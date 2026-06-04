# Google OAuth External API

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

`agel-outreach` uses Google as the only sign-in provider via NextAuth v5.
The OAuth client lives in Google Cloud Console; the app stores the
client ID and secret in env vars.

## Why this exists

The redirect URI and the domain allowlist together gatekeep the entire
UI. Reviewing this doc before changing either prevents accidental "all
users locked out" outages.

## How it works

1. Google Cloud Console → APIs and Services → Credentials → Create OAuth
   client ID (Web application).
2. Authorized redirect URI:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://<your-domain>/api/auth/callback/google`
3. NextAuth uses `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and
   `AUTH_SECRET` to complete the exchange.
4. The `signIn` callback in `src/auth.ts` rejects the session if the
   email's domain is not in `AUTH_ALLOWED_DOMAINS`.

## Code references

- `src/auth.ts`
- `src/middleware.ts`
- `src/app/api/auth/[...nextauth]/`
- Env: `src/lib/env.ts`

## Common tasks

- Add a new redirect URI for a staging URL: add it to the Cloud Console
  client, no app change required.
- Add a new allowed domain: extend `AUTH_ALLOWED_DOMAINS` (CSV) in the
  deployed env, redeploy.

## Pitfalls

- Removing a redirect URI in Cloud Console breaks sign-in for that
  environment until a new one is added — Google will not redirect to an
  unlisted URI.
- `AUTH_SECRET` must match across all running instances; rotating it
  invalidates every active session.

## Related docs

- [reference.md](reference.md)
- [../architecture/auth.md](../architecture/auth.md)
- [../../operations/deployment.md](../../operations/deployment.md)
- [../guides/sso-debug.md](../guides/sso-debug.md)
