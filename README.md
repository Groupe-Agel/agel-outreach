# agel-outreach

Internal AGEL GROUP tool for sending personalized bulk emails from uploaded
contact files. Upload a JSON / CSV / Excel sheet, pick a saved MJML template,
review with live preview + safeguards, send via Resend.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind 4 · Drizzle ORM ·
Postgres · NextAuth v5 (Google SSO) · Resend / Mailpit · MJML · Handlebars ·
Monaco.

**Testing mode:** `DEV_SKIP_AUTH=true` bypasses Google SSO and acts as
`dev@groupe-agel.com`. `MAIL_TRANSPORT=mailpit` (default) routes all email
to a local [Mailpit](https://mailpit.axllent.org) inbox at
<http://localhost:8025> instead of hitting Resend. Flip both flags off to
go to production.

## Quick start (testing mode — no Google, no Resend, no DNS)

```bash
# 1. Install
bun install
brew install mailpit          # one-time, if you don't have it

# 2. Local Postgres database
psql -U root -d postgres -c "CREATE DATABASE agel_outreach;"

# 3. Env: defaults already set DEV_SKIP_AUTH=true and MAIL_TRANSPORT=mailpit
cp .env.example .env.local

# 4. Schema
bun run db:generate
bun run db:migrate

# 5. Run mailpit (separate terminal — keeps the inbox UI open)
bun run mailpit               # → http://localhost:8025

# 6. Dev server (separate terminal)
bun run dev                   # → http://localhost:3000
```

Open <http://localhost:3000> — you skip straight to `/campaigns` (no login).
Open <http://localhost:8025> to inspect every email the app sends.

## Going to production

Edit `.env.local`:

```diff
- DEV_SKIP_AUTH="true"
+ DEV_SKIP_AUTH="false"
- MAIL_TRANSPORT="mailpit"
+ MAIL_TRANSPORT="resend"
+ AUTH_GOOGLE_ID="..."
+ AUTH_GOOGLE_SECRET="..."
+ RESEND_API_KEY="re_..."
```

See `docs/SETUP.md` for the full Google OAuth / Resend / DNS / webhook setup.

## What's in the box

- **Templates** — MJML source + Handlebars `{{vars}}` and `{{#if}}` conditionals,
  edited in a Monaco editor with a live preview pane (`/templates`).
- **Campaigns** — pick a template, upload contacts, preview with row picker,
  test-send-to-self, typed-confirm modal, send-now or schedule-for-later
  (`/campaigns`).
- **Per-recipient send log** — Resend webhooks update delivery / open / bounce
  status (`/campaigns/[id]`).
- **REST API** — `POST /api/v1/campaigns/send` (token-protected, manage tokens
  at `/settings/api-tokens`).
- **Cron dispatcher** — `POST /api/cron/dispatch` picks up SCHEDULED campaigns
  whose `scheduledAt` is due. Wire to a cron addon, GitHub Actions, or hit
  manually with the `x-cron-secret` header.

## Auth

Sign-in is restricted by email domain (`AUTH_ALLOWED_DOMAINS`, comma-separated).
Default: `groupe-agel.com`. Edit and restart to add more.

## Sender identity

One verified domain in Resend (`RESEND_DEFAULT_FROM_EMAIL`). Per-campaign you
choose a display name and reply-to. See `docs/SETUP.md` for the one-time DNS
setup (SPF + DKIM + DMARC).

## Scripts

```bash
bun run dev           # dev server
bun run build         # production build
bun run start         # production server
bun run typecheck     # tsc --noEmit
bun run lint          # eslint
bun run test          # vitest
bun run db:generate   # generate SQL migration from schema
bun run db:migrate    # apply latest migration via psql
bun run db:studio     # drizzle-kit studio
```

## REST API

Create a token at `/settings/api-tokens`, then:

```bash
curl -X POST http://localhost:3000/api/v1/campaigns/send \
  -H "Authorization: Bearer agel_XXXXX" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "clxxxxx",
    "subjectTpl": "Programme AGEL — {{organization}}",
    "fromName": "AGEL Partnerships",
    "replyTo": "partners@groupe-agel.com",
    "contacts": [
      { "email": "imad@ouifork.com", "full_name": "ZAIRIG IMAD", "organization": "Ouifork", "job_title": "CEO" }
    ]
  }'
```

Returns the new `campaignId` and either inline send results or `scheduled: true`.

## Project layout

```
src/
├── app/
│   ├── (app)/             # authenticated UI
│   │   ├── campaigns/
│   │   ├── templates/
│   │   └── settings/api-tokens/
│   ├── api/
│   │   ├── auth/[...nextauth]
│   │   ├── templates/{[id],preview,preview-by-id,test-send}/
│   │   ├── campaigns/{[id]/{send,test}}/
│   │   ├── v1/campaigns/send/   # token-protected REST
│   │   ├── webhooks/resend/
│   │   ├── cron/dispatch/
│   │   ├── api-tokens/[id]/
│   │   └── parse/               # file upload
│   ├── login/
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
│   ├── auth-helpers.ts
│   ├── db/{index.ts,schema.ts}
│   ├── env.ts
│   ├── email.ts
│   ├── api-token.ts
│   ├── parsers/
│   ├── templates/{compile,defaults,extract-client}
│   ├── resend.ts
│   └── send.ts
├── auth.ts
├── middleware.ts
└── types/
drizzle/               # generated SQL migrations
tests/                 # vitest unit tests
docs/SETUP.md
```
