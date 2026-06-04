import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import {
  compileMjml,
  renderTemplate,
  renderText,
} from "@/lib/templates/compile";
import { withAutoVars } from "@/lib/templates/auto-vars";

const Body = z.object({
  templateId: z.string().min(1),
  subjectTpl: z.string().optional().default(""),
  sampleData: z.record(z.string(), z.unknown()).default({}),
  autoVars: z
    .object({
      reply_to: z.string().default(""),
      from_name: z.string().default(""),
    })
    .optional(),
});

export async function POST(req: Request) {
  await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { templateId, subjectTpl, sampleData, autoVars } = parsed.data;
  const t = await db.query.templates.findFirst({
    where: eq(schema.templates.id, templateId),
  });
  if (!t) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const { html, errors } = await compileMjml(t.mjmlSource);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors.map((e) => e.formattedMessage).join("; ") },
      { status: 400 },
    );
  }
  const data = withAutoVars(sampleData, {
    reply_to: autoVars?.reply_to ?? "",
    from_name: autoVars?.from_name ?? "",
  });
  const rendered = renderTemplate(html, data);
  const subject = renderText(subjectTpl || t.subjectTpl, data);
  return NextResponse.json({ html: rendered, subject });
}
