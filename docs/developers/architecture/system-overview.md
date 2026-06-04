# System Overview

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

`agel-outreach` is a single Next.js 16 app on the Bun runtime. The UI under
`src/app/(app)/` calls server actions and internal route handlers under
`src/app/api/`; the external REST surface lives at `/api/v1/*` and is
protected by bearer tokens. Persistence is Postgres via Drizzle ORM. Email
delivery is a swappable transport: Mailpit (local), generic SMTP, or Resend
(production).

## Why this exists

The shape of the app matters more than the file tree: knowing where the
boundary between UI, internal handlers, and the public REST surface lies
tells you which auth model applies and which guarantees a change must
preserve.

## How it works

```
┌─────────────────────────────────────────────────────────┐
│                  Browser (App Router UI)                │
│   src/app/(app)/campaigns, /templates, /settings/...    │
└────────────┬────────────────────────────────────────────┘
             │  session cookie (NextAuth) — domain-allowlisted
             ▼
┌─────────────────────────────────────────────────────────┐
│           Internal API handlers (session auth)           │
│   src/app/api/{campaigns,templates,parse,profile,...}    │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────┐
│ Drizzle  │ │ Mail svc │ │ Template svc │ │ Parsers    │
│ Postgres │ │ Resend / │ │ MJML +       │ │ JSON / CSV │
│          │ │ SMTP /   │ │ Handlebars   │ │ / Excel    │
│          │ │ Mailpit  │ │              │ │            │
└──────────┘ └──────────┘ └──────────────┘ └────────────┘

External callers ──► /api/v1/campaigns/send  (Bearer agel_*)
Resend           ──► /api/webhooks/resend    (signed)
Cron             ──► /api/cron/dispatch      (x-cron-secret)
```

## Code references

- App router (UI): `src/app/(app)/`
- Internal API: `src/app/api/`
- Public REST: `src/app/api/v1/`
- Webhook: `src/app/api/webhooks/resend/`
- Cron: `src/app/api/cron/dispatch/`
- Auth: `src/auth.ts`, `src/middleware.ts`
- DB: `src/lib/db/`
- Mail: `src/lib/mail/`
- Templates: `src/lib/templates/`
- Parsers: `src/lib/parsers/`

## Common tasks

- Add a new UI route under `src/app/(app)/` and a matching internal API
  handler under `src/app/api/`.
- Add a new public endpoint under `src/app/api/v1/` and document it in
  [../api/reference.md](../api/reference.md).

## Pitfalls

- Do not call `/api/v1/*` from the browser — it expects the bearer header,
  not the session cookie.
- Do not mix internal-only fields into a `v1` response shape; that surface
  is consumed by external scripts and changes are breaking.

## Related docs

- [data-flow.md](data-flow.md)
- [auth.md](auth.md)
- [email-pipeline.md](email-pipeline.md)
- [templating.md](templating.md)
- [../api/reference.md](../api/reference.md)
