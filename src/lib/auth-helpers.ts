import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { ensureDevUser } from "@/lib/dev-user";
import type { UserRole } from "@/lib/db/schema";

export type AppUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
};

export async function requireUser(): Promise<AppUser> {
  if (env.DEV_SKIP_AUTH) return ensureDevUser();
  const session = await auth();
  if (!session?.user) redirect("/login");
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
  };
}

export async function getOptionalUser(): Promise<AppUser | null> {
  if (env.DEV_SKIP_AUTH) return ensureDevUser();
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
  };
}

export async function requireSuperAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "SUPERADMIN") {
    // Soft redirect: dropping to /campaigns is friendlier than a 403 page
    redirect("/campaigns?error=forbidden");
  }
  return user;
}
