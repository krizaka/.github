# Repository layout standard

A Krizaka repository opens on a short, predictable root: a reader finds the code, the docs, the scripts and the tests
without scrolling past notes, scratch files or build output. The guard is `scripts/check-repo-layout.mjs`, run in every
shared CI (`node-ci`, `java-ci`, `python-ci`, `maven`, `krizaka-ci`, `expo-ci`) through the action
`krizaka/.github/actions/repo-layout`. Its unit tests are `tests/check-repo-layout.test.mjs`.

## The rules

1. **root-entry**: a root file or folder must be one the repository kind declares (table below) or be listed in
   `.repo-layout.json` with a « why ».
2. **root-file**: a root file that belongs in a folder fails: a test (`tests/`), a script (`scripts/`), a note or document
   (`docs/`), a query (`infra/` or `scripts/`), a medium (the folder that uses it, or Bunny, AGENTS §5.2), a local artefact.
3. **odd names**: an environment template is named `.env.example`, never `exemple.env.txt`, `env.sample` and the like.
   Rename it and update every reference.
4. **generated**: nothing generated or local is tracked: `node_modules`, `target/`, `dist`, `.next`, `coverage`,
   `__pycache__`, `var/`, `data/`, captures and screenshots, `.DS_Store`, a real `.env`.
5. **licence**: one licence layout, per ADR-012. `LICENSE` and `LICENSE.md` together, saying the same thing, fail:
   keep the one that carries the text.
6. **config**: a `.repo-layout.json` entry that matches nothing, or has no « why », fails (a stale exception is removed).

`infra/` stays an allowed root folder in every kind: deployment and migration files stay portable between repositories.

## Allowed root entries

Every kind may hold the common files (README, LICENSE, NOTICE, SECURITY, AGENTS, CLAUDE, CONTRIBUTING, CHANGELOG,
CODEOWNERS, git and editor dotfiles, `.env.example`, release-please files, `dev-preview.json`, `*-ratchet.json`, `a11y-baseline.json`,
`app-links*.json`, Sonar files, Dockerfiles and compose files, Prettier and commit-lint config) and the common folders
`docs`, `scripts`, `tests`, `test`, `.github`, `.githooks`, `.husky`, `.do`, `deploy`, `infra`.

| Kind | Detected by | Adds (files) | Adds (folders) |
| --- | --- | --- | --- |
| `next-app` | `next.config.*` | Node tooling files | `app lib src content messages public e2e rules rule-tests db functions types` |
| `node-cli` | `package.json` only | Node tooling files | `src e2e rules rule-tests alias bin lib` |
| `expo` | `eas.json` | Node tooling files | `src app assets plugins .maestro e2e rules rule-tests` |
| `ts-monorepo` | `pnpm-workspace.yaml`, `turbo.json` | Node tooling files | `apps packages tools site renovate .changeset rules rule-tests e2e` |
| `maven` | `pom.xml` | `pom.xml mvnw mvnw.cmd` | `src .mvn examples starters` and one folder per module (has a `pom.xml`) |
| `workspace` | `*.workspace.json` | as `maven` | `src .mvn apps contracts` and module folders |
| `python` | `pyproject.toml` | `pyproject.toml requirements*.txt uv.lock pytest.ini ruff.toml conftest.py` | `app src models` |
| `iac` | `*.tf`, `stacks/`, `modules/` | Terraform files | `modules providers stacks` |
| `packs` | `pack.schema.json` | Node tooling files + `pack.schema.json` | one folder per pack (has a `pack.yaml`) |
| `org` | `repos.json` | `AGENTS.template.md LABELS.md ROADMAP.md repos.json release-repos.json` | `actions orchestration profile workflow-templates` |

`Node tooling files` are `package.json`, the lockfile, `tsconfig*.json`, ESLint, PostCSS, Tailwind, Next, Vitest, Jest,
Playwright, Metro, Expo and `eas.json` configs. The list is the source: `scripts/check-repo-layout.mjs` (`KINDS`).
A `kind` in `.repo-layout.json` overrides the detection.

## `.repo-layout.json`

A justified extra lives at the root, each entry with a « why » a reviewer can judge:

```json
{
  "kind": "maven",
  "allow": [
    { "path": "archunit_store", "why": "ArchUnit freeze store, read by the architecture tests" }
  ],
  "allowTracked": [
    { "path": "tests/fixtures/dist/**", "why": "a fixture that models a build output" }
  ]
}
```

`allow` lists root entries (a name, or a glob with `*`); `allowTracked` lists tracked paths (globs with `*` and `**`).
A guard is never silenced to get a PR green: move the file first, declare it only when its place is a fact.

## Java

The package layout inside a service is held by ArchUnit, not by this script: the shared `GovernanceRules`
(`orazaka-test-support`, and the Krizaka test kit of `krizaka-build`) refuse a class at a package root that belongs in
`domain`, `application` or `infrastructure`, and a `*Service` in `infrastructure/support`.
ArchUnit's freeze store (`archunit_store/`) is declared in `.repo-layout.json` unless `freeze.store.path` points under
`src/test/resources`.

## Rollout

The guard fails a build on the first violation. Each repository gets one cleanup pull request (move or declare) and one line
in its `AGENTS.md` pointing here.
