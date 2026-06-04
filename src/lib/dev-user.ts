import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import type { AppUser } from "@/lib/auth-helpers";

const DEV_EMAIL = "dev@groupe-agel.com";
const DEV_NAME = "Dev User";

let cached: AppUser | null = null;

/**
 * Returns a stable dev user with SUPERADMIN role, upserting it on first call
 * so FK constraints (templates.createdById, campaigns.createdById, etc.) and
 * role-gated routes work. Only callable when DEV_SKIP_AUTH is enabled.
 */
export async function ensureDevUser(): Promise<AppUser> {
  if (!env.DEV_SKIP_AUTH) {
    throw new Error("ensureDevUser called without DEV_SKIP_AUTH=true");
  }
  if (cached) return cached;

  // Race-safe upsert with role promotion.
  await db
    .insert(users)
    .values({ email: DEV_EMAIL, name: DEV_NAME, role: "SUPERADMIN" })
    .onConflictDoUpdate({
      target: users.email,
      set: { role: "SUPERADMIN" },
    });

  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_EMAIL))
    .limit(1);

  if (!row) throw new Error("ensureDevUser: upsert+select both failed");

  cached = {
    id: row.id,
    email: row.email,
    name: row.name ?? DEV_NAME,
    image: row.image ?? null,
    role: row.role,
  };
  return cached;
}
