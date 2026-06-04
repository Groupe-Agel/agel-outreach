# Local Setup

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** current

## Summary

Bring `agel-outreach` up on a developer machine with Postgres for storage and
Mailpit as a local SMTP inbox. With `DEV_SKIP_AUTH=true` and
`MAIL_TRANSPORT=mailpit` (both set in the example env) the app boots without
Google SSO and without hitting Resend, so neither account is required to
build, preview templates, or exercise the campaigns flow end-to-end.

## Why this exists

Resend, Google OAuth, and DNS configuration are deployment concerns, not
development concerns. Locally, every email goes to Mailpit on
<http://localhost:8025> and `dev@groupe-agel.com` is the session user. This
doc covers everything needed to reach the campaigns screen and send a fake
email; production wiring lives in
[../operations/deployment.md](../operations/deployment.md).

## How it works

### 1. Postgres

Local dev assumes a Postgres instance reachable as `root`. The default
`DATABASE_URL` is:

```
postgresql://root@localhost:5432/agel_outreach?schema=public
```

Create the database:

```bash
psql -U root -d postgres -c "CREATE DATABASE agel_outreach;"
```

### 2. Install dependencies

```bash
bun install
brew install mailpit          # one-time, if not already installed
```

### 3. Environment

```bash
cp .env.example .env.local
```

The example file already sets `DEV_SKIP_AUTH=true` and
`MAIL_TRANSPORT=mailpit`. Leave them alone for local work.

### 4. Schema

```bash
bun run db:generate
bun run db:migrate
```

`db:generate` regenerates SQL only when `src/lib/db/schema.ts` changes;
`db:migrate` applies the latest file under `drizzle/`.

### 5. Run Mailpit and the dev server

In two terminals:

```bash
bun run mailpit               # SMTP on :1025, UI on http://localhost:8025
bun run dev                   # Next.js on http://localhost:3000
```

Open <http://localhost:3000> — with `DEV_SKIP_AUTH=true` you land straight
on `/campaigns`. Open <http://localhost:8025> to inspect every email the app
sends.

## Code references

- Env validation: `src/lib/env.ts`
- Auth bypass: `src/auth.ts`, `src/middleware.ts`
- Mailpit / SMTP transport: `src/lib/mail/`
- DB connection: `src/lib/db/index.ts`
- Schema: `src/lib/db/schema.ts`
- Drizzle config: `drizzle.config.ts`
- Migration scripts: `drizzle/`

## Common tasks

```bash
bun run dev           # dev server
bun run build         # production build
bun run start         # production server (after build)
bun run typecheck     # tsc --noEmit
bun run lint          # eslint
bun run test          # vitest
bun run db:generate   # generate SQL migration from schema diff
bun run db:migrate    # apply latest migration
bun run db:studio     # drizzle-kit studio
```

## Pitfalls

- If `psql -U root` fails, the local Postgres role is not `root`. Either
  create the role or change `DATABASE_URL` in `.env.local` to match an
  existing superuser.
- Mailpit's SMTP port is `1025`, not the standard `25`. The
  `SMTP_PORT="1025"` line in `.env.example` is correct — do not change it
  to `25`.
- `AUTH_SECRET` is only required when `DEV_SKIP_AUTH=false`. If you flip
  the bypass off without generating one, NextAuth will refuse to start.
- The `RESEND_FROM_DOMAIN` setting is informational — actual sending uses
  `RESEND_DEFAULT_FROM_EMAIL`.

## Related docs

- [../operations/deployment.md](../operations/deployment.md) — production
  Resend, OAuth, DNS, webhooks, Clever Cloud
- [../developers/architecture/system-overview.md](../developers/architecture/system-overview.md)
- [../developers/guides/testing.md](../developers/guides/testing.md)
- [../developers/guides/sso-debug.md](../developers/guides/sso-debug.md)
