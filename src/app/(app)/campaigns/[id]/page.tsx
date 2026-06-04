import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { campaigns, recipients as recipientsTable, templates } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { Icon } from "@/components/ui/Icon";
import { CampaignActions } from "@/components/CampaignActions";
import { CampaignDetailTabs, type Activity } from "@/components/CampaignDetailTabs";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const c = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });
  if (!c) notFound();

  const [t, rcpts] = await Promise.all([
    db.query.templates.findFirst({
      where: eq(templates.id, c.templateId),
      columns: { name: true },
    }),
    db
      .select()
      .from(recipientsTable)
      .where(eq(recipientsTable.campaignId, id))
      .orderBy(desc(recipientsTable.sentAt)),
  ]);

  const openRate =
    c.sentCount > 0 ? Math.round((c.openedCount / c.sentCount) * 100) : 0;

  const activity: Activity[] = [
    { at: c.createdAt.toISOString(), event: "Campaign created" },
    ...(c.startedAt
      ? [{ at: c.startedAt.toISOString(), event: `Send started · queued ${c.totalCount} messages` }]
      : []),
    ...(c.completedAt
      ? [
          {
            at: c.completedAt.toISOString(),
            event: `Send completed — ${c.sentCount} delivered, ${c.failedCount} failed`,
          },
        ]
      : []),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const recipients = rcpts.map((r) => ({
    id: r.id,
    email: r.email,
    status: r.status,
    sentAt: r.sentAt?.toISOString() ?? null,
    openedAt: r.openedAt?.toISOString() ?? null,
    errorMessage: r.errorMessage,
    mergeData: (r.mergeData ?? {}) as Record<string, unknown>,
  }));

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
        title={c.name ?? "(untitled)"}
        subtitle={c.subjectTpl}
        actions={
          <CampaignActions
            id={c.id}
            status={c.status}
            scheduledAt={c.scheduledAt}
          />
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Details</div>
          <Detail label="Status" value={<StatusPill status={c.status} />} />
          <Detail label="Template" value={t?.name ?? "—"} />
          <Detail label="From" value={c.fromEmail} mono />
          <Detail label="Reply-to" value={c.replyTo} mono />
          <Detail
            label={c.completedAt ? "Sent" : c.scheduledAt ? "Scheduled" : "Created"}
            value={format(c.completedAt ?? c.scheduledAt ?? c.createdAt, "PPp")}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <BigStat label="Total" value={c.totalCount} accent="ink" />
          <BigStat label="Sent" value={c.sentCount} accent="maroon" />
          <BigStat
            label="Failed"
            value={c.failedCount}
            accent={c.failedCount > 0 ? "red" : "ink"}
          />
          <BigStat
            label="Opened"
            value={c.openedCount}
            accent="ink"
            sub={`${openRate}%`}
          />
        </div>
      </div>

      <CampaignDetailTabs
        recipients={recipients}
        activity={activity}
        recipientsCount={c.totalCount}
      />
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "7px 0",
        borderBottom: "1px solid var(--color-ink-50)",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--color-ink-400)" }}>{label}</span>
      <span
        className={mono ? "mono" : undefined}
        style={{
          color: "var(--color-ink-800)",
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 180,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function BigStat({
  label,
  value,
  accent = "ink",
  sub,
}: {
  label: string;
  value: number;
  accent?: "ink" | "maroon" | "red";
  sub?: string;
}) {
  const color = {
    maroon: "var(--color-maroon-700)",
    red: "var(--color-danger-700)",
    ink: "var(--color-ink-800)",
  }[accent];
  return (
    <div
      className="card"
      style={{
        padding: "18px 20px",
        borderRadius: 0,
        borderRight: "1px solid var(--color-ink-100)",
        boxShadow: "none",
      }}
    >
      <div className="eyebrow">{label}</div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginTop: 8,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color,
          }}
        >
          {value.toLocaleString()}
        </div>
        {sub && (
          <div className="mono" style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
