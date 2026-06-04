# SSO Debug Guide

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

Step-by-step diagnosis when Google SSO is failing in dev or production.

## Why this exists

NextAuth's failure modes look identical from the UI ("Sign in failed"
loop). This guide narrows the search.

## How it works

### Symptoms vs. cause

| Symptom | First check |
|---|---|
| Endless redirect loop after consent | `NEXTAUTH_URL` and the Cloud Console redirect URI must match exactly. |
| "AccessDenied" returned by `signIn` | The email's domain is not in `AUTH_ALLOWED_DOMAINS`. |
| 500 from `/api/auth/callback/google` | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` are missing or wrong. |
| All sessions expired at once | `AUTH_SECRET` was rotated; users must sign in again. |
| Local dev cannot reach `/login` | `DEV_SKIP_AUTH=true` may already be on — you should land on `/campaigns` instead. |

### Diagnostic commands

```bash
# Show the env the app sees (without leaking values)
bun run -e 'console.log(Object.keys(process.env).filter(k => k.startsWith("AUTH_")))'

# Verify the callback URL is whitelisted in Google
curl -I "${APP_URL}/api/auth/callback/google"
```

## Code references

- `src/auth.ts`
- `src/middleware.ts`
- `src/lib/env.ts`
- `src/app/api/auth/[...nextauth]/`
- `src/app/login/`

## Common tasks

- Reset a stuck local session: clear cookies for `localhost:3000` and
  reload.
- Temporarily allow another domain: extend `AUTH_ALLOWED_DOMAINS` (CSV)
  in `.env.local` and restart.

## Pitfalls

- `AUTH_ALLOWED_DOMAINS` is comma-separated and trimmed; trailing
  whitespace silently breaks the match.
- `DEV_SKIP_AUTH=true` returns a fixed user; never set it in production.

## Related docs

- [../architecture/auth.md](../architecture/auth.md)
- [../api/google-oauth-external-api.md](../api/google-oauth-external-api.md)
- [../../operations/runbook.md](../../operations/runbook.md)
