# Conformance: a rule reaches every repository (krizaka/.github#393)

An org rule is declared in [`rules.json`](rules.json) with the check that proves it in a repository, and is rolled out to
**every active repository** in the same work. Active = `repos.json` minus archived, `Archive` and `Paused` repositories, which the
matrix lists as out of scope. There are no exceptions.

- **Registry**: `docs/standards/rules.json`, one entry per rule (`id`, `issue`, `applies`, `check`, `fix`). A rule without its check
  or its fix fails `tests/conformance.test.mjs`. Checks: `workflow-calls`, `workflow-matches`, `workflow-forbids`, `file-exists`,
  `file-matches`.
- **Matrix**: `node scripts/conformance.mjs` (repo x rule, green / red / n/a). Weekly and on every pull request that touches the rules
  (`.github/workflows/conformance.yml`); the 3-hour checkpoint prints it (`checkpoint-gen.sh`, « Conformance »).
- **Fan-out**: `node scripts/conformance-fanout.mjs --matrix matrix.json [--rules a,b] [--repos x] [--apply]` opens one pull request per
  red repository for the rules that have a template (`copy`, `append-section`, `settings-hook`); `manual` rules are listed, never guessed.
- **Closing**: the issue of a rule closes when its column is green in every active repository. Report the matrix, not « done for most ».
- **Adding a rule**: add the entry (and its template under `workflow-templates/` when it can be one), run the matrix, fan out, fix the rest.
