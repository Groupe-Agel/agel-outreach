# Controllers Overview

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

How HTTP route handlers are organized in `src/app/api/` — which folder
holds which responsibility, where validation lives, and where shared
helpers sit.

## Why this exists

App Router collocates handlers with routes, which makes "where does this
endpoint live" a navigation question instead of a search question — but
only if the layout convention is documented.

## How it works

- `src/app/api/auth/[...nextauth]/` — NextAuth catch-all.
- `src/app/api/parse/` — file upload normalization.
- `src/app/api/templates/` — template CRUD plus preview and test-send.
- `src/app/api/campaigns/` — campaign actions, including
  `[id]/send` and `[id]/test`.
- `src/app/api/v1/campaigns/send/` — public REST send.
- `src/app/api/webhooks/resend/` — Resend webhook ingest.
- `src/app/api/cron/dispatch/` — cron entry point for scheduled
  campaigns.
- `src/app/api/api-tokens/[id]/` — API token revoke.
- `src/app/api/profile/`, `src/app/api/users/` — read-only user data.

Each `route.ts` handler is thin: it validates the request body with Zod,
calls into a `src/lib/*` helper, and shapes the response.

## Code references

- Handlers: `src/app/api/**/route.ts`
- Validation: Zod schemas alongside each handler
- Shared logic: `src/lib/send.ts`, `src/lib/api-token.ts`,
  `src/lib/auth-helpers.ts`
- Parsers: `src/lib/parsers/`

## Common tasks

- Add a new endpoint: create a `route.ts` under the matching folder,
  define a Zod body schema, call into `src/lib/*`.
- Move logic out of a handler: extract into `src/lib/*` so it can be
  unit-tested.

## Pitfalls

- Do not put DB calls directly in `route.ts`; route those through
  `src/lib/*` so the handler stays mockable.
- The session shape comes from `auth-helpers.ts` — do not re-derive it
  in each handler.

## Related docs

- [reference.md](reference.md)
- [route-card.md](route-card.md)
- [../architecture/system-overview.md](../architecture/system-overview.md)
