# Audit

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

`agel-outreach` audits send activity at the `send_log` row level: one row
per recipient per campaign with provider status. There is no separate
audit table for UI actions today.

## Why this exists

When a stakeholder asks "what was sent to whom and when?", the answer is
in `send_log` plus `campaign`. Documenting that lets the answer come from
a SQL query, not a search through application logs.

## How it works

- Every send produces one `send_log` row before the transport call.
- The Resend webhook updates the row status as events arrive.
- `campaign` keeps creator, schedule, sender identity, and template
  pointer.
- Together the join answers "campaign X sent at Y by user Z to recipient
  R with outcome S".

## Code references

- Schema: `src/lib/db/schema.ts`
- Send pipeline: `src/lib/send.ts`
- Webhook: `src/app/api/webhooks/resend/`

## Common tasks

- Export a campaign's recipients and outcomes:

   ```sql
   SELECT c.id, c.subject_tpl, s.email, s.status, s.updated_at
   FROM send_log s JOIN campaign c ON c.id = s.campaign_id
   WHERE c.id = 'cl...';
   ```

- Count bounce rate by sender domain or by template version (extend the
  schema if columns are missing).

## Pitfalls

- Webhooks can arrive out of order; treat status transitions as a
  weak ordering, not a sequence.
- There is no UI-action audit (who edited which template, who created
  which API token). If that is required, add a dedicated `audit_log`
  table rather than instrumenting handlers ad hoc.

## Related docs

- [schema-overview.md](schema-overview.md)
- [../architecture/data-flow.md](../architecture/data-flow.md)
- [../architecture/email-pipeline.md](../architecture/email-pipeline.md)
