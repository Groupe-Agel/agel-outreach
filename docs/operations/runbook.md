# Runbook

> **Audience:** operations
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

Incident-response procedures for `agel-outreach` in production.

## Who uses it

The engineer paged. Read top-to-bottom on the first incident; jump by
heading on repeat ones.

## What they can do

### Campaign stuck in SCHEDULED past its `scheduledAt`

1. Confirm cron is hitting `/api/cron/dispatch` (see
   [monitoring.md](monitoring.md)).
2. If yes, check Clever Cloud logs for a `dispatchPending()` failure.
3. As a manual unblock:

   ```bash
   curl -X POST https://<your-domain>/api/cron/dispatch \
     -H "x-cron-secret: $CRON_SECRET"
   ```

### Resend deliveries failing

1. Check the Resend dashboard for domain status — DNS records can be
   silently removed by an admin.
2. If DKIM / SPF are red, fix at the registrar and re-verify.
3. If the API key was rotated, update `RESEND_API_KEY` in the deployed
   env and redeploy.

### Webhooks not arriving

1. Confirm the Resend webhook endpoint still points at the deployed URL.
2. Confirm `RESEND_WEBHOOK_SECRET` matches the secret shown in Resend.
3. Hit `/api/webhooks/resend` manually — a `401` is the correct response
   to an unsigned request; a `5xx` means the handler is broken.

### Cannot sign in

1. Confirm `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, and
   `AUTH_ALLOWED_DOMAINS` are set.
2. Confirm the requesting email's domain is in `AUTH_ALLOWED_DOMAINS`.
3. See [../developers/guides/sso-debug.md](../developers/guides/sso-debug.md)
   for deeper diagnosis.

### Database unreachable

1. Check the Clever Cloud Postgres addon status.
2. Confirm `DATABASE_URL` in the deployed env still matches the addon.
3. Try `bun run db:studio` from a developer machine against the prod
   `DATABASE_URL` to isolate driver vs. network.

## Screenshots or flows

(Add incident screenshots and timelines here when they happen.)

## Related docs

- [deployment.md](deployment.md)
- [monitoring.md](monitoring.md)
- [../developers/architecture/email-pipeline.md](../developers/architecture/email-pipeline.md)
- [../developers/guides/sso-debug.md](../developers/guides/sso-debug.md)
