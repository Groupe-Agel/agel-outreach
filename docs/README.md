# agel-outreach Documentation

> **Audience:** everyone
> **Last reviewed:** 2026-05-18
> **Status:** current

`agel-outreach` is an internal AGEL GROUP tool for sending personalized bulk
emails from uploaded contact files. Users upload a JSON / CSV / Excel sheet,
pick a saved MJML template, review with live preview and safeguards, and send
via Resend (with Mailpit available for local dev). The stack is Next.js 16,
React 19, TypeScript, Tailwind 4, Drizzle ORM on Postgres, NextAuth v5 with
Google SSO, MJML and Handlebars for templating, and Monaco as the editor.

## Where to start

| You are... | Open first |
|---|---|
| New to the project | [overview/glossary.md](overview/glossary.md), then [overview/project-status.md](overview/project-status.md) |
| A developer setting up locally | [getting-started/local-setup.md](getting-started/local-setup.md) |
| Joining the team | [getting-started/onboarding.md](getting-started/onboarding.md) |
| Submitting changes | [getting-started/contributing.md](getting-started/contributing.md) |
| Looking for an endpoint | [developers/api/reference.md](developers/api/reference.md) |
| Looking for the schema | [developers/database/schema-overview.md](developers/database/schema-overview.md) |
| Reading the architecture | [developers/architecture/system-overview.md](developers/architecture/system-overview.md) |
| Deploying or operating | [operations/deployment.md](operations/deployment.md), [operations/runbook.md](operations/runbook.md) |
| A product stakeholder | [product/feature-overview.md](product/feature-overview.md), [product/user-flows.md](product/user-flows.md) |
| Auditing history | [history/changelog/README.md](history/changelog/README.md) |

## Folder map

```
docs/
  README.md                          # this file
  overview/                          # what the project is, where it stands
  getting-started/                   # bring a new contributor to first PR
  developers/                        # everything an engineer needs day-to-day
    architecture/                    # system shape and major concerns
    api/                             # HTTP surface and external integrations
    database/                        # schema, roles, migrations, audit
    features/                        # one .md + .html mockup per feature
    guides/                          # cross-cutting how-tos (testing, SSO, security, scale)
  operations/                        # deploy, monitor, on-call runbook
  product/                           # what the product does, in product language
  history/                           # point-in-time records
    changelog/                       # monthly summaries
    recaps/                          # per-session engineering recaps
    decisions/specs/                 # design specs (never retro-edited)
    decisions/plans/                 # implementation plans (never retro-edited)
```

## How docs are structured

Top-level folders are organized by **audience** (overview, getting-started,
developers, operations, product, history). Sub-folders inside `developers/`
are organized by **topic**. The two axes never mix.

Every doc except this `README.md` and `history/changelog/README.md` opens
with the same three-line block:

```
# <Title>

> **Audience:** developers | operations | product | everyone
> **Last reviewed:** YYYY-MM-DD
> **Status:** draft | current | deprecated
```

That makes the audience and freshness of any doc visible in the first three
lines. Developer-facing docs follow a fixed section order
(Summary / Why this exists / How it works / Code references / Common tasks /
Pitfalls / Related docs); product, overview, and operations docs use a
shorter audience-friendly order.

## Contributing

See [getting-started/contributing.md](getting-started/contributing.md) for
the docs contribution rules — kebab-case, front matter, HTML siblings for
feature docs, relative links, no emojis.

## Related

- Entry points: `src/app/page.tsx`, `src/app/layout.tsx`, `src/middleware.ts`,
  `src/auth.ts`
- API root: `src/app/api/`
- DB schema: `src/lib/db/schema.ts`
- Project README at the repo root for the quick-start tour
