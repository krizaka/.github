# Guards: the registry

<!-- summary: The registry of guards that catch each lesson, and the repositories where each one runs. -->

This page lists the guards that catch each lesson, and the repos where each guard runs. It applies [a bug means a missing guard](bug-means-missing-guard.md). The decisions behind it are in [ADR-013](../adr/ADR-013-guards-and-local-sonar.md), and the earlier retro-audit is in [docs/audits/2026-10-bug-guards.md](../audits/2026-10-bug-guards.md).

**Rule:** a fix lands with its guard. A row whose guard is « missing » points to its issue. When a guard ships, update the row in the same PR.

## 1. Lessons → guards (2026-10-25 → 27)

| Bug or lesson | Guard that catches it now | Repos covered | Evidence / issue |
|---|---|---|---|
| ffmpeg operands read as options, path escape | unit test: the encoder confines its output; operands never read as flags | sovkora-worker-media, sovkora-cli | sovkora-worker-media#84, sovkora-cli#94 |
| Prompt carried in a GET query | `CodeRules.assertNoContentOnGet` (krizaka-test-support, frozen) | sovkora-conversation-service | #66 → krizaka-java#103 (krizaka-java#106) |
| Payment webhooks applied twice | one-transaction test; **missing** shared replay-twice contract | folioviv | folioviv#453 → krizaka-ts#169 |
| Stale pack consent on runs | governance test: consent re-checked at run start | sovkora-studio-service | sovkora-studio-service#92 |
| Tokens inside git remote URLs | **missing** | tools, every clone | .github#324 |
| Secrets in an example config | Sonar S6718 only (late); push protection misses non-provider patterns | krizaka-platform-kit | #71 → .github#324 |
| Connection string logged | **missing** lint rule | verikora | #400 → krizaka-ts#167 |
| Static mutable crypto state, `getenv` in code | `CodeRules.assertNoStaticMutableState`, `assertNoGetenvOutsideConfig` (krizaka-test-support, frozen) | krizaka-users | #57 → krizaka-java#102 (krizaka-java#106) |
| `Math.random` in an auth testkit | Sonar S2245; local `sonarjs/pseudo-random` once enabled | krizaka-ts | #158 → krizaka-ts#164 |
| View Transitions broke the page audit | the audit waits for a running transition | verikora (copy) | verikora#378 → krizaka-ui#747 |
| Binder and button overflow | page audit (containment, overlap) | verikora; others pending | krizaka-ui#729, krizaka-ui#747, folioviv#405, sovkora-web#295 |
| Wall-clock flaky tests | ast-grep `no-ambient-clock` (TS domain code only); **missing** for Java and tests | TS apps | krizaka-java#104 |
| Import layout collapsed by OpenRewrite | explicit import layout in `krizaka-parent` (rewrite + spotless) | krizaka-users, krizaka-platform-kit; **not** the sovkora services | krizaka-java#101 → sovkora-engine#141 |
| Cognitive complexity (every red Sonar gate) | `sonarjs/cognitive-complexity` + ratchet in `@krizaka/config` 0.11; PMD `CognitiveComplexity` (15) for Java in `krizaka-parent` (`krizaka-quality`, per-module `pmd-baseline.properties`, krizaka-java#107; **pending** the release and each repo's bump) | TS consumers of 0.11; Java: krizaka-users baseline ready (krizaka-users#59) | .github#319, krizaka-java#105, krizaka-ui#785, krizaka-blog#166 |
| Java Sonar smells and security bugs (S1192, S1186, S107, S1172, S127, S106, S2077, S5998) | PMD + SpotBugs/find-sec-bugs in `mvn verify` (`krizaka-quality`; baselines measured by `scripts/quality-baseline.mjs`, they only shrink); **no twin** for S135 and S6218 (Sonar only) | krizaka-users (baseline ready); other Java repos after the parent release | krizaka-java#105 → krizaka-java#107 |
| Server code calling client code (dossiers crash) | `krizaka-server-client-boundary` (`@krizaka/config` 0.10) | verikora, folioviv, sovkora-web, krizaka-com, krizaka-blog; **not** krizaka-ui | verikora#458 → krizaka-ui#785, krizaka-ts#165 |
| Dev migrations not applied; numbering collision | **missing** | verikora, folioviv | krizaka-ts#168 |
| A committed `.vitest` output | repo-layout check (clean root) should refuse it | krizaka-ui | krizaka-ui#783 |
| Docs-only PRs blocked: required checks never report | `sonar-light` job of `node-ci` / `java-ci`: a docs-only PR gets a real Sonar scan (no build), the `CI gate` requires it (tested) | every repo on the shared CI | .github#330 (replaces folioviv#456) |
| Packs step ids versus refs | blueprint step-id guard on every pack | sovkora-packs | sovkora-packs#160, #161 |
| GitHub Actions injection, permissions, unpinned steps | Sonar only (actionlint does not check them) | all | .github#268 → .github#325 |
| OS command resolved by PATH | Sonar S4036; local `sonarjs/no-os-command-from-path` once enabled | all TS | krizaka-com#408 → krizaka-ts#164 |
| Orphan ratchet counter (`pageTemplate`: no rule measures it) | **missing**: the ratchet keeps unknown counters | folioviv, sovkora-web, verikora | krizaka-ts#172 |
| A fix with no guard | `fix-needs-guard` (see below) | all | .github#323 |
| import collapse (OpenRewrite autodetected the import layout and folded untouched files) | explicit layout in krizaka-parent and sovkora-parent (`krizaka-rewrite-style`, no star import, static imports first) | every JVM repo | krizaka-java#101, sovkora-build#39, sovkora-engine#133 #143 |
| A guide, README, AGENTS or skill out of date after a change | `docs-map.json` lists, per kind of change, the documents to update ([docs-map.md](docs-map.md)); `scripts/docs-map.mjs` checks its shape and that every document exists; the pull-request check `docs-map / check` (`scripts/docs-map-check.mjs`, fixtures in `tests/docs-map-check.test.mjs`) warns first, then is required (krizaka-internal#2758) | every repository once the check ships | krizaka-internal#2756, #2758 |

## 2. The matrix (2026-10-27, read from the GitHub API)

`Y` = present, `–` = absent. A number is the current ratchet total (the sum of the counters).

| Repo | ESLint | lint-ratchet | ast-grep (rules) | sg-ratchet | depcruise | ArchUnit | rewrite + spotless | page audit | a11y-audit | hook | Sonar required |
|---|---|---|---|---|---|---|---|---|---|---|---|
| verikora | Y | 47 | 17 | 22 | Y | – | – | Y | – (local branch) | Y | Y |
| folioviv | Y | 41 | 21 | 33 | Y | – | – | #405 | Y | – | Y |
| sovkora-web | Y | 61 | 15 | 113 | Y | – | – | #295 | Y | – | Y |
| krizaka-com | Y | 2 | 16 | 4 | Y | – | – | – | Y | – | Y |
| krizaka-ui | Y (0.9.1) | – | 14 | 122 | – | – | – | – | – | – | Y |
| krizaka-ts | Y (source) | – | 14 | 0 | Y | – | – | – | – | – | Y |
| krizaka-blog | – | – | – | – | – | – | – | – | – | – | Y |
| sovkora-engine | – | – | – | – | – | Y (frozen: spring-ai-outside-adapter, spring-in-core) | sovkora-parent | – | – | – | Y |
| sovkora-studio-service | – | – | – | – | – | Y | sovkora-parent | – | – | – | Y |
| sovkora-conversation-service | – | – | – | – | – | Y (frozen store) | sovkora-parent | – | – | – | Y (added 2026-10-27) |
| krizaka-java | – | – | – | – | – | Y (source: test-support) | Y (source) | – | – | – | Y |
| The bar flashed « Sign in » to a signed-in person, or flipped back to it after a failed `/api/me` refetch (pending drawn as signed out; an error read as a sign-out). The caching case was ruled out: pages hold no personal HTML, `/api/me` is `private, no-store` + `Vary: Cookie` | `useNavSession` / `NavBar.Session` in `@krizaka/ui/nav-bar` (pending is its own state, only an answer changes the state, `initial` for a server-read session) with its tests; `GET /api/me` route tests assert `Cache-Control: private, no-store` and `Vary: Cookie` for signed in and signed out; each app's bar test asserts the first render is neither state while pending, then the session's | krizaka-ui, verikora, folioviv, sovkora-web | krizaka-ui#800 |
| A fix that ships without a guard (the lessons loop itself) | `guard` job of `node-ci` / `java-ci`, in the `CI gate`: a `fix` PR adds a test, a rule or an audit (patterns: [`guard-paths.json`](guard-paths.json)), or carries `guard-exempt` and a `Guard exemption:` line (`scripts/fix-needs-guard.mjs`, tested) | every repo on the shared CI | .github#323 |

No repo runs SpotBugs, PMD, Error Prone, gitleaks or zizmor yet.

## 2.1 Stale-base merges (.github#319)

Two PRs green on an old base can turn `main` red once both merge (verikora: lint warnings over the frozen cap). Decision, 2026-10-27:

- **Merge queue: verified on krizaka-ts (2026-10-27), rolling out repository by repository.** The earlier reason (« SonarCloud only reports on PRs ») was only true of SonarCloud's *automatic* analysis. A CI analysis (`SonarSource/sonarqube-scan-action` / `@sonar/scan`, `sonar: true` in `node-ci.yml`, with automatic analysis turned off for the project) analyses any branch on our plan and posts « SonarCloud Code Analysis » on the commit, including `gh-readonly-queue/main/...`. Evidence: a probe commit on a queue-named branch got no check from automatic analysis (no branch in `project_branches/list`), then got `SonarCloud Code Analysis: success` after a CI scan with the branch name; then PR krizaka-ts#192 went through the queue with CI, Security scan and Sonar green on the queue commit and merged. Recipe per repository: (1) `merge_group:` in the `on:` of `ci.yml` and `security.yml` (the shared workflows are `merge_group`-safe); (2) `sonar: true` and `secrets: SONAR_TOKEN` on the CI caller, and automatic analysis off (`POST api/autoscan/activation?projectKey=…&enable=false`) once its PR is green; (3) a `merge_queue` ruleset on the default branch (required checks stay in the branch protection); (4) drop `strict` and the repository from `update-behind-cron.sh`. Until a repository has done these, it keeps `strict` and the cron. Known gap: `node-ci.yml`'s coverage collect step fails on a literal `sonar-coverage-paths` that does not exist (nullglob only drops wildcard patterns); krizaka-ts passes `coverage/lcov.inf[o]` until it has a report. The repositories done are listed below (generated).
- **Meanwhile: `strict` is on** (`required_status_checks.strict`, the required checks unchanged) on main of verikora, folioviv, krizaka-ui, krizaka-ts, krizaka-com, sovkora-web, sovkora-engine, krizaka-java, sovkora-conversation-service and .github.
- **Sweep:** krizaka-agents `tools/update-behind-prs.sh <owner/repo>...` (run by its `update-behind-cron.sh`) runs `gh pr update-branch` on every auto-merge-armed PR that is behind, so strict never stalls them.

**Queue state, read from GitHub** (generated by the scheduled `docs-current` workflow: the `Merge queue` ruleset of each public repository):

<!-- gen:queue-state:start -->
- **On the merge queue (6):** `folioviv`, `krizaka-com`, `krizaka-composer`, `krizaka-ts`, `krizaka-ui`, `verikora`.
- **Not on the merge queue yet (24; the Strict column of the table above says which keep strict up-to-date branches):** `.github`, `krizaka-billing`, `krizaka-blog`, `krizaka-java`, `krizaka-infra`, `krizaka-lab`, `krizaka-notifications`, `krizaka-desktop`, `sovkora`, `sovkora-engine`, `sovkora-automation-service`, `sovkora-build`, `sovkora-cli`, `sovkora-contracts`, `sovkora-conversation-service`, `sovkora-edge-service`, `sovkora-job-service`, `sovkora-knowledge-service`, `sovkora-mobile`, `sovkora-packs`, `sovkora-studio-service`, `sovkora-ui-kit`, `sovkora-web`, `sovkora-worker-media`.
<!-- gen:queue-state:end -->

## 2.2 « A fix needs a guard » recognises a lowered ratchet

`docs/standards/guard-paths.json` counts as guards: tests, rules, audits, and the **ratchet and baseline files** (`lint-ratchet.json`, `sg-ratchet.json`, `perf-budgets.json`, the a11y baselines, `pmd-baseline.properties`), plus a `package.json` whose patch **lowers a `--max-warnings N` cap** (`lowersCap`, tested; raising a cap or leaving it does not count).

The paths below are generated from `guard-paths.json` (never hand-edit):

<!-- gen:guard-paths:start -->
A `fix` PR is one whose title matches `^fix(\(|:|!)` (branches `release-please--*`, `changeset-release/*` are skipped); the exemption is the label `guard-exempt` and a line matching `^Guard exemption:\s*\S{3,}`. What counts as a guard:

| Kind | Paths |
| :--- | :--- |
| tests | `**/*.test.*`, `**/*.spec.*`, `**/src/test/**`, `**/test_*.py`, `**/e2e/**`, `**/.maestro/**`, `**/tests/**`, `**/__tests__/**` |
| rules | `rules/**`, `**/rules/**`, `rule-tests/**`, `**/rule-tests/**`, `eslint.config.*`, `**/eslint.config.*`, `.dependency-cruiser*`, `**/.dependency-cruiser*`, `*ratchet*.json`, `archunit_store/**`, `**/architecture/**` |
| audits | `**/page-audit*`, `**/a11y*` |
| ratchets | `lint-ratchet.json`, `sg-ratchet.json`, `perf-budgets.json`, `**/lint-ratchet.json`, `**/sg-ratchet.json`, `**/perf-budgets.json`, `**/*a11y*baseline*`, `**/a11y-baseline*`, `**/pmd-baseline.properties`, `pmd-baseline.properties` |

A `package.json` that lowers a cap matching `--max-warnings[ =](\d+)` counts too.
<!-- gen:guard-paths:end -->

**Renaming a `fix` PR to dodge the check is not allowed.** A fix that truly has no guard to add uses the `guard-exempt` label and a `Guard exemption: <reason>` line.

## 2.3 The automation catalogue (ADR-026, krizaka-internal#2755)

The daily Conformance run also publishes the **automation catalogue** (`conformance-matrix` branch, `automation/catalogue.json`):
every script, workflow, action, custom npm script, hook and the Mac's crons, with the flags « nothing calls it », « no test »,
« regex over 80 », « over 400 lines », « no header » and « copied ». It is measurement only, the guards that read it come with
phase F of the ADR. The fields are in [automation-catalogue.md](automation-catalogue.md).

## 3. One source per rule set

Every rule set has **one** home. A repo only consumes it.

| Rule set | The single source | What a repo keeps |
|---|---|---|
| ESLint presets, the sonarjs layer | `@krizaka/config` (krizaka-ts) | `eslint.config.mjs` = `krizakaStack()`, its suppressions baseline |
| ast-grep rules + `sg-ratchet` | `@krizaka/config` pack + bin (krizaka-ui#613, krizaka-ts#166) | `sgconfig.yml` pointing at the pack, `sg-ratchet.json` |
| dependency-cruiser | `@krizaka/config/dependency-cruiser` (krizaka-ts#165) | `.dependency-cruiser.cjs` extending it, known-violations baseline |
| SEO family check | `@krizaka/config` bin (krizaka-ts#166) | the call in CI |
| ArchUnit | `krizaka-test-support` (krizaka-java) | one architecture test calling the entry points, the `archunit_store` |
| Java format, imports, PMD, SpotBugs | `krizaka-parent` | the parent version, the baseline files |
| CI steps | krizaka/.github reusable workflows | a caller workflow of a few lines |
| Page audit + a11y | one shared package (krizaka-ui#747) | seeds and routes |

- **Copies found:**
  - `sg-ratchet.mjs` in 6 repos;
  - `check-seo-family.mjs` in 9;
  - `rules/*.yml` in 6 (14 to 21 rules each);
  - a page audit in verikora;
  - hand-written CI in krizaka-ui and krizaka-blog (.github#328).

  Each copy has its move filed.
- **Local exceptions:** a repo-specific rule (for example verikora's `no-direct-organize-write`) stays in the repo, listed in its `sgconfig.yml` with one line of reason.
- **Upgrades:** each source ships versioned releases, and Renovate bumps the consumers (.github#332). Since nothing is copied, no drift check is needed.

**What `@krizaka/config` ships now** (generated from its latest npm package by the scheduled `docs-current` workflow):

<!-- gen:config-exports:start -->
`@krizaka/config` 0.20.0 ships 7 commands (`krizaka-edit-check`, `krizaka-known-violations`, `krizaka-ratchet`, `krizaka-seo-family`, `krizaka-server-client-boundary`, `krizaka-sg-ratchet`, `krizaka-workspace-guard`) and 22 entry points: `./covered-domains`, `./covered-domains.json`, `./dependency-cruiser`, `./editorconfig`, `./eslint`, `./eslint/code-rules`, `./eslint/env-names`, `./eslint/krizaka-ui`, `./eslint/next`, `./eslint/no-locale-ternary`, `./eslint/plugin`, `./eslint/stack`, `./eslint/ui-warnings`, `./known-violations`, `./patterns`, `./prettier`, `./ratchet`, `./server-client-boundary`, `./tsconfig/base.json`, `./tsconfig/next.json`, `./tsconfig/react-library.json`, `./tsconfig/react-native.json`.
<!-- gen:config-exports:end -->
