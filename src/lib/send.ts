import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  compileMjml,
  renderTemplate,
  renderText,
} from "@/lib/templates/compile";
import { withAutoVars } from "@/lib/templates/auto-vars";
import { getTransport, type MailMessage } from "@/lib/mail/transport";
import { env } from "@/lib/env";

export type DispatchResult = {
  sent: number;
  failed: number;
};

const BATCH_SIZE = 100;

function buildFrom(fromName: string): string {
  return `${fromName} <${env.RESEND_DEFAULT_FROM_EMAIL}>`;
}

export async function sendCampaign(campaignId: string): Promise<DispatchResult> {
  const [c] = await db
    .update(schema.campaigns)
    .set({ status: "SENDING", startedAt: new Date() })
    .where(eq(schema.campaigns.id, campaignId))
    .returning();
  if (!c) throw new Error(`Campaign ${campaignId} not found`);

  const template = await db.query.templates.findFirst({
    where: eq(schema.templates.id, c.templateId),
  });
  if (!template) {
    await db
      .update(schema.campaigns)
      .set({ status: "FAILED", completedAt: new Date() })
      .where(eq(schema.campaigns.id, campaignId));
    throw new Error("Template not found");
  }

  const { html: htmlTpl, errors: mjmlErrors } = await compileMjml(
    template.mjmlSource,
  );
  if (mjmlErrors.length > 0) {
    await db
      .update(schema.campaigns)
      .set({ status: "FAILED", completedAt: new Date() })
      .where(eq(schema.campaigns.id, campaignId));
    throw new Error(
      "MJML compile errors: " +
        mjmlErrors.map((e) => e.formattedMessage).join("; "),
    );
  }

  const queued = await db.query.recipients.findMany({
    where: and(
      eq(schema.recipients.campaignId, campaignId),
      eq(schema.recipients.status, "QUEUED"),
    ),
  });

  const transport = getTransport();
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < queued.length; i += BATCH_SIZE) {
    const slice = queued.slice(i, i + BATCH_SIZE);
    const payload: MailMessage[] = slice.map((r) => {
      const data = withAutoVars(
        (r.mergeData ?? {}) as Record<string, unknown>,
        { reply_to: c.replyTo, from_name: c.fromName },
      );
      return {
        from: buildFrom(c.fromName),
        to: r.email,
        replyTo: c.replyTo,
        subject: renderText(c.subjectTpl, data),
        html: renderTemplate(htmlTpl, data),
        headers: {
          "X-Campaign-Id": c.id,
          "X-Recipient-Id": r.id,
        },
      };
    });

    const results = await transport.sendMany(payload);

    for (let j = 0; j < slice.length; j++) {
      const r = slice[j];
      const result = results[j];
      if (result.id && !result.error) {
        await db
          .update(schema.recipients)
          .set({
            status: "SENT",
            resendId: result.id,
            sentAt: new Date(),
          })
          .where(eq(schema.recipients.id, r.id));
        sent++;
      } else {
        await db
          .update(schema.recipients)
          .set({
            status: "FAILED",
            errorMessage: result.error ?? "Unknown send error",
          })
          .where(eq(schema.recipients.id, r.id));
        failed++;
      }
    }
  }

  await db
    .update(schema.campaigns)
    .set({
      status: failed === queued.length && queued.length > 0 ? "FAILED" : "SENT",
      sentCount: sent,
      failedCount: failed,
      completedAt: new Date(),
    })
    .where(eq(schema.campaigns.id, campaignId));

  return { sent, failed };
}

/**
 * Picks up SCHEDULED campaigns whose `scheduledAt` is due (or null) and sends
 * them. Called by /api/cron/dispatch on a schedule, and also fire-and-forget
 * from the UI "send now" endpoint to kick off immediately.
 */
export async function dispatchPending(limit = 5): Promise<{ processed: number }> {
  const now = new Date();
  const pending = await db
    .select({ id: schema.campaigns.id })
    .from(schema.campaigns)
    .where(
      and(
        eq(schema.campaigns.status, "SCHEDULED"),
        or(
          isNull(schema.campaigns.scheduledAt),
          lte(schema.campaigns.scheduledAt, now),
        ),
      ),
    )
    .limit(limit);

  let processed = 0;
  for (const c of pending) {
    try {
      await sendCampaign(c.id);
      processed++;
    } catch (err) {
      console.error("dispatch failed for campaign", c.id, err);
    }
  }
  return { processed };
}

/**
 * Test-send-to-self: render the template with sample data and send one email
 * to the user's own address. Does NOT enqueue real recipients.
 */
export async function testSendToSelf(opts: {
  templateId: string;
  subjectTpl: string;
  fromName: string;
  replyTo: string;
  sampleData: Record<string, unknown>;
  toEmail: string;
}): Promise<{ id: string | null }> {
  const template = await db.query.templates.findFirst({
    where: eq(schema.templates.id, opts.templateId),
  });
  if (!template) throw new Error("Template not found");

  const { html: htmlTpl, errors } = await compileMjml(template.mjmlSource);
  if (errors.length > 0) {
    throw new Error(
      "MJML compile errors: " + errors.map((e) => e.formattedMessage).join("; "),
    );
  }

  const data = withAutoVars(opts.sampleData, {
    reply_to: opts.replyTo,
    from_name: opts.fromName,
  });
  const transport = getTransport();
  const result = await transport.send({
    from: buildFrom(opts.fromName),
    to: opts.toEmail,
    replyTo: opts.replyTo,
    subject: "[TEST] " + renderText(opts.subjectTpl, data),
    html: renderTemplate(htmlTpl, data),
  });
  if (result.error) throw new Error(result.error);
  return { id: result.id };
}

