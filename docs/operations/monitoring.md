# Monitoring

> **Audience:** operations
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

Signals worth watching for `agel-outreach` in production: delivery
success rate from Resend, webhook ingest, cron dispatch heartbeat, and the
Next.js / Bun process on Clever Cloud.

## Who uses it

The on-call rota and anyone investigating a sending incident.

## What they can do

- Watch Resend's dashboard for delivery / bounce / complaint rates by
  domain.
- Confirm `/api/webhooks/resend` is receiving and persisting events.
- Confirm `/api/cron/dispatch` is being hit on its schedule and the
  `dispatchPending()` log line appears.
- Watch Clever Cloud app logs for `next start` boot lines and any
  Drizzle / Postgres error spam.

## Screenshots or flows

(Add dashboard screenshots or alert wiring here as they exist.)

## Related docs

- [deployment.md](deployment.md)
- [runbook.md](runbook.md)
- [../developers/architecture/email-pipeline.md](../developers/architecture/email-pipeline.md)
