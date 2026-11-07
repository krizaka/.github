# ADR-027 — Architecture as code: the current state generated from `main` by `@krizaka/architecture`, the intent and the target written in LikeC4, the drift counted by the matrix, one interactive view

- **Status:** Accepted (CTO, 2026-11-07, on the founder's request of the same day; a delegated decision: reversible, no cost).
- **Date:** 2026-11-07
- **Issue:** krizaka-internal#2808 (epic). **Supersedes** the plan of krizaka-internal#1917 (#1919 to #1923, § « The prior plan »).
  **Builds on:** [ADR-026](ADR-026-automation-strategy.md) (one home per kind; the automation catalogue as the pattern: one tool
  here, read daily by the matrix and locally by the Mac), the conformance matrix ([rules.json](../standards/rules.json),
  [conformance.md](../standards/conformance.md)), [ADR-013](ADR-013-guards-and-local-sonar.md) §5 (less in-house) and the
  trusted-open-source rule (a trusted project behind a small facade).
- **Scope:** the architecture views of the org: the three assets (Sovkora, Verikora, Folioviv), the libraries, the static sites
  and the org's own platform; levels C1 (system context) and C2 (containers), current and target, and C3 (components) as
  generated. C4 (code) stays in the code graph.

## Context

The founder's request (2026-11-07, translated): « I need an architecture vision to reassure me. In the cockpit, Architecture tab,
one view per asset — the three — and that becomes the norm: a C1 and a C2 diagram of the current state and of the target. I want
to see where we are going. Then the same for the libraries, C1, C2 and the target, a C1 and C2 of the static sites, and finally the
dependencies between the libraries that build an asset. The diagram must be visual and represent `main` every time. The local
build of the repositories must update it every time. It is as code, and the matrix must give me the right numbers on the sync with
`main`. Not text like today: something interactive that gives me all the information and links, with filters, to the GitHub tags.
Use open-source libraries for an ultra-advanced graphic. »

### What exists (measured on 2026-11-07, the 36 reference copies on `main`)

| Where | What it shows | Source | Checked against `main` |
| :-- | :-- | :-- | :-- |
| The cockpit, Architecture tab | a folder tree and an edges table per repository; then « C4 from the code »: one chip per repository and three **tables** (context, containers, components; 9, 14 and 23 rows for the first repository) — the founder: « is that the C4? » | the local code graph; `@krizaka/architecture` 0.1.0 (krizaka-ts) run on the reference copies | yes, it is generated from `main`: the right source, shown as text; no versions, no tags, no target |
| The cockpit, Organisation tab | a static grid of boxes (C1, C2) | a hand-typed file in the founder's company folder | no: not versioned, no check |
| sovkora `orazaka.workspace.json` and `docs/_generated/architecture.json` | the asset's repositories, modules and flows | a hand-kept manifest, and a generator that reads it | no: **0 of the 16** names they list exist since the renames of 2026-11-06 |
| krizaka.com « how it fits », java.krizaka.com building blocks | ordered lists | manifests, at build | partly |
| A repository's `docs/architecture/` | — | — | 0 of 36 have one |

The generated current state already exists: `@krizaka/architecture` reads a checkout and gives its containers (workspaces,
Maven modules), its components (the first folder under `src/`, with the imports between them) and the external services it
reads (the env declarations, by context). What it lacks: the versions, the org dependencies with the version that builds them,
the Rust and Python units, a parser for the POM (it reads XML with regexes), the tags and the links. Nothing shows where we are
going (there is no target anywhere), nothing is a picture one can explore, and the one hand-kept list drifted within a day. The prior plan (krizaka-internal#1917, 2026-10-31: a home-made `krizaka.arch/1` JSON drawn by a
home-made SVG `ArchitectureMap`) had no target either, wrote its own renderer, and never started.

## Options

Checked on 2026-11-07 against the npm registry and GitHub.

| Option | Licence | Maintenance | Adoption | Verdict |
| :-- | :-- | :-- | :-- | :-- |
| **LikeC4** (`likec4`, `@likec4/language-services`): a C4 language in TypeScript; a parser and a layout (Graphviz in WebAssembly) callable from Node; views by predicates; `extend` across files; a model builder for « load, then patch »; exports to Mermaid, PlantUML, D2 and draw.io | MIT | 1.60.0 on 2026-10-15, about one release a month; 69 contributors, one lead maintainer | 6.0k stars; 608k npm downloads a month | **Chosen for the intent.** Plain-text C4 in each repository, parsed and laid out in 0.3 s in the spike, no JVM; tags and views express current and target |
| Structurizr DSL | Apache-2.0 | `structurizr/java`, `cli` and `lite` archived on 2026-02-01, folded into `structurizr/structurizr` (522 stars) | the C4 reference; smaller momentum now | Refused: a Java toolchain for a Node cockpit and CI, and a project in transition; LikeC4 keeps the same C4 vocabulary |
| Mermaid C4 | MIT | very active (12.3.0 on 2026-11-03) | 91k stars; 84M downloads a month | Refused as the model and as the view: its C4 diagrams are documented as experimental, the layout is fixed, there are no filters or focus. Kept as an **export** (GitHub renders it, step 4.2) |
| A generated graph drawn with React Flow (`@xyflow/react`) and laid out by ELK (`elkjs`) or dagre | MIT; ELK EPL-2.0 or GPL-3.0 (EPL-2.0 passes the licence gate); dagre MIT | React Flow 12.12.1 (2026-11-02); ELK 0.12.1 (2026-10-28); `@dagrejs/dagre` 3.1.3 (2026-10-24) | 39k stars and 66M downloads a month; 58M; 26M | **Chosen for the canvas and the facts graph.** Zoom, pan, mini-map, our own nodes and edges; ELK lays out nested C4 boundaries and re-lays out a filtered graph in the browser; dagre is weaker on nested boundaries |
| `@krizaka/architecture` (ours, krizaka-ts) | Apache-2.0 | 0.1.0 | the cockpit only | **Kept and extended as the one generator of the current state of a repository** (libraries first: no second generator). It is not a model of intent and has no target: that is LikeC4's part |
| `@likec4/diagram` (LikeC4's own React renderer) | MIT | as LikeC4 | — | Refused for the cockpit: it brings Mantine and its own styles, outside `@krizaka/ui` and our tokens, and our drift and facts overlays need our own nodes |

The proposed direction holds: LikeC4 for what is written by hand, a generated graph for the facts (from `@krizaka/architecture`),
and one view that combines both.

## Decision

### 1. Two kinds of truth, kept apart

| | Written by hand (intent) | Generated from `main` (facts) |
| :-- | :-- | :-- |
| What | the people and the external systems; the containers of a system, what each is for and how they talk; the **target**: what is planned and what is retiring, with the ADR or the issue that carries it | per repository (`@krizaka/architecture`): its containers (deployable apps, published packages, reactor modules, crates, Python projects) with their version, the org dependencies with the version that builds them, the components and their imports, the external services; across the org (the assembler): the latest tags, how far each dependency is behind its library's latest tag, the links |
| Where | `docs/architecture/*.c4` in the system's home repository | never committed: computed at the commit read, and recorded with it |
| Can it lie? | yes, and that is the drift (§ 6) | no: it is what `main` holds at the recorded SHA |

« Current » for the dependency graph, the containers and the versions means the facts. The hand-written current view says what
those facts are for; where the two disagree, the disagreement is the drift the matrix counts.

### 2. The model as code

- **One specification for the org**, in this repository: `docs/architecture/specification.c4`. Element kinds: `person`,
  `system`, `external`, `container`, `app` and `mobile`, `library` (a building block of the system: a package or a set of
  artifacts), `datastore`, `queue`, `site` (a static site). Tags: `#planned` (target only) and `#retiring` (current only); an
  untagged element is current and target. Metadata keys: `repo` (a repository of the registry), `path` (a unit inside it, such
  as `apps/web` or `packages/*`; the root when absent), `adr` (`ADR-022`, or `sovkora ADR-073`) and `issue`
  (`krizaka-internal#2663`). No repository writes a specification of its own (the tool refuses it): one vocabulary, one look.
- **The org's own file**, in this repository: `docs/architecture/org.c4`. The people (the founder, the contributors, the agents,
  the customers and visitors), the external systems (GitHub, the package registries, the cloud and CDN providers, the model
  providers), the org's platform system (this repository, the agents' tooling, the infrastructure, the templates) and the
  relationships between systems.
- **The systems are generated, never typed** (§ 4): one `system` per entry of the family in `@krizaka/org` that has a
  repository (products are the assets, open source the libraries, the company's sites), with the family id as its id
  (`sovkora`, `verikora`, `folioviv`, `ui`, `java`, `ts`, `lab`, `krizaka`, `blog`), its name, its address and its repository.
- **A home writes only its own system's inside**: `model { extend sovkora { … } }` and relationships. It may point at another
  system (`verikora.api -> sovkora`), never inside it, so every repository parses with the org base alone and its verdict
  depends only on its own commit.
- **The views are generated by convention**: per system `<id>_c1` (the system and everything that talks to it) and `<id>_c2`
  (its inside); for the org `org_c1`, `assets_c1`, `libraries_c1`, `libraries_c2`, `sites_c1` and `sites_c2`, from the same
  lists. A home may add views; it never has to write the standard ones.
- **Current and target live in one model.** The C2 view holds both, so the cockpit lays out the union once and switches
  between current (without `#planned`), target (without `#retiring`) and the gap (both, marked) without a node moving.

Example, in Sovkora's home:

```text
model {
  extend sovkora {
    edge = container 'Edge service' {
      technology 'Java 21, Spring Boot 4'
      metadata { repo 'sovkora-edge-service' }
    }
    broker = queue 'Message broker' {
      #planned
      metadata { issue 'krizaka-internal#2663' }
    }
  }
  sovkora.edge -> sovkora.broker 'publishes jobs' { #planned }
}
```

### 3. Where it lives (one home per kind, ADR-026)

| What | Home |
| :-- | :-- |
| A system's C1 and C2 (intent, current and target) | its home repository's `docs/architecture/`: the family entry's repository (`sovkora` for the 16 Sovkora repositories, `krizaka-ui` for Krizaka UI…) |
| The org specification, the people, the externals, the platform system | this repository, `docs/architecture/` |
| The generator of a repository's current state (containers, versions, org dependencies, components, external services) | krizaka-ts, `@krizaka/architecture` (one generator, used by the assembler, the CLI and any docs site) |
| The org assembler (the joins across repositories, the tags, the LikeC4 reader, the drift, the views, the verdicts) | this repository, `tools/architecture/`: it reads no manifest itself |
| The published result | the data branch `conformance-matrix`: `architecture/architecture.json` and `architecture/summary.md` |
| The local result | the Mac's temporary folder (`kz-config tmp`): `architecture/architecture.json` |
| The canvas | the cockpit first (`src/components/diagram/`, the only importer of React Flow and ELK), then `@krizaka/ui/diagram` (§ 9) |
| Components (C3), code (C4) | generated: `@krizaka/architecture` (C3, drawn in the cockpit under each container) and the code graph (C4) |

### 4. The lists are read, never typed

| List | Read from | Later |
| :-- | :-- | :-- |
| The systems: assets, libraries, the company's sites | `@krizaka/org` `family`, the single source of the family and the brands, pinned in the tool's lockfile | — |
| The repositories, active or not, and the asset each belongs to | `repos.json` (`owner`, `status`, `archived`), generated from the GitHub API | `policy.json` `apps[].repos` once step 2 of krizaka-internal#2781 lands; one reader changes (`tools/architecture/lib/sources.mjs`) |
| The static sites | `deploy/apps.json` and each app's specification on `main` | — |
| The units, packages, versions and dependencies | `@krizaka/architecture` on the manifests of `main`: `package.json` and the workspace file with the lockfile's version, `pom.xml` and its modules, `Cargo.toml`, `pyproject.toml`, each read with its parser | — |
| The latest tags | the repository's tags (`@krizaka/<package>@x.y.z`, `vX.Y.Z`, calendar tags): the reference copy, or `git/matching-refs/tags` on GitHub | — |

A version is the one that builds the unit: the lockfile's for npm (`pnpm-lock.yaml`, `package-lock.json`), the pin otherwise,
and for a Maven unit whose org dependency is managed, the `krizaka-bom` its parents import. « Behind » is that version against the
library's latest tag.

### 5. The facts

`@krizaka/architecture` 0.2.0 (step 1.0) gives, per repository: its containers with ecosystem, language, version and published
or private, each container's org dependencies (the package, the range, the version that builds it, development or not), its
components and imports, its external services, as today, deterministic. `architecture.json` (schema
`docs/standards/architecture.schema.json`) then holds, for each active repository at its `main` SHA: that output, the commit and
its date, the system, the kind, the visibility, the latest tag (name, address), and per dependency the repository that publishes
it, that package's latest tag and whether it is behind. Then the systems, the models (each file with its
SHA-256, the parse errors), the drift items, the laid-out views (nodes with their position, size, kind, lifecycle, links and the
facts they bind; edges with their route), the dependency graph and a summary. Everything is sorted and only `generatedAt` holds a
clock: the same commits give the same bytes (tested).

### 6. The drift: what the matrix counts

A **required unit** is a repository's root, each `apps/*` workspace, and, in a library, each published package (a `package.json`
that is not private, a module of the root reactor, a crate). An element binds the units its `repo` and `path` name (`path` may
end in `*`).

| Drift | When |
| :-- | :-- |
| `undocumented` | a required unit on `main` that no current element binds |
| `phantom` | a current element bound to a repository or a path that `main` does not have (renamed, archived, deleted) |
| `reached` | a `#planned` element whose binding already exists on `main`: the target is reached, drop the tag |
| `gone` | a `#retiring` element whose binding is gone from `main`: drop the element |
| `missing` | a system's home has no `docs/architecture/*.c4` |
| `invalid` | the model does not parse against the org base (the parser's errors, with file and line) |

Relationships at runtime (calls, events) are intent: they are drawn, not checked. Build dependencies are facts: they are
generated, never written by hand.

### 7. Sync with `main`: the rule and the numbers

- **The rule `architecture-model`** ([rules.json](../standards/rules.json)), for every active repository: pass when the
  repository is bound by its system's model, that model parses, and no drift item names the repository. A home also carries its
  model's `missing` and `invalid`. The evidence is the model files with their SHA-256 and the commit read. The check reads the
  tool's verdict **at the same commit** as the matrix: another commit, or no verdict, is `unknown`, never green.
- **First step, reported.** No `security` flag: it never fails the run, opens no issue and is not fanned out (the « warn »
  step). It becomes blocking once every active repository passes, by a one-line change and the founder's go (step 4.3).
- **The numbers**, in `architecture/architecture.json` and in the matrix: the repositories in sync out of the active ones, the
  drift items by kind, and for each view the `main` SHA it reflects. The cockpit shows the same three numbers in its header,
  and each repository's matrix line.

### 8. The local build

A krizaka-agents tool (`tools/cockpit/architecture.py`, declared in `tools/install.json`, run by `kz-run`) runs this
repository's tool, from its reference copy, on the reference copies (`kz-config repos`, always on `main`) after the workspace
sync, and writes the cockpit's data with the SHA of every repository read. It does nothing when no reference copy moved, and
installs the tool's dependencies only when their lockfile changed. There is no hand step, and the matrix's daily run uses the
same code on GitHub's copies.

### 9. The cockpit's Architecture tab

- **It replaces the « C4 from the code » tables.** Views: one per asset (Sovkora, Verikora, Folioviv), the libraries, the static
  sites and the dependencies; C1, C2 and the generated C3 of a container; current, target, the gap, or current and target side by
  side. A system whose home has no model yet still shows its generated current state (containers, dependencies, external services
  from `@krizaka/architecture`); the model adds the intent and the target. The code-graph explorer stays, under « Code ».
- **The canvas**: React Flow with our nodes and edges drawn in `@krizaka/tokens` (both themes); LikeC4's layout for the
  hand-written views, ELK for the dependency graph (re-laid out on each filter); smooth zoom and pan, focus on a node (its paths
  lit, the rest dimmed), a mini-map, a search; loaded only on this tab.
- **The dependency graph**: the library packages on one side, each asset's units on the other; one edge per dependency with the
  pinned version, in the danger tone when it is behind the library's latest tag.
- **Filters**, kept in the address: asset, layer (people, systems, containers, libraries, externals), current, target or gap,
  language, drift only.
- **Every node links** to its GitHub repository, its latest tag, its ADR, its issue (for a planned element) and its matrix line.
- **Around the canvas, `@krizaka/ui` only** (Page, Tabs, Facts, Dialog, Badge, DataTable for the text version of every view).
  The canvas folder is the only importer of React Flow and ELK. It moves into `@krizaka/ui/diagram`, with a « diagrams » covered
  domain in `@krizaka/config` that refuses a direct import of `@xyflow/*`, `elkjs`, `@dagrejs/*`, `mermaid` and
  `@likec4/diagram`, once the freeze lifts (step 4.1): krizaka-ui is frozen except for the carousel, and the cockpit is the first
  consumer and the test bench.

### 10. Refused

- A hand-written current dependency list or version anywhere (it drifts in a day, as Sovkora's manifest did).
- One model per repository for the 16 Sovkora repositories: one system, one home.
- A specification per repository; a typed list of assets, libraries or sites.
- Generated facts or laid-out views committed in a repository: they would be stale at the next merge, so they live with the
  commit they read.
- Structurizr (a JVM, a project in transition), Mermaid as the model, `@likec4/diagram` in the cockpit, a home-made renderer.

## Consequences

- One picture per system, current and target, readable as text in its repository and explorable in the cockpit: the founder
  sees where we are going, and the matrix proves the picture against `main`.
- A new system or repository appears in the views without anyone typing it; a repository nobody models is a red cell.
- Cost: one assembler in this repository (`@likec4/language-services`, `@krizaka/org` and `@krizaka/architecture`, pinned; about
  60 MB installed), one job beside the daily catalogue, one folder per home, one canvas. `@krizaka/architecture` stops being
  dependency-free: it gains three trusted parsers (`yaml`, `smol-toml`, `fast-xml-parser`), because ADR-026 refuses a regex over a
  structured format.
- Risk: LikeC4 has one lead maintainer. The model files are plain C4 text, the parser sits behind one module of the assembler, and
  the exports to Mermaid, PlantUML, D2 and draw.io keep a way out.

## The prior plan (krizaka-internal#1917, 2026-10-31)

| Issue | Becomes |
| :-- | :-- |
| #1917, the epic | superseded by krizaka-internal#2808 |
| #1919, its ADR | superseded by this ADR, closed by its pull request |
| #1920, an org model in `@krizaka/architecture` | re-scoped to step 1.0: `@krizaka/architecture` 0.2.0 generates every repository's current state (versions, org dependencies, all ecosystems, parsers); the joins across repositories stay in the assembler |
| #1921, repository topics and a nightly release | superseded: the daily publication on `conformance-matrix`; the lists come from `@krizaka/org` and the registry |
| #1922, `ArchitectureMap` in `@krizaka/ui` | re-scoped to `@krizaka/ui/diagram` (step 4.1) |
| #1923, the cockpit opens on the map | re-scoped to the cockpit's Architecture tab (step 1.4) |
| #1924 to #1926 (krizaka.com, java.krizaka.com and Sovkora's docs draw from the model), #1951 (C3 from the code) | kept, under krizaka-internal#2808, after step 4 |

## Plan

Each line is one issue (one repository, one theme). S is under half a day, M up to two days, L more.

### Step 1 — the proof (now, during the freeze: tooling and documentation only)

| # | Repository | Issue | Size |
| :-- | :-- | :-- | :-- |
| 1.0 (krizaka-internal#1920) | krizaka-ts | `@krizaka/architecture` 0.2.0: every container's version and org dependencies (lockfile, BOM), Maven, Rust and Python units read with their parsers, a file-map entry point | M |
| 1.1 (krizaka-internal#2809) | .github | the assembler: the org specification, `@krizaka/architecture` per repository, the tags and the joins, the LikeC4 reader, the drift, the daily publication | L |
| 1.2 (krizaka-internal#2810) | .github | the `architecture-model` rule, reported | M |
| 1.3 (krizaka-internal#2811) | krizaka-agents | the local build after each workspace sync | S |
| 1.4 (krizaka-internal#1923) | the cockpit | the Architecture tab | L |
| 1.5 (krizaka-internal#2812) | sovkora | Sovkora's C1 and C2, current and target | M |

A progress report closes step 1, before step 2 opens.

### Step 2 — the two other assets

| # | Repository | Issue | Size |
| :-- | :-- | :-- | :-- |
| 2.1 | verikora | Verikora's C1 and C2, current and target | M |
| 2.2 | folioviv | Folioviv's C1 and C2, current and target | M |

### Step 3 — the libraries, the static sites, the platform

| # | Repository | Issue | Size |
| :-- | :-- | :-- | :-- |
| 3.1 | krizaka-ui | Krizaka UI, with krizaka-composer and krizaka-desktop bound | S |
| 3.2 | krizaka-ts | Krizaka TypeScript | S |
| 3.3 | krizaka-java | Krizaka Java | S |
| 3.4 | krizaka-lab | Krizaka Lab | S |
| 3.5 | krizaka-com | krizaka.com, with the coming-soon pages bound | S |
| 3.6 | krizaka-blog | the blog | S |
| 3.7 | .github | the platform system complete (the agents' tooling, the infrastructure, the templates, Kridoc's place) | S |

### Step 4 — after the freeze

| # | Repository | Issue | Size |
| :-- | :-- | :-- | :-- |
| 4.1 (krizaka-internal#1922) | krizaka-ui | `@krizaka/ui/diagram` and the « diagrams » covered domain in `@krizaka/config`; the cockpit moves to it | M |
| 4.2 | .github | a GitHub-readable render of every view (Mermaid, on the data branch) for contributors without the cockpit | S |
| 4.3 | .github | `architecture-model` blocking, once every active repository passes | S |
| 4.4 (#1924 to #1926) | krizaka-com, krizaka-java, sovkora-web | the public pages that draw the architecture read the model | M each |

Steps 2 to 4 are filed when their step opens. Done when the `architecture-model` column is green in every active repository and
the cockpit shows every system's C1 and C2, current and target, from `main`.
