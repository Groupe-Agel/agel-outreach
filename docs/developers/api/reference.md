# API Reference

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Table of contents

- [Public REST (`/api/v1/*`)](#public-rest-apiv1)
  - [POST /api/v1/campaigns/send](#post-apiv1campaignssend)
- [Internal API (session)](#internal-api-session)
  - [Auth](#auth)
  - [Parse](#parse)
  - [Templates](#templates)
  - [Campaigns](#campaigns)
  - [API tokens](#api-tokens)
  - [Profile and users](#profile-and-users)
- [Webhooks](#webhooks)
- [Cron](#cron)

## Public REST (`/api/v1/*`)

Authentication: `Authorization: Bearer agel_XXXXX`. Tokens are managed at
`/settings/api-tokens`.

### POST /api/v1/campaigns/send

Send a campaign from an external script. Body:

```json
{
  "templateId": "clxxxxx",
  "subjectTpl": "Programme AGEL — {{organization}}",
  "fromName": "AGEL Partnerships",
  "replyTo": "partners@groupe-agel.com",
  "contacts": [
    {
      "email": "imad@ouifork.com",
      "full_name": "ZAIRIG IMAD",
      "organization": "Ouifork",
      "job_title": "CEO"
    }
  ]
}
```

Returns `{ campaignId, scheduled? }` — either inline send results or a
scheduled marker.

## Internal API (session)

All endpoints under `src/app/api/` (excluding `/api/v1`, `/api/webhooks`,
`/api/cron`) require a valid session cookie. The middleware in
`src/middleware.ts` redirects unauthenticated requests.

### Auth

- `GET/POST /api/auth/[...nextauth]` — NextAuth v5 handlers. See
  [../architecture/auth.md](../architecture/auth.md).

### Parse

- `POST /api/parse` — accept a JSON / CSV / Excel upload, return a
  normalized contact list for preview.

### Templates

- `GET/POST /api/templates/[id]` — read or update one template.
- `POST /api/templates/preview` — compile arbitrary MJML + variables
  for the editor preview.
- `POST /api/templates/preview-by-id` — compile a stored template
  against a contact row.
- `POST /api/templates/test-send` — send the template to the current
  user's email.

### Campaigns

- `POST /api/campaigns/[id]/send` — start a send-now or scheduled
  campaign.
- `POST /api/campaigns/[id]/test` — test-send a campaign to self.

### API tokens

- `POST /api/api-tokens` — create a token (the raw value is returned
  once).
- `DELETE /api/api-tokens/[id]` — revoke.

### Profile and users

- `GET /api/profile` — current session's user record.
- `GET /api/users` — list of users (allowlisted domain).

## Webhooks

- `POST /api/webhooks/resend` — signed by Resend; updates `send_log`.
  Returns `401` on signature mismatch, `200` on accept.

## Cron

- `POST /api/cron/dispatch` — requires `x-cron-secret`. Runs
  `dispatchPending()` for `SCHEDULED` campaigns whose `scheduledAt` is
  due.

## Related docs

- [controllers-overview.md](controllers-overview.md)
- [route-card.md](route-card.md)
- [../architecture/auth.md](../architecture/auth.md)
- [../architecture/data-flow.md](../architecture/data-flow.md)
- [resend-external-api.md](resend-external-api.md)
- [google-oauth-external-api.md](google-oauth-external-api.md)
