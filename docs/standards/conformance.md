# Conformance: a rule reaches every repository (krizaka/.github#393)

An org rule is declared in [`rules.json`](rules.json) with the check that proves it in a repository, and is rolled out to
**every active repository** in the same work. Active = `repos.json` minus archived, `Archive` and `Paused` repositories, which the
matrix lists as out of scope. There are no exceptions.

- **Registry**: `docs/standards/rules.json`, one entry per rule (`id`, `issue`, `applies`, `check`, `fix`). A rule without its check
  or its fix fails `tests/conformance.test.mjs`. Checks: `workflow-calls`, `workflow-matches`, `workflow-forbids`, `file-exists`,
  `file-matches`, `manifests-forbid {pattern}` (no manifest, workspace file, submodule list, POM or Gradle file names the pattern),
  `path-forbids {pattern, except}` (no tracked path matches the pattern: `adr-internal` refuses any ADR file outside krizaka-internal, krizaka-internal#3335),
  `versions-current`, `agents-template` (AGENTS.md is rendered from [`agents-template.md`](agents-template.md) by `scripts/agents-md.mjs`: its marker, the five
  headings, at most 80 lines, the krizaka-engineering skill linked, every relative link resolves).
- **Deterministic** (founder 2026-11-06, « la matrice doit le prouver d'une façon déterministe », krizaka-internal#2635): each
  repository is read at **one pinned commit** (its default branch SHA, recorded in every cell); every file a check reads is recorded
  with the SHA-256 of what it judged (and the line that matched), a live setting (rulesets, npm) with its URL, HTTP status and
  SHA-256. No judgement, no sampling. A cell is `pass`, `fail`, `unknown` (a fetch error or nothing to read, with its reason: never
  pass, never fail), `manual` (no deterministic check exists yet: never shown as pass) or `n/a`. `tests/conformance.test.mjs` runs the
  matrix twice on a fixture and asserts the same bytes. Per-repo tests a rule requires are found by file name (`path-matches`): the
  name says the rule (`public-no-amount.test.*`, `privacy-officer.test.*`…).
- **The matrix confirms**: a rule holds in a repository only if its cell says `pass`; cite rule id × repo × run date (× commit).
- **Matrix**: `node scripts/conformance.mjs` (repo x rule, pass / fail / unknown / manual / n/a, then the family versions each repository pins). **Daily**
  against main of every active repository, and on every pull request that touches the rules (`.github/workflows/conformance.yml`);
  the 3-hour checkpoint prints it (`checkpoint-gen.sh`, « Conformance »).
- **Where to read it**: the daily run publishes [`conformance/matrix.md`](https://github.com/krizaka/.github/blob/conformance-matrix/conformance/matrix.md)
  and `conformance/matrix.json` on the data branch `conformance-matrix` (`scripts/conformance-publish.mjs`; the cockpit and
  `session-start` read the JSON, never GitHub per view). Its schema 2: `generatedAt`, `runUrl`, `rulesCommit`, `rules` (id, title,
  issue, security, check type, link to its text), `repos` (commit), `summary` (pass, fail, unknown, manual per rule), `cells`, and
  `results`: one line per cell with rule, repo, commit, check, status, why, evidence, runDate and link.
  It opens or refreshes one issue per red repository and closes it when the repository is green (`scripts/conformance-issues.mjs`).
- **The rules really reach the repositories** (krizaka-internal#879): `versions-current {ecosystems, graceDays}` is red when a repository
  still pins a family version (`@krizaka/*` on npm; `krizaka-parent` / `krizaka-bom` from the krizaka-java releases) older than one
  out for `graceDays`. `release-propagation` asks for the receiver **and** the landed bump; `maven-family-current` does it for Java.
- **A caller grants what the called job asks for** (krizaka-internal#3342): `caller-permissions` reads each workflow that calls a reusable
  workflow of the org, fetches the called file at the SHA the caller pins, and is red when the calling job (its own `permissions:`, else the
  workflow's) grants less than the called jobs ask for. GitHub refuses such a run as `startup_failure` with 0 jobs and no log: « Bump @krizaka
  packages » never ran in any consumer because the caller declared `permissions: {}` and its `bump` job granted nothing while the called
  job asks `contents: read`. The caller template `workflow-templates/bump-krizaka.yml` carries `permissions: contents: read` on the job; the rule's fix copies that template (it is reported, not a
  security rule, so the consumers are fixed by one pull request each, not by `conformance-fanout.mjs --apply`).
- **« Bump @krizaka packages » runs in npm repositories and in a sub-folder** (krizaka-internal#3342): the shared `bump-krizaka.yml` reads the
  lockfile of its `working-directory` input (default `.`) with `scripts/detect-package-manager.mjs`: `pnpm-lock.yaml` runs pnpm,
  `package-lock.json` runs `npm install --package-lock-only`, neither fails with a clear error (krizaka-java passes `working-directory: site`).
- **Scheduled guards are never red in silence**: a red scheduled run of `audit-guards` opens (or comments) one issue in
  krizaka-internal, and the next green run closes it (`scripts/red-run-issue.mjs`). Any alert passes `alert-key` to `actions/alert-issue`:
  one issue per key whatever its title does (comment, reopen, or close with the green run as proof; krizaka-internal#2282).
- **Fan-out**: `node scripts/conformance-fanout.mjs --matrix matrix.json [--rules a,b] [--repos x] [--apply]` opens one pull request per
  red repository for the rules that have a template (`copy`, `append-section`, `settings-hook`, `agents-template` — it renders AGENTS.md from the
  repository's line of `repos.json` and its scripts, and moves the old AGENTS.md to `docs/agents.md`, never overwriting one); `manual` rules are listed, never guessed.
- **Closing**: the issue of a rule closes when its column is green in every active repository. Report the matrix, not « done for most ».
- **Adding a rule**: add the entry (and its template under `workflow-templates/` when it can be one), run the matrix, fan out, fix the rest.
