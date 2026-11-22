# The repository README standard

<!-- summary: The one template of every Krizaka repository's README: variants by kind from repos.json, generated blocks between markers, hand-written sections, and the guard that fails drift. -->

Founder, 2026-11-22 ([krizaka-internal#4362](https://github.com/krizaka/krizaka-internal/issues/4362),
[krizaka-internal#4672](https://github.com/krizaka/krizaka-internal/issues/4672)): every non-archived repository listed in
[repos.json](../../repos.json) follows the org README template. Generated blocks carry the identity, badges and licence line
from the org data; a reusable workflow and a conformance check fail when a README drifts.

## The template, in order

Every repository keeps the same five-part skeleton:

| # | Part | Who writes it | Content |
| :-- | :-- | :-- | :-- |
| 1 | **Head** (block `head`) | generated | light/dark mark from the brand CDN, name, one-line promise or role, variant/know-how and status or visibility pill; products also embed their C1 schema |
| 2 | `## Quick start` | by hand | the shortest commands to run, test or use the repository |
| 3 | **Badges** (block `badges`) | generated | at most three badges (CI, Security, Licence — only workflows present in the repository), never hidden when red |
| 4 | `## Details` | by hand | structure, configuration, licence or workflow notes specific to the repository |
| 5 | **Footer** (block `footer`) | generated | the licence line (FSL-1.1-ALv2 for products, Apache-2.0 / MIT for open repositories, private notice for private ones) and, for **public** repositories only, the family link |

Sober: no extra badge, no table of contents, no screenshot gallery. Private repositories have **no public family link**.

## Variants by repository kind

The closed set of variants and the mapping from `repos.json`'s `kind` live in one file:
[scripts/readme-variants.mjs](../../scripts/readme-variants.mjs). Adding a kind is one edit there; an unknown kind is refused.

| Variant | Matches | Mark | C1 schema | Default licence | Public family link |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `product` | Listed in `profile/products.json` (or `kind: app`) | `brand/<product>` | required (`docs/architecture/c1.mmd`) | FSL-1.1-ALv2 | yes (when public) |
| `library` | Public `npm`, `maven`, `rust`, `python` | `brand/krizaka` | none | Apache-2.0 (or `LICENSE`) | yes |
| `site` | Public `site` (non-product) | `brand/krizaka` | none | Apache-2.0 (or `LICENSE`) | yes |
| `infra` | `iac` | `brand/krizaka` | none | Apache-2.0 (or `LICENSE`) | only when public |
| `internal` | Private code/site repository | `brand/krizaka` | none | private (or `LICENSE`) | **never** |
| `empty` | `none` (data, issues, static pages) | `brand/krizaka` | none | private (or `LICENSE`) | only when public |

## Where each input comes from

- **Repository set**: [repos.json](../../repos.json) entries with `archived: false` only. Never hard-coded.
- **Product metadata**: name, know-how, promise (`proof`), status, optional `colour` (hex, defaults to `3e76a8`) and optional
  `priorApache` note come from [profile/products.json](../../profile/products.json). A status absent from `statuses` is refused.
- **Marks**: `https://krizaka-assets.b-cdn.net/brand/<brand>/mark-{light,dark}.svg`.
- **Schema** (products only): `docs/architecture/c1.mmd` (Mermaid) or an image via `--schema`. An empty or missing schema fails
  the check.
- **Licences**: read from `LICENSE.md` / `LICENSE` (and `LICENSE-APACHE` when present alongside FSL-1.1-ALv2, e.g. Folioviv's
  commits before `4318e84 (2026-10-26)`).
- **Badges**: `ci.yml` and `security.yml` when present in `.github/workflows/`, plus the licence badge.

## The markers

Each generated block sits between `<!-- product-readme:<block>:start … -->` and `<!-- product-readme:<block>:end -->`
(`<block>` is `head`, `badges` or `footer`). Never edit between them. `head` is first, `footer` is last, `badges` sits between
`## Quick start` and `## Details`.

## Commands

```bash
node scripts/product-readme.mjs --repo verikora            # rewrite the three blocks of ./README.md
node scripts/product-readme.mjs --repo verikora --check    # exit 1: a block is stale or missing, or a section is missing
node scripts/product-readme.mjs --repo verikora --print    # print the blocks, write nothing
```

`--product` stays as an alias for `--repo`. `--repos`, `--registry`, `--readme` and `--schema` override the default paths
(confined inside the repository or `.github`). Dependency-free Node; tests are in `tests/product-readme.test.mjs`.

## The guard

Every non-archived repository calls the reusable workflow from `.github/workflows/readme.yml`, on `pull_request` **and**
`merge_group` so the check reports in the merge queue:

```yaml
name: README

on:
  pull_request:
  merge_group:
  push:
    branches: [main]

permissions: {}

jobs:
  readme:
    name: README
    permissions:
      contents: read
    uses: krizaka/.github/.github/workflows/product-readme.yml@<sha> # main
    with:
      repo: verikora
```

Inputs: `repo` (optional; defaults to `product` or `github.event.repository.name`), `product` (deprecated alias), `schema`
(default `docs/architecture/c1.mmd`), `readme` (default `README.md`).

The conformance rule `product-readme` (`scripts/conformance-checks.mjs`, `docs/standards/rules.json`) fails any non-archived
repository of `repos.json` whose README drifts or that does not call `product-readme.yml` on `pull_request` and `merge_group`.
