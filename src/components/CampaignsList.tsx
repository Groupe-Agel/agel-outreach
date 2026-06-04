"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

export type CampaignRow = {
  id: string;
  name: string | null;
  subject: string;
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  openedCount: number;
  scheduledAt: string | null;
  createdAt: string;
  completedAt: string | null;
};

const STATUSES = ["ALL", "SENT", "SCHEDULED", "SENDING", "DRAFT", "FAILED"] as const;

export function CampaignsList({ campaigns }: { campaigns: CampaignRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("ALL");

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (q && !(c.name ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      if (filter !== "ALL" && c.status !== filter) return false;
      return true;
    });
  }, [campaigns, q, filter]);

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon="paperPlane"
        title="No campaigns yet"
        description="Create your first campaign — upload contacts, pick a template, and send it from one place."
        action={
          <Link href="/campaigns/new" className="btn btn-primary">
            <Icon name="plus" size={14} /> New campaign
          </Link>
        }
      />
    );
  }

  return (
    <>
      <StatsStrip campaigns={campaigns} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "20px 0 12px",
        }}
      >
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <input
            className="input"
            placeholder="Search campaigns…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
          <span
            style={{
              position: "absolute",
              left: 12,
              top: 11,
              color: "var(--color-ink-400)",
              pointerEvents: "none",
            }}
          >
            <Icon name="search" size={14} />
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--color-ink-50)",
            padding: 3,
            borderRadius: 8,
          }}
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className="btn btn-sm"
              style={{
                background: filter === s ? "#ffffff" : "transparent",
                color: filter === s ? "var(--color-ink-800)" : "var(--color-ink-600)",
                boxShadow: filter === s ? "var(--shadow-xs)" : "none",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.04em",
                height: 28,
                border: "none",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-secondary btn-sm">
          <Icon name="download" size={13} /> Export
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="Nothing matches that filter"
          description="Try a different status, or clear your search."
          action={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setQ("");
                setFilter("ALL");
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filtered.map((c, i) => (
            <Row key={c.id} c={c} divider={i > 0} />
          ))}
        </div>
      )}
    </>
  );
}

function StatsStrip({ campaigns }: { campaigns: CampaignRow[] }) {
  const totalSent = campaigns.reduce((a, c) => a + (c.sentCount || 0), 0);
  const totalOpened = campaigns.reduce((a, c) => a + (c.openedCount || 0), 0);
  const totalFailed = campaigns.reduce((a, c) => a + (c.failedCount || 0), 0);
  const inFlight = campaigns.filter(
    (c) => c.status === "SENDING" || c.status === "SCHEDULED",
  ).length;
  const openRate =
    totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  const stats = [
    { label: "Recipients reached", value: totalSent.toLocaleString(), delta: "all-time" },
    { label: "Opens", value: totalOpened.toLocaleString(), delta: `${openRate}%` },
    { label: "Failed", value: totalFailed.toString(), delta: totalFailed > 0 ? "review" : "all clear" },
    { label: "In flight", value: inFlight.toString(), delta: inFlight > 0 ? "active" : "idle" },
  ];

  return (
    <div
      className="card"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        padding: 0,
        overflow: "hidden",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            padding: "18px 20px",
            borderLeft: i > 0 ? "1px solid var(--color-ink-100)" : "none",
          }}
        >
          <div className="eyebrow" style={{ fontSize: 10.5 }}>{s.label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
            <div
              className="mono"
              style={{
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "var(--color-ink-800)",
              }}
            >
              {s.value}
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--color-ink-400)" }}
            >
              {s.delta}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({ c, divider }: { c: CampaignRow; divider: boolean }) {
  const ts = c.completedAt ?? c.scheduledAt ?? c.createdAt;
  const when = ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : "—";

  return (
    <Link
      href={`/campaigns/${c.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        alignItems: "center",
        gap: 24,
        padding: "16px 20px",
        borderTop: divider ? "1px solid var(--color-ink-100)" : "none",
        transition: "background 100ms",
      }}
      className="campaign-row"
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: "var(--color-ink-800)",
            letterSpacing: "-0.01em",
            marginBottom: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {c.name ?? "(untitled)"}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 12.5,
            color: "var(--color-ink-400)",
          }}
        >
          <span>
            <span className="mono">{c.totalCount}</span> recipients
          </span>
          <Dot />
          <span>
            <span className="mono">{c.sentCount}</span> sent
          </span>
          <Dot />
          <span style={{ color: c.failedCount > 0 ? "var(--color-danger-700)" : "var(--color-ink-400)" }}>
            <span className="mono">{c.failedCount}</span> failed
          </span>
          <Dot />
          <span>
            <span className="mono">{c.openedCount}</span> opened
          </span>
        </div>
      </div>
      <SparkBar c={c} />
      <StatusPill status={c.status} />
      <div
        className="mono"
        style={{
          fontSize: 12.5,
          color: "var(--color-ink-400)",
          width: 110,
          textAlign: "right",
        }}
      >
        {when}
      </div>
      <style>{`.campaign-row:hover { background: var(--color-blush-50); }`}</style>
    </Link>
  );
}

function Dot() {
  return (
    <span
      style={{
        width: 3,
        height: 3,
        borderRadius: 999,
        background: "var(--color-ink-200)",
      }}
    />
  );
}

function SparkBar({ c }: { c: CampaignRow }) {
  if (c.totalCount === 0) return <div style={{ width: 140 }} />;
  const sentPct = (c.sentCount / c.totalCount) * 100;
  const failedPct = (c.failedCount / c.totalCount) * 100;
  const openedPct = (c.openedCount / c.totalCount) * 100;
  return (
    <div style={{ width: 140 }}>
      <div
        style={{
          height: 6,
          background: "var(--color-ink-50)",
          borderRadius: 4,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(sentPct - failedPct, 0)}%`,
            background: "var(--color-maroon-700)",
          }}
        />
        {failedPct > 0 && (
          <div
            style={{ width: `${failedPct}%`, background: "var(--color-danger-700)" }}
          />
        )}
      </div>
      <div
        className="mono"
        style={{
          marginTop: 4,
          fontSize: 10.5,
          color: "var(--color-ink-400)",
          letterSpacing: "0.02em",
        }}
      >
        {openedPct > 0 ? `${Math.round(openedPct)}% opened` : "no opens yet"}
      </div>
    </div>
  );
}
