# Data Flow

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

How a campaign moves from "user clicks send" to "recipient inbox" — the
request, the database writes, the outbound transport, and the asynchronous
webhook update of the send log.

## Why this exists

The send pipeline crosses the UI / internal-API / database / external-API
boundary several times. A single doc with the order of writes prevents
guessing.

## How it works

Send-now path:

1. UI submits `POST /api/campaigns/[id]/send` with the contact rows and the
   campaign settings.
2. Handler inserts the campaign row (status: `RUNNING`).
3. For each contact, handler compiles the template (MJML → HTML +
   Handlebars), writes a `send_log` row (status: `queued`), then hands the
   message to the transport.
4. Transport returns immediately on accept. The send log stays `queued`
   until a webhook updates it.
5. Resend → `POST /api/webhooks/resend` updates the matching `send_log`
   row to `delivered`, `opened`, `bounced`, or `complained`.

Schedule path:

1. UI submits `POST /api/campaigns/[id]/send` with `scheduledAt` in the
   future.
2. Handler inserts the campaign row (status: `SCHEDULED`).
3. Cron tick hits `POST /api/cron/dispatch`; `dispatchPending()` finds
   `SCHEDULED` campaigns whose `scheduledAt` is due and runs the same
   compile-and-send loop as the send-now path.

Public REST path (`POST /api/v1/campaigns/send`):

- Auth is a bearer token from `/settings/api-tokens` (not the session
  cookie).
- Same compile-and-send loop; same `send_log` writes; same webhook flow.

## Code references

- Send handler: `src/app/api/campaigns/[id]/send/`
- Public send: `src/app/api/v1/campaigns/send/`
- Webhook: `src/app/api/webhooks/resend/`
- Cron: `src/app/api/cron/dispatch/`
- Send helper: `src/lib/send.ts`
- Mail transports: `src/lib/mail/`
- Template compile: `src/lib/templates/compile.ts`
- Schema: `src/lib/db/schema.ts`

## Common tasks

- Add a new send-time validation: extend the schema in the handler and
  surface the error in the typed-confirm modal.
- Add a new webhook event: extend the switch in
  `src/app/api/webhooks/resend/` and map it to a new `send_log` status.

## Pitfalls

- A `send_log` row is created *before* the transport accepts the message.
  If the transport fails synchronously, the row must be marked `failed` in
  the same handler — there is no retry loop.
- Webhooks can arrive out of order. The handler should treat `opened`
  after `bounced` as a no-op, not as a regression.

## Related docs

- [system-overview.md](system-overview.md)
- [email-pipeline.md](email-pipeline.md)
- [../database/schema-overview.md](../database/schema-overview.md)
- [../database/audit.md](../database/audit.md)
