# CI/CD Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up GitHub Actions CI for every PR and a manual-button deploy pipeline for the single Clever Cloud production instance.

**Architecture:** PR runs `ci.yml` (typecheck/lint/test/build). Deploys run on `workflow_dispatch` with a `confirm=DEPLOY` guard. The deploy workflow re-gates the merged commit, runs the Drizzle migrator against the prod DB (so a failed migration aborts before the swap), calls `clever deploy`, then smoke-tests `/api/health` and `/login`. Rollback is a documented manual step. No staging.

**Tech Stack:** GitHub Actions, Bun, Next.js 16 (App Router), Drizzle ORM + `postgres-js` driver, Clever Cloud CLI, Vitest.

**Spec:** [`docs/superpowers/specs/2026-06-04-cicd-pipeline-design.md`](../specs/2026-06-04-cicd-pipeline-design.md)

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `.github/workflows/ci.yml` | PR gate: typecheck → lint → test → build |
| `.github/workflows/deploy.yml` | Manual deploy: re-gate → migrate → deploy → smoke test |
| `scripts/migrate.ts` | Drizzle migrator runner (replaces buggy psql script) |
| `src/app/api/health/route.ts` | `GET /api/health` — returns 200 + sha + db status |
| `tests/health.test.ts` | Unit test for the health route handler |

### Modified files

| Path | Change |
|---|---|
| `package.json` | Replace `db:migrate` script |
| `docs/operations/deployment.md` | Append "How the pipeline works" + "GitHub Actions secrets" sections |
| `docs/operations/runbook.md` | Append rollback procedure |

### One-time external setup (not in the repo)

| Where | Action |
|---|---|
| Clever Cloud | Create app + Postgres addon + env vars |
| Hostinger DNS | Add Resend SPF/DKIM/DMARC records for `agelpartners.com` |
| Resend | Verify the domain, create webhook endpoint |
| Google Cloud Console | Create OAuth 2.0 client for prod redirect URI |
| GitHub repo settings | Add 4 secrets, enable branch protection on `main` |

---

## Task 1: Add `/api/health` endpoint (TDD)

**Files:**
- Create: `tests/health.test.ts`
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1.1: Write the failing test**

Create `tests/health.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

const { db } = await import("@/lib/db");
const { GET } = await import("@/app/api/health/route");

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.mocked(db.execute).mockReset();
  });

  it("returns 200 with ok:true when the DB query succeeds", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([{ "?column?": 1 }] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      sha: expect.any(String),
      db: "up",
    });
  });

  it("returns 503 with ok:false when the DB query throws", async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error("connection refused"));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ ok: false, db: "down" });
  });
});
```

- [ ] **Step 1.2: Run the test to verify it fails**

Run: `bun run test tests/health.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/health/route'`

- [ ] **Step 1.3: Implement the route handler**

Create `src/app/api/health/route.ts`:

```ts
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
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

- [ ] **Step 1.4: Run the test to verify it passes**

Run: `bun run test tests/health.test.ts`
Expected: PASS — 2 tests pass

- [ ] **Step 1.5: Verify typecheck and lint stay green**

Run: `bun run typecheck && bun run lint`
Expected: zero errors

- [ ] **Step 1.6: Commit**

```bash
git add tests/health.test.ts src/app/api/health/route.ts
git commit -m "Add /api/health endpoint for deploy smoke test

Returns 200 ok with sha and db status when SELECT 1 succeeds, 503 down
on DB failure. Used by deploy.yml smoke-test step.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Replace the broken `db:migrate` script

**Files:**
- Create: `scripts/migrate.ts`
- Modify: `package.json:13`

**Why:** The current script (`ls drizzle | grep ... | tail -1`) applies only the LAST migration file. With 3 migrations present, a fresh DB ends up missing two of them. The replacement uses Drizzle's official migrator which is idempotent and tracks state in a `drizzle.__migrations` table.

- [ ] **Step 2.1: Create the migration runner**

Create `scripts/migrate.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("migrations applied");
} finally {
  await sql.end();
}
```

- [ ] **Step 2.2: Update the package.json script**

In `package.json`, replace line 13:

```diff
- "db:migrate": "psql \"$DATABASE_URL\" -f drizzle/$(ls drizzle | grep -E '^[0-9]+_.+\\.sql$' | tail -1)",
+ "db:migrate": "bun run scripts/migrate.ts",
```

- [ ] **Step 2.3: Verify the script runs locally (manual)**

Against a local Postgres DB (`createdb agel_outreach_migrate_test` first if you want a fresh one):

Run:
```bash
DATABASE_URL=postgresql://root@localhost:5432/agel_outreach_migrate_test bun run db:migrate
```

Expected:
- First run prints `migrations applied`. Tables exist (`\dt` in psql shows `users`, `templates`, `campaigns`, etc.) plus a `drizzle.__migrations` table.
- Second run prints `migrations applied` again. No errors. Idempotent.

If you do not have a local Postgres handy, skip this manual check — the GH Actions deploy step will exercise the same code path against the real prod DB during Task 7.

- [ ] **Step 2.4: Verify typecheck stays green**

Run: `bun run typecheck`
Expected: zero errors

- [ ] **Step 2.5: Commit**

```bash
git add scripts/migrate.ts package.json
git commit -m "Replace db:migrate script with proper Drizzle migrator

Old script applied only the latest SQL file via tail -1, so any fresh
DB or batched migration was missing earlier files. New script uses
drizzle-orm's official migrator — idempotent, tracks applied state
in drizzle.__migrations, fails non-zero on error so the deploy
pipeline can abort cleanly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Add the CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 3.1: Create the workflow file**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    name: CI
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Typecheck
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Test
        run: bun run test

      - name: Build
        run: bun run build
        env:
          # Next.js build statically evaluates env. Provide harmless
          # placeholders so it doesn't fail on missing secrets.
          DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci"
          AUTH_SECRET: "ci-placeholder-not-used-at-build-time"
          AUTH_TRUST_HOST: "true"
          NEXTAUTH_URL: "http://localhost:3000"
          APP_URL: "http://localhost:3000"
          MAIL_TRANSPORT: "mailpit"
          DEV_SKIP_AUTH: "false"
          AUTH_ALLOWED_DOMAINS: "groupe-agel.com"
```

- [ ] **Step 3.2: Verify the yaml is syntactically valid**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "ok"`
Expected: `ok`

- [ ] **Step 3.3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI workflow — typecheck, lint, test, build on PR

Runs on every PR to main and every push to main. Concurrency-cancels
older runs on the same ref so superseded PR pushes don't queue up.
Build step provides harmless env placeholders so Next.js's compile-
time env validation doesn't fail without real secrets.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 3.4: Push and verify it runs**

```bash
git push origin main
```

Then open the GitHub repo → Actions tab. The "CI" run for the push should appear and turn green within ~3 minutes. If it fails, fix the failure before continuing — the deploy workflow re-runs the same gates and will fail the same way.

---

## Task 4: Add the deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 4.1: Create the workflow file**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type DEPLOY to confirm a production deploy'
        required: true
        type: string

concurrency:
  group: deploy-prod
  cancel-in-progress: false

jobs:
  deploy:
    name: Deploy to production
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      APP_URL: ${{ secrets.PROD_APP_URL }}
    steps:
      - name: Refuse unconfirmed runs
        if: ${{ inputs.confirm != 'DEPLOY' }}
        run: |
          echo "::error::confirm input must be exactly 'DEPLOY' (got '${{ inputs.confirm }}')"
          exit 1

      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Re-gate (typecheck, test, build)
        run: |
          bun run typecheck
          bun run test
          bun run build
        env:
          DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci"
          AUTH_SECRET: "deploy-placeholder-not-used-at-build-time"
          AUTH_TRUST_HOST: "true"
          NEXTAUTH_URL: ${{ secrets.PROD_APP_URL }}
          APP_URL: ${{ secrets.PROD_APP_URL }}
          MAIL_TRANSPORT: "resend"
          DEV_SKIP_AUTH: "false"
          AUTH_ALLOWED_DOMAINS: "groupe-agel.com,agelpartners.com"

      - name: Apply DB migrations against prod
        run: bun run scripts/migrate.ts
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}

      - name: Install Clever Cloud CLI
        run: |
          curl -fsSL https://clever-tools.clever-cloud.com/releases/latest/clever-tools-latest_linux.tar.gz \
            | tar -xz --strip-components=1 -C /usr/local/bin clever-tools-latest_linux/clever
          clever version

      - name: Authenticate Clever CLI
        run: clever login --token "$CLEVER_TOKEN" --secret "$CLEVER_SECRET"
        env:
          CLEVER_TOKEN: ${{ secrets.CLEVER_TOKEN }}
          CLEVER_SECRET: ${{ secrets.CLEVER_SECRET }}

      - name: Tag the deploy with the commit sha
        run: clever env set GIT_SHA "${{ github.sha }}" --alias agel-outreach

      - name: Deploy
        run: clever deploy --alias agel-outreach --force

      - name: Smoke test — /api/health
        run: |
          for i in 1 2 3 4 5; do
            if curl -fsS "$APP_URL/api/health" | tee /tmp/health.json | grep -q '"ok":true'; then
              echo "health OK"
              exit 0
            fi
            echo "attempt $i failed, retrying in 6s"
            sleep 6
          done
          echo "::error::/api/health never returned ok:true after 5 attempts"
          cat /tmp/health.json || true
          exit 1

      - name: Smoke test — /login renders
        run: |
          body=$(curl -fsS "$APP_URL/login")
          if ! echo "$body" | grep -q "Sign in"; then
            echo "::error::/login response did not contain 'Sign in'"
            exit 1
          fi
          echo "login OK"

      - name: Job summary
        if: always()
        run: |
          {
            echo "## Deploy summary"
            echo ""
            echo "- **Commit:** \`${{ github.sha }}\`"
            echo "- **App URL:** $APP_URL"
            echo "- **Status:** ${{ job.status }}"
          } >> "$GITHUB_STEP_SUMMARY"
```

- [ ] **Step 4.2: Verify the yaml is syntactically valid**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo "ok"`
Expected: `ok`

- [ ] **Step 4.3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Add deploy workflow — manual button with migration-first ordering

Triggered only by workflow_dispatch with confirm=DEPLOY. Re-runs CI
gates against the merged commit, applies Drizzle migrations against
prod DB BEFORE clever deploy so a failed migration aborts without
touching live code, then smoke-tests /api/health and /login.

Workflow-level concurrency group 'deploy-prod' (cancel-in-progress:
false) queues parallel runs instead of aborting.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4.4: Push**

```bash
git push origin main
```

The workflow appears in the Actions tab with a "Run workflow" button but cannot succeed yet — secrets and the Clever app don't exist. That's expected. Task 6 stands up the infra; Task 7 runs the first deploy.

---

## Task 5: Update operations docs

**Files:**
- Modify: `docs/operations/deployment.md` — append two new sections
- Modify: `docs/operations/runbook.md` — append rollback procedure

- [ ] **Step 5.1: Append the pipeline-overview section to deployment.md**

Open `docs/operations/deployment.md` and append (after the existing "Deploy on Clever Cloud" section, before "Screenshots or flows"):

```markdown
### 6. How the CI/CD pipeline works

Two GitHub Actions workflows:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | every PR to `main`, every push to `main` | typecheck → lint → vitest → `next build` |
| `deploy.yml` | manual click in Actions tab (input `confirm=DEPLOY`) | re-gate → migrator → `clever deploy` → smoke test |

Deploys never happen automatically. Merging to `main` does not deploy.
Production reaches the live URL only when a human opens the Actions tab,
picks "Deploy" → "Run workflow", types `DEPLOY`, and clicks the green
button.

The deploy step ordering is intentional:

```
re-gate → migrate prod DB → clever deploy → smoke test
              │                                  │
              └─ failed migration aborts here    └─ failed smoke test goes
                 (old code + old schema stay)       red but new release IS
                                                    already live; rollback
                                                    is manual (see runbook)
```

### 7. GitHub Actions secrets

Set under repo Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `CLEVER_TOKEN` | from `~/.config/clever-cloud/clever-tools.json` after `clever login` locally |
| `CLEVER_SECRET` | same file as above |
| `PROD_DATABASE_URL` | `clever env --alias agel-outreach \| grep POSTGRESQL_ADDON_URI` (the addon URI) |
| `PROD_APP_URL` | the live URL, e.g. `https://outreach.agelpartners.com` |

Rotate `CLEVER_TOKEN` / `CLEVER_SECRET` whenever someone with deploy
access leaves the team.
```

- [ ] **Step 5.2: Append the rollback procedure to runbook.md**

Open `docs/operations/runbook.md` and append:

```markdown
## Rolling back a deploy

The Actions "Deploy" run failed, or the new release is live but broken.
Rollback is a documented manual procedure — the pipeline never rolls
back on its own.

### 1. Find the previous good deploy

```bash
clever activity --alias agel-outreach
```

Look for the most recent line with status `OK` before the current bad
release. Copy its commit sha.

### 2. Re-deploy that commit

```bash
clever deploy --alias agel-outreach --commit <previous-sha> --force
```

Wait for Clever to confirm the swap (`clever logs --alias agel-outreach`
shows the new process binding).

### 3. Verify

```bash
curl -fsS https://<prod-url>/api/health | jq .
```

The `sha` field should match `<previous-sha>` (truncated). The `db`
field should be `"up"`.

### 4. Database rollback

The pipeline only applies **additive** migrations (new tables, new
nullable columns, new indexes), so reverting code against a forward-
migrated schema is safe in practice. If a destructive migration is
ever required, it follows a separate two-phase plan and is not run
through this pipeline.

### 5. Postmortem

File a `docs/history/decisions/` entry within 24h: what broke, why
smoke test or CI didn't catch it, what gate to add.
```

- [ ] **Step 5.3: Verify both files still render (markdown sanity)**

Run: `head -3 docs/operations/deployment.md docs/operations/runbook.md`
Expected: both still start with the audience / last-reviewed / status block.

- [ ] **Step 5.4: Bump the `Last reviewed` line of both files to today**

In `docs/operations/deployment.md` line 4, change `Last reviewed:` to `2026-06-04`.
In `docs/operations/runbook.md`, change `Last reviewed:` to `2026-06-04`.

- [ ] **Step 5.5: Commit**

```bash
git add docs/operations/deployment.md docs/operations/runbook.md
git commit -m "Document the CI/CD pipeline and rollback procedure

deployment.md gets a 'How the CI/CD pipeline works' section explaining
the two workflows and the migration-first ordering, plus a list of the
four GitHub Actions secrets needed.

runbook.md gets the full rollback procedure: clever activity to find
the previous OK release, clever deploy --commit to swap back, curl
/api/health to verify, postmortem requirement.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5.6: Push**

```bash
git push origin main
```

---

## Task 6: One-time external infrastructure setup

**This task changes no files in the repo.** It is the operator checklist that prepares the live environment so Task 7 (first deploy) can succeed. Walk top to bottom — every step is required.

- [ ] **Step 6.1: Create the Clever Cloud app**

```bash
clever login                          # browser flow, one-time
clever create --type node agel-outreach
```

Note the app ID printed.

- [ ] **Step 6.2: Create and link the Postgres addon**

```bash
clever addon create postgresql-addon --plan dev agel-outreach-db
clever service link-addon agel-outreach-db --alias agel-outreach
```

`dev` plan is fine for now. Upgrade later if needed.

- [ ] **Step 6.3: Set the Bun runtime engines hint**

Clever's Node builder auto-detects Bun from `bun.lock`. No config change
needed, but verify:

```bash
clever env --alias agel-outreach | grep -E "CC_(NODE|RUN)"
```

If `CC_PRE_BUILD_HOOK` is set to something unrelated, remove it.

- [ ] **Step 6.4: Configure the Resend domain at Hostinger DNS**

1. Resend dashboard → Domains → Add Domain → `agelpartners.com`.
2. Resend prints 3 DNS records. Copy them.
3. Hostinger panel → Domains → `agelpartners.com` → DNS / Nameservers:
   - SPF: TXT `@` → value from Resend
   - DKIM: CNAME `resend._domainkey` → value from Resend
   - DMARC: TXT `_dmarc` → `v=DMARC1; p=quarantine; rua=mailto:dmarc@agelpartners.com`
4. Wait 5–60 minutes. Resend's domain page flips to **Verified**.

- [ ] **Step 6.5: Create the Resend webhook**

Resend dashboard → Webhooks → Add Endpoint:
- URL: `https://<prod-url>/api/webhooks/resend`
- Events: `email.delivered`, `email.opened`, `email.bounced`, `email.complained`

Copy the signing secret (`whsec_…`) into a scratch file for step 6.7.

- [ ] **Step 6.6: Create the Google OAuth client**

1. Google Cloud Console → APIs & Services → Credentials → Create
   Credentials → OAuth 2.0 Client ID → Web application.
2. Authorized redirect URI: `https://<prod-url>/api/auth/callback/google`
3. Copy the Client ID and Client Secret into the scratch file.

- [ ] **Step 6.7: Set the Clever Cloud env vars**

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Then set everything:

```bash
APP=agel-outreach
PROD_URL="https://<your-prod-url>"     # ← replace

clever env set DATABASE_URL '${POSTGRESQL_ADDON_URI}' --alias $APP
clever env set AUTH_SECRET '<generated-secret>'        --alias $APP
clever env set AUTH_TRUST_HOST true                    --alias $APP
clever env set NEXTAUTH_URL "$PROD_URL"                --alias $APP
clever env set APP_URL "$PROD_URL"                     --alias $APP
clever env set AUTH_GOOGLE_ID '<from-step-6.6>'        --alias $APP
clever env set AUTH_GOOGLE_SECRET '<from-step-6.6>'    --alias $APP
clever env set AUTH_ALLOWED_DOMAINS "groupe-agel.com,agelpartners.com" --alias $APP
clever env set MAIL_TRANSPORT resend                   --alias $APP
clever env set RESEND_API_KEY '<resend-key>'           --alias $APP
clever env set RESEND_FROM_DOMAIN agelpartners.com     --alias $APP
clever env set RESEND_DEFAULT_FROM_EMAIL outreach@agelpartners.com --alias $APP
clever env set RESEND_WEBHOOK_SECRET '<from-step-6.5>' --alias $APP
clever env set CRON_SECRET '<openssl rand -hex 24>'    --alias $APP
clever env set DEV_SKIP_AUTH false                     --alias $APP
```

Verify:

```bash
clever env --alias agel-outreach | sort
```

You should see all 15 vars set (plus the addon-injected `POSTGRESQL_ADDON_URI` and `PORT`).

- [ ] **Step 6.8: Capture Clever CLI credentials for GitHub Actions**

```bash
cat ~/.config/clever-cloud/clever-tools.json
```

Note the `token` and `secret` strings.

- [ ] **Step 6.9: Capture the Postgres URI for GitHub Actions**

```bash
clever env --alias agel-outreach | grep POSTGRESQL_ADDON_URI
```

Copy the URI.

- [ ] **Step 6.10: Add the four GitHub Actions secrets**

GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `CLEVER_TOKEN` | from step 6.8 |
| `CLEVER_SECRET` | from step 6.8 |
| `PROD_DATABASE_URL` | from step 6.9 (the full `postgresql://…` URI) |
| `PROD_APP_URL` | the prod URL, e.g. `https://outreach.agelpartners.com` |

- [ ] **Step 6.11: Enable branch protection on `main`**

GitHub repo → Settings → Branches → Add branch ruleset:
- Branch name pattern: `main`
- Require a pull request before merging: ✓
- Require status checks to pass: ✓
  - Status check that must pass: **CI**
- Block force pushes: ✓
- Restrict deletions: ✓

Leave "Require approvals" off until the team grows past one engineer.

- [ ] **Step 6.12: Point the prod URL at the Clever app**

```bash
clever domain add outreach.agelpartners.com --alias agel-outreach
```

Then in Hostinger DNS, add a CNAME:
- Host: `outreach`
- Value: `<app-id>.cleverapps.io` (from `clever published-config --alias agel-outreach`)
- TTL: 3600

Or A-record approach if Clever provides static IPs in your plan.

Wait for DNS propagation (`dig outreach.agelpartners.com` resolves).

---

## Task 7: First deploy + verification

- [ ] **Step 7.1: Trigger the deploy workflow**

GitHub repo → Actions → Deploy → Run workflow:
- Branch: `main`
- `confirm`: `DEPLOY`

Click "Run workflow".

- [ ] **Step 7.2: Watch the run**

Open the run. Expected sequence (≈ 5–8 min total):

| Step | Expected |
|---|---|
| Refuse unconfirmed runs | skipped (confirm == DEPLOY) |
| Setup Bun, install | green |
| Re-gate | green |
| Apply DB migrations against prod | prints `migrations applied`. First run creates all 3 migrations. |
| Install Clever Cloud CLI | green |
| Authenticate Clever CLI | green |
| Tag the deploy with the commit sha | green |
| Deploy | green. Streams `clever deploy` output. Ends with the Clever URL. |
| Smoke test — /api/health | `health OK` |
| Smoke test — /login renders | `login OK` |
| Job summary | shows commit + URL + Status: success |

- [ ] **Step 7.3: Verify from outside the workflow**

From your laptop:

```bash
curl -fsS https://<prod-url>/api/health | jq .
```

Expected:
```json
{ "ok": true, "sha": "<the-deployed-commit-sha>", "db": "up" }
```

Open `https://<prod-url>/login` in a browser. The Google sign-in card
should render.

Sign in with a `@groupe-agel.com` or `@agelpartners.com` account. You
should land on `/campaigns`.

- [ ] **Step 7.4: Send a tiny real campaign as the end-to-end check**

In the UI:
1. Templates → use any existing template (or duplicate the seed
   `clever-cloud-early-access` if seeded).
2. Campaigns → New → upload a 1-row CSV with your own email address.
3. Preview → looks right → "Send now".

Within a few seconds:
- Resend dashboard shows the email in **Sent**, then **Delivered**.
- Your inbox receives it from `outreach@agelpartners.com`.
- `/campaigns/<id>` reflects `delivered` (the webhook fires).

If any of those don't happen, do **not** proceed. Roll back per
`docs/operations/runbook.md` and investigate.

- [ ] **Step 7.5: Wire the cron dispatcher**

Pick the cron transport (Clever Cron addon is simplest):

```bash
clever addon create cron-addon --plan dev outreach-cron
```

In the addon dashboard, add a job:
- Schedule: `*/1 * * * *`
- Command: `curl -X POST -H "x-cron-secret: $CRON_SECRET" https://<prod-url>/api/cron/dispatch`

Send another tiny campaign, but pick "Schedule for later" with a time
1–2 minutes in the future. Verify the cron tick picks it up within 60
seconds of `scheduledAt`.

- [ ] **Step 7.6: Mark project status**

Update `docs/overview/project-status.md`:

```diff
- Status: pre-production (no live deploy yet)
+ Status: production — deployed to <prod-url> on 2026-06-04
+ CI/CD: GitHub Actions; deploys manually-triggered via Actions tab
```

Commit:

```bash
git add docs/overview/project-status.md
git commit -m "Mark project status as production

First successful pipeline deploy on 2026-06-04. CI/CD via GitHub
Actions, deploys triggered manually from the Actions tab.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Done. Verification checklist

After Task 7, confirm all of the following:

- [ ] Every push and PR triggers a CI run that finishes green
- [ ] `main` is protected — direct push is rejected, CI must pass to merge
- [ ] `https://<prod-url>/api/health` returns `{ok:true, db:"up", sha:"…"}`
- [ ] `https://<prod-url>/login` renders the Google sign-in card
- [ ] A 1-row campaign sends, lands in the inbox, and `/campaigns/<id>` shows `delivered`
- [ ] `clever activity --alias agel-outreach` lists the deploy with the current commit sha
- [ ] The 4 GH secrets exist; no env var with a real value is anywhere in the repo or in commit history
