# Onboarding

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

Path for a new engineer joining `agel-outreach` from zero to a first PR.

## Why this exists

A short checklist beats a wiki crawl. New contributors should be able to
read this once and know what to install, who to ask, and which doc to open
next.

## How it works

1. Read [../overview/glossary.md](../overview/glossary.md) and
   [../overview/project-status.md](../overview/project-status.md).
2. Follow [local-setup.md](local-setup.md) until the dev server boots and
   Mailpit shows a test email.
3. Skim [../developers/architecture/system-overview.md](../developers/architecture/system-overview.md)
   and [../developers/architecture/data-flow.md](../developers/architecture/data-flow.md).
4. Read [contributing.md](contributing.md) before opening a PR.

## Code references

- Top-level entry: `src/app/page.tsx`, `src/app/layout.tsx`
- Middleware and auth: `src/middleware.ts`, `src/auth.ts`
- Domain modules: `src/lib/db`, `src/lib/mail`, `src/lib/templates`, `src/lib/parsers`

## Common tasks

- Pick up a starter issue tagged for new contributors.
- Pair on a small PR before tackling anything cross-cutting.

## Pitfalls

- Do not change the auth or env-validation surface without reading
  [../developers/architecture/auth.md](../developers/architecture/auth.md) first.

## Related docs

- [contributing.md](contributing.md)
- [local-setup.md](local-setup.md)
- [../developers/architecture/system-overview.md](../developers/architecture/system-overview.md)
