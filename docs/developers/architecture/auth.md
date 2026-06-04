# Authentication and Authorization

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

The app has two auth surfaces. The UI and internal API use NextAuth v5 with
the Google provider and a domain allowlist. The public REST API at
`/api/v1/*` uses bearer tokens minted at `/settings/api-tokens` and stored
hashed in the database.

## Why this exists

Mixing the two surfaces is the most common source of "401 in the browser"
bugs. Knowing which guard wraps which route prevents that.

## How it works

### UI / internal API (session)

- Provider: Google OAuth via `next-auth` v5 (`src/auth.ts`).
- Domain check: `AUTH_ALLOWED_DOMAINS` (comma-separated, default
  `groupe-agel.com`). Email outside the allowlist is rejected at sign-in.
- Dev bypass: `DEV_SKIP_AUTH=true` returns a fixed `dev@groupe-agel.com`
  session without contacting Google. Used by `local-setup.md`.
- Middleware: `src/middleware.ts` redirects unauthenticated requests to
  `/login`.

### Public REST (bearer)

- Endpoint: `POST /api/v1/campaigns/send` and friends under `/api/v1/*`.
- Header: `Authorization: Bearer agel_XXXXX`.
- Storage: hashed in the `api_token` table; the raw token is shown to the
  user once at creation time.
- Management UI: `/settings/api-tokens`.

### Internal: webhooks and cron

- `/api/webhooks/resend` verifies the Resend signature against
  `RESEND_WEBHOOK_SECRET`.
- `/api/cron/dispatch` requires the `x-cron-secret` header to match
  `CRON_SECRET`.

## Code references

- `src/auth.ts`
- `src/middleware.ts`
- `src/lib/auth-helpers.ts`
- `src/lib/api-token.ts`
- `src/app/api/api-tokens/[id]/`
- `src/app/api/v1/`
- `src/app/api/webhooks/resend/`
- `src/app/api/cron/dispatch/`

## Common tasks

- Add a route that requires a session: place it under `src/app/(app)/` or
  `src/app/api/` (the middleware covers both).
- Add a route that requires a bearer token: place it under
  `src/app/api/v1/` and call the token-check helper from
  `src/lib/api-token.ts`.

## Pitfalls

- `DEV_SKIP_AUTH=true` must be off in any deployed environment. The env
  validator in `src/lib/env.ts` is the last line of defense.
- API tokens are not scoped per user beyond ownership; revoke tokens
  rather than trying to limit their reach.
- Webhook signature failures should return `401`, not `500` — the latter
  causes Resend to retry indefinitely.

## Related docs

- [system-overview.md](system-overview.md)
- [../guides/sso-debug.md](../guides/sso-debug.md)
- [../guides/security-audit.md](../guides/security-audit.md)
- [../database/roles-permissions.md](../database/roles-permissions.md)
