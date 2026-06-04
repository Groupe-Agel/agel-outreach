import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { hashPassword } from "@/lib/password";

const CreateBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["USER", "SUPERADMIN"]).default("USER"),
});

export async function GET() {
  await requireSuperAdmin();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      hasPassword: users.passwordHash, // mapped to boolean below
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return NextResponse.json({
    users: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      createdAt: r.createdAt.toISOString(),
      hasPassword: Boolean(r.hasPassword),
    })),
  });
}

export async function POST(req: Request) {
  await requireSuperAdmin();
  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const { email, name, password, role } = parsed.data;
  const normalized = email.trim().toLowerCase();

  try {
    const [created] = await db
      .insert(users)
      .values({
        email: normalized,
        name: name ?? null,
        role,
        passwordHash: hashPassword(password),
      })
      .returning({ id: users.id });
    return NextResponse.json({ id: created.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("user_email_unique")) {
      return NextResponse.json(
        { error: "A user with that email already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
