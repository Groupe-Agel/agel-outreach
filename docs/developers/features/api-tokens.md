# API Tokens

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

API tokens authenticate external callers to the public REST surface at
`/api/v1/*`. Tokens are managed from `/settings/api-tokens`; the raw
value is shown to the user once at creation and stored hashed.

## Why this exists

Bearer tokens give scripts and other tools a way to trigger campaigns
without going through the browser session.

## How it works

- UI route: `src/app/(app)/settings/api-tokens/`.
- Create: `POST /api/api-tokens` returns the raw token once.
- Revoke: `DELETE /api/api-tokens/[id]`.
- Validate: `src/lib/api-token.ts` hashes the bearer header and looks up
  the matching active row.

## Code references

- UI: `src/app/(app)/settings/api-tokens/`
- API: `src/app/api/api-tokens/`
- Helper: `src/lib/api-token.ts`
- Schema: `src/lib/db/schema.ts` (`api_token`)
- Mockup sibling: [api-tokens.html](api-tokens.html)

## Common tasks

- Issue a token for a script:
  1. Visit `/settings/api-tokens`.
  2. Click "Create token".
  3. Copy the raw `agel_...` value before closing the dialog.

- Use a token:

  ```bash
  curl -X POST https://<your-domain>/api/v1/campaigns/send \
    -H "Authorization: Bearer agel_XXXXX" \
    -H "Content-Type: application/json" \
    -d '{ ... }'
  ```

## Pitfalls

- The raw value is irrecoverable after creation. If a user loses it,
  revoke and reissue.
- Tokens are scoped per user, not per organization. Revoking a user does
  not auto-revoke their tokens.

## Related docs

- [campaigns.md](campaigns.md)
- [../api/reference.md](../api/reference.md)
- [../architecture/auth.md](../architecture/auth.md)
- [../guides/security-audit.md](../guides/security-audit.md)
