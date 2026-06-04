# Contributing

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

How to land a change in `agel-outreach` — code conventions, docs conventions,
test expectations, and PR rules.

## Why this exists

The repo has rules that are easy to break by accident: docs front matter,
kebab-case names, the HTML sibling rule for feature docs, and the no-`rm`
rule for renaming docs.

## How it works

### Code

- Run `bun run typecheck`, `bun run lint`, and `bun run test` before
  opening a PR.
- Follow the existing module shape under `src/lib/*` — one folder per
  domain concern.
- Never change the Next.js / NextAuth / Drizzle major versions in a feature
  PR.

### Docs

- All file and folder names under `docs/` are kebab-case. The only
  uppercase exceptions are `docs/README.md` and
  `docs/history/changelog/README.md`.
- Every `.md` (except those two) opens with the three-line front matter
  block — see [../README.md](../README.md) for the exact shape.
- Internal links are relative paths only — never absolute repo URLs.
- No emojis anywhere under `docs/`.
- When you add or rename a feature doc under
  `docs/developers/features/`, you also add or rename its sibling `.html`
  mockup in the same PR.
- When you rename a doc, use `git mv` so history follows the new path.
  Never `rm` + recreate.
- `history/decisions/specs/` and `history/decisions/plans/` are
  point-in-time. Once shipped, do not edit them — write a new file
  instead.

### Tests

- New behavior gets a Vitest test under `tests/`.
- The send pipeline must work end-to-end against Mailpit; do not mock
  the Resend client past the transport boundary in `src/lib/mail`.

## Code references

- Lint config: `eslint.config.mjs`
- TS config: `tsconfig.json`
- Vitest config: `vitest.config.ts`
- Tests: `tests/`

## Common tasks

- Open a PR with a short description and a screenshot or Mailpit capture
  if the change is user-facing.
- Update [../history/changelog/](../history/changelog/) for the current
  month when you ship.

## Pitfalls

- Editing `.env.example` requires updating
  [local-setup.md](local-setup.md) and
  [../operations/deployment.md](../operations/deployment.md) so the docs
  stay in sync.
- Adding an endpoint requires updating
  [../developers/api/reference.md](../developers/api/reference.md) and
  [../developers/api/route-card.md](../developers/api/route-card.md).

## Related docs

- [onboarding.md](onboarding.md)
- [../developers/guides/testing.md](../developers/guides/testing.md)
- [../developers/guides/security-audit.md](../developers/guides/security-audit.md)
