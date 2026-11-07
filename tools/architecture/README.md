# tools/architecture

The org's architecture as code ([ADR-027](../../docs/adr/ADR-027-architecture-as-code.md), krizaka-internal#2809): the
assembler that reads every active repository at its default branch, takes its current state from `@krizaka/architecture` (the
one generator: containers, versions, org dependencies, components, external services), reads the hand-written LikeC4 models with
the org base (`docs/architecture/specification.c4`, `org.c4`), counts the drift and writes one verdict per repository for the
matrix rule `architecture-model`, the laid-out views and the dependency graph for the cockpit. How to write a model:
[docs/standards/architecture.md](../../docs/standards/architecture.md).

```sh
npm ci --ignore-scripts
node architecture.mjs --local <reference copies> --out <dir>          # from the Mac's copies (no network)
GH_TOKEN=… node architecture.mjs --out <dir>                          # from GitHub: one commit, one tarball and the tags per repository
GH_TOKEN=… node architecture.mjs --publish-from <dir>                 # publish on the data branch conformance-matrix
node architecture.mjs --local <reference copies> --repo <name> [--use <repo>=<worktree>]   # one verdict; exit 1 when red
npm test
```

| Module | One job |
| :-- | :-- |
| `lib/sources.mjs` | the lists (`repos.json`, the family of `@krizaka/org`) and the sources (files and tags at one commit); this checkout is always krizaka/.github |
| `lib/facts.mjs` | the joins across repositories: each dependency's publisher, the latest tags, behind or not; the repository's C4 levels from `@krizaka/architecture` |
| `lib/model.mjs` | the only module that talks to LikeC4: the generated systems and views, a home's check, the parse and the layout |
| `lib/drift.mjs` | the required units, the bindings, the drift items, the verdicts and the numbers |
| `lib/views.mjs` | the laid-out views as the cockpit draws them, with links (repository, tag, ADR, issue) and the facts they bind |
| `lib/graph.mjs` | the dependency graph |
| `lib/assemble.mjs` | all of it, in order; the same commits give the same bytes |
| `lib/render.mjs`, `lib/publish.mjs` | `summary.md`; the data branch |

Output schema: [docs/standards/architecture.schema.json](../../docs/standards/architecture.schema.json). Run daily by the
Conformance workflow (job « Conformance matrix », step « The architecture »), before the matrix that reads its verdicts; its own
tests run in the workflow « Architecture tool ».
