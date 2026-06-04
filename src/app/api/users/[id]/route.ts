import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { hashPassword } from "@/lib/password";

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  role: z.enum(["USER", "SUPERADMIN"]).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
});

async function countOtherSuperAdmins(excludeId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "SUPERADMIN"), ne(users.id, excludeId)));
  return Number(row?.n ?? 0);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSuperAdmin();
  const { id } = await params;
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  // Guard: don't allow demoting the last remaining SUPERADMIN.
  if (parsed.data.role === "USER" && id === me.id) {
    const others = await countOtherSuperAdmins(id);
    if (others === 0) {
      return NextResponse.json(
        { error: "You are the last SUPERADMIN; cannot demote yourself." },
        { status: 400 },
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.password !== undefined) {
    updates.passwordHash = hashPassword(parsed.data.password);
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db.update(users).set(updates).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSuperAdmin();
  const { id } = await params;
  if (id === me.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  // If the target is a SUPERADMIN, make sure another exists.
  const target = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.role === "SUPERADMIN") {
    const others = await countOtherSuperAdmins(id);
    if (others === 0) {
      return NextResponse.json(
        { error: "Cannot delete the last SUPERADMIN." },
        { status: 400 },
      );
    }
  }

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
