# ADR-013 — Guards: local Sonar, shift-left, one source per rule set, less in-house

- **Status:** Accepted (CTO, delegated). The rollouts are tracked in milestones B73 (krizaka-ts), B74 (krizaka-build) and B75 (.github).
- **Date:** 2026-10-27
- **Builds on:** [a bug means a missing guard](../standards/bug-means-missing-guard.md), [.github#319](https://github.com/krizaka/.github/issues/319) (Sonar KPI), [.github#240](https://github.com/krizaka/.github/issues/240) (Sonar required). The registry and the matrix are in [guards.md](../standards/guards.md).

## Context

Every red Sonar gate came from a rule we could have run locally (S3776 first). In the org's SonarCloud (2026-10-27): 6,545 open issues, of which 174 are bugs and 138 are vulnerabilities. Almost all TS/JS findings have a twin in `eslint-plugin-sonarjs` or `unicorn`. The taint vulnerabilities (jssecurity / tssecurity) have no local twin. Sonar's Java analyzer does not run offline in Maven.

Meanwhile, guards are copied from repo to repo (`sg-ratchet.mjs` ×6, `check-seo-family.mjs` ×9, `rules/*.yml` ×6), and several tools are home-made where a standard one exists.

## Decisions

### 1. Sonar rules locally

- ✓ **TS:** the `eslint-plugin-sonarjs` recommended set, plus the `unicorn` rules Sonar ports, in `@krizaka/config` under the ratchet ([krizaka-ts#164](https://github.com/krizaka/krizaka-ts/issues/164)).
  - → It is the same engine as SonarCloud's JS/TS analyzer, so a finding shows up at lint time instead of at PR time.
  - ! Each consumer records new baselines, and lint gets a few seconds slower.
- ✓ **Java:** PMD (cognitive complexity, duplicate literals, empty methods, parameter lists) plus SpotBugs with find-sec-bugs (SQL injection, record equality on arrays, regex), in `krizaka-parent`, each with a baseline that only shrinks ([krizaka-build#105](https://github.com/krizaka/krizaka-build/issues/105)).
  - → Together they cover our actual Java findings (S1192, S1186, S3776, S135, S107, S1172, S5998, S6218, S2077).
  - ! Adds about 30–60 s to `verify`.
- ✓ **ArchUnit** for the architectural lessons that no linter sees: static mutable state and `getenv` outside config, content on a GET, ambient clock, sleep in tests ([krizaka-build#102](https://github.com/krizaka/krizaka-build/issues/102), [#103](https://github.com/krizaka/krizaka-build/issues/103), [#104](https://github.com/krizaka/krizaka-build/issues/104)).
- ✕ **Error Prone.** → It overlaps PMD and SpotBugs on our findings, and it ties us to compiler internals at each JDK bump.
- ✕ **New OpenRewrite recipes as guards.** → OpenRewrite rewrites code; it does not check it. It stays for the import layout and migrations (krizaka-build#101).
- ✓ **IDE:** SonarQube for IDE in connected mode, with `.sonarlint/connectedMode.json` committed per repo ([.github#327](https://github.com/krizaka/.github/issues/327)).
  - → This is the only early place where the taint findings show up.
- ✓ **The Sonar gate is required on all 13 focus repos.** It was added to orazaka-conversation-service and krizaka-platform-kit on 2026-10-27; both were green on `main`.

### 2. Boundaries, secrets, workflows

- ✓ dependency-cruiser preset rules for the declared boundaries: domain ↛ infra, client ↛ server, ports ↛ adapters ([krizaka-ts#165](https://github.com/krizaka/krizaka-ts/issues/165)).
- ✓ gitleaks (hook and CI), non-provider secret patterns turned on, and no credentials in remote URLs ([.github#324](https://github.com/krizaka/.github/issues/324), `priority:P0`).
- ✓ zizmor next to actionlint for the workflow vulnerabilities ([.github#325](https://github.com/krizaka/.github/issues/325)).
- ✓ `fix-needs-guard` inside `CI gate`: a `fix` PR adds a test or a rule file, or carries the `guard-exempt` label with a reason ([.github#323](https://github.com/krizaka/.github/issues/323)).

### 3. Shift-left: each check at the earliest stage it can run

The order is IDE → pre-commit → pre-push → PR CI → Sonar. CI always runs everything again, because hooks can be bypassed. A guard is removed only once an earlier one replaces it.

| Check | Current stage | Target stage | Issue |
|---|---|---|---|
| Sonar TS/JS smells and bugs (S3358, S6759, S2871, S4036…) | Sonar | IDE + pre-push (ESLint sonarjs) | krizaka-ts#164 |
| Cognitive complexity, TS | PR CI (0.11) | IDE + pre-push | .github#326 |
| Java smells (S1192, S3776…) | Sonar | `mvn verify` locally (PMD) | krizaka-build#105 |
| Taint vulnerabilities | Sonar | IDE (connected mode); Sonar stays the gate | .github#327 |
| ESLint, the ratchets, ast-grep, depcruise | PR CI (pre-push in yomizaka only) | pre-push everywhere | .github#326 |
| Secrets | GitHub push protection (provider patterns only) | pre-commit (gitleaks) | .github#324 |
| Workflow security | Sonar | pre-push + PR CI (zizmor) | .github#325 |
| Duplication | PR CI **and** Sonar (duplicated) | pre-push (dup-ratchet); Sonar's condition informative | .github#329 |
| Docs-only Sonar status | full CI (akinaza#456) | a light Sonar scan, no build | .github#330 |

- ✓ **Docs-only PRs get a light Sonar scan** (checkout plus scan, about 1 min) in the reusable workflows.
  - → The required status is a real gate, and nothing is built.
- ✕ **A gate job posting a synthetic Sonar success.** → It forges another app's required check, and it would hide a real failure on the changed files.
- ✓ **Keep CodeQL next to Sonar.** → They are different engines with different findings, at no cost to us. This is not duplication worth removing.

### 4. One source per rule set

- ✓ **Every rule set has one home, and repos only consume it:**
  - ESLint, the ast-grep pack, depcruise and the ratchet bins live in `@krizaka/config`;
  - ArchUnit lives in `krizaka-test-support`;
  - Java build rules live in `krizaka-parent`;
  - CI lives in krizaka/.github reusable workflows.

  A repo keeps only the `extends` or dependency, its measured baselines, and a listed exception with its reason.
  - → Copies drift, and « keep the copies identical » has no enforcer. A versioned release plus a bot bump is followable.
  - ! The move takes about 25 small PRs (krizaka-ui#613, krizaka-ts#166, .github#328), and every rule change becomes a release.
- ✕ **Drift checks between copies.** → They are not needed once nothing is copied.

### 5. Less in-house

| Tool | Verdict | → because | ! cost |
|---|---|---|---|
| `krizaka-ratchet` | **replace** with ESLint bulk suppressions (`eslint-suppressions.json`, ESLint ≥ 9.24) | built-in, counts per file and rule, prune to lock gains | one generated file per repo (krizaka-ts#170) |
| `krizaka-ratchet` (meanwhile) | **fix**: fail on a counter no rule measures (the orphan `pageTemplate`) | a ratchet must guard something | krizaka-ts#172 |
| `sg-ratchet` | **keep**, as a `@krizaka/config` bin | ast-grep has no baseline | the copies to delete (krizaka-ts#166) |
| `check-seo-family.mjs` | **keep**, as a bin | the family contract is ours | the same move |
| `check-repo-layout.mjs` | **keep** | the allowlist of a clean root is ours; ls-lint only checks names | – |
| page audit | **keep** containment and overlap, in one shared package | axe and Lighthouse CI do not check overlap | krizaka-ui#747 |
| `@krizaka/a11y-audit` | **merge** into the page-audit package, as a thin `@axe-core/playwright` wrapper with a baseline | one audit, not two | small |
| `dev-migrations.mjs` | **merge**: `drizzle-kit check` and `migrate` first, only the dev-drift probe stays ours | standard tool for the numbering | krizaka-ts#168 |
| `pr-assets.mjs`, `cdn-assets.mjs` | **keep** | the Bunny layout, hashing and manifest are ours | – |
| `board-mv.py` | **replace** with `actions/add-to-project` + `gh project item-edit` | built-in; the board fills itself | .github#331 |
| `board-order.py` | **keep** | ordering by priority is ours | – |
| `heavy-lock.sh` | **keep** | a local lock for this machine's heavy jobs; macOS ships no `flock` | – |
| `gh-app-token.py` | **keep locally**; CI already uses `actions/create-github-app-token` | the agents need an app token outside CI | – |
| changesets / release-please | **keep** | standard tools | – |
| Dependabot | **replace** with Renovate and one shared preset | one source, grouped `@krizaka/*` bumps, pnpm catalogs, Maven BOMs | installing the app is Oussama's call (.github#332) |

## Consequences

- Most findings now surface at lint or `verify` time, and Sonar becomes the last net (taint, coverage, duplication on new code) instead of the first.
- The registry in [guards.md](../standards/guards.md) is updated by each fix PR.
- 25 issues are filed. The 5 in **Next** are krizaka-ts#164, krizaka-build#102, .github#323, .github#324 and .github#330.
