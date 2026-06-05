import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { campaigns, smtpConfigs, templates, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { env } from "@/lib/env";
import { SideNav } from "@/components/SideNav";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

async function getCounts() {
  const [[c], [t]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(campaigns),
    db.select({ n: sql<number>`count(*)::int` }).from(templates),
  ]);
  return { campaigns: Number(c?.n ?? 0), templates: Number(t?.n ?? 0) };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const counts = await getCounts();
  const devMode = env.DEV_SKIP_AUTH;

  const [row, [{ cfgCount }]] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { smtpHost: true, smtpUser: true, smtpPassEncrypted: true },
    }),
    db
      .select({ cfgCount: sql<number>`count(*)::int` })
      .from(smtpConfigs)
      .where(eq(smtpConfigs.userId, user.id)),
  ]);
  const hasLegacy = Boolean(
    row?.smtpHost && row?.smtpUser && row?.smtpPassEncrypted,
  );
  const needsSmtp = cfgCount === 0 && !hasLegacy;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <SideNav
        user={{
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }}
        devMode={devMode}
        campaignCount={counts.campaigns}
        templateCount={counts.templates}
        onSignOut={handleSignOut}
      />
      <main
        style={{
          marginLeft: 248,
          padding: "36px 48px 64px",
          maxWidth: 1200,
        }}
      >
        {needsSmtp && <SmtpWarning />}
        {children}
      </main>
    </div>
  );
}

function SmtpWarning() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        marginBottom: 24,
        background: "var(--color-blush-50)",
        border: "1px solid var(--color-blush-200)",
        borderRadius: 10,
        color: "var(--color-ink-800)",
        fontSize: 13.5,
        lineHeight: 1.5,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "#ffffff",
          border: "1px solid var(--color-blush-200)",
          color: "var(--color-maroon-700)",
        }}
        aria-hidden
      >
        <Icon name="mail" size={14} />
      </span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            color: "var(--color-ink-800)",
            marginBottom: 2,
          }}
        >
          Set up your mailbox to start sending
        </div>
        <div style={{ color: "var(--color-ink-600)", fontSize: 13 }}>
          You haven&apos;t connected an SMTP server yet, so campaigns will send
          from the system default address. Add your credentials so emails go
          from your own mailbox and replies come straight back to you.
        </div>
      </div>
      <Link
        href="/settings/profile#smtp"
        className="btn btn-primary btn-sm"
        style={{ flexShrink: 0, alignSelf: "center" }}
      >
        Configure
      </Link>
    </div>
  );
}
