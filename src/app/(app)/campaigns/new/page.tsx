import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contactLists,
  contactListMembers,
  smtpConfigs,
  templates,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { NewCampaignFlow } from "@/components/NewCampaignFlow";

export default async function NewCampaignPage() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: templates.id,
      name: templates.name,
      subjectTpl: templates.subjectTpl,
      variables: templates.variables,
    })
    .from(templates)
    .orderBy(desc(templates.updatedAt));

  const lists = await db
    .select({
      id: contactLists.id,
      name: contactLists.name,
      memberCount: sql<number>`count(${contactListMembers.id})::int`,
    })
    .from(contactLists)
    .leftJoin(
      contactListMembers,
      eq(contactLists.id, contactListMembers.listId),
    )
    .where(eq(contactLists.createdById, user.id))
    .groupBy(contactLists.id)
    .orderBy(desc(contactLists.updatedAt));

  const smtpConfigList = await db
    .select({
      id: smtpConfigs.id,
      name: smtpConfigs.name,
      provider: smtpConfigs.provider,
      smtpUser: smtpConfigs.smtpUser,
      fromEmail: smtpConfigs.fromEmail,
      isDefault: smtpConfigs.isDefault,
    })
    .from(smtpConfigs)
    .where(eq(smtpConfigs.userId, user.id))
    .orderBy(desc(smtpConfigs.isDefault), desc(smtpConfigs.updatedAt));

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link
            href="/campaigns"
            style={{ color: "var(--color-maroon-700)", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="arrowLeft" size={12} /> Campaigns
          </Link>
        }
        title="New campaign"
        subtitle="Send a personalised email to every row in your contacts file. We'll preview each one before anything goes out."
      />
      <NewCampaignFlow
        templates={rows}
        lists={lists}
        smtpConfigs={smtpConfigList}
        defaultFromName={user.name ?? user.email.split("@")[0]}
        defaultReplyTo={user.email}
        defaultFromAddress={env.RESEND_DEFAULT_FROM_EMAIL}
      />
    </div>
  );
}
