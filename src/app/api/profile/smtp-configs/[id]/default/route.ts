import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smtpConfigs } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireUser();
  const { id } = await params;

  const existing = await db.query.smtpConfigs.findFirst({
    where: and(eq(smtpConfigs.id, id), eq(smtpConfigs.userId, me.id)),
    columns: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  await db
    .update(smtpConfigs)
    .set({ isDefault: false })
    .where(eq(smtpConfigs.userId, me.id));
  await db
    .update(smtpConfigs)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(smtpConfigs.id, id));

  return NextResponse.json({ ok: true });
}
