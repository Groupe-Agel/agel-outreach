# Migrations

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

Migrations are SQL files under `drizzle/`, generated from
`src/lib/db/schema.ts` with `drizzle-kit`. Apply with `bun run db:migrate`
(which `psql`-applies the newest file).

## Why this exists

Edit-in-place on a generated migration is the most common way to corrupt
a Drizzle history. This doc states the rules once.

## How it works

1. Edit `src/lib/db/schema.ts`.
2. Run `bun run db:generate` — creates a new file under `drizzle/`.
3. Review the diff. Adjust the schema and regenerate if the SQL is
   wrong; do not edit the SQL directly.
4. Commit both files.
5. Apply locally: `bun run db:migrate` runs the newest `drizzle/*.sql`.
6. Apply in prod: redeploy after merging — Clever Cloud's build picks up
   the migration scripts.

## Code references

- Schema: `src/lib/db/schema.ts`
- Drizzle config: `drizzle.config.ts`
- Generated migrations: `drizzle/`
- Apply script (in `package.json`): `db:migrate` uses
  `psql "$DATABASE_URL" -f drizzle/$(ls drizzle | grep -E '^[0-9]+_.+\.sql$' | tail -1)`.

## Common tasks

- Add a column: edit `schema.ts`, regenerate, review the new SQL,
  commit, apply.
- Backfill data: write a follow-up SQL file by hand and apply after the
  Drizzle-generated migration.

## Pitfalls

- Do not edit a committed migration. Author a follow-up instead.
- `db:migrate` only runs the newest file. To run a multi-file backlog,
  apply each in order with `psql` directly.
- Production `DATABASE_URL` must point at the Clever Cloud Postgres
  addon — running `db:migrate` against the wrong URL is destructive.

## Related docs

- [schema-overview.md](schema-overview.md)
- [../../getting-started/local-setup.md](../../getting-started/local-setup.md)
- [../../operations/deployment.md](../../operations/deployment.md)
