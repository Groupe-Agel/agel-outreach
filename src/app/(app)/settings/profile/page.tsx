import { eq } from "drizzle-orm";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileForm, type ProfileData } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const me = await requireUser();
  const row = await db.query.users.findFirst({ where: eq(users.id, me.id) });

  const data: ProfileData = {
    id: me.id,
    email: me.email,
    name: row?.name ?? me.name,
    role: me.role,
    createdAt: row?.createdAt.toISOString() ?? new Date().toISOString(),
    hasPassword: Boolean(row?.passwordHash),
    signature: row?.signature ?? null,
    defaultFromName: row?.defaultFromName ?? null,
    defaultReplyTo: row?.defaultReplyTo ?? null,
  };

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Profile"
        subtitle="Your account, sender identity, and how AGEL Outreach reaches you."
      />
      <ProfileForm user={data} onSignOut={handleSignOut} />
    </div>
  );
}
