import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { hashPassword, verifyPassword } from "@/lib/password";

const Body = z.object({
  name: z.string().min(1).max(80).optional(),
  defaultFromName: z.string().max(80).optional().nullable(),
  defaultReplyTo: z.string().email().optional().nullable(),
  signature: z.string().max(2000).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
});

export async function PATCH(req: Request) {
  const me = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const { name, defaultFromName, defaultReplyTo, signature, currentPassword, newPassword } =
    parsed.data;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (defaultFromName !== undefined)
    updates.defaultFromName = defaultFromName || null;
  if (defaultReplyTo !== undefined)
    updates.defaultReplyTo = defaultReplyTo || null;
  if (signature !== undefined) updates.signature = signature || null;

  if (newPassword) {
    // For password changes, require the current password (unless none is set yet).
    const row = await db.query.users.findFirst({ where: eq(users.id, me.id) });
    if (row?.passwordHash) {
      if (!currentPassword || !verifyPassword(currentPassword, row.passwordHash)) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 400 },
        );
      }
    }
    updates.passwordHash = hashPassword(newPassword);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db.update(users).set(updates).where(eq(users.id, me.id));
  return NextResponse.json({ ok: true });
}
