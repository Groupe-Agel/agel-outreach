import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiTokensManager } from "@/components/ApiTokensManager";

export default async function ApiTokensPage() {
  await requireUser();
  const rows = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      createdAt: apiTokens.createdAt,
      lastUsedAt: apiTokens.lastUsedAt,
      revokedAt: apiTokens.revokedAt,
    })
    .from(apiTokens)
    .orderBy(desc(apiTokens.createdAt));

  const initial = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    revokedAt: r.revokedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="API tokens"
        subtitle="Programmatic access to AGEL Outreach. Tokens are shown once, then stored hashed — keep them somewhere safe."
      />
      <ApiTokensManager initial={initial} />
    </div>
  );
}
