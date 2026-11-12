# Architecture as code

<!-- summary: How a system's C1 and C2, current and target, are written in its home repository, what is generated from main, and how the drift is checked. -->

Decided in [ADR-027](../adr/ADR-027-architecture-as-code.md) (krizaka-internal#2808). Every system of the org (the assets, the
libraries, the company's sites, the platform) has one picture, current and target, that the founder explores in the cockpit and
that the conformance matrix proves against `main`.

## Two kinds of truth

| | Generated from `main` (never written) | Written by hand (the intent and the target) |
| :-- | :-- | :-- |
| What | each repository's containers, versions, org dependencies, components and external services (`@krizaka/architecture`); the systems (the family of `@krizaka/org`); the latest tags; behind or not; the standard views | what each container is for, how they talk, the people and the external systems, what is **planned** and what is **retiring** |
| Where | computed at the commit read, never committed | `docs/architecture/*.c4` in the system's home repository |

## Where a model lives

| System | Home | Files |
| :-- | :-- | :-- |
| an asset (Sovkora, Verikora, Folioviv) | its main repository (`sovkora` for its 16 repositories) | `docs/architecture/<system>.c4` |
| a library family (Krizaka UI, TypeScript, Java, Lab) | the family's repository (`krizaka-ui`…) | the same |
| a company site (krizaka.com, the blog) | its repository | the same |
| the platform, the people, the external systems, the specification | this repository | `docs/architecture/specification.c4`, `docs/architecture/org.c4` |

A home writes only its own system's inside, with `extend`, and relationships; it may point at another system, never inside it.
It never writes a `specification` (the org's is [`docs/architecture/specification.c4`](../architecture/specification.c4)).

## Writing a model

```text
model {
  extend sovkora {
    web = app 'Web app' {
      description 'The customer site and the console.'
      technology 'Next.js 16'
      metadata {
        repo 'sovkora-web'
      }
    }
    search = container 'Web search' {
      #planned
      technology 'SearXNG'
      metadata {
        adr 'sovkora ADR-087'
      }
    }
  }
  customer -> sovkora.web 'chats and runs Studios'
  sovkora.web -> sovkora.search 'grounds answers' { #planned }
}
```

- **Kinds**: `container`, `app` (web), `mobile` (phone or desktop app), `library` (a building block: a package or artifacts),
  `datastore`, `queue`, `site` (a static site); `person`, `system` and `external` are the org's.
- **Lifecycle**: no tag = current and target; `#planned` = target only; `#retiring` = current only. A planned or retiring element
  carries the `adr` or the `issue` that changes it.
- **Binding**: `metadata { repo '<repository>' path '<unit>' }` binds an element to what `main` holds: `path` is a unit such as
  `apps/web` or `packages/*` (the root when absent). A current element of the repository covers its root; each `apps/*` unit, and
  in a library each published package, needs an element of its own (a `*` path may bind several).
- **Links**: `adr 'ADR-022'` (this repository) or `adr 'sovkora ADR-073'` (another one), `issue 'krizaka-internal#2663'`, and
  any `link <url> 'title'`. The repository, its latest tag and its matrix line are added from the facts.
- **Views**: generated (`<system>_c1`, `<system>_c2`, and the org's `assets_c1`, `libraries_c1`, `libraries_c2`, `sites_c1`,
  `sites_c2`, `org_c1`); a home may add its own.

## What is checked: the drift

| Drift | When |
| :-- | :-- |
| `undocumented` | a unit on `main` (a root, an `apps/*`, a library's published package) that no current element binds |
| `phantom` | a current element bound to a repository or a path that `main` does not have |
| `reached` | a `#planned` element whose binding already exists on `main`: drop the tag |
| `gone` | a `#retiring` element whose binding is gone from `main`: drop the element |
| `missing` | a system's home has no `docs/architecture/*.c4` |
| `invalid` | the model does not parse against the org base (file and line) |

An asset's repositories may only be bound by that asset's model. Runtime relationships are drawn, not checked; build dependencies
are facts and never written by hand.

## Check a model before its pull request

From a checkout of this repository, on the Mac's reference copies, reading your branch for the home you change:

```sh
cd tools/architecture && npm ci --ignore-scripts
node architecture.mjs --local "$(~/.local/bin/kz-config repos)" --use sovkora=<your worktree> --repo sovkora
```

It prints the repository's verdict and every drift item, and exits 1 while it is red. `--out <dir>` writes the whole architecture
(`architecture.json`, `summary.md`). The tool reads tracked files: `git add` a new model first.

## Where the numbers are

- **The matrix**: the rule `architecture-model` (one cell per active repository, the commit it read, the drift items).
- **The data branch** `conformance-matrix`: `architecture/architecture.json` (schema
  [`architecture.schema.json`](architecture.schema.json)) and `architecture/summary.md`, written daily by the Conformance workflow.
- **The founder's cockpit**, Architecture tab: rebuilt on the Mac after each workspace sync (krizaka-agents
  `tools/cockpit/architecture.py`), with the `main` SHA each view reflects.
