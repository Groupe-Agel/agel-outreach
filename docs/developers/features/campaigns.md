# Campaigns

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

The campaigns feature lets a user pick a saved template, upload a contact
list, preview a few rows, send a test to themselves, then send or
schedule the campaign. Per-recipient delivery status fills in as Resend
webhooks arrive.

## Why this exists

Campaigns are the core flow of the app. Templates and API tokens exist to
serve this screen.

## How it works

- UI route: `src/app/(app)/campaigns/`.
- Send action: `POST /api/campaigns/[id]/send`.
- Test send: `POST /api/campaigns/[id]/test`.
- Public REST: `POST /api/v1/campaigns/send` (bearer token).
- Status updates: `POST /api/webhooks/resend` updates `send_log`.

## Code references

- UI: `src/app/(app)/campaigns/`
- Internal API: `src/app/api/campaigns/`
- Public REST: `src/app/api/v1/campaigns/send/`
- Send helper: `src/lib/send.ts`
- Schema: `src/lib/db/schema.ts` (`campaign`, `send_log`)
- Mockup sibling: [campaigns.html](campaigns.html)

## Common tasks

- Add a new send-time field (e.g., a custom header): extend the Zod
  schema in the handler, the form on the UI, and the schema column if
  the field must be persisted.

## Pitfalls

- The typed-confirm modal exists because the send action is irreversible.
  Do not bypass it for "convenience".
- The `(app)` route group requires a session; the `/api/v1/` send path
  does not. Test both.

## Related docs

- [templates.md](templates.md)
- [api-tokens.md](api-tokens.md)
- [../architecture/data-flow.md](../architecture/data-flow.md)
- [../architecture/email-pipeline.md](../architecture/email-pipeline.md)
- [../../product/user-flows.md](../../product/user-flows.md)
