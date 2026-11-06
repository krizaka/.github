# The docs map

<!-- summary: Which documents a change of each kind must update, in one committed file, and how to add a category. -->

Founder, 2026-11-06: the newcomer guides, the READMEs, the AGENTS files and the skills must never fall behind. So a change of a
kind always updates the same documents, and that list is a file, [docs-map.json](../../docs-map.json) at the root of this
repository (ADR-026, [krizaka-internal#2734](https://github.com/krizaka/krizaka-internal/issues/2734)).

The local, never committed `krizaka.config.json` only points to it: its key `docsMap` is the path of the file in the reference
copy of this repository, and `~/.local/bin/kz-config docsMap` prints it. A tool reads the list through that path, never from a copy.

## The shape

`docs-map.json` holds `categories`. A category has:

| Key | What it is |
| :-- | :-- |
| `id` | lowercase letters, digits and dashes; the name used in an issue's « Done when » line (`docs-map category: way-of-working`) |
| `title` | the kind of change, in one line |
| `when` | a list of `{ repo, globs }`: the changed files that put a pull request in the category. Globs, never regexes: `*` inside a folder, `**` across folders |
| `docs` | a list of the documents to update: `{ repo, path }`, a file of that repository (no glob). `bump: true` for a krizaka-agents skill, whose plugin version in `.claude-plugin/marketplace.json` moves with it. `local: true` (with no `repo`) for a page outside git, such as the cockpit's: printed, never required |

The schema is [docs-map.schema.json](docs-map.schema.json). `scripts/docs-map.mjs` checks the same rules without a dependency,
and `node scripts/docs-map.mjs --exist` also checks, through the API, that every listed document exists in its repository.
`tests/docs-map.test.mjs` runs the shape; a category with a regex, a glob as a document, an id used twice or a local page with a
repository fails.

## The categories

| Category | A pull request that touches | Updates |
| :-- | :-- | :-- |
| `way-of-working` | krizaka-agents `tools/`, `skills/`, `subagents/`, `AGENTS.md`, `install.sh`; this repository's `docs/standards/` | the four newcomer guides (krizaka-internal `docs/onboarding/`), krizaka-agents README and AGENTS, the lane-session skill (bumped), `AGENTS.template.md` |
| `java-norm` | krizaka-java's parent, test support, quality and rewrite style | krizaka-java AGENTS and README, the `krizaka-java` skill (bumped), `AGENTS.template.md` |
| `typescript-norm` | krizaka-ts `packages/config/` | the config package README, the `krizaka-typescript` skill (bumped), `AGENTS.template.md` |
| `new-repository` | `repos.json` | the org profile README, `docs/standards/repositories.md`, the four newcomer guides |
| `product-rename` | `@krizaka/org` (`packages/org/`), `docs/standards/renames-*.md` | krizaka-com AGENTS, the org profile, the renames record, the four newcomer guides |
| `automation` | krizaka-agents `install.json` and git hooks; this repository's workflows, actions, `scripts/`, `tools/` | krizaka-agents README (crons), `docs/standards/guards.md`, the guide « with Claude Code », the cockpit's automation catalogue (local) |
| `release-process` | `release-repos.json`, `bump-krizaka.yml`, `krizaka-release.mjs`, `gen-release-consumers.mjs` | `docs/standards/ci-and-deploy.md`, the `krizaka-landing` skill (bumped) |
| `board-lanes` | krizaka-agents `tools/lanes/`, `board-*.py`, `kz.py`; `LABELS.md` | the lane-session and issue skills (bumped), `LABELS.md`, the guides « with Claude Code » |

## How a pull request is held to it

On each pull request, for each category its changed files match, one of the category's documents of the same repository is in
the diff, or the body has a line `Docs: <the pull request or issue that updates them>` (the documents are in another
repository) or `Docs: not needed, <why>`. The check is [krizaka-internal#2758](https://github.com/krizaka/krizaka-internal/issues/2758);
the rule that makes every active repository run it is [krizaka-internal#2759](https://github.com/krizaka/krizaka-internal/issues/2759).

## Add a category

1. Add the category to `docs-map.json`: an `id`, a `title`, the `when` globs of the files that mean this kind of change, and the
   `docs` that must then change. Name a document that exists; the map is the list, not a wish.
2. Run `node --test tests/docs-map.test.mjs` and `node scripts/docs-map.mjs --exist`.
3. Update this table, and the documents of the `way-of-working` category (this page is in it).
4. A new bug of the kind « the guide was out of date » is a missing entry here: add it before the fix (bug means missing guard).
