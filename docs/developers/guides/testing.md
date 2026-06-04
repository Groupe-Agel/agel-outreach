# Testing Guide

> **Audience:** developers
> **Last reviewed:** 2026-05-18
> **Status:** draft

## Summary

`agel-outreach` uses Vitest for unit and integration tests. The send
pipeline must work against Mailpit end-to-end; do not mock the Resend
client past the transport boundary in `src/lib/mail/`.

## Why this exists

Mocking the transport hides the most common class of regression in this
app — a change that compiles but fails at the SMTP / API layer. Mailpit
gives us a real network round-trip without external dependencies.

## How it works

- Runner: `bun run test` (or `bun run test:watch`).
- Config: `vitest.config.ts`.
- Suite location: `tests/`.
- Mailpit-backed assertions: when `MAIL_TRANSPORT=mailpit`, hit the
  Mailpit API at `/api/v1/messages` to verify what was sent.

## Code references

- `vitest.config.ts`
- `tests/`
- Mailpit transport: `src/lib/mail/`

## Common tasks

- Write a test for a handler: import the helper from `src/lib/*`
  directly; the handler stays thin and is tested via the helper.
- Verify an outbound email: send through the Mailpit transport in the
  test setup, then query the Mailpit API to assert subject / recipient /
  body.

## Pitfalls

- Mocking the Resend SDK passes locally but hides production breakage.
  If a test needs to mock at all, mock the transport interface in
  `src/lib/mail/`, not the SDK.
- Tests that depend on a real Postgres instance must run against a
  dedicated schema and tear down rows; do not share state between tests.

## Related docs

- [../../getting-started/contributing.md](../../getting-started/contributing.md)
- [../architecture/email-pipeline.md](../architecture/email-pipeline.md)
- [security-audit.md](security-audit.md)
