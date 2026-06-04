# Roles and Permissions

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

`agel-outreach` does not currently have application-level roles beyond
"authenticated user in the allowlisted domain". All sign-in restriction
is enforced at the email-domain level via `AUTH_ALLOWED_DOMAINS`.

## Why this exists

To prevent future contributors from assuming a role model that doesn't
exist, and to document the small per-resource ownership checks that do
exist (templates, campaigns, API tokens).

## How it works

- Sign-in: only emails whose domain is in `AUTH_ALLOWED_DOMAINS`
  (default `groupe-agel.com`).
- Ownership: templates, campaigns, and API tokens are scoped to the
  creating user. Handlers must filter by `userId` before returning a row.
- API tokens: hashed at rest; revocation is a row update, not a delete.

## Code references

- Sign-in guard: `src/auth.ts`
- Auth helpers: `src/lib/auth-helpers.ts`
- Token storage: `src/lib/api-token.ts`
- Schema: `src/lib/db/schema.ts`

## Common tasks

- Adding an admin-only feature: there is no admin role today. Either
  introduce one (with a migration) or gate by user email allowlist.

## Pitfalls

- Do not assume a handler is safe just because the user is signed in.
  Owner checks are per-resource.
- Removing a domain from `AUTH_ALLOWED_DOMAINS` does not delete the
  users — it only blocks future sign-ins.

## Related docs

- [schema-overview.md](schema-overview.md)
- [../architecture/auth.md](../architecture/auth.md)
- [../guides/security-audit.md](../guides/security-audit.md)
