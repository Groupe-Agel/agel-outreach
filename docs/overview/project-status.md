# Project Status

> **Audience:** everyone
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

Where `agel-outreach` is right now — what is shipped, what is in flight, and
what is explicitly out of scope.

## Who uses it

New joiners, stakeholders deciding whether a feature already exists, and
reviewers checking whether a request fits the current scope.

## What they can do

### Shipped

- Template editor (MJML + Handlebars + Monaco) at `/templates`.
- Campaigns flow at `/campaigns`: upload contacts, preview with row picker,
  test-send-to-self, typed-confirm modal, send-now or schedule-for-later.
- Per-recipient send log driven by Resend webhooks.
- REST API at `/api/v1/campaigns/send` with token auth managed at
  `/settings/api-tokens`.
- Cron dispatcher at `/api/cron/dispatch` for scheduled campaigns.
- Google SSO with domain allowlist; `DEV_SKIP_AUTH=true` bypass for local
  development.
- Mailpit transport for local dev, Resend transport for production.

### In flight

- (Track here. Keep this list short — point at a doc in
  `../history/decisions/plans/` for detail.)

### Out of scope (deliberate gaps)

- No per-user sender identity; one verified domain plus per-campaign
  `fromName` and `replyTo`.
- No attachments, no click tracking, no recurring sends, no A/B testing.
- The `RESEND_FROM_DOMAIN` setting is informational — actual sending uses
  `RESEND_DEFAULT_FROM_EMAIL` directly.
- The current `dispatchPending()` handles up to five campaigns per cron
  tick; high-volume batching (>100 / sec) is future work.

## Screenshots or flows

None — see [../product/feature-overview.md](../product/feature-overview.md)
for visuals.

## Related docs

- [glossary.md](glossary.md)
- [../product/feature-overview.md](../product/feature-overview.md)
- [../history/changelog/README.md](../history/changelog/README.md)
