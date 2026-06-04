# Email Pipeline

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

The mail subsystem under `src/lib/mail/` exposes one transport interface
with three backends — `mailpit`, generic `smtp`, and `resend`. The active
backend is chosen by `MAIL_TRANSPORT`. The send pipeline writes a
`send_log` row before handing the message to the transport, and the Resend
webhook updates that row asynchronously.

## Why this exists

Local dev must not hit production Resend. The transport abstraction makes
that swap a one-line env change instead of an in-code toggle.

## How it works

```
Send handler
  │
  ▼
src/lib/send.ts ── compile template ─► HTML + subject
  │
  ▼
src/lib/mail/<transport>.ts ── send ─► provider (Mailpit / SMTP / Resend)
  │
  ▼
INSERT send_log (status: queued)

[Async] /api/webhooks/resend
  ─► UPDATE send_log SET status = delivered | opened | bounced | complained
```

Transport selection at boot:

- `MAIL_TRANSPORT=mailpit` → nodemailer pointed at
  `SMTP_HOST:SMTP_PORT` (default `127.0.0.1:1025`).
- `MAIL_TRANSPORT=smtp` → same nodemailer code path, any SMTP server.
- `MAIL_TRANSPORT=resend` → Resend SDK using `RESEND_API_KEY`.

## Code references

- Send entry: `src/lib/send.ts`
- Transports: `src/lib/mail/`
- Resend client: `src/lib/mail/` (see the file selected by transport)
- Webhook: `src/app/api/webhooks/resend/`
- Cron: `src/app/api/cron/dispatch/`
- Schema: `src/lib/db/schema.ts` (`campaign`, `send_log`)

## Common tasks

- Add a new event from Resend: extend the webhook handler switch and add
  a status case to `send_log`.
- Add a new transport: implement the existing transport interface under
  `src/lib/mail/` and register it in the boot-time selector.

## Pitfalls

- The `RESEND_FROM_DOMAIN` setting is informational only — the actual
  `from` address is `RESEND_DEFAULT_FROM_EMAIL`.
- The send loop is not idempotent on retry. If the transport accepts the
  message but the DB write fails afterward, you get a sent email with no
  `send_log` row.
- Mailpit's SMTP port is `1025`. Do not change it to `25` in `.env.local`.

## Related docs

- [data-flow.md](data-flow.md)
- [system-overview.md](system-overview.md)
- [templating.md](templating.md)
- [../api/resend-external-api.md](../api/resend-external-api.md)
- [../../operations/runbook.md](../../operations/runbook.md)
