import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smtpConfigs } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { encryptSecret } from "@/lib/secret-crypto";

const Body = z.object({
  name: z.string().min(1).max(80),
  provider: z.enum(["outlook", "hostinger", "custom"]).default("custom"),
  host: z.string().min(1).max(200),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  smtpUser: z.string().min(1).max(200),
  smtpPassword: z.string().min(1).max(500),
  fromEmail: z.string().email().optional().nullable(),
  setAsDefault: z.boolean().optional(),
});

export async function GET() {
  const me = await requireUser();
  const rows = await db
    .select({
      id: smtpConfigs.id,
      name: smtpConfigs.name,
      provider: smtpConfigs.provider,
      host: smtpConfigs.host,
      port: smtpConfigs.port,
      secure: smtpConfigs.secure,
      smtpUser: smtpConfigs.smtpUser,
      fromEmail: smtpConfigs.fromEmail,
      isDefault: smtpConfigs.isDefault,
      createdAt: smtpConfigs.createdAt,
    })
    .from(smtpConfigs)
    .where(eq(smtpConfigs.userId, me.id))
    .orderBy(desc(smtpConfigs.isDefault), desc(smtpConfigs.updatedAt));
  return NextResponse.json({ configs: rows });
}

export async function POST(req: Request) {
  const me = await requireUser();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await db
    .select({ id: smtpConfigs.id })
    .from(smtpConfigs)
    .where(eq(smtpConfigs.userId, me.id));
  const shouldBeDefault =
    data.setAsDefault === true || existing.length === 0;

  if (shouldBeDefault) {
    await db
      .update(smtpConfigs)
      .set({ isDefault: false })
      .where(eq(smtpConfigs.userId, me.id));
  }

  const [row] = await db
    .insert(smtpConfigs)
    .values({
      userId: me.id,
      name: data.name,
      provider: data.provider,
      host: data.host,
      port: data.port,
      secure: data.secure,
      smtpUser: data.smtpUser,
      passEncrypted: encryptSecret(data.smtpPassword),
      fromEmail: data.fromEmail || null,
      isDefault: shouldBeDefault,
    })
    .returning({ id: smtpConfigs.id });

  return NextResponse.json({ id: row.id });
}
