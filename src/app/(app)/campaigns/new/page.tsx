import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
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
        defaultFromName={user.name ?? user.email.split("@")[0]}
        defaultReplyTo={user.email}
        defaultFromAddress={env.RESEND_DEFAULT_FROM_EMAIL}
      />
    </div>
  );
}
