# AGEL Outreach — Feature Catalogue

> A living catalogue of every feature that exists, is being built, or could be built to help the AGEL team run outreach campaigns more effectively. Use this as a roadmap reference, planning document, and shared vocabulary.

Last updated: 2026-06-04

---

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ | Shipped — available today in production |
| 🚧 | In progress |
| 🔭 | Backlog — designed, not started |
| 💡 | Idea — worth considering, not yet specced |

Effort estimates are rough: **S** = <2 hrs, **M** = ½ day, **L** = 1–3 days, **XL** = > 3 days.

---

## 1. Already shipped ✅

These are live in production today.

| Feature | What it does |
|---|---|
| **Email + password authentication** | NextAuth-based sign-in with bcrypt-style scrypt password hashing. Sessions stored as JWTs. |
| **Per-user SMTP configuration** | Each user enters their own SMTP host/port/user/password from `/settings/profile`. Sends go from their own mailbox. |
| **Encrypted credential storage** | SMTP passwords stored with AES-256-GCM, key derived from `AUTH_SECRET`. Never readable in DB or logs. |
| **SMTP "Test connection" button** | Verifies the credentials via `nodemailer.verify()` before saving. |
| **Required-SMTP guardrail** | In production, sending fails with a friendly "Configure your mailbox in Settings → Mail server" message instead of silently using fallback credentials. |
| **Mailbox-not-configured banner** | A friendly banner appears on every page until the user sets up their mailbox. |
| **MJML template editor** | Monaco-based editor with live preview, variable extraction, MJML compilation server-side. |
| **Campaigns** | Multi-step flow: template → contacts → preview → send. Each step has its own validation. |
| **Contacts upload** | Accepts `.json`, `.csv`, `.xlsx`. Auto-detects email column. Validates per row. |
| **Sample contact downloads** | One-click download of a starter file in any of the three formats. |
| **Saved contact lists** | Save an audience once, reuse across campaigns. List index, create, view, delete. |
| **Test-send to yourself** | Render the campaign with a real contact row and send only to your own address. |
| **Scheduled sends** | Pick a future datetime; cron dispatcher picks it up when due. |
| **Per-recipient send status** | Real-time table of QUEUED / SENT / DELIVERED / FAILED / OPENED per contact, with error messages. |
| **Confirmation modal before send** | Type the recipient count to confirm — prevents accidental large sends. |
| **Profile management** | Name, default from-name, default reply-to, signature, password change. |
| **Role-based access** | `USER` and `SUPERADMIN`. SUPERADMINs see the **Users** management page. |
| **API tokens** | Hashed token-based REST API for programmatic campaign creation (page hidden from nav but route exists). |
| **CI/CD pipeline** | GitHub Actions workflow → SSH push to Clever Cloud on every `main` merge. Migrate + seed workflows are manual-trigger. |
| **AGEL branded UI** | Brand colors, serif/sans/mono font system, maroon/blush palette, custom favicon. |

---

## 2. Must-haves (legal & safety) 🔭

Build these before scaling outreach volume.

### Unsubscribe link & opt-out page
**Effort: S–M.** Legal requirement under GDPR (EU), CAN-SPAM (US), CASL (Canada).
- Add `unsubscribed_at`, `unsubscribed_via` to `contact_list_member` (and a global suppression table).
- Auto-inject `{{unsubscribe_url}}` into every campaign with a per-recipient token.
- Public `/u/[token]` page (no auth) with one-click unsubscribe.
- At send time, refuse to send to suppressed contacts (raise a clear error in the campaign report).

### Suppression list (do-not-contact)
**Effort: S.** A global blocklist of email addresses regardless of which list they're on. Use cases: bounces, complaints, unsubscribes, and manually flagged "do not contact" addresses.

### Daily send-rate limit per user
**Effort: S.** Hostinger mailboxes typically cap at 300/day on shared plans. Exceeding can suspend the whole account.
- Configurable per-user cap (default 300).
- Counter resets at midnight in user's timezone.
- Refuse at send time with "You've used 287/300 today; try again tomorrow."
- Show remaining quota in the campaign confirmation modal.

### GDPR data-subject request handler
**Effort: M.** When a contact emails you asking "what data do you have on me?", you can generate a JSON export of every row across every list + every campaign that sent to that address. One-page admin tool.

### Privacy policy & footer
**Effort: S.** A `Privacy` link in the email footer pointing to your policy hosted on `agelpartners.com`. Required by most providers and GDPR.

---

## 3. Productivity wins 🔭

These pay back daily for the team.

### Drafts
**Effort: S.** The `DRAFT` status already exists in the schema. Expose it: save a half-finished campaign and resume later.

### Duplicate a campaign
**Effort: S.** "Duplicate" button on a campaign that copies template, subject, sender info, schedule — but starts with empty contacts.

### List editing
**Effort: M.** Rename, edit description, add/remove individual members on an existing list. Today: delete and recreate.

### List sharing across users
**Effort: M.** Mark a list as "shared with team" so colleagues can use it in their own campaigns.

### Bulk actions
**Effort: S.** Multi-select campaigns to archive, delete, or duplicate at once.

### Search & filter
**Effort: M.** Free-text search by name, filter by status (draft/sent/scheduled/failed), date range, sender.

### Keyboard shortcuts
**Effort: S.** ⌘K for command palette, ⌘N for new campaign, J/K to navigate lists, etc.

### Onboarding tour
**Effort: M.** First-time-login walkthrough that guides users through SMTP setup, creating a template, uploading contacts, sending a test.

---

## 4. Engagement & analytics 🔭

Turn outreach from a black box into a measurable funnel.

### Per-campaign analytics dashboard
**Effort: M.** Open rate, delivery rate, fail rate, reply rate. Timeline of opens over the first 72 hours. Per-recipient breakdown.

### Click tracking
**Effort: M.** Wrap outbound links in tracking redirects (`/c/[token]`), log clicks per recipient.

### Open tracking pixel
**Effort: S.** A 1×1 transparent GIF served from `/o/[token].gif`. Note: many corporate mail clients block this.

### Best send-time recommendations
**Effort: L.** After enough campaign data, suggest send times based on when this audience usually opens.

### A/B testing
**Effort: L.** Send variant A to half, variant B to half. Auto-pick the winner by open rate after N hours and send to the rest.

### Campaign comparison
**Effort: M.** "Compare campaign X vs campaign Y" — side-by-side open/click/reply metrics.

### CSV export
**Effort: S.** Per-campaign export of recipient statuses + merge data + timestamps for offline analysis.

### Live dashboard
**Effort: M.** A `/dashboard` page showing aggregate stats this week / month: campaigns sent, recipients reached, average open rate, top templates.

---

## 5. Reply handling 🔭

The single biggest UX win for an outbound team.

### IMAP reply tracking
**Effort: L.** Poll each user's IMAP inbox in the background; match incoming messages to outbound campaigns by `Message-ID` / `In-Reply-To`. Update recipient status to `REPLIED`.

### In-app inbox view
**Effort: L.** A timeline of replies received per campaign — read, archive, mark as deal-won/lost.

### Auto-categorize replies
**Effort: L.** Classify replies as: interested / not-interested / out-of-office / auto-reply / human. Use an LLM or simple regex heuristics for the first pass.

### Auto-pause on reply
**Effort: S** (once reply tracking exists). If a contact replies to step 1 of a sequence, don't send step 2.

### Reply templates
**Effort: S.** A small library of quick-reply snippets per user.

---

## 6. Deliverability & quality 🔭

Keep emails out of spam folders.

### Pre-send spam-score check
**Effort: M.** Analyze subject + body for spam triggers (ALL CAPS, excessive `!`, "free", "click here"). Show a 0–10 score before send.

### Template linting
**Effort: S.** Warn if MJML references variables not in contacts, has broken tag closures, or missing alt-text on images.

### Domain authentication wizard
**Effort: M.** Walk users through setting up SPF, DKIM, and DMARC on their domain. Verify by DNS lookup.

### Deliverability score per user
**Effort: L.** Track bounce rate, complaint rate, and open rate. Show a 0–100 score; warn if degrading.

### Inbox preview (Litmus-style)
**Effort: XL.** Show how the email renders in Gmail web, Apple Mail, Outlook desktop, mobile clients. Needs third-party API ($).

### Image alt-text validation
**Effort: S.** Refuse to send if `<mj-image>` is missing `alt`. Hurts accessibility and deliverability.

---

## 7. Sequences & automation 🔭

### Multi-step sequences
**Effort: L.** "Send step 1; if no reply in 5 days, send step 2; if still no reply, send step 3." Each step has its own template + subject + delay.

### Conditional logic
**Effort: L** (on top of sequences). "If opened step 1 but didn't click, send X; if didn't open, send Y."

### Drip campaigns
**Effort: M.** Recurring sends to a list on a schedule (every Monday at 9 AM, etc.).

### Time-zone aware sending
**Effort: M.** Send at "9 AM local time" per recipient, computed from a `timezone` column.

---

## 8. Team & collaboration 🔭

### Audit log
**Effort: S.** SUPERADMINs see who sent what, when, to whom, with the result.

### Shared template library
**Effort: M.** Templates tagged "team" are visible to everyone, not just the creator.

### Approval workflow
**Effort: L.** Require a SUPERADMIN to approve any campaign over N recipients before send.

### Comments on templates / campaigns
**Effort: M.** In-line comments so a colleague can suggest edits before send.

### Mentions & notifications
**Effort: M.** `@yassine` in a comment notifies them in-app + email.

### Activity feed
**Effort: S.** Per-user feed: "Marie sent campaign X to 230 recipients", "Ahmed created list Y".

---

## 9. Contact management 🔭

Becomes more important as the contact database grows.

### Unified contact profile
**Effort: L.** Click an email address anywhere to see: every list they're on, every campaign sent, every reply, all merge data. A mini CRM.

### Custom fields
**Effort: M.** Beyond `email`, `name`, `organization`, let users define their own fields per list (e.g., `deal_size`, `last_meeting_date`).

### Tags
**Effort: S.** Tag contacts (`vip`, `partner`, `cold-lead`) and filter lists by tag.

### Contact deduplication
**Effort: M.** Cross-list dedup: if `alice@example.com` is in 3 lists, show it once with a "which lists" indicator.

### Import from Google / Outlook
**Effort: L.** OAuth into Google Contacts or Microsoft Graph and pull contacts.

### Auto-bounce handling
**Effort: M.** Parse bounce notifications from IMAP. Auto-add hard-bounced addresses to the suppression list.

---

## 10. Templates & content 🔭

### Template version history
**Effort: M.** Each save creates a new version; rollback to any prior version.

### Template variables manager
**Effort: S.** A panel showing every variable used by the current template with sample values for preview.

### Image hosting / asset library
**Effort: M.** Upload images, store on Clever Cellar / S3, paste URLs into MJML. Or one-click insert with a toolbar button (additional effort).

### Multi-language variants
**Effort: M.** A template can have FR, EN, AR variants. Send the right one based on a contact's `locale` field.

### Template categories
**Effort: S.** Group templates: "Cold outreach", "Welcome series", "Newsletters", etc.

### AI-assisted writing
**Effort: M.** "Rewrite this for a warmer tone" / "Make it shorter" via Claude API. Saves drafts as suggestions, never sends without confirmation.

---

## 11. Integrations 🔭

### Webhooks
**Effort: M.** Fire HTTP POSTs to a configured URL on events: `campaign.sent`, `recipient.opened`, `recipient.replied`. Lets you wire into Slack, n8n, anything.

### Native Slack notifications
**Effort: S** (uses the webhook foundation). Post in a Slack channel when a campaign finishes.

### Zapier / Make / n8n
**Effort: M.** Public API + auth, plus a few "trigger" endpoints so external automation tools can connect.

### Calendar booking links
**Effort: S.** Auto-inject Calendly / Cal.com booking links per user as a merge var.

### CRM sync (HubSpot, Pipedrive)
**Effort: L.** Two-way sync of contacts + campaign activity.

---

## 12. Advanced / future ideas 💡

These are bigger bets — worth considering once the basics are rock solid.

- **Per-recipient send personalization at AI scale** — generate 3 unique opening lines per contact from their LinkedIn / company data, automatically.
- **Inbox warm-up** — slowly ramp send volume on a new mailbox to build sender reputation. Some tools (Smartlead, Instantly) do this and it's surprisingly valuable.
- **Native mobile companion app** — view replies and stats from your phone.
- **Voice notes in emails** — record a short audio clip, hosted, included as a link with a preview thumbnail.
- **Video personalization (Loom-style thumbnails)** — auto-generate a thumbnail of a Loom video with the recipient's name overlaid.
- **Custom tracking domains** — `links.agelpartners.com/c/xxx` instead of generic tracking URLs. Better deliverability and brand consistency.
- **Public campaign report links** — share a read-only stats URL with stakeholders who don't have an account.
- **Real-time collaboration** — multiple people editing the same template at once (Google Docs-style).
- **AI subject-line suggester** — generate 5 subject line variants, predict open rate for each.

---

## How to read this catalogue

- **For planning sprints:** Pick from §2 (legal) first, then §3 (productivity wins) to compound returns daily. §5 (reply handling) is the highest-leverage feature for outbound sales — schedule it when you have a 1–3 day window.
- **For prioritization arguments:** Effort tags + impact category give you a quick way to argue tradeoffs. "An A/B test (L) vs a daily-send-limit (S)" — the S wins almost every time.
- **For onboarding:** Skim §1 to understand what's already built before adding to it.

Open a ClickUp ticket in the Outreach list when you start work on any feature here. Cross-reference the section + feature name in the ticket description.
