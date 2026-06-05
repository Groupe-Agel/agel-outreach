import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smtpConfigs } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { encryptSecret } from "@/lib/secret-crypto";

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  provider: z.enum(["outlook", "hostinger", "custom"]).optional(),
  host: z.string().min(1).max(200).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  secure: z.boolean().optional(),
  smtpUser: z.string().min(1).max(200).optional(),
  smtpPassword: z.string().min(1).max(500).optional(),
  fromEmail: z.string().email().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireUser();
  const { id } = await params;
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const existing = await db.query.smtpConfigs.findFirst({
    where: and(eq(smtpConfigs.id, id), eq(smtpConfigs.userId, me.id)),
  });
  if (!existing) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const data = parsed.data;
  if (data.name !== undefined) updates.name = data.name;
  if (data.provider !== undefined) updates.provider = data.provider;
  if (data.host !== undefined) updates.host = data.host;
  if (data.port !== undefined) updates.port = data.port;
  if (data.secure !== undefined) updates.secure = data.secure;
  if (data.smtpUser !== undefined) updates.smtpUser = data.smtpUser;
  if (data.fromEmail !== undefined) updates.fromEmail = data.fromEmail || null;
  if (data.smtpPassword) updates.passEncrypted = encryptSecret(data.smtpPassword);

  await db.update(smtpConfigs).set(updates).where(eq(smtpConfigs.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireUser();
  const { id } = await params;

  const existing = await db.query.smtpConfigs.findFirst({
    where: and(eq(smtpConfigs.id, id), eq(smtpConfigs.userId, me.id)),
    columns: { id: true, isDefault: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  await db.delete(smtpConfigs).where(eq(smtpConfigs.id, id));

  // If we just deleted the default, promote any other config to default.
  if (existing.isDefault) {
    const next = await db.query.smtpConfigs.findFirst({
      where: eq(smtpConfigs.userId, me.id),
      columns: { id: true },
    });
    if (next) {
      await db
        .update(smtpConfigs)
        .set({ isDefault: true })
        .where(eq(smtpConfigs.id, next.id));
    }
  }

  return NextResponse.json({ ok: true });
}
