# Deployment

> **Audience:** operations
> **Last reviewed:** 2026-06-04
> **Status:** current

## Summary

`agel-outreach` deploys to Clever Cloud as a Bun-runtime Next.js app backed by
the Postgres addon. Production needs Google OAuth (for SSO), Resend (for
sending), DNS records on the sending domain (SPF / DKIM / DMARC), a webhook
endpoint for delivery tracking, and a cron tick for scheduled campaigns.

## Who uses it

Engineers cutting a release or rotating credentials, and the on-call rota
diagnosing a stuck deploy or a failed scheduled send.

## What they can do

### 1. Google OAuth (SSO)

1. Open <https://console.cloud.google.com/apis/credentials>.
2. **Create credentials → OAuth client ID → Web application.**
3. Authorized redirect URI: `{APP_URL}/api/auth/callback/google`
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://<your-domain>/api/auth/callback/google`
4. Copy the Client ID and Client Secret into the deployed env:

   ```
   AUTH_GOOGLE_ID="..."
   AUTH_GOOGLE_SECRET="..."
   ```

5. Generate `AUTH_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

The domain allowlist is controlled by `AUTH_ALLOWED_DOMAINS` (comma-separated,
default `groupe-agel.com`). Sign-in is rejected for any other domain.

### 2. Resend (sending)

1. Create a Resend account at <https://resend.com> and grab an API key.
2. Add `groupe-agel.com` (or whichever AGEL domain is sending) as a verified
   sending domain. Resend returns three DNS records — add all three at the
   registrar:
   - **SPF** TXT record
   - **DKIM** CNAME record
   - **DMARC** TXT record (recommended)
3. When Resend marks the domain *verified*, set:

   ```
   RESEND_API_KEY="re_..."
   RESEND_FROM_DOMAIN="groupe-agel.com"
   RESEND_DEFAULT_FROM_EMAIL="outreach@groupe-agel.com"
   ```

   The mailbox does not need to exist on Google Workspace; Resend handles
   outbound. Set a Reply-To that does exist if you want inbound replies.

### 3. Resend webhooks (delivery tracking)

1. Resend → Webhooks → Add endpoint: `{APP_URL}/api/webhooks/resend`.
2. Subscribe to `email.delivered`, `email.opened`, `email.bounced`,
   `email.complained`.
3. Copy the signing secret:

   ```
   RESEND_WEBHOOK_SECRET="whsec_..."
   ```

For local dev without a public URL, use `ngrok http 3000` — or skip; the app
still works, just without delivery / open tracking.

### 4. Cron dispatcher (scheduled sends)

Scheduled campaigns are kicked by `POST /api/cron/dispatch`. Options:

- **Clever Cloud Cron addon** — point it at the dispatch URL every minute.
- **GitHub Actions** — a workflow with `schedule: cron: '*/1 * * * *'` and a
  `curl` step.
- **Manual / `crontab -e`** — for self-hosted boxes.

Every call must include the secret header:

```bash
curl -X POST https://<your-domain>/api/cron/dispatch \
  -H "x-cron-secret: $CRON_SECRET"
```

`CRON_SECRET` is set in the deployed env. If left blank in dev the endpoint
is unauthenticated for convenience; in prod it must always be set.

### 5. Deploy on Clever Cloud

```bash
clever create --type node agel-outreach
clever addon create postgresql-addon
clever env import < .env.local       # without quotes, one per line
clever deploy
```

The Bun runtime is detected from `bun.lock`. The app listens on
`process.env.PORT` (default 3000) as Next.js does out of the box.

### 6. How the CI/CD pipeline works

Two GitHub Actions workflows:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | every PR to `main`, every push to `main` | typecheck → lint → vitest → `next build` |
| `deploy.yml` | manual click in Actions tab (input `confirm=DEPLOY`) | re-gate → migrator → `clever deploy` → smoke test |

Deploys never happen automatically. Merging to `main` does not deploy.
Production reaches the live URL only when a human opens the Actions tab,
picks "Deploy" → "Run workflow", types `DEPLOY`, and clicks the green
button.

The deploy step ordering is intentional:

```
re-gate → migrate prod DB → clever deploy → smoke test
              │                                  │
              └─ failed migration aborts here    └─ failed smoke test goes
                 (old code + old schema stay)       red but new release IS
                                                    already live; rollback
                                                    is manual (see runbook)
```

### 7. GitHub Actions secrets

Set under repo Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `CLEVER_TOKEN` | from `~/.config/clever-cloud/clever-tools.json` after `clever login` locally |
| `CLEVER_SECRET` | same file as above |
| `PROD_DATABASE_URL` | `clever env --alias agel-outreach \| grep POSTGRESQL_ADDON_URI` (the addon URI) |
| `PROD_APP_URL` | the live URL, e.g. `https://outreach.agelpartners.com` |

Rotate `CLEVER_TOKEN` / `CLEVER_SECRET` whenever someone with deploy
access leaves the team.

## Screenshots or flows

The send pipeline at deploy time:

```
Browser / API ──► /api/campaigns/[id]/send (or /api/v1/campaigns/send)
                       │
                       ▼
                 dispatch helper ──► Resend API ──► recipient inbox
                       │
                       ▼
                 send_log row (status: queued)
                                              ▲
                 /api/webhooks/resend ─────────┘  (updates: delivered/opened/bounced)
```

Scheduled path:

```
Cron tick ──► POST /api/cron/dispatch (x-cron-secret)
                  │
                  ▼
            dispatchPending() — picks SCHEDULED campaigns whose
            scheduledAt is due, runs the same send pipeline.
```

## Related docs

- [../getting-started/local-setup.md](../getting-started/local-setup.md)
- [../developers/architecture/email-pipeline.md](../developers/architecture/email-pipeline.md)
- [../developers/api/resend-external-api.md](../developers/api/resend-external-api.md)
- [../developers/api/google-oauth-external-api.md](../developers/api/google-oauth-external-api.md)
- [runbook.md](runbook.md)
- [monitoring.md](monitoring.md)
