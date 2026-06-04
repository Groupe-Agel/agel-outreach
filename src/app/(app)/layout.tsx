import { sql } from "drizzle-orm";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { campaigns, templates } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { env } from "@/lib/env";
import { SideNav } from "@/components/SideNav";

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
        {children}
      </main>
    </div>
  );
}
