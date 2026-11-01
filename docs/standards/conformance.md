# Conformance: a rule reaches every repository (krizaka/.github#393)

An org rule is declared in [`rules.json`](rules.json) with the check that proves it in a repository, and is rolled out to
**every active repository** in the same work. Active = `repos.json` minus archived, `Archive` and `Paused` repositories, which the
matrix lists as out of scope. There are no exceptions.

- **Registry**: `docs/standards/rules.json`, one entry per rule (`id`, `issue`, `applies`, `check`, `fix`). A rule without its check
  or its fix fails `tests/conformance.test.mjs`. Checks: `workflow-calls`, `workflow-matches`, `workflow-forbids`, `file-exists`,
  `file-matches`, `manifests-forbid {pattern}` (no manifest, workspace file, submodule list, POM or Gradle file names the pattern),
  `versions-current`, `agents-template` (AGENTS.md is rendered from [`agents-template.md`](agents-template.md) by `scripts/agents-md.mjs`: its marker, the five
  headings, at most 80 lines, the krizaka-engineering skill linked, every relative link resolves).
- **Matrix**: `node scripts/conformance.mjs` (repo x rule, green / red / n/a, then the family versions each repository pins). **Daily**
  against main of every active repository, and on every pull request that touches the rules (`.github/workflows/conformance.yml`);
  the 3-hour checkpoint prints it (`checkpoint-gen.sh`, « Conformance »).
- **Where to read it**: the daily run publishes [`conformance/matrix.md`](https://github.com/krizaka/.github/blob/conformance-matrix/conformance/matrix.md)
  and `conformance/matrix.json` on the data branch `conformance-matrix` (`scripts/conformance-publish.mjs`; the cockpit reads the JSON).
  It opens or refreshes one issue per red repository and closes it when the repository is green (`scripts/conformance-issues.mjs`).
- **The rules really reach the repositories** (krizaka-internal#879): `versions-current {ecosystems, graceDays}` is red when a repository
  still pins a family version (`@krizaka/*` on npm; `krizaka-parent` / `krizaka-bom` from the krizaka-build releases) older than one
  out for `graceDays`. `release-propagation` asks for the receiver **and** the landed bump; `maven-family-current` does it for Java.
- **Scheduled guards are never red in silence**: a red scheduled run of `audit-guards` opens (or comments) one issue in
  krizaka-internal, and the next green run closes it (`scripts/red-run-issue.mjs`).
- **Fan-out**: `node scripts/conformance-fanout.mjs --matrix matrix.json [--rules a,b] [--repos x] [--apply]` opens one pull request per
  red repository for the rules that have a template (`copy`, `append-section`, `settings-hook`, `agents-template` — it renders AGENTS.md from the
  repository's line of `repos.json` and its scripts, and moves the old AGENTS.md to `docs/agents.md`, never overwriting one); `manual` rules are listed, never guessed.
- **Closing**: the issue of a rule closes when its column is green in every active repository. Report the matrix, not « done for most ».
- **Adding a rule**: add the entry (and its template under `workflow-templates/` when it can be one), run the matrix, fan out, fix the rest.
