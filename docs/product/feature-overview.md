# Feature Overview

> **Audience:** product
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

What `agel-outreach` lets a user actually do, in product terms.

## Who uses it

Internal AGEL teams running partner outreach, recruitment campaigns, or
event invitations.

## What they can do

- Sign in with their AGEL Google account.
- Author and edit MJML email templates with a live preview at `/templates`.
- Create a campaign at `/campaigns`: pick a template, upload a contact
  sheet (JSON / CSV / Excel), preview against any row, send a test to
  themselves.
- Send now, or schedule for later.
- Watch per-recipient delivery / open / bounce status in the campaign
  detail screen.
- Create API tokens under `/settings/api-tokens` and trigger campaigns
  from a script or another tool via `POST /api/v1/campaigns/send`.

## Screenshots or flows

See [user-flows.md](user-flows.md) for the click-by-click flow of each
feature, and the HTML mockups under
[../developers/features/](../developers/features/).

## Related docs

- [user-flows.md](user-flows.md)
- [../overview/project-status.md](../overview/project-status.md)
- [../developers/features/campaigns.md](../developers/features/campaigns.md)
- [../developers/features/templates.md](../developers/features/templates.md)
- [../developers/features/api-tokens.md](../developers/features/api-tokens.md)
