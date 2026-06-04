# Resend External API

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

`agel-outreach` talks to <https://resend.com> for production sending and
for webhook-driven delivery tracking. The Resend SDK is called from the
`resend` transport in `src/lib/mail/`; Resend calls back to
`/api/webhooks/resend`.

## Why this exists

Resend's terms (one verified domain, hashed API key, signed webhooks)
shape several local choices: the env-var split, the schema for
`send_log`, and the `401`-not-`500` rule on signature mismatch.

## How it works

### Outbound

- Auth: `RESEND_API_KEY` (server-only).
- Domain: must be verified in the Resend dashboard with SPF / DKIM /
  DMARC records on the registrar.
- From: the actual `from` is `RESEND_DEFAULT_FROM_EMAIL`. The
  `RESEND_FROM_DOMAIN` env var is informational only.
- Per-campaign overrides: `fromName` and `replyTo`.

### Inbound webhooks

- Endpoint: `POST /api/webhooks/resend`.
- Subscribed events: `email.delivered`, `email.opened`, `email.bounced`,
  `email.complained`.
- Signing secret: `RESEND_WEBHOOK_SECRET`.
- Response: `401` on signature mismatch, `200` on accept.

## Code references

- Transport: `src/lib/mail/` (the file selected when
  `MAIL_TRANSPORT=resend`)
- Webhook handler: `src/app/api/webhooks/resend/`
- Env: `src/lib/env.ts`

## Common tasks

- Verify a new sending domain: add it in the Resend dashboard, copy the
  three DNS records to the registrar, wait for verified.
- Rotate the API key: generate a new key in Resend, set
  `RESEND_API_KEY` in the deployed env, redeploy.

## Pitfalls

- A `5xx` from the webhook handler triggers Resend retries that pile up
  fast; always return `401` for a bad signature.
- Resend rate limits — the current `dispatchPending()` caps at five
  campaigns per cron tick to stay well below them.

## Related docs

- [reference.md](reference.md)
- [../architecture/email-pipeline.md](../architecture/email-pipeline.md)
- [../../operations/deployment.md](../../operations/deployment.md)
- [../../operations/runbook.md](../../operations/runbook.md)
