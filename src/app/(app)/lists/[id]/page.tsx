import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactLists, contactListMembers } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListDetail } from "@/components/ListDetail";

export default async function ContactListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;

  const list = await db.query.contactLists.findFirst({
    where: and(
      eq(contactLists.id, id),
      eq(contactLists.createdById, me.id),
    ),
  });
  if (!list) notFound();

  const members = await db
    .select({
      id: contactListMembers.id,
      email: contactListMembers.email,
      mergeData: contactListMembers.mergeData,
    })
    .from(contactListMembers)
    .where(eq(contactListMembers.listId, id))
    .orderBy(asc(contactListMembers.email));

  return (
    <div>
      <PageHeader
        eyebrow="Audiences"
        title={list.name}
        subtitle={list.description ?? `${members.length} contact${members.length === 1 ? "" : "s"}`}
      />
      <ListDetail
        list={{
          id: list.id,
          name: list.name,
          description: list.description,
          memberCount: members.length,
        }}
        members={members.map((m) => ({
          id: m.id,
          email: m.email,
          mergeData: (m.mergeData ?? {}) as Record<string, unknown>,
        }))}
      />
    </div>
  );
}
