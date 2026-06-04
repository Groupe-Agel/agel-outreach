import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth-helpers";
import { extractVariables } from "@/lib/templates/compile";

const Body = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  subjectTpl: z.string().min(1),
  mjmlSource: z.string().min(1),
});

export async function GET() {
  await requireUser();
  const rows = await db
    .select()
    .from(schema.templates)
    .orderBy(desc(schema.templates.updatedAt));
  return NextResponse.json({ templates: rows });
}

export async function POST(req: Request) {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { name, description, subjectTpl, mjmlSource } = parsed.data;
  const variables = extractVariables(mjmlSource + " " + subjectTpl);
  const [t] = await db
    .insert(schema.templates)
    .values({
      name,
      description: description || null,
      subjectTpl,
      mjmlSource,
      variables,
      createdById: user.id,
    })
    .returning({ id: schema.templates.id });
  return NextResponse.json({ id: t.id });
}
