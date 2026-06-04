import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashToken } from "@/lib/api-token";
import { sendCampaign } from "@/lib/send";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  templateId: z.string().min(1),
  subjectTpl: z.string().min(1),
  fromName: z.string().min(1),
  replyTo: z.string().email(),
  scheduledAt: z.string().datetime().optional(),
  contacts: z.array(z.record(z.string(), z.unknown())).min(1),
});

async function authenticate(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const hash = hashToken(m[1]);
  const tok = await db.query.apiTokens.findFirst({
    where: eq(schema.apiTokens.tokenHash, hash),
  });
  if (!tok || tok.revokedAt) return null;
  await db
    .update(schema.apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiTokens.id, tok.id));
  return tok;
}

export async function POST(req: Request) {
  const tok = await authenticate(req);
  if (!tok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

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

  // Validate every contact has an email
  for (let i = 0; i < body.contacts.length; i++) {
    if (typeof body.contacts[i].email !== "string") {
      return NextResponse.json(
        { error: `contacts[${i}] missing string email` },
        { status: 400 },
      );
    }
  }

  const fromEmail = `${body.fromName} <${env.RESEND_DEFAULT_FROM_EMAIL}>`;
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

  const [campaign] = await db
    .insert(schema.campaigns)
    .values({
      name: template.name + " (API)",
      templateId: template.id,
      subjectTpl: body.subjectTpl,
      fromName: body.fromName,
      fromEmail,
      replyTo: body.replyTo,
      scheduledAt,
      status: scheduledAt && scheduledAt > new Date() ? "SCHEDULED" : "SCHEDULED",
      totalCount: body.contacts.length,
      createdById: tok.createdById,
    })
    .returning({ id: schema.campaigns.id });

  await db.insert(schema.recipients).values(
    body.contacts.map((c) => ({
      campaignId: campaign.id,
      email: String(c.email),
      mergeData: c,
      status: "QUEUED" as const,
    })),
  );

  if (!scheduledAt || scheduledAt <= new Date()) {
    try {
      const result = await sendCampaign(campaign.id);
      return NextResponse.json({ campaignId: campaign.id, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { campaignId: campaign.id, error: msg },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    campaignId: campaign.id,
    scheduled: true,
    scheduledAt,
  });
}
