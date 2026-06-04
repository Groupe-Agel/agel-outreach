# Templates

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

The templates feature is an MJML + Handlebars editor with a live preview.
Authors edit at `/templates`; the same template is then selectable in the
campaigns flow.

## Why this exists

MJML guarantees mail-client safety; Handlebars guarantees per-recipient
personalization. Pairing them with the Monaco editor and a live preview
keeps authoring tight.

## How it works

- UI route: `src/app/(app)/templates/`.
- Preview routes: `POST /api/templates/preview` (arbitrary MJML),
  `POST /api/templates/preview-by-id` (stored template + contact row).
- Test-send: `POST /api/templates/test-send`.
- Compile: `src/lib/templates/compile.ts` runs Handlebars first, then
  MJML.

## Code references

- UI: `src/app/(app)/templates/`
- API: `src/app/api/templates/`
- Compile: `src/lib/templates/compile.ts`
- Defaults: `src/lib/templates/defaults.ts`
- Client-side variable extraction: `src/lib/templates/extract-client.ts`
- Mockup sibling: [templates.html](templates.html)

## Common tasks

- Add a custom Handlebars helper: register in `compile.ts` and document
  in [../architecture/templating.md](../architecture/templating.md).
- Add a default variable for the preview pane: extend `defaults.ts`.

## Pitfalls

- MJML errors do not always reach the editor; check the dev-server log
  if the preview blanks out.
- Handlebars treats missing keys as empty — typos in `{{vars}}` are
  silent.

## Related docs

- [campaigns.md](campaigns.md)
- [api-tokens.md](api-tokens.md)
- [../architecture/templating.md](../architecture/templating.md)
- [../../product/user-flows.md](../../product/user-flows.md)
