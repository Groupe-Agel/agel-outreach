import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns as campaignsTable } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { CampaignsList } from "@/components/CampaignsList";

export default async function CampaignsPage() {
  await requireUser();
  const rows = await db
    .select({
      id: campaignsTable.id,
      name: campaignsTable.name,
      subject: campaignsTable.subjectTpl,
      status: campaignsTable.status,
      totalCount: campaignsTable.totalCount,
      sentCount: campaignsTable.sentCount,
      failedCount: campaignsTable.failedCount,
      openedCount: campaignsTable.openedCount,
      scheduledAt: campaignsTable.scheduledAt,
      createdAt: campaignsTable.createdAt,
      completedAt: campaignsTable.completedAt,
    })
    .from(campaignsTable)
    .orderBy(desc(campaignsTable.createdAt));

  const serialized = rows.map((r) => ({
    ...r,
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Outreach"
        title="Campaigns"
        subtitle="Every campaign you've sent or scheduled. Pick one to see per-recipient delivery."
        actions={
          <Link href="/campaigns/new" className="btn btn-primary">
            <Icon name="plus" size={14} /> New campaign
          </Link>
        }
      />
      <CampaignsList campaigns={serialized} />
    </div>
  );
}
