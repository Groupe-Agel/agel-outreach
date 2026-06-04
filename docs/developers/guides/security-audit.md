# Security Audit Checklist

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

What to check when reviewing a change that touches auth, secrets, the
public REST surface, or webhooks.

## Why this exists

These categories are the highest-blast-radius surfaces in the app; the
checklist makes review consistent and skipping a step visible.

## How it works

### Auth

- [ ] `DEV_SKIP_AUTH` is `false` in every deployed env.
- [ ] `AUTH_ALLOWED_DOMAINS` is set; no trailing whitespace per entry.
- [ ] `AUTH_SECRET` is unique per environment, set via env, never in
      source.
- [ ] Adding a new route under `src/app/(app)/` or `src/app/api/`
      (non-`v1`, non-webhook, non-cron): middleware coverage verified.

### Public REST (`/api/v1/*`)

- [ ] Endpoint checks the bearer token via `src/lib/api-token.ts`.
- [ ] Token is stored hashed; raw value never written to logs.
- [ ] The handler enforces ownership against the token's user.
- [ ] Response shape avoids internal-only fields.

### Webhooks (Resend)

- [ ] Signature verified against `RESEND_WEBHOOK_SECRET`.
- [ ] Bad signature returns `401`, not `500`.
- [ ] Handler tolerates out-of-order events.

### Cron

- [ ] `/api/cron/dispatch` requires `x-cron-secret` matching
      `CRON_SECRET`.
- [ ] In production, `CRON_SECRET` is set and non-empty.

### Secrets

- [ ] No `.env*` committed; `.env.example` is the only checked-in env
      file.
- [ ] API keys and signing secrets are read via `src/lib/env.ts`, not
      `process.env` ad hoc.

### Input handling

- [ ] Uploaded files go through `src/lib/parsers/` and are size-bounded.
- [ ] Zod schemas exist for every API body; rejections return `4xx`,
      not `500`.

## Code references

- `src/lib/env.ts`
- `src/lib/api-token.ts`
- `src/lib/parsers/`
- `src/app/api/webhooks/resend/`
- `src/app/api/cron/dispatch/`

## Common tasks

- Run the lint and typecheck steps before review: `bun run typecheck`
  and `bun run lint`.

## Pitfalls

- A signed-in session is not the same as ownership. Every handler that
  reads a record must filter by `userId`.
- The Mailpit transport accepts anything; production checks must not
  rely on Mailpit-only behavior.

## Related docs

- [../architecture/auth.md](../architecture/auth.md)
- [../api/reference.md](../api/reference.md)
- [scalability.md](scalability.md)
- [../database/roles-permissions.md](../database/roles-permissions.md)
