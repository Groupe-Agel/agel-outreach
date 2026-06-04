# Schema Overview

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

`agel-outreach` uses Drizzle ORM on Postgres. The schema is one file at
`src/lib/db/schema.ts`; generated SQL lives under `drizzle/` and is
applied with `bun run db:migrate`.

## Why this exists

Knowing the table list and which tables join to which is the fastest way
to read the send pipeline without opening every handler.

## How it works

### Tables (high level)

- **Auth-related** (managed by the Drizzle NextAuth adapter):
  `user`, `account`, `session`, `verification_token`.
- **Templates:** `template` — MJML source plus metadata.
- **Campaigns:** `campaign` — one row per send, with status, schedule,
  template reference, and sender identity.
- **Send log:** `send_log` — one row per recipient per campaign, with
  delivery / open / bounce / complaint status.
- **API tokens:** `api_token` — hashed tokens for the public REST surface.

(For the exact column list, read `src/lib/db/schema.ts` directly. This
doc deliberately avoids restating column names that change frequently.)

## Code references

- Schema: `src/lib/db/schema.ts`
- Drizzle config: `drizzle.config.ts`
- Connection: `src/lib/db/index.ts`
- Migrations: `drizzle/`

## Common tasks

- Change a table: edit `schema.ts`, run `bun run db:generate`, review the
  diff under `drizzle/`, run `bun run db:migrate`.
- Inspect the live DB: `bun run db:studio`.

## Pitfalls

- Drizzle generates pure SQL — once a migration file is committed, do
  not edit it. Author a follow-up migration instead.
- The auth adapter expects exact column names. Renaming a column on a
  NextAuth-managed table breaks sign-in.

## Related docs

- [migrations.md](migrations.md)
- [roles-permissions.md](roles-permissions.md)
- [audit.md](audit.md)
- [../architecture/data-flow.md](../architecture/data-flow.md)
