# ADR-018 — Workflows by concern, repository profiles, speed budgets and a health scorecard

- Status: Accepted (slice 1 shipped with this ADR; the next slices are filed in krizaka-internal, `lane:platform`)
- Date: 2026-10-30
- Owner: Platform lane
- Founder's mandate (2026-10-30): restudy the reusable workflows (granularity, naming, the right check at the right
  moment), make every repository **fast** (the workflows serve the repositories, never slow them), « automatiser,
  automatiser, automatiser » with standard tools and buildpacks, and a **repository health scorecard** that proves the
  rules are applied and the repositories kept up to date.

## 1. Inventory, measured (REST API, 2026-10-23 22:30 → 2026-10-30 22:30 UTC)

Read with the agents' app (REST only): every workflow file of the 40 non-archived repositories, the rulesets and
branch protections of `main`, every workflow run of the week, and the organisation's billing usage. The numbers below
are reproducible with `scripts/ci-speed.mjs` (the feedback times) and the billing endpoint
(`orgs/krizaka/settings/billing/usage`).

| What | Measured |
| :--- | :--- |
| Workflow runs | **16,003** in 7 days: 5,515 `pull_request`, 4,117 `dynamic` (CodeQL default setup, Dependabot, Pages), 2,547 `push`, 2,542 `pull_request_target`, 710 `merge_group`, 287 `repository_dispatch`, 125 `schedule` |
| Runner minutes | **224,320 Linux + 938 macOS** (Oct 24–30): $1,398 at list price, **$0 net** (public repositories). The bill is zero; the *time* is not — it is the lanes' waiting. |
| Where | yomizaka 55k · akinaza 50k · krizaka-ui 49k · .github 18k · krizaka-ts 13k · orazaka 11k · krizaka-com 7k |
| Conclusions | 11,902 success · 2,495 skipped · 1,083 failure · 423 cancelled (superseded) · 47 startup failures |
| Runs that did nothing | 2,495 skipped `pull_request_target` runs of `dependabot-automerge` (one per PR in 37 repositories, 0 minutes but one more check row each); 103 of 167 « Docs regenerate » runs of orazaka and 82 of 134 « Security scan » runs under 45 s; **287 « Changelog rebuild » runs (31.8 h)** — one forced krizaka.com rebuild per product release, 253 in three days, each runner waiting `--wait` ≈ 6.6 min |
| Red | krizaka-ui `CI` 115 failures of 262 runs (44 %); orazaka-web-client « Dev preview live » 45 of 50 |

### The reusable workflows and their callers

| Workflow | Callers | Distinct pins |
| :--- | --: | --: |
| `security-scan.yml` | 39 | 8 |
| `dependabot-automerge.yml` | 37 | 7 |
| `release-notes.yml` | 16 | 5 |
| `node-ci.yml` | 10 | 5 |
| `bump-krizaka.yml` | 9 | 4 |
| `python-ci.yml` (2 repos) · `maven.yml` 7 · `tauri-macos.yml` (4 repos) · `mobile-e2e.yml` (4) · `visual-regression.yml` (3) · `post-deploy.yml` 4 · `app-videos.yml` 4 · `expo-ci.yml` 4 · `java-ci.yml` 2 · `maven-github-packages.yml` 2 · `deploy-watch.yml` 1 · `krizaka-ci.yml` 1 | | 1–3 |

The Orazaka components (13 repositories) call `component.yml` of krizaka/orazaka, not this repository. Five
repositories run on a merge queue (krizaka-com, krizaka-ui, yomizaka, akinaza, krizaka-ts); the required checks of
each repository are in the scorecard (§ 7) rather than copied here.

### Speed: feedback at the 90th percentile (minutes; budget: PR 10, merge queue 15)

| Repository | PR p50 | PR p90 | Queue p50 | Queue p90 | Critical path, measured on three green queue runs |
| :--- | --: | --: | --: | --: | :--- |
| akinaza | 26.4 | **31.9** | 26.3 | **30.7** | `Verify (build)` 24.9 min = after-build crawls 14.6 + **the tests again, 8.9** + build 0.7; Maestro (Android) 19.9 |
| krizaka-ui | 19.3 | **27.1** | 27.3 | **29.5** | one serial job « Type-check, test, build » 24.1 min (not on node-ci); three documentation crawls ≈ 10 min each |
| yomizaka | 16.5 | **26.6** | 15.7 | **21.1** | `Verify (build)` 10.5 min = after-build 4.8 + **the tests again, 4.1** |
| orazaka | 4.5 | **33.0** | — | — | the workspace build of the upstreams |
| krizaka-com | 10.5 | **14.1** | 10.6 | 13.9 | `Container image` 7.9 min (the image smoke 5.3) |
| Orazaka services | 6–12 | 11–19 | — | — | the Maven workspace (`component / verify`) |
| the libraries (krizaka-ts, krizaka-build, orazaka-cli, …) | 2–6 | 5–9 | 4.8 | 8.4 | within budget |

**The first win is a bug.** Since the build pack (2026-10-25, #224) the `build` leg of `node-ci.yml` in
`parallel: true` mode runs the test script again after the `test` leg already ran it (v1.3 ran it once). It costs
akinaza 8.9 minutes and yomizaka 4.1 minutes on the critical path of every PR and every queue entry. Slice 1 removes it
(§ 9).

### Rules checked by reading today, and their automated check

Scanned: `AGENT-RULES.md`, the lanes' handoffs, `docs/standards/rules.json` (21 rules, each with its check).

| Rule (today read by an agent) | Automated check | State |
| :--- | :--- | :--- |
| Issue title `<repo> · <type>(<scope>): …` + `repo:`/`product:`/`lane:`/`type:` labels | krizaka-internal triage (`needs-triage`) + the local hook | exists |
| Every issue has a type and a parent Feature | `issue-tree audit` (.github#367) | PR open, to land |
| At most 5 open PRs per repository | `pr-cap.yml` | exists |
| One fan-out PR per repository at a time; a PR open > 3 days is reported | the scorecard's `prs` cell (count, age, fan-out PRs per repo) | **slice 2** |
| A PR closes or refs a sub-issue (`Closes krizaka/krizaka-internal#n`) | `pr-links-issue` check in `security-scan`'s caller set (title/body read, no model) | **slice 6** |
| No internal issue in a public repository | `public-issues-scan.yml` + conformance (.github#452) | exists / PR open |
| Every org rule reaches every active repository | `conformance.yml` (the matrix) | exists, read by the scorecard |
| Pins current (no stale `krizaka/.github` pin) | `callers-report.yml` (report only) | becomes a scorecard cell (8 pins of security-scan today) |
| Speed budgets | `org-ci-speed.yml` + `scripts/ci-speed.mjs` | **slice 1** |
| Every test file of this repository runs in CI | the CI lists its tests by hand (`lint-workflows.yml`) | **slice 6**: a test that every `*.test.mjs` is listed |
| Board: Next ≤ 30 cards, every new issue on the board with a Status | `board-structure.py` (by hand) | **slice 6**: scheduled, red in the scorecard |
| Films start on a meaningful frame, no idle stretch | `actions/app-videos` (first frames) | exists for the web films; Mac films pending |
| A bug ships with its guard | `fix-needs-guard` job of node-ci / java-ci | exists |
| Docs and READMEs current | `docs-current.yml`, `gen-docs --check` | exists |
| Claims true to the code, product judgement, design taste | — | stays a review (cannot be automated) |

## 2. Taxonomy: `<area>-<what>.yml`, one purpose each

Areas: `ci` (the per-stack pipelines), `ui`, `mobile`, `desktop`, `media`, `docs`, `security`, `deps`, `release`,
`deploy`, `seo`, `issues`, `pr`, `org` (the organisation's scheduled reports). Job names are **literal** (a skipped job
never evaluates `${{ }}`; the 2026-10-30 lesson, `tests/literal-job-names.test.mjs`).

| Today | Becomes | Moment |
| :--- | :--- | :--- |
| `node-ci.yml` | `ci-node.yml` | PR, merge_group, main |
| `java-ci.yml` · `maven.yml` (verify part) | `ci-java.yml` | PR, merge_group, main |
| `expo-ci.yml` · `python-ci.yml` · `krizaka-ci.yml` | `ci-expo.yml` · `ci-python.yml` · `ci-auto.yml` | PR, merge_group |
| `changes.yml` | `ci-changes.yml` (the fail-open gate, a building block) | inside the others |
| `visual-regression.yml` | `ui-visual.yml` (only when UI files change) | PR, merge_group |
| — (axe runs inside after-build scripts today) | `ui-a11y.yml` | PR, merge_group |
| `mobile-e2e.yml` | unchanged (already `<area>-<what>`) | PR, merge_group |
| `tauri-macos.yml` | `desktop-macos.yml` | PR (unsigned), main/tag (signed) |
| `app-videos.yml` · `brand-icons-sync.yml` | `media-films.yml` · `media-brand-icons.yml` | main, schedule |
| `docs-current.yml` | unchanged; `docs-site.yml` (build + lychee links) for the docs profile | PR, schedule |
| `security-scan.yml` · `scorecard.yml` | unchanged · `security-scorecard.yml` | PR, merge_group · schedule |
| `dependabot-automerge.yml` · `bump-krizaka.yml` · `propagate-pins.yml` | `deps-automerge.yml` · `deps-bump-krizaka.yml` · `deps-propagate-pins.yml` | Dependabot PRs · release · push |
| `release-notes.yml` · `maven.yml` (publish part) · `maven-github-packages.yml` · `changelog-rebuild.yml` | unchanged · `release-maven-central.yml` · `release-maven-packages.yml` · `release-changelog.yml` | tag / release |
| `deploy-watch.yml` | unchanged | main, schedule |
| `post-deploy.yml` · `seo-family.yml` | `seo-post-deploy.yml` · unchanged | deploy · schedule |
| `feature-surfaces.yml` · `public-issues-scan.yml` · `roadmap-sync.yml` | `issues-surfaces.yml` · `issues-public-scan.yml` · `issues-roadmap.yml` | issues events, schedule |
| `pr-cap.yml` | unchanged | PR, schedule |
| `callers-report.yml` · `weekly-digest.yml` · `conformance.yml` · `repos-registry.yml` · `repository-names.yml` · `profile*.yml` · `audit-guards.yml` | `org-callers` · `org-digest` · `org-conformance` · `org-registry` · `org-names` · `org-profile*` · `org-audit-guards` | schedule |
| — | **`org-ci-speed.yml`** (slice 1) · **`org-health.yml`** (slice 2) | schedule |

**A file rename never renames a check.** GitHub names a reusable workflow's check « *caller job* / *job name* »: the
file name is not in it. The renames therefore need no protection change. The only required-check renames are the
legacy shims still required by name, listed for the CTO (protection change, founder login):

| Repository | Required today | Becomes |
| :--- | :--- | :--- |
| krizaka-ui | `Type-check, test, build`, `Documentation site (ui.krizaka.com)` | `ci / CI gate` (when krizaka-ui moves to ci-node, slice 4) |
| krizaka-blog | `Lint, tests, build` | `ci / CI gate` |
| krizaka-lab | `Typecheck, build, test` | `ci / CI gate` |
| template-next-app | `Lint · Typecheck · Tests · Build` | `ci / CI gate` |
| krizaka-build | `Static site` | `docs-site / gate` |

## 3. Repository profiles, default sets, tunable inputs

`docs/standards/ci-profiles.json` declares the profiles (`library`, `app-web`, `app-mobile`, `app-desktop`,
`java-service`, `worker`, `site`, `docs`, `infra`, `org`), each with its default workflows and its optional ones, and
maps every active repository of `repos.json` to one or more profiles (akinaza is `app-web` + `app-mobile`; a test
refuses an active repository without a profile). A repository composes what it needs: every workflow keeps inputs for
the jobs it runs, `relevant` / `ignore` (path filters through the fail-open gate), `timeout-minutes`, shards
(`e2e-shards`), `parallel`, caches (`turbo-cache`, `next-cache-paths`). Slice 3 adds a caller template per profile
(`workflow-templates/<profile>/`) and a conformance rule `ci-profile`: the repository calls its profile's set.

## 4. Speed budgets, measured and reported

- **PR < 10 min, merge queue < 15 min**, at the 90th percentile of seven days, per head commit and event (first run
  started → last run finished, cancelled and skipped runs left out). A repository may declare its own budget in
  `ci-profiles.json`; the default is the organisation's.
- `scripts/ci-speed.mjs` measures; `org-ci-speed.yml` (Monday 07:30 UTC, and by hand) writes the table in its summary and a
  JSON artifact; the scorecard reads it. **A workflow that pushes a repository over budget is the workflow's bug**: the
  report names the workflow that is usually the slowest of each commit.
- Fail-fast order inside every pipeline: the gate (seconds) → lint, typecheck, unit tests side by side → build → image,
  e2e shards, Sonar after verify. `concurrency` with `cancel-in-progress` on pull requests in every caller (423
  superseded runs were cancelled this week; a caller without it lets them run).

## 5. Moments

| Moment | What runs |
| :--- | :--- |
| `pull_request` | the gate, lint/types/tests, build, image when its files changed, UI checks when UI files changed, security scan |
| `merge_group` | the required set only, with the same gate on the entry's diff (`ci-changes` already compares the queue entry with its base) |
| `push` to main | films, releases, docs refresh, drift checks; never the PR checks again unless a deploy needs the artifact |
| `schedule` | scans (Scorecard, osv), migrations check, pin cap, the org reports (callers, conformance, speed, health) |
| deploy | `seo-post-deploy`, `deploy-watch`; `release-changelog` coalesced (slice 5) |

## 6. Caches, images and buildpacks

- Caches: npm/pnpm store (setup-node), `.next/cache`, `.turbo`, Playwright browsers, `~/.m2`, uv/pip — already in the
  build pack's `setup`/`build`/`after-build`. Measured earlier: a buildx Actions-cache layer cache was slower than a
  plain `docker build` (94 s vs 77 s) and competes for the 10 GB; it stays off.
- **Cloud Native Buildpacks where they fit** (SBOM inside the image, reproducible, cached layers, no Dockerfile to
  maintain): the Spring services build with `spring-boot:build-image` (Paketo, already in Spring Boot) — first
  `orazaka-conversation-service`, whose Dockerfile goes; the Next.js apps (krizaka-com, akinaza, yomizaka,
  template-next-app) trial the Paketo Node.js buildpack on template-next-app first, adopted only if build time and image
  size are not worse than the Dockerfile by more than 20 % (measured in the PR). DigitalOcean App Platform builds CNB
  natively, so the deploy path does not change.
- **Dockerfiles kept, with their reason**: `orazaka-worker-media/Dockerfile.cuda` and `orazaka/infra/compute-nodes`
  (CUDA base images and the NVIDIA runtime, no buildpack covers them); `orazaka/infra/deploy/gpu-relay` (a tiny relay on
  a pinned distroless base); `yomizaka/deploy/backup` (database tooling installed from apt, outside the buildpacks'
  model); `orazaka-packs/.../forensics` (native forensics libraries).

## 7. The repository health scorecard (founder, 2026-10-30)

« Une solution automatisée pour contrôler que les règles sont appliquées et que les repos sont maintenus à jour. »
`org-health.yml` (daily) writes `health.json` (one object per non-archived repository, each cell `ok | warn | red` with
its evidence URL) and a page the cockpit and the 7-hour summary read; it composes **existing sources, nothing re-measured**:

| Cell | Source |
| :--- | :--- |
| Rules applied | the conformance matrix (`scripts/conformance.mjs --json`), which already carries `rules.json` + the AGENT-RULES rules turned into checks (§ 1) |
| Supply chain | OpenSSF Scorecard results (the `scorecard` rule's SARIF / the public API) |
| Freshness | Dependabot alerts and open version PRs (REST), `callers-report` stale pins, the toolchain versions (`expo-sdk.json`, Node/Java versions of the callers), the last non-bot commit |
| CI green on main | the latest completed runs on `main` (REST) |
| Code quality | SonarCloud API: quality gate, complexity, duplication (`api/qualitygates/project_status`, `api/measures/component`) |
| PRs | open count ≤ 5, age > 3 days, fan-out PRs per repository (`pr-cap.mjs`) |
| Issues private | `scan-public-issues.mjs` |
| Required checks | the ruleset of `main` contains the profile's required set |
| Release flow | the last release / tag and its release-please PR (when the profile releases) |
| Speed | `ci-speed.mjs` (§ 4) |

A repository with a red cell is **red**: the scorecard opens (or updates) one issue per drifting repository in
krizaka-internal (`<repo> · chore(health): …`, `repo:` · `product:` · `lane:platform` · `type:chore`), and a lane
does not start a new feature issue in a red repository until it is green again (AGENT-RULES gets the line when slice 2
lands). The coding standard written by the engineering session (krizaka-engineering skill + AGENTS template) adds its
checkable parts as rules of `rules.json`, which the scorecard then reads through the matrix.

## 8. Standard tools first

actionlint, zizmor, gitleaks, OpenSSF Scorecard, Dependabot (grouped), release-please / changesets, ast-grep, Playwright,
Maestro, SonarCloud, Trivy + Syft (SBOM), lychee (links, the docs profile) and markdownlint are used as they are. Our
scripts only where no tool does it: the fail-open change gate (`dorny/paths-filter` reports no « skipped » semantics for
required checks and `tj-actions/changed-files` was compromised in March 2025), the conformance matrix, the speed report
and the scorecard's composition.

## 9. Migration plan

1. **Slice 1 (this PR):** this ADR; `node-ci` build leg no longer re-runs the tests; `docs/standards/ci-profiles.json`;
   `scripts/ci-speed.mjs` + `org-ci-speed.yml`; tests. Callers get the fix with their next pin bump (Dependabot's
   `github-actions` group or `bump-krizaka`).
2. **Slice 2:** the health scorecard (§ 7).
3. **Slice 3:** the renames of § 2 — new files, the old names kept as generated identical copies (a test asserts
   identity) for one release, then deleted; one fan-out PR per repository (joined to its open fan-out PR), in landing
   order: pins → formatter → conformance; profile caller templates + the `ci-profile` rule.
4. **Slice 4:** the over-budget repositories: akinaza (shard the after-build crawls, narrow Maestro's `relevant`),
   krizaka-ui (onto ci-node, parallel legs, the shim renames above), yomizaka.
5. **Slice 5:** `release-changelog` coalesced (one rebuild per window, no runner waiting on `--wait`).
6. **Slice 6:** the manual rules of § 1 still without a check.
7. **Slice 7:** buildpacks (§ 6), measured.

Every slice: tests for its scripts, actionlint and zizmor green, landed by the train; the speed report is the measure.
