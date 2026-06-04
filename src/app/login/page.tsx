import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { campaigns, recipients } from "@/lib/db/schema";
import { Wordmark } from "@/components/ui/Wordmark";
import { LoginForm } from "./LoginForm";

type Params = Promise<{ next?: string }>;

async function getBrandStats() {
  const [[r], [c]] = await Promise.all([
    db
      .select({
        sent: sql<number>`count(*) filter (where status in ('SENT','DELIVERED','OPENED'))::int`,
        opened: sql<number>`count(*) filter (where status = 'OPENED')::int`,
      })
      .from(recipients),
    db.select({ n: sql<number>`count(*) filter (where status = 'SENT')::int` }).from(campaigns),
  ]);
  const sent = Number(r?.sent ?? 0);
  const opened = Number(r?.opened ?? 0);
  const campaignsSent = Number(c?.n ?? 0);
  return {
    reached: sent,
    deliveryPct: sent > 0 ? Math.round(((sent - 0) / sent) * 100) : 0,
    campaignsSent,
    openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
  };
}

export default async function LoginPage({ searchParams }: { searchParams: Params }) {
  const { next } = await searchParams;
  if (env.DEV_SKIP_AUTH) redirect(next ?? "/campaigns");
  const session = await auth();
  if (session?.user) redirect(next ?? "/campaigns");

  const stats = await getBrandStats();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1.1fr",
        background: "#ffffff",
      }}
    >
      {/* Left — form */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "48px 56px",
          justifyContent: "space-between",
          minWidth: 0,
        }}
      >
        <Wordmark />

        <div
          style={{
            maxWidth: 380,
            width: "100%",
            alignSelf: "center",
            marginTop: -40,
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Internal · AGEL Group
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 38,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              margin: "0 0 8px",
              fontWeight: 400,
              color: "var(--color-ink-800)",
            }}
          >
            Sign in to{" "}
            <span style={{ fontStyle: "italic", color: "var(--color-maroon-700)" }}>
              Outreach
            </span>
            .
          </h1>
          <p style={{ margin: "0 0 32px", color: "var(--color-ink-600)", fontSize: 15 }}>
            Send personalized campaigns to your contacts —
            <br />
            thoughtfully, and one batch at a time.
          </p>

          <LoginForm next={next ?? "/campaigns"} />

          <div
            style={{
              marginTop: 24,
              padding: "12px 14px",
              background: "var(--color-blush-50)",
              borderRadius: 8,
              border: "1px solid var(--color-blush-100)",
              fontSize: 12.5,
              color: "var(--color-ink-600)",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <span style={{ color: "var(--color-ink-400)" }}>🔒</span>
            <div>
              This tool is restricted to AGEL Group employees. Access is managed by your administrator.
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--color-ink-400)" }}>
          © {new Date().getFullYear()} Groupe AGEL · Internal tooling
        </div>
      </div>

      {/* Right — brand visual */}
      <LoginBrandPanel stats={stats} />
    </div>
  );
}

function LoginBrandPanel({
  stats,
}: {
  stats: {
    reached: number;
    deliveryPct: number;
    campaignsSent: number;
    openRate: number;
  };
}) {
  return (
    <div
      style={{
        position: "relative",
        background:
          "linear-gradient(160deg, #631D2A 0%, #4a1620 60%, #2e0d15 100%)",
        overflow: "hidden",
        color: "var(--color-blush-50)",
        display: "flex",
        flexDirection: "column",
        padding: "48px 56px",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(236, 194, 202, 0.18) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse at top right, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at top right, black 30%, transparent 75%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: -120,
          right: -80,
          fontFamily: "var(--font-serif)",
          fontSize: 580,
          lineHeight: 0.7,
          fontStyle: "italic",
          color: "rgba(236, 194, 202, 0.08)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        A
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: "rgba(236, 194, 202, 0.08)",
            border: "1px solid rgba(236, 194, 202, 0.18)",
            borderRadius: 999,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
            color: "var(--color-blush-200)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--color-blush-300)",
            }}
          />
          Version 2.4 · May 2026
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 460 }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 34,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            fontWeight: 400,
            color: "var(--color-blush-50)",
          }}
        >
          Personalised at scale.
          <br />
          <span style={{ fontStyle: "italic", color: "var(--color-blush-200)" }}>
            Sent like it matters.
          </span>
        </div>
        <p
          style={{
            marginTop: 18,
            fontSize: 14,
            lineHeight: 1.65,
            color: "rgba(236, 194, 202, 0.7)",
            maxWidth: 380,
          }}
        >
          Upload contacts, pick a template, preview every row, and send — with
          confirmations and audit trails the marketing team can stand behind.
        </p>
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 40 }}>
        {[
          { n: stats.reached.toLocaleString(), l: "Recipients reached" },
          { n: `${stats.deliveryPct}%`, l: "Delivery rate" },
          { n: stats.campaignsSent.toString(), l: "Campaigns sent" },
        ].map((s) => (
          <div key={s.l}>
            <div
              className="mono"
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: "var(--color-blush-50)",
                letterSpacing: "-0.02em",
              }}
            >
              {s.n}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-blush-300)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
