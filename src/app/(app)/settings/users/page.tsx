import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleBadge } from "@/components/ui/StatusPill";
import { UsersManager } from "@/components/UsersManager";

export default async function UsersPage() {
  const me = await requireSuperAdmin();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const initial = rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    createdAt: r.createdAt.toISOString(),
    hasPassword: Boolean(r.passwordHash),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Users"
        subtitle={
          <>
            Team members with access to AGEL Outreach. Only users with{" "}
            <RoleBadge role="SUPERADMIN" /> can manage this list.
          </>
        }
      />
      <UsersManager initial={initial} currentUserId={me.id} />
    </div>
  );
}
