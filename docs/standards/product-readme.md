# The product README

<!-- summary: The one template of a product's README: what is generated between markers, what is hand-written, the order of the sections, and the guard that fails a stale or incomplete README. -->

Founder, 2026-11-22 ([krizaka-internal#4362](https://github.com/krizaka/krizaka-internal/issues/4362)): the README of a product,
above all one that is public, follows the org template: badges, a schema, easy to read, professional, the Krizaka identity. So it
is **generated** from the org data, not hand-written, and a reusable workflow fails when it drifts.

## The template, in order

| # | Part | Who writes it | Content |
| :-- | :-- | :-- | :-- |
| 1 | **Head** (block `head`) | generated | the product's mark (light and dark, from the brand CDN), its name, the one-line promise, the know-how, the status **once** (one pill in the product's colour), the C1/C2 schema |
| 2 | `## Quick start` | by hand | **3 commands** to run the product, nothing else |
| 3 | **Badges** (block `badges`) | generated | CI, licence, security: three, no more, never hidden when red |
| 4 | `## Details` | by hand | what is specific to the product: structure, configuration, links to the docs |
| 5 | **Footer** (block `footer`) | generated | the FSL line « FSL-1.1-ALv2: source-available, each release becomes Apache-2.0 two years later » and the family link |

Sober: no other badge, no table of contents, no screenshot gallery. The schema carries the architecture.

## Where each input comes from

- Name, know-how, promise (`proof`), status, repository: the product's entry in [profile/products.json](../../profile/products.json).
  The optional `colour` (hex, no `#`) defaults to the Krizaka blue `3e76a8`. A status absent from `statuses` is refused.
- The marks: `https://krizaka-assets.b-cdn.net/brand/<product>/mark-{light,dark}.svg`.
- The schema: `docs/architecture/c1.mmd` of the product repository, the Mermaid text of its C1 (or C2) from the architecture as
  code (`docs/architecture/`). A path to an image (`--schema docs/architecture/c1.svg`) is embedded as an image instead.
  An empty or missing schema fails the check: a product without a schema is not documented.
- The badges point to the workflows `ci.yml` and `security.yml` of the product repository (TO VALIDATE: the caller workflows of
  every product use these two file names) and to its `LICENSE`.

## The markers

Each generated block sits between `<!-- product-readme:<block>:start … -->` and `<!-- product-readme:<block>:end -->`
(`<block>` is `head`, `badges` or `footer`). Never edit between them. The `head` block is first, the `footer` block last, the
`badges` block between `## Quick start` and `## Details`.

## Commands

```bash
node scripts/product-readme.mjs --product verikora            # rewrite the three blocks of ./README.md
node scripts/product-readme.mjs --product verikora --check    # exit 1: a block is stale or missing, a section is missing
node scripts/product-readme.mjs --product verikora --print    # print the blocks, write nothing
```

`--registry`, `--readme` and `--schema` override the three paths. Dependency-free Node; the tests are
`tests/product-readme.test.mjs`. A README that has no markers yet starts from the three blocks printed by `--print`, placed
as in the table above.

## The guard

A product repository calls the reusable workflow, on `pull_request` **and** `merge_group` so that its required check reports in
the merge queue:

```yaml
product-readme:
  uses: krizaka/.github/.github/workflows/product-readme.yml@<sha> # main
  with: { product: verikora }
  permissions: { contents: read }
```

Inputs: `product` (required), `schema` (default `docs/architecture/c1.mmd`), `readme` (default `README.md`). Each export ticket of
the B27 milestone ([#4148](https://github.com/krizaka/krizaka-internal/issues/4148)) applies the template to its product in its own
pull request and makes the job a required check; public repositories first.

When the org data changes (a promise, a status, a colour), the check of each product goes red until its README is regenerated:
that is the guard working, not a flake.
