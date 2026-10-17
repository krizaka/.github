# Dev preview — the bar every Krizaka product reaches

> North star (Oussama, 2026-10-16): **every product, Orazaka included, reaches Dev preview.** Orochia is the reference.
> Decision record: [ADR-002](../adr/ADR-002-dev-preview-status-is-data.md). Schema: [dev-preview.schema.json](dev-preview.schema.json).

**Dev preview** means: the product runs for real on its dev site, only the QA accounts can use it, one real journey
works end to end on the real backend, and everything around it (UX, admin, security, SEO, docs, cost) is in order. It
is *not* a public launch: sign-up stays closed, nothing is sold, the site is `noindex` unless the SEO policy says
otherwise.

The status is **data, not words**. Each product repository carries a `dev-preview.json` (root of the repository) that
lists every criterion below with an **evidence URL** or `null`. krizaka.com may show « Dev preview » for a product only
when its checklist is complete (see *How krizaka.com uses it*).

## Assets

A product has up to three assets, each judged on its own: **web** (the dev site), **admin** (its operator console, e.g.
`admin.<product>.com`, a separate app today or a host-routed group of the product app), **mobile** (the native app).
`na` (not applicable) is allowed only where the table says so, with a reason of at least 20 characters.

## The criteria

`How to verify` is a command or a link a person can follow without asking anyone. Run the whole probe with
`node scripts/dev-preview-probe.mjs <product>` (this repository) — it checks every criterion it can check from
outside and prints what it could not.

### Web

| Id | Criterion | How to verify | `na` ok? |
| :--- | :--- | :--- | :--- |
| `site.healthy` | The dev site answers 200 on `/` and `/api/healthz` (or `/api/health`), and shows its version (`APP_VERSION`: `vX.Y.Z+sha`) | probe; `curl -fsS https://dev.<product>.com/api/healthz` | no |
| `site.signup-closed` | Sign-up is closed server-side (`AUTH_SIGNUP_ENABLED=false`): the sign-up endpoint answers 403 and a test guards it | probe (POST to the sign-up endpoint answers 403); link to the test | no |
| `site.qa-signin` | The QA account signs in on the real backend and reaches its home | `~/.krizaka-worktrees/tools/qa-accounts.sh` accounts; evidence = the e2e/CI run that signs in, or a request id | no |
| `journey.core` | The product's core journey works end to end on the real backend, with proof. **The evidence is a video of the journey** (standing rule « videos of real use cases »): recorded on the real dev backend as a demo persona (never an admin), uploaded to Bunny (`site/products/<product>/tour/…`, `scripts/cdn-assets.mjs`), shown in the product's docs and site, with the run's request ids in the PR that adds it | URL of the video (or of the docs page that plays it) + link to the PR listing the request ids and to the test that replays the journey | no |
| `journey.ai-via-orazaka` | Its AI goes through Orazaka with a real run (trace of the run, no mock, no direct vendor call); the journey video shows it | link to the Orazaka run trace (run id) and to the video; Orazaka itself: a real engine run (generation, analysis) | yes: the product has no AI feature (stated in its AGENTS) |
| `ui.krizaka-ui` | Krizaka UI only: the NAV-SYS bar (`@krizaka/ui/nav-bar`, product standard of the addendum 2026-10-15), **one** footer (« A Krizaka product »), the brand marks of `@krizaka/ui`, no hand-made bar, no hard-coded colour | `npm run lint` (ratchets) + probe (one `<footer>`) | no |
| `ui.themes-devices` | The key screens are reviewed in dark **and** light, phone **and** desktop: a Playwright crawl in CI (no cut content, no horizontal scroll, no empty tile, no console error) and reviewed screenshots | link to the CI crawl job and to the capture set on Bunny (`pr-assets/<repo>/dev-preview/`, overwritten each time) | no |
| `ux.ia-review` | **UX/IA review**: the user's jobs map to a navigation of **at most about 5 top-level items**, no mixed concepts in one menu (docs next to features next to platforms), no orphan entries (a platform or a demo alone at the top), a coherent journey for the product's real users, Krizaka UI patterns, reviewed screenshots of the key screens on phone and desktop | a `docs/UX_DECISIONS.md` entry (decision · problem · principle · refused · cost · signal) + the nav file + a test of its shape + the screenshots | no |
| `mobile.build` | Where the product needs a mobile app, a build exists (EAS development build, APK or TestFlight) and launches on the real dev backend | link to the build / tag; recording of the launch | yes: the product's AGENTS says « no mobile app » |
| `mobile.ux-review` | The `ux.ia-review` for the mobile app (tabs, jobs, one-handed reach, same journey as the web) | as `ux.ia-review`, on a simulator/device | yes: when `mobile.build` is `na` |
| `mobile.app-links` | Universal links / Android App Links work: every shareable web route opens the installed app. `/.well-known/apple-app-site-association` and `assetlinks.json` are served 200 with `application/json` and no redirect, with the right bundle id and package, and Apple's CDN and Google's Digital Asset Links API agree; CI runs `check-app-links` on every PR in the web and the mobile repository (web routes ↔ AASA/assetlinks ↔ `app.json` ↔ Expo Router screens) | `node scripts/check-app-links.mjs --live https://dev.<product>.com` (the probe runs it) | yes: when `mobile.build` is `na` |
| `quality.ci-green` | CI is green on `main` (lint, typecheck, tests, build), no check skipped | `gh run list -R krizaka/<repo> -b main -L 1` | no |
| `quality.tests` | Unit tests run in CI and a test guards each criterion of this list that code can guard (sign-up closed, gate, noindex) | CI workflow link | no |
| `security.alerts` | **No open critical or high alert** from CodeQL, Dependabot and secret scanning in the product's repositories **and in the Krizaka building blocks it deploys** (users, billing, notifications…). OpenSSF Scorecard findings are tracked, not counted, except `TokenPermissions` (fixable) | probe (`gh api repos/krizaka/<repo>/code-scanning/alerts`, `/dependabot/alerts`, `/secret-scanning/alerts`) | no |
| `docs.current` | README, AGENTS and docs describe what runs today (dev URL, version, commands, env table, admin, deployment), and the generated docs are in sync | link to the DOCS-AUDIT result for the repository | no |
| `seo.family` | The SEO family contract passes with the declared policy (`index: on|off` in the checklist; noindex sites still serve correct robots, sitemap, llms.txt) | `node scripts/check-seo-family.mjs --base https://dev.<product>.com --host https://dev.<product>.com --index off` (krizaka-com) | no |
| `ops.cost` | The dev deployment runs on the smallest instance, its monthly cost is in the cost table and in `docs/DEPLOYMENT.md`, and the organisation total is within the budget (≤ 100 USD/month cloud, GPU apart) | link to the cost table section (private: the date and figure are quoted in the evidence note) | no |

### Admin (the operator console)

| Id | Criterion | How to verify | `na` ok? |
| :--- | :--- | :--- | :--- |
| `admin.gated` | Access is gated (host + IP allow-list today, Cloudflare Access later, admin role + strong password), the console is **unreachable from the public host**, and a test proves both | link to the gate test (e.g. `test/gate.test.mts`); probe: the public host answers 404 on the console paths | yes: no operator task exists yet (construction) |
| `admin.noindex` | `noindex` everywhere: robots `Disallow: /`, `X-Robots-Tag`, meta | `node scripts/check-seo-family.mjs --base https://admin.<product>.com --host https://admin.<product>.com --console --index off` | no |
| `admin.operator-tasks` | The real operator tasks work against the **real DB**: users (list, detail, suspend/restore), content and moderation, payments and credits, settings read from the DB as parameters (draft → preview → publish → audit → rollback), and what is proper to the product | e2e run/recording of each task + request ids | partly: only the tasks the product has |
| `admin.audit-log` | Every operator action is in an audit log that the console shows, with who, what, when, request id | link to the test and to the screen | no |
| `admin.shell` | The console is the Krizaka UI admin shell (`AppShell` console, `auth-layout` for sign-in), dark and light, with the `DEV` badge | screenshots in both themes (Bunny) + lint | no |
| `admin.ux-review` | `ux.ia-review` for the console: the operator's jobs → at most about 5 sections, no mixed concepts | as `ux.ia-review` | no |
| `admin.ci` | The console's code is covered by CI with tests (own repository today, or the product repository once merged by host routing) | CI link | no |

Merging the consoles into the product apps by host routing (orochia#232, orazaka-web-admin#31) is the way to deliver
`admin.*` for every product without a new App Platform app each; the criteria do not change, only where the code lives.

## The checklist file

`dev-preview.json` at the root of each product repository (the main product repo; the admin and mobile repos of a
product that is not yet one repository are reported in the same file):

```json
{
  "$schema": "https://raw.githubusercontent.com/krizaka/.github/main/docs/standards/dev-preview.schema.json",
  "version": 1,
  "product": "orochia",
  "index": "off",
  "criteria": {
    "site.healthy": { "evidence": "https://dev.orochia.com/api/health", "checked": "2026-10-16" },
    "journey.ai-via-orazaka": { "evidence": null, "gap": "Explorer runs on a direct vendor call", "issue": "https://github.com/krizaka/orochia/issues/1" },
    "mobile.build": { "na": "No mobile app is planned for the dev preview; AGENTS.md says so." }
  }
}
```

Rules: every criterion id of this document is present; each entry is **either** `evidence` (an `https` URL) with
`checked` (`YYYY-MM-DD`), **or** `evidence: null` with a `gap` and, once filed, its `issue`, **or** `na` (only where
allowed, ≥ 20 characters). The checklist is **complete** when no entry has `evidence: null`. Evidence is re-checked: an
entry older than 60 days counts as missing for the status (re-run the probe, update `checked`).

## How krizaka.com uses it

`lib/products.ts` gives each product a `status`; `devPreview` is allowed only when the product's checklist is complete.
`scripts/gen-dev-preview.mjs` (at build, after the registry versions) reads each product's `dev-preview.json` from GitHub
raw, writes the git-ignored `lib/dev-preview-checklists.json`, and **fails the build** if a product marked `devPreview`
has an incomplete, stale or unreachable checklist or evidence. `tests/dev-preview.test.mjs` guards the rule. Other
statuses (`development`, `construction`, `upcoming`) are never gated.

## Not criteria (on purpose)

Public sign-up, payments in production, store listings, marketing, performance budgets: they belong to the public launch,
not to Dev preview.
