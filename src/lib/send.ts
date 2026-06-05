import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  compileMjml,
  renderTemplate,
  renderText,
} from "@/lib/templates/compile";
import { withAutoVars } from "@/lib/templates/auto-vars";
import {
  createUserSmtpTransport,
  getTransport,
  type MailMessage,
  type Transport,
} from "@/lib/mail/transport";
import { decryptSecret } from "@/lib/secret-crypto";
import { env } from "@/lib/env";

export type DispatchResult = {
  sent: number;
  failed: number;
};

const BATCH_SIZE = 100;

type UserSmtp = Pick<
  typeof schema.users.$inferSelect,
  | "smtpHost"
  | "smtpPort"
  | "smtpSecure"
  | "smtpUser"
  | "smtpPassEncrypted"
  | "smtpFromEmail"
  | "email"
>;

type SmtpConfigRow = typeof schema.smtpConfigs.$inferSelect;

function userSmtpReady(u: UserSmtp): boolean {
  return Boolean(u.smtpHost && u.smtpPort && u.smtpUser && u.smtpPassEncrypted);
}

async function loadDefaultSmtpConfig(userId: string): Promise<SmtpConfigRow | null> {
  const row = await db.query.smtpConfigs.findFirst({
    where: and(
      eq(schema.smtpConfigs.userId, userId),
      eq(schema.smtpConfigs.isDefault, true),
    ),
  });
  if (row) return row;
  // No explicit default — fall back to most recently created.
  return (
    (await db.query.smtpConfigs.findFirst({
      where: eq(schema.smtpConfigs.userId, userId),
    })) ?? null
  );
}

async function loadSmtpConfigForUser(
  configId: string,
  userId: string,
): Promise<SmtpConfigRow | null> {
  return (
    (await db.query.smtpConfigs.findFirst({
      where: and(
        eq(schema.smtpConfigs.id, configId),
        eq(schema.smtpConfigs.userId, userId),
      ),
    })) ?? null
  );
}

function buildFromForConfig(fromName: string, c: SmtpConfigRow): string {
  return `${fromName} <${c.fromEmail || c.smtpUser}>`;
}

function buildFromForLegacyUser(fromName: string, u: UserSmtp | null): string {
  const addr =
    u && userSmtpReady(u)
      ? u.smtpFromEmail || u.smtpUser || u.email
      : env.RESEND_DEFAULT_FROM_EMAIL;
  return `${fromName} <${addr}>`;
}

function transportFromConfig(c: SmtpConfigRow): Transport {
  return createUserSmtpTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    user: c.smtpUser,
    pass: decryptSecret(c.passEncrypted),
  });
}

function transportFromLegacyUser(u: UserSmtp | null): Transport {
  if (u && userSmtpReady(u)) {
    return createUserSmtpTransport({
      host: u.smtpHost!,
      port: u.smtpPort!,
      secure: Boolean(u.smtpSecure),
      user: u.smtpUser!,
      pass: decryptSecret(u.smtpPassEncrypted!),
    });
  }
  if (env.NODE_ENV === "production") {
    throw new Error(
      "No SMTP configured for this user. Configure your mailbox in Settings → Mail server before sending.",
    );
  }
  // Dev/test: fall back to env transport so mailpit and friends keep working.
  return getTransport();
}

async function resolveSendingChannel(
  userId: string,
  legacyUser: UserSmtp | null,
  fromName: string,
  smtpConfigId?: string | null,
): Promise<{ transport: Transport; fromAddress: string }> {
  if (smtpConfigId) {
    const explicit = await loadSmtpConfigForUser(smtpConfigId, userId);
    if (explicit) {
      return {
        transport: transportFromConfig(explicit),
        fromAddress: buildFromForConfig(fromName, explicit),
      };
    }
    // Fall through if the explicit config was deleted between save and send.
  }
  const cfg = await loadDefaultSmtpConfig(userId);
  if (cfg) {
    return {
      transport: transportFromConfig(cfg),
      fromAddress: buildFromForConfig(fromName, cfg),
    };
  }
  return {
    transport: transportFromLegacyUser(legacyUser),
    fromAddress: buildFromForLegacyUser(fromName, legacyUser),
  };
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

  const owner = await db.query.users.findFirst({
    where: eq(schema.users.id, c.createdById),
  });
  let transport: Transport;
  let fromAddress: string;
  try {
    const channel = await resolveSendingChannel(
      c.createdById,
      owner ?? null,
      c.fromName,
      c.smtpConfigId,
    );
    transport = channel.transport;
    fromAddress = channel.fromAddress;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.campaigns)
      .set({ status: "FAILED", completedAt: new Date() })
      .where(eq(schema.campaigns.id, campaignId));
    throw new Error(message);
  }

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
        from: fromAddress,
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
  userId?: string;
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
  const owner = opts.userId
    ? await db.query.users.findFirst({ where: eq(schema.users.id, opts.userId) })
    : null;
  const channel = opts.userId
    ? await resolveSendingChannel(opts.userId, owner ?? null, opts.fromName)
    : {
        transport: transportFromLegacyUser(owner ?? null),
        fromAddress: buildFromForLegacyUser(opts.fromName, owner ?? null),
      };
  const result = await channel.transport.send({
    from: channel.fromAddress,
    to: opts.toEmail,
    replyTo: opts.replyTo,
    subject: "[TEST] " + renderText(opts.subjectTpl, data),
    html: renderTemplate(htmlTpl, data),
  });
  if (result.error) throw new Error(result.error);
  return { id: result.id };
}

