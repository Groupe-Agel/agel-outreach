# Templating

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

Templates are MJML documents with Handlebars expressions. The Monaco
editor at `/templates` writes the MJML source; at send time the helper in
`src/lib/templates/compile.ts` runs Handlebars over the source, compiles
the result with `mjml`, and yields the final HTML.

## Why this exists

MJML guarantees the markup is mail-client safe; Handlebars handles the
per-recipient personalization. Both run at send time, in order — keeping
them separate keeps the editor preview honest.

## How it works

1. The author writes MJML with `{{vars}}` and `{{#if}}` blocks.
2. Preview compiles the template with `defaults` values (no real contact
   row) — `src/lib/templates/defaults.ts`.
3. On send, `compile.ts` resolves the Handlebars block against each
   contact row, then runs `mjml` once to produce the final HTML.
4. The subject line is also a Handlebars template (`subjectTpl`).

## Code references

- Compile: `src/lib/templates/compile.ts`
- Defaults: `src/lib/templates/defaults.ts`
- Client-side variable extraction: `src/lib/templates/extract-client.ts`
- Editor route: `src/app/(app)/templates/`
- Preview routes: `src/app/api/templates/preview/`,
  `src/app/api/templates/preview-by-id/`
- Test-send: `src/app/api/templates/test-send/`

## Common tasks

- Add a new built-in Handlebars helper: register it in
  `src/lib/templates/compile.ts` and document it in
  [../../product/feature-overview.md](../../product/feature-overview.md).
- Surface a new variable to the preview editor: update
  `extract-client.ts` so the variable picker sees it.

## Pitfalls

- MJML errors are not always surfaced to the editor; check the dev-server
  log if the preview pane goes blank.
- Handlebars treats missing keys as empty strings — this is intentional
  for partial contact sheets, but it can hide a typo in `{{vars}}`.
- The compiled HTML is cached per-call only; do not assume two consecutive
  sends produce the same byte-for-byte HTML if a helper reads `Date.now()`.

## Related docs

- [email-pipeline.md](email-pipeline.md)
- [data-flow.md](data-flow.md)
- [../features/templates.md](../features/templates.md)
