# ADR-007: Shared rules in one place, by repository profile

- **Status:** proposed (2026-10-23). It waits for the CTO's « validé » on krizaka/.github#217.
- **Issue:** krizaka/.github#217. It coordinates with #113 (the CI build pack).
- **Deciders:** Oussama (« les règles en un seul endroit, partagées »), then the CTO.
- **Numbering:** ADR-006 is krizaka/.github#197, still open, so this decision takes ADR-007.
- **Evidence:** [docs/standards/rules.md](../standards/rules.md) holds the inventory with paths and counts, the profiles, and the migration plan.

## Context

The code rules of the organisation exist, and they work. They are spread across the repositories as copies. Measured on `main` of the 44 repositories on 2026-10-23:
- **Ten repositories carry the same ast-grep setup.**
  - The `sgconfig.yml` files are 10 copies with 1 content.
  - There are 149 rule files with 46 contents. **The rule bodies are the same; only their `files:`/`ignores:` globs differ**, because each repository's layout differs. Orochia also changes two message lines.
  - There are 139 rule tests with 17 contents.
  - `sg-ratchet.mjs` and `sg-fix.mjs` are in 10 copies each; krizaka-com's differs by one line, an eslint-disable comment.
- **`check-seo-family.mjs`, « copied unchanged into each repository », has drifted.** Nine copies have 255 lines and four have 235, 34 lines apart: orazaka-web-client, yasakia, yomizaka and yororis.
- **About 8,400 lines are exact repeats** across these pieces, without counting the agent files.
- **ESLint and dependency-cruiser are already shared** through `@krizaka/config` (krizaka-ui `packages/config`). It holds the flat configs, `krizakaStack()`, the dependency-cruiser boundary and the `krizaka-ratchet` bin. The 15 repositories that use it pin anywhere from `^0.1.0` to `^0.7.0`.
- **Java has two rule libraries.**
  - `krizaka-test-support` (krizaka-build, on Maven Central) has `CodeRules`, `ArchitectureRules`, `ConfigBindingRules`, `SourceRules` and `FrozenRules`.
  - `orazaka-test-support` `GovernanceRules` (orazaka-build) has 1,181 lines, and **17 of its rule names duplicate `CodeRules`**: `assertDomainPurity`, `assertFieldsPrivate`, `assertNoFieldInjection`… The rest is Orazaka's own (packs, capabilities, settlement).
  - 33 governance test classes in 14 repositories wire one library or the other.
  - Spotless and OpenRewrite are configured once, in `krizaka-parent`.
- **Python** lint is an input of the shared `python-ci.yml` (`ruff check .`), with 5 callers.
- **Every agent file restates the rules.**
  - 21 `AGENTS.md` files carry a « Static rules » section of 22–29 lines, 511 lines in total, in 7 variants.
  - The charter's CONTRIBUTING §10 restates them a third time.
  - When a rule changes, these texts are what goes stale first.

## Decision

1. **The rule lives once, with its tests, in a package of its runtime.** A repository keeps only:
   - its **profile** or profiles;
   - its **local rules** (a folder, with tests);
   - its **ratchet counts**, its debt, which is local by nature.
2. **TypeScript and JavaScript: `@krizaka/config` becomes the one rules package (option B).** It already holds ESLint, dependency-cruiser and `krizaka-ratchet`. It gains:
   - **The ast-grep rules and their tests**, written once, with the body and the message. Each rule declares the **roles** it applies to (`domain`, `feature`, `ui`, `any`), not paths.
   - **`krizaka-rules`**, one bin:
     - **`sync`** writes the git-ignored `.krizaka/ast-grep/*.yml` from the package's rules and the repository's `krizaka.rules.json`, which lists its profiles and its paths by role. `sync --check` fails when the files are stale.
     - **`check`** runs ESLint, the ast-grep scan through the ratchet, dependency-cruiser, the file-name check and, for sites, the SEO family check.
     - **`ratchet`** replaces `sg-ratchet.mjs` (`--update` locks a gain).
     - **`fix`** replaces `sg-fix.mjs`.
     - **`doc`** prints the profile's rule table.
     - **`seo-family`** replaces `check-seo-family.mjs`.
   - **`@ast-grep/cli` as an exact dependency of the package**, so every repository runs the same ast-grep.
   - A proof that this works: ast-grep 0.51.0 loads rules from a folder under `node_modules`, or from a generated folder, and resolves their `files:` globs from the repository root. I checked it on 2026-10-23 in a scratch repository.
3. **Java: no new artifact (option C, already half there).**
   - `krizaka-test-support` stays the home of the ArchUnit rules. The 17 generic duplicates leave `GovernanceRules` for `CodeRules`; the rest stays in `orazaka-test-support` as Orazaka's own.
   - `krizaka-test-support` gains one entry point per Java profile, `KrizakaRules.buildingBlock(classes)` and `KrizakaRules.service(classes)`. Each repository's governance test becomes the profile call, plus its local rules, plus its `FrozenRules` store.
   - Spotless and OpenRewrite stay in `krizaka-parent`.
4. **CI runs the shared rules through the repository's own lint (option D as the carrier, not the store).**
   - #113's `krizaka-ci.yml` `quality` action calls `krizaka-rules check` for Node, and Maven `verify` for Java, where ArchUnit runs as tests.
   - The rules do not live in workflows. A workflow cannot run offline, and the rules must run in the Copilot sandbox and locally.
5. **Python stays as it is.** `ruff` comes through `python-ci.yml`; a shared `ruff.toml` comes when a second Python rule set appears. Today the organisation has one `pyproject.toml`, with its `[tool.ruff]` settings (orazaka-worker-media `pyproject.toml:14-30`).
6. **Agent files point, they do not restate.**
   - A repository's `AGENTS.md` says its profile in three lines and links the table, which is generated by `krizaka-rules doc` into the package README.
   - CONTRIBUTING §10 keeps the principle (« the debt only goes down, never silenced ») and links [docs/standards/rules.md](../standards/rules.md).
   - The charter template says the same. The before and after are in the standard, §4.

## The options weighed

| Criterion | A. A new `@krizaka/rules` | **B. Extend `@krizaka/config` (chosen)** | C. Java rules artifact | D. Reusable workflows |
|---|---|---|---|---|
| Adding a local rule | `rules/` in the repo, listed beside the package's | **same** | a local `@ArchTest` beside the profile | not possible offline |
| A local exception | the ratchet count; a path left out of a role in `krizaka.rules.json` | **same**; `--off=<rule>` only with an ADR line | `FrozenRules` store (already used: 6 modules in 5 repositories) | — |
| Versioning, Renovate/Dependabot | one more package to bump next to `@krizaka/config` | **one package**, already in 15 repos; grouped with `@ast-grep/cli` (now its dependency) | `krizaka-test-support` follows the BOM | the workflow pin (`@sha`) |
| Ratchets per repository | kept (counts are local) | **kept**. A new rule in a minor version fails the Renovate PR (`unrecorded`, `sg-ratchet.mjs` `compare`) until its baseline is recorded: a reviewed step, never silent | `FrozenRules` | — |
| How the rules reach Copilot and Claude | the package README | **the package README, generated from the rules**; AGENTS.md cites the profile | the Java README | not visible to an agent |
| CI time | same tools | **same**; `sync` costs milliseconds | same | same |
| Offline tests (Copilot sandbox) | yes (after install) | **yes**: the rules are in `node_modules`, and the package tests its own rules without network | yes | **no**: a workflow runs only on GitHub |
| New things to own | a package, its release, its docs | **none**: `@krizaka/config` has them already | an entry point | — |

**A was rejected.** It would duplicate `@krizaka/config`'s release, docs and adoption, and split « the config » from « the rules » that the ESLint stack rules already mix.

**D alone was rejected.** It runs checks; it cannot hold rules that must run in the sandbox and on a laptop. It remains the carrier, through #113.

## Consequences and costs

- **One package carries more.** `@krizaka/config` gets ast-grep, its rules, and five bins. Its version spread (0.1 to 0.7 today) is the first thing the migration fixes: every pilot moves to the release that ships the rules.
- **One generated folder per repository** (`.krizaka/ast-grep/`, git-ignored), rebuilt by `sync`. A stale copy fails `sync --check` in `lint`.
- **A rule change reaches every repository through a version bump,** never through 10 copies. Renovate opens the PR, and a new rule asks for its baseline in that PR.
- **Repositories without ast-grep get the rules by declaring a profile.** That covers the mobile apps, orazaka-ui-kit, orochia-design-system, orazaka-cli, krizaka-blog, krizaka-motion and yororis. They start at their current counts.
- **The Java move touches the governance tests of the Orazaka services.** Each one keeps its frozen store, so no violation appears or disappears.
- **Not decided here:** moving `@krizaka/config` out of krizaka-ui (it stays); a shared Python rule set (not needed yet); the CI pack itself (#113).
