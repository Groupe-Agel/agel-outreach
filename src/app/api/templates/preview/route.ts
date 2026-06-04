import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import {
  compileMjml,
  renderTemplate,
  renderText,
} from "@/lib/templates/compile";

const Body = z.object({
  mjmlSource: z.string(),
  subjectTpl: z.string().optional().default(""),
  sampleData: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: Request) {
  await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { mjmlSource, subjectTpl, sampleData } = parsed.data;
  const { html, errors } = await compileMjml(mjmlSource);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors.map((e) => e.formattedMessage).join("; ") },
      { status: 400 },
    );
  }
  const rendered = renderTemplate(html, sampleData);
  const subject = subjectTpl ? renderText(subjectTpl, sampleData) : "";
  return NextResponse.json({ html: rendered, subject });
}
