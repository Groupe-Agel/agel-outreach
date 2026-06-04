# Scalability Guide

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

`agel-outreach` is tuned for AGEL-sized internal campaigns: low five-figure
recipient counts per campaign, single-digit campaigns per cron tick. This
doc states the current limits and where to push if they need to grow.

## Why this exists

The send pipeline is deliberately simple. Scaling it requires changes in
specific places; documenting those keeps the simplicity affordable.

## How it works

### Current bounds

- `dispatchPending()` picks at most five `SCHEDULED` campaigns per cron
  tick.
- Cron interval is operator-controlled (default suggestion: one minute).
- Send loop is sequential per campaign; recipients are processed one at
  a time.
- Resend SDK rate limits are not currently parallelized against.

### Where to push to scale

- Parallel recipients per campaign: introduce a worker pool around the
  send loop in `src/lib/send.ts` with a concurrency cap.
- Larger batch per tick: raise the limit in `dispatchPending()`; ensure
  the cron interval drops to match.
- Higher Resend throughput: request a higher rate limit in the Resend
  dashboard and tune the worker pool to stay within it.
- Faster DB writes: batch `send_log` inserts; the current
  one-insert-per-recipient is the easiest thing to optimize first.

## Code references

- `src/lib/send.ts`
- `src/app/api/cron/dispatch/`
- `src/lib/mail/`
- Schema: `src/lib/db/schema.ts`

## Common tasks

- Increase per-tick capacity: change the constant in
  `dispatchPending()` and time the resulting send window against the
  cron interval.
- Measure throughput: count `send_log` rows created in a one-minute
  window during a load test against Mailpit.

## Pitfalls

- Raising the per-tick cap without lowering the cron interval can
  cause overlapping dispatches; guard the dispatcher with a row-level
  lock if you do.
- The send loop is not idempotent on retry — a partial send followed
  by a re-dispatch double-sends to the recipients that already received
  a copy.

## Related docs

- [../architecture/email-pipeline.md](../architecture/email-pipeline.md)
- [../architecture/data-flow.md](../architecture/data-flow.md)
- [security-audit.md](security-audit.md)
- [../../operations/monitoring.md](../../operations/monitoring.md)
