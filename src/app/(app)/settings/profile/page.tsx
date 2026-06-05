import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smtpConfigs, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileForm, type ProfileData, type SmtpConfig } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const me = await requireUser();
  const row = await db.query.users.findFirst({ where: eq(users.id, me.id) });

  const configs = await db
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
    })
    .from(smtpConfigs)
    .where(eq(smtpConfigs.userId, me.id))
    .orderBy(desc(smtpConfigs.isDefault), desc(smtpConfigs.updatedAt));

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

  const initialConfigs: SmtpConfig[] = configs.map((c) => ({
    id: c.id,
    name: c.name,
    provider: c.provider as SmtpConfig["provider"],
    host: c.host,
    port: c.port,
    secure: c.secure,
    smtpUser: c.smtpUser,
    fromEmail: c.fromEmail,
    isDefault: c.isDefault,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Profile"
        subtitle="Your account, sender identity, and how AGEL Outreach reaches you."
      />
      <ProfileForm user={data} initialConfigs={initialConfigs} />
    </div>
  );
}
