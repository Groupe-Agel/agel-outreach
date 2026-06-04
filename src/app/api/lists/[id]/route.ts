import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactLists, contactListMembers } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireUser();
  const { id } = await params;

  const list = await db.query.contactLists.findFirst({
    where: and(
      eq(contactLists.id, id),
      eq(contactLists.createdById, me.id),
    ),
  });
  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const members = await db
    .select({
      id: contactListMembers.id,
      email: contactListMembers.email,
      mergeData: contactListMembers.mergeData,
    })
    .from(contactListMembers)
    .where(eq(contactListMembers.listId, id))
    .orderBy(asc(contactListMembers.email));

  return NextResponse.json({ list, members });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireUser();
  const { id } = await params;

  const list = await db.query.contactLists.findFirst({
    where: and(
      eq(contactLists.id, id),
      eq(contactLists.createdById, me.id),
    ),
    columns: { id: true },
  });
  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  await db.delete(contactLists).where(eq(contactLists.id, id));
  return NextResponse.json({ ok: true });
}
