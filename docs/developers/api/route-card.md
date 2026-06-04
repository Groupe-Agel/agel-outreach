# Route Card

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

One-screen cheat sheet of every HTTP route in `agel-outreach`. For full
shapes see [reference.md](reference.md).

## Why this exists

When a Slack thread mentions a route by path, this page tells you which
auth model it expects and what it does without opening the source.

## How it works

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | — | NextAuth callbacks |
| POST | `/api/parse` | session | normalize an uploaded contact file |
| GET | `/api/templates/[id]` | session | read one template |
| POST | `/api/templates/[id]` | session | update one template |
| POST | `/api/templates/preview` | session | compile arbitrary MJML for the editor |
| POST | `/api/templates/preview-by-id` | session | compile a stored template against a contact |
| POST | `/api/templates/test-send` | session | send a template to the current user |
| POST | `/api/campaigns/[id]/send` | session | run or schedule a campaign |
| POST | `/api/campaigns/[id]/test` | session | test-send a campaign to self |
| POST | `/api/v1/campaigns/send` | bearer | external send from a script |
| POST | `/api/api-tokens` | session | create an API token |
| DELETE | `/api/api-tokens/[id]` | session | revoke an API token |
| GET | `/api/profile` | session | current session's user |
| GET | `/api/users` | session | list users in the allowlisted domain |
| POST | `/api/webhooks/resend` | signed | ingest a Resend delivery event |
| POST | `/api/cron/dispatch` | `x-cron-secret` | run scheduled campaigns |

## Code references

- All handlers: `src/app/api/**/route.ts`

## Common tasks

- Adding a route? Update this table in the same PR.

## Pitfalls

- The "session" column means the NextAuth cookie. From a curl on the
  command line, only the `v1`, `webhooks`, and `cron` rows are reachable.

## Related docs

- [reference.md](reference.md)
- [controllers-overview.md](controllers-overview.md)
- [../architecture/auth.md](../architecture/auth.md)
