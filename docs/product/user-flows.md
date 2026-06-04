# User Flows

> **Audience:** product
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

Click-by-click flows for the main `agel-outreach` features.

## Who uses it

Product reviewing scope, support reproducing user reports, designers
proposing changes.

## What they can do

### Sign in

1. User opens the app URL.
2. Redirected to `/login`.
3. Clicks "Sign in with Google".
4. Google consent screen, then return to the app authenticated.
5. Landing screen is `/campaigns`.

### Create and send a campaign

1. From `/campaigns`, click "New campaign".
2. Pick a template from the dropdown.
3. Upload a contact sheet (JSON / CSV / Excel).
4. Preview with the row picker; click a row to see how the template
   resolves for that contact.
5. Send test to self; check inbox or Mailpit.
6. Fill in subject, from-name, reply-to.
7. Choose "Send now" or pick a date/time.
8. Type the typed-confirm phrase, click confirm.
9. Land on the campaign detail screen; rows fill in as Resend webhooks
   arrive.

### Author a template

1. From `/templates`, click "New template".
2. Edit MJML in the Monaco editor on the left; the right pane shows the
   compiled preview.
3. Use `{{variables}}` and `{{#if condition}}...{{/if}}` for personalization.
4. Save. The template is now selectable in the campaigns flow.

### Use the REST API

1. Visit `/settings/api-tokens` and click "Create token".
2. Copy the token (shown once).
3. From any client:

   ```bash
   curl -X POST https://<your-domain>/api/v1/campaigns/send \
     -H "Authorization: Bearer agel_XXXXX" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
   ```

## Screenshots or flows

See the HTML mockups under
[../developers/features/](../developers/features/).

## Related docs

- [feature-overview.md](feature-overview.md)
- [../developers/features/campaigns.md](../developers/features/campaigns.md)
- [../developers/features/templates.md](../developers/features/templates.md)
- [../developers/features/api-tokens.md](../developers/features/api-tokens.md)
