import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactLists, contactListMembers } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";

export default async function ListsPage() {
  const me = await requireUser();
  const rows = await db
    .select({
      id: contactLists.id,
      name: contactLists.name,
      description: contactLists.description,
      updatedAt: contactLists.updatedAt,
      memberCount: sql<number>`count(${contactListMembers.id})::int`,
    })
    .from(contactLists)
    .leftJoin(
      contactListMembers,
      eq(contactLists.id, contactListMembers.listId),
    )
    .where(eq(contactLists.createdById, me.id))
    .groupBy(contactLists.id)
    .orderBy(desc(contactLists.updatedAt));

  return (
    <div>
      <PageHeader
        eyebrow="Audiences"
        title="Contact lists"
        subtitle="Saved groups of contacts you can reuse across campaigns without re-uploading."
        actions={
          <Link href="/lists/new" className="btn btn-primary">
            <Icon name="plus" size={14} /> New list
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="users"
          title="No contact lists yet"
          description="Upload a contacts file once and save it as a list. Then pick it when creating a campaign — no re-uploading."
          action={
            <Link href="/lists/new" className="btn btn-primary">
              <Icon name="plus" size={14} /> New list
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
          {rows.map((l) => (
            <Link
              key={l.id}
              href={`/lists/${l.id}`}
              className="card-hover"
              style={{
                display: "block",
                padding: 18,
                background: "#ffffff",
                border: "1px solid var(--color-ink-100)",
                borderRadius: 10,
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--color-ink-800)",
                  }}
                >
                  {l.name}
                </div>
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    color: "var(--color-maroon-700)",
                    padding: "2px 8px",
                    background: "var(--color-blush-50)",
                    borderRadius: 999,
                  }}
                >
                  {l.memberCount} {l.memberCount === 1 ? "contact" : "contacts"}
                </span>
              </div>
              {l.description && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-ink-600)",
                    marginBottom: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {l.description}
                </div>
              )}
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-ink-400)",
                  marginTop: 8,
                }}
              >
                Updated {new Date(l.updatedAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
