# CI/CD Pipeline — Design

> **Audience:** developers, operations
> **Last reviewed:** 2026-06-04
> **Status:** current

## Summary

Add a GitHub Actions CI/CD pipeline for `agel-outreach`. CI runs on every PR;
deploys happen only when a human clicks the "Run workflow" button. Deployment
target is a single Clever Cloud app backed by a Postgres addon — no staging
environment. Email sends use Resend with `agelpartners.com` as the verified
sending domain (DNS managed at Hostinger).

The plan also fixes a latent bug in `package.json`'s `db:migrate` script that
applies only the most recent SQL file, and adds a `/api/health` endpoint used
by the post-deploy smoke test.

## Scope

### In scope

- `.github/workflows/ci.yml` — PR gate (typecheck, lint, test, build)
- `.github/workflows/deploy.yml` — manual button, migrations + deploy + smoke test
- `scripts/migrate.ts` — proper Drizzle migrator that applies all pending files
- `src/app/api/health/route.ts` — health endpoint for the smoke test
- `package.json` — replace the buggy `db:migrate` script
- `docs/operations/deployment.md` — add "how the pipeline works" + "rollback" sections
- `docs/operations/runbook.md` — add the rollback procedure

### Out of scope (explicit YAGNI)

- Staging environment, preview deploys, second Postgres addon — single instance only
- E2E tests in CI — only `vitest run` for now
- Auto-rollback — rollback is documented as a manual procedure
- Slack notifications — red Actions run is sufficient signal
- Blue/green or zero-downtime — Clever Cloud handles graceful swap natively
- DB rollback on failed migration — pipeline only deploys additive migrations

## Architecture

```
                          ┌──────────────────────┐
  Pull Request ───────────▶│  ci.yml (auto)       │── ✗ fail → block merge
                          │  typecheck/lint/     │── ✓ pass → allow merge
                          │  test/build          │
                          └──────────────────────┘

  Merge to main ──────────▶ (nothing happens — single-environment design)

                          ┌──────────────────────┐
  Click "Run workflow" ───▶│  deploy.yml          │
   (input: confirm=DEPLOY)│                      │
                          │  1. re-run gates     │
                          │  2. run migrator     │── ✗ fail → STOP, no deploy
                          │     against prod DB  │
                          │  3. clever deploy    │── ✗ fail → STOP
                          │  4. smoke test       │── ✗ fail → red ✗
                          │     /api/health 200  │           (rollback manual)
                          │     /login 200       │
                          └──────────────────────┘
                                     │
                                     ▼
                          Clever Cloud (single app)
                              ├─ Bun runtime
                              ├─ Postgres addon (DATABASE_URL auto-injected)
                              └─ env vars set via clever env set
```

## Components

### CI workflow — `.github/workflows/ci.yml`

```
Trigger:  pull_request → main
          push → main

Job ci   (ubuntu-latest, ~3 min)
  - actions/checkout@v4
  - oven-sh/setup-bun@v2  (version pinned via bun.lock)
  - bun install --frozen-lockfile
  - bun run typecheck
  - bun run lint
  - bun run test
  - bun run build
```

No database needed — `vitest` runs in-memory. The job name "CI" is what branch
protection will require.

### Deploy workflow — `.github/workflows/deploy.yml`

```
Trigger:  workflow_dispatch
          inputs:
            confirm:
              description: 'Type DEPLOY to confirm'
              required: true
              type: string
              # Step 0 below rejects anything other than "DEPLOY"

Job deploy   (ubuntu-latest, fail-fast)
  0. Refuse if inputs.confirm != "DEPLOY"
  1. Checkout + Bun + bun install --frozen-lockfile
  2. bun run typecheck && bun run test && bun run build
        (re-gate the merged commit; the CI run on PR may be stale)
  3. bun run scripts/migrate.ts
        env: DATABASE_URL = ${{ secrets.PROD_DATABASE_URL }}
        ↳ on failure: STOP. No deploy. Old code still serves old schema.
  4. Install Clever CLI; authenticate via secrets.CLEVER_TOKEN / CLEVER_SECRET
  5. clever deploy --force
        (Clever pulls the commit, builds with Bun, performs graceful swap)
  6. Smoke test (workflow env: APP_URL = ${{ secrets.PROD_APP_URL }}):
        curl -fsS --retry 5 --retry-delay 6 $APP_URL/api/health
        curl -fsS $APP_URL/login | grep -q "Sign in"
        ↳ on failure: workflow red; rollback is manual (see runbook)
  7. Write summary to $GITHUB_STEP_SUMMARY (sha, duration, smoke result)

Top-level workflow setting:
  concurrency:
    group: deploy-prod
    cancel-in-progress: false   # never abort an in-flight deploy
```

### Migration script — `scripts/migrate.ts`

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "./drizzle" });
await sql.end();
console.log("migrations applied");
```

`package.json` changes:

```diff
- "db:migrate": "psql \"$DATABASE_URL\" -f drizzle/$(ls drizzle | grep -E '^[0-9]+_.+\\.sql$' | tail -1)"
+ "db:migrate": "bun run scripts/migrate.ts"
```

This is idempotent. Drizzle tracks applied migrations in `drizzle.__migrations`
and applies only what's pending. Safe to re-run.

### Health endpoint — `src/app/api/health/route.ts`

```ts
import { sql as raw } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.execute(raw`SELECT 1`);
    return NextResponse.json({
      ok: true,
      sha: process.env.GIT_SHA ?? "unknown",
      db: "up",
    });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
```

`GIT_SHA` is set by the deploy step via `clever env set GIT_SHA=$GITHUB_SHA`
just before deploy, so the live response shows which commit is serving.

## Data flow on a successful deploy

```
human clicks "Run workflow" with confirm=DEPLOY
       │
       ▼
GH runner re-runs typecheck/test/build  (catches drift since PR merge)
       │
       ▼
GH runner connects to prod Postgres with PROD_DATABASE_URL
       │
       ▼
Drizzle migrator applies all rows missing from drizzle.__migrations
       │           (on a fresh DB this is 0000 + 0001 + 0002)
       │           (on a re-deploy this is nothing — idempotent)
       ▼
clever deploy → Clever pulls commit, builds with Bun, swaps graceful
       │
       ▼
Smoke test polls $APP_URL/api/health until 200 (retry 5 × 6s)
       │
       ▼
Summary: sha, duration, smoke result printed to job summary
```

## Error handling

| Failure point | Outcome |
|---|---|
| Type/lint/test/build fails in CI (PR) | Merge blocked by branch protection |
| Re-gate fails in deploy.yml | Workflow red, no migration touched, no swap |
| Migration fails | Workflow red, no swap. Old code + old schema still serving. Engineer investigates DB. |
| `clever deploy` fails | Workflow red. Clever leaves prior release running. |
| Smoke test fails (health 503 or login !200) | Workflow red. New release IS live and serving. Engineer must rollback manually (runbook). |
| `confirm` input != "DEPLOY" | Workflow refuses immediately, exit 1 |

The window where a new schema is live but the old code is still running exists
between steps 3 and 5. Mitigated by enforcing **additive-only migrations** — new
tables, new nullable columns, new indexes. If a destructive migration is ever
needed (drop column, rename table), it gets a separate two-phase plan and
isn't done through this pipeline.

## Secrets

### GitHub Actions Secrets (repo Settings → Secrets and variables → Actions)

| Secret | Purpose |
|---|---|
| `CLEVER_TOKEN` | Clever CLI auth |
| `CLEVER_SECRET` | Clever CLI auth |
| `PROD_DATABASE_URL` | Migration step connects to prod DB from the CI runner |
| `PROD_APP_URL` | Smoke test target, e.g. `https://outreach.agelpartners.com` |

### Clever Cloud env (`clever env set` or dashboard)

| Var | Notes |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `"true"` (required behind Clever's proxy) |
| `NEXTAUTH_URL`, `APP_URL` | both = the prod URL |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google Cloud Console OAuth client |
| `AUTH_ALLOWED_DOMAINS` | `groupe-agel.com,agelpartners.com` |
| `MAIL_TRANSPORT` | `"resend"` |
| `RESEND_API_KEY` | Resend account key |
| `RESEND_FROM_DOMAIN` | `"agelpartners.com"` |
| `RESEND_DEFAULT_FROM_EMAIL` | `"outreach@agelpartners.com"` |
| `RESEND_WEBHOOK_SECRET` | from Resend webhook config |
| `CRON_SECRET` | header secret for `/api/cron/dispatch` |
| `DEV_SKIP_AUTH` | `"false"` |

### Provided by Clever Cloud

| Var | Source |
|---|---|
| `POSTGRESQL_ADDON_URI` | Auto-injected when the Postgres addon is linked to the app |
| `DATABASE_URL` | **Manually set once** to `$POSTGRESQL_ADDON_URI` via `clever env set DATABASE_URL '${POSTGRESQL_ADDON_URI}'` — Clever expands the reference at runtime |
| `PORT` | Auto-injected by Clever runtime |

### DNS records at Hostinger (one-time)

To verify `agelpartners.com` on Resend, Hostinger DNS receives:

- `SPF` TXT
- `DKIM` CNAME (provided by Resend)
- `DMARC` TXT (recommended `p=quarantine` or `p=reject` once trusted)

A separate `outreach.agelpartners.com` A/CNAME points at the Clever app domain.

## Branch protection (one-time GitHub config)

- Require pull request before merging to `main`
- Require status check **CI** to pass
- Disallow force-pushes to `main`
- 1-reviewer requirement deferred until the team grows beyond a single engineer

## Rollback procedure

Added to `docs/operations/runbook.md`:

```bash
# 1. Find the previous good deploy
clever activity --alias agel-outreach

# 2. Re-deploy a known-good commit
clever deploy --alias agel-outreach --commit <previous-sha> --force

# 3. Schema rollback is intentionally not automated.
#    Pipeline-applied migrations are additive, so reverting code
#    against the new schema is safe in 99% of cases.
#    For destructive migrations (out of scope), follow the
#    project's two-phase migration playbook.
```

## Testing strategy

- **CI gates verify** that the build is green: types, lint, unit tests, `next build`
- **Migration step is self-verifying**: Drizzle errors on schema mismatch
- **Smoke test verifies**: app boots, DB is reachable, login page renders
- **No new tests are required for this plan itself** — the runtime behaviour is
  covered by the existing `vitest` suite and the smoke test

## Migration baseline

Since no Clever Cloud app or Postgres addon exists yet, the very first deploy
runs the migrator against a fresh DB. No manual baseline step is needed.

If a prod DB is ever stood up out-of-band before the first pipeline deploy
(e.g., `db:push` against the addon manually), `drizzle.__migrations` must be
seeded with rows marking `0000`, `0001`, `0002` as applied so the migrator
doesn't try to re-create existing tables. This is not the planned path.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Smoke test passes but a downstream feature is broken | Smoke test is the floor, not the ceiling. Engineers manually verify any feature touched by the deploy. |
| Migration succeeds but the new code expects a schema the migration didn't deliver | Drizzle types are generated from the schema; CI's `typecheck` step catches mismatches at PR time. |
| Resend webhook secret rotation forgotten after first deploy | Document rotation steps in the runbook; surface in onboarding doc. |
| Operator runs deploy.yml twice in parallel | Workflow-level `concurrency: deploy-prod` with `cancel-in-progress: false` queues the second run. |
| `confirm` input typo treated as a deploy | Step 0 string-compares to literal `"DEPLOY"` and exits non-zero otherwise. |

## Related docs

- [../../operations/deployment.md](../../operations/deployment.md) — first-deploy + env setup (existing, will be extended)
- [../../operations/runbook.md](../../operations/runbook.md) — rollback procedure will be added here
- [../../developers/database/migrations.md](../../developers/database/migrations.md) — Drizzle migration conventions

## Approval

This spec was drafted on 2026-06-04 via a brainstorm session. Locked decisions:

1. Single Clever Cloud instance, no staging
2. CI on PR; deploy via manual button only (`confirm=DEPLOY` guard)
3. Migrations run from the GH runner *before* `clever deploy`
4. Fresh DB on first deploy; no baseline step
5. Resend + agelpartners.com (verified via Hostinger DNS)
6. Red Actions run is the only failure signal — no Slack
