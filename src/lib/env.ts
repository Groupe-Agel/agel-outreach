import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16),
  AUTH_GOOGLE_ID: z.string().default(""),
  AUTH_GOOGLE_SECRET: z.string().default(""),
  AUTH_ALLOWED_DOMAINS: z.string().default("groupe-agel.com"),
  // Mail transport selection: "mailpit" / "smtp" use nodemailer against
  // SMTP_* settings; "resend" uses the Resend HTTP API.
  MAIL_TRANSPORT: z.enum(["mailpit", "smtp", "resend"]).default("mailpit"),
  RESEND_API_KEY: z.string().default(""),
  RESEND_FROM_DOMAIN: z.string().default("groupe-agel.com"),
  RESEND_DEFAULT_FROM_EMAIL: z.string().default("outreach@groupe-agel.com"),
  RESEND_WEBHOOK_SECRET: z.string().default(""),
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z
    .string()
    .default("1025")
    .transform((v) => Number.parseInt(v, 10)),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  CRON_SECRET: z.string().default(""),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEV_SKIP_AUTH: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

export const env = schema.parse(process.env);

export const allowedDomains = env.AUTH_ALLOWED_DOMAINS.split(",").map((s) =>
  s.trim().toLowerCase(),
);
