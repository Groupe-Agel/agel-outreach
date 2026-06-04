"use client";

import { useState } from "react";
import { format } from "date-fns";
import { StatusPill } from "@/components/ui/StatusPill";

export type RecipientRow = {
  id: string;
  email: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  errorMessage: string | null;
  mergeData: Record<string, unknown>;
};

export type Activity = {
  at: string;
  event: string;
};

export function CampaignDetailTabs({
  recipients,
  activity,
  recipientsCount,
}: {
  recipients: RecipientRow[];
  activity: Activity[];
  recipientsCount: number;
}) {
  const [tab, setTab] = useState<"recipients" | "activity">("recipients");

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--color-ink-100)",
        }}
      >
        {(
          [
            { id: "recipients", label: "Recipients", count: recipientsCount },
            { id: "activity", label: "Activity log", count: null },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              background: "none",
              border: "none",
              padding: "12px 14px",
              cursor: "pointer",
              fontSize: 13.5,
              fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? "var(--color-maroon-700)" : "var(--color-ink-600)",
              borderBottom:
                tab === t.id
                  ? "2px solid var(--color-maroon-700)"
                  : "2px solid transparent",
              marginBottom: -1,
              fontFamily: "inherit",
            }}
          >
            {t.label}
            {t.count !== null && (
              <span
                className="mono"
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  background: "var(--color-ink-50)",
                  padding: "1px 6px",
                  borderRadius: 4,
                  color: "var(--color-ink-600)",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === "recipients" && <RecipientsTable recipients={recipients} />}
        {tab === "activity" && <ActivityLog activity={activity} />}
      </div>
    </div>
  );
}

function RecipientsTable({ recipients }: { recipients: RecipientRow[] }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 1.4fr 1.2fr 110px 120px",
          gap: 16,
          padding: "10px 20px",
          background: "var(--color-ink-25)",
          borderBottom: "1px solid var(--color-ink-100)",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--color-ink-400)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>#</span>
        <span>Name</span>
        <span>Email</span>
        <span>Organisation</span>
        <span>Status</span>
        <span>Sent</span>
      </div>
      {recipients.length === 0 && (
        <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--color-ink-400)", fontSize: 13 }}>
          No recipients on this campaign yet.
        </div>
      )}
      {recipients.map((r, i) => {
        const data = r.mergeData ?? {};
        const name = (data["full_name"] ?? data["name"] ?? "—") as string;
        const org = (data["organization"] ?? data["org"] ?? "—") as string;
        return (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 1.4fr 1.2fr 110px 120px",
              gap: 16,
              padding: "12px 20px",
              borderBottom:
                i < recipients.length - 1 ? "1px solid var(--color-ink-50)" : "none",
              fontSize: 13,
              alignItems: "center",
            }}
          >
            <span className="mono" style={{ color: "var(--color-ink-400)", fontSize: 11 }}>
              {i + 1}
            </span>
            <span style={{ color: "var(--color-ink-800)" }}>{name}</span>
            <span className="mono" style={{ color: "var(--color-ink-600)", fontSize: 12 }}>
              {r.email}
            </span>
            <span style={{ color: "var(--color-ink-600)" }}>{org}</span>
            <StatusPill status={r.status} />
            <span className="mono" style={{ color: "var(--color-ink-400)", fontSize: 11.5 }}>
              {r.sentAt ? format(new Date(r.sentAt), "HH:mm:ss") : "—"}
            </span>
            {r.errorMessage && (
              <div style={{ gridColumn: "2 / -1", fontSize: 11.5, color: "var(--color-danger-700)", marginTop: -4 }}>
                {r.errorMessage}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActivityLog({ activity }: { activity: Activity[] }) {
  return (
    <div className="card" style={{ padding: "8px 0" }}>
      {activity.length === 0 && (
        <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--color-ink-400)", fontSize: 13 }}>
          No events yet.
        </div>
      )}
      {activity.map((row, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            gap: 16,
            padding: "8px 20px",
          }}
        >
          <span className="mono" style={{ color: "var(--color-ink-400)", fontSize: 12 }}>
            {format(new Date(row.at), "PP HH:mm:ss")}
          </span>
          <span style={{ fontSize: 13.5, color: "var(--color-ink-700)" }}>{row.event}</span>
        </div>
      ))}
    </div>
  );
}
