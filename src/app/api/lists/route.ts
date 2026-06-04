import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactLists, contactListMembers } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { normalizeContacts } from "@/lib/parsers";

const CreateBody = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  contacts: z.array(z.record(z.string(), z.unknown())).min(1),
});

export async function GET() {
  const me = await requireUser();
  const rows = await db
    .select({
      id: contactLists.id,
      name: contactLists.name,
      description: contactLists.description,
      createdAt: contactLists.createdAt,
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

  return NextResponse.json({ lists: rows });
}

export async function POST(req: Request) {
  const me = await requireUser();
  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const { name, description, contacts } = parsed.data;

  const normalized = normalizeContacts(contacts);
  if (normalized.rows.length === 0) {
    return NextResponse.json(
      { error: "No contacts with a valid email were found." },
      { status: 400 },
    );
  }

  const [list] = await db
    .insert(contactLists)
    .values({
      name,
      description: description || null,
      createdById: me.id,
    })
    .returning();

  // Deduplicate by email within the upload before inserting.
  const seen = new Set<string>();
  const members: { listId: string; email: string; mergeData: Record<string, unknown> }[] = [];
  for (const c of normalized.rows) {
    if (seen.has(c.email)) continue;
    seen.add(c.email);
    const { email, ...rest } = c;
    members.push({ listId: list.id, email, mergeData: rest });
  }

  if (members.length > 0) {
    await db.insert(contactListMembers).values(members);
  }

  return NextResponse.json({
    id: list.id,
    memberCount: members.length,
    skipped: normalized.errors.length,
  });
}
