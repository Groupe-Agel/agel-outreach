# Glossary

> **Audience:** everyone
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

Shared vocabulary for `agel-outreach`. Use these terms in PRs, tickets, and
documentation; do not invent synonyms.

## Who uses it

Everyone — engineers, product, ops, and reviewers.

## What they can do

| Term | Meaning |
|---|---|
| Campaign | A single send-job: one template + one contact list, dispatched once. |
| Template | An MJML document with Handlebars `{{vars}}` and `{{#if}}` conditionals, edited in the Monaco editor at `/templates`. |
| Contact | One row from the uploaded JSON / CSV / Excel sheet. Provides the variables Handlebars resolves. |
| Send log | Per-recipient row tracking delivery, opens, bounces, and complaints for a campaign. |
| Test send | A campaign send addressed only to the current user, for previewing before going wide. |
| Scheduled campaign | A campaign with `scheduledAt` in the future; picked up by the cron dispatcher. |
| Cron dispatcher | `POST /api/cron/dispatch`, the endpoint that runs scheduled campaigns when their time comes. |
| API token | A bearer credential created at `/settings/api-tokens` for the public REST API at `/api/v1/*`. |
| Sender identity | The verified Resend domain plus the per-campaign `fromName` and `replyTo`. |
| Transport | The active mail backend — `mailpit`, `smtp`, or `resend`. |
| Mailpit | The local SMTP catch-all used in dev mode; UI at <http://localhost:8025>. |
| Domain allowlist | The comma-separated list in `AUTH_ALLOWED_DOMAINS` controlling which email domains can sign in. |

## Screenshots or flows

None — this page is reference text only.

## Related docs

- [project-status.md](project-status.md)
- [../product/feature-overview.md](../product/feature-overview.md)
