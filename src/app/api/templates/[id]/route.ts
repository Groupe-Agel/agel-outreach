import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { extractVariables } from "@/lib/templates/compile";

const Body = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  subjectTpl: z.string().min(1),
  mjmlSource: z.string().min(1),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { name, description, subjectTpl, mjmlSource } = parsed.data;
  const variables = extractVariables(mjmlSource + " " + subjectTpl);
  await db
    .update(schema.templates)
    .set({
      name,
      description: description || null,
      subjectTpl,
      mjmlSource,
      variables,
      updatedAt: new Date(),
    })
    .where(eq(schema.templates.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  await db.delete(schema.templates).where(eq(schema.templates.id, id));
  return NextResponse.json({ ok: true });
}
