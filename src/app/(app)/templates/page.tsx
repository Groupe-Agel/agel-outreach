import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { TemplateGridCard } from "@/components/TemplateGridCard";

export default async function TemplatesPage() {
  await requireUser();
  const rows = await db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      variables: templates.variables,
      updatedAt: templates.updatedAt,
    })
    .from(templates)
    .orderBy(desc(templates.updatedAt));

  const serialized = rows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Templates"
        subtitle="Reusable MJML emails. Each template defines body, layout, and the variables it expects from your contacts file."
        actions={
          <Link href="/templates/new" className="btn btn-primary">
            <Icon name="plus" size={14} /> New template
          </Link>
        }
      />

      {serialized.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No templates yet"
          description="Templates are MJML snippets you'll re-use across campaigns. Create one and we'll show a live preview as you type."
          action={
            <Link href="/templates/new" className="btn btn-primary">
              <Icon name="plus" size={14} /> New template
            </Link>
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {serialized.map((t) => (
            <TemplateGridCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
