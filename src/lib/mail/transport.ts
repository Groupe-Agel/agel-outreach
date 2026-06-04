import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { env } from "@/lib/env";

export type MailMessage = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
};

export type SendResult = {
  id: string | null;
  error?: string;
};

export interface Transport {
  send(msg: MailMessage): Promise<SendResult>;
  sendMany(msgs: MailMessage[]): Promise<SendResult[]>;
  readonly name: string;
}

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
};

class SmtpTransport implements Transport {
  readonly name: string;
  private mailer: Transporter;

  constructor(config?: SmtpConfig) {
    if (config) {
      this.name = "smtp";
      this.mailer = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth:
          config.user && config.pass
            ? { user: config.user, pass: config.pass }
            : undefined,
      });
      return;
    }
    this.name = env.MAIL_TRANSPORT === "mailpit" ? "mailpit" : "smtp";
    this.mailer = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }

  async verify(): Promise<void> {
    await this.mailer.verify();
  }

  async send(msg: MailMessage): Promise<SendResult> {
    try {
      const info = await this.mailer.sendMail({
        from: msg.from,
        to: msg.to,
        replyTo: msg.replyTo,
        subject: msg.subject,
        html: msg.html,
        headers: msg.headers,
      });
      return { id: info.messageId ?? null };
    } catch (err) {
      return {
        id: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async sendMany(msgs: MailMessage[]): Promise<SendResult[]> {
    // SMTP has no native batch — send sequentially over a single connection.
    const out: SendResult[] = [];
    for (const m of msgs) out.push(await this.send(m));
    return out;
  }
}

class ResendTransport implements Transport {
  readonly name = "resend";
  private resend: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error(
        "MAIL_TRANSPORT=resend but RESEND_API_KEY is empty. Set it in .env.local.",
      );
    }
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  async send(msg: MailMessage): Promise<SendResult> {
    try {
      const result = await this.resend.emails.send({
        from: msg.from,
        to: [msg.to],
        replyTo: msg.replyTo,
        subject: msg.subject,
        html: msg.html,
        headers: msg.headers,
      });
      const id = (result as { data?: { id?: string } }).data?.id ?? null;
      return { id };
    } catch (err) {
      return {
        id: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async sendMany(msgs: MailMessage[]): Promise<SendResult[]> {
    // Resend batch API: up to 100 per call.
    try {
      const result = await this.resend.batch.send(
        msgs.map((m) => ({
          from: m.from,
          to: [m.to],
          replyTo: m.replyTo,
          subject: m.subject,
          html: m.html,
          headers: m.headers,
        })),
      );
      const data = (result as { data?: { data?: Array<{ id: string }> } }).data
        ?.data;
      return msgs.map((_, i) => {
        const id = data?.[i]?.id;
        return id ? { id } : { id: null, error: "No id returned by Resend" };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return msgs.map(() => ({ id: null, error: msg }));
    }
  }
}

let _transport: Transport | null = null;

export function getTransport(): Transport {
  if (_transport) return _transport;
  if (env.MAIL_TRANSPORT === "resend") {
    _transport = new ResendTransport();
  } else {
    _transport = new SmtpTransport();
  }
  return _transport;
}

// For tests + hot-reload scenarios.
export function resetTransport() {
  _transport = null;
}

/**
 * Builds a one-off SMTP transport from explicit credentials. Used to send a
 * campaign through the credentials of the user who created it, instead of the
 * env-wide default. Caller is responsible for keeping its own reference; this
 * does NOT touch the module-level singleton.
 */
export function createUserSmtpTransport(config: SmtpConfig): SmtpTransport {
  return new SmtpTransport(config);
}
