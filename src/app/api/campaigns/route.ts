import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth-helpers";
import { env } from "@/lib/env";

const Body = z.object({
  templateId: z.string().min(1),
  name: z.string().optional(),
  subjectTpl: z.string().min(1),
  fromName: z.string().min(1),
  replyTo: z.string().email(),
  scheduledAt: z.string().datetime().optional(),
  contacts: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "At least one contact is required"),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const body = parsed.data;

  const template = await db.query.templates.findFirst({
    where: eq(schema.templates.id, body.templateId),
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const fromEmail = `${body.fromName} <${env.RESEND_DEFAULT_FROM_EMAIL}>`;
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

  const [campaign] = await db
    .insert(schema.campaigns)
    .values({
      name: body.name ?? template.name,
      templateId: template.id,
      subjectTpl: body.subjectTpl,
      fromName: body.fromName,
      fromEmail,
      replyTo: body.replyTo,
      scheduledAt,
      status: "DRAFT",
      totalCount: body.contacts.length,
      createdById: user.id,
    })
    .returning({ id: schema.campaigns.id });

  // Insert recipients
  await db.insert(schema.recipients).values(
    body.contacts.map((c) => ({
      campaignId: campaign.id,
      email: String(c.email),
      mergeData: c,
      status: "QUEUED" as const,
    })),
  );

  return NextResponse.json({ id: campaign.id });
}
