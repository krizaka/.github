# ADR-024 — Krizaka Composer in the products: a thin-seam fork, one document contract, blocks from the library

- **Status:** Proposed (architect, 2026-11-02). The founder accepts.
- **Date:** 2026-11-02
- **Issue:** [krizaka-internal#2246](https://github.com/krizaka/krizaka-internal/issues/2246) (epic, lot B09, between step 1 and steps 2–3)
- **Builds on:** akinaza `docs/adr/ADR-010-shop-editor-on-puck.md` (the evaluation, the spike, the fork, amended 2026-10-31),
  akinaza ADR-004 and ADR-007 (the shop page is a document in Akinaza's database), [ADR-015](ADR-015-ai-code-audit-measured-and-enforced.md)
  (ratchets), [ADR-017](ADR-017-e2e-journeys-test-shape.md) (journeys in products, components in the library), the audit inputs of
  krizaka-internal#1907 and #2003 (posted on #2246), and the founder's rules: no raw px or z-index (#2245), FR/EN (#1897), schema 2 (#1892),
  library first, trusted OSS behind a facade, the admin follows the feature.
- **Repositories:** krizaka-composer, krizaka-ui, akinaza; krizaka-ts (`@krizaka/config` rules); the Orazaka lane for the assistant pack.
- **Keeps from ADR-010:** the choice of Puck, the fork `krizaka/krizaka-composer` published as `@krizaka/composer`, the closed field types, the
  five example shops, the Style panel, the assistant that proposes and the owner confirms, the budgets, the refusals. **Changes:** how the fork
  follows upstream (§ 1), where the document contract lives and who owns the shop migration (§ 2–3), the catalogue version (§ 3), the
  engine switch (§ 8), and the plan order of steps 2–3 (§ 11).

## Context

ADR-010 chose Puck and, on 2026-10-31, a Krizaka fork instead of a facade. C1 (#1891) shipped `@krizaka/composer` 0.1.0 with
`@krizaka/composer/document` (the `ComposerDocument`, zod validation, migrations, `fromPuckData`). Before C2, C3, L2 and the Akinaza slices are
built, the founder asked for the long-term integration to be checked. Reading the code on 2026-11-02 shows four things that the plan would
otherwise lock in:

1. **The fork follows upstream by cherry-pick only.** ADR-010 § 6: security and bug fixes cherry-picked, features « when an issue asks ». A
   0.x project with 203 commits in six months moves fast; cherry-picking single commits from a diverging tree is how forks rot: each pick
   conflicts more, until no one picks.
2. **The editor knows a product's format.** `packages/core/document/migrate.ts` holds `shopPageToDocument` (the shop page schema 1 of
   `@krizaka/ui/shop`). The editor depends on the shop; the dependency points the wrong way.
3. **Two schemas describe one block.** A shop section is `defineSection` in `@krizaka/ui/shop` (zod/mini: variants, settings, blocks) and
   would be described again as a composer block (`defineBlocks`: field types, slots). Two sources drift.
4. **One version for two things.** `schema` versions the envelope; nothing versions the blocks' props. When a section's settings change in
   `@krizaka/ui`, stored pages have no migration path.

The audit (#1907) adds the owner's needs: edit a document, never code; the page sells the booking (no two « Réserver » with one name, no empty
tile, text on a photo ≥ 4.5:1 — rules in the blocks); phone first (360 px preview by default); bilingual by construction; demo said as demo.
Its risks: two sources of truth, the old composer removed too early, editor code on public pages, fork maintenance.

## Decision

**Krizaka Composer stays a fork of Puck, kept thin by a seam rule and merged from upstream releases. The page format is a React-free contract
package that the library and the products share. Blocks are declared once, in `@krizaka/ui`, and the editor reads them. The product owns its
store, its validation and its admin.**

### 1. Fork, wrap or contribute: a thin-seam fork, merged from upstream releases

| Option | Verdict |
| :-- | :-- |
| ✕ Thin layer on upstream Puck + `@krizaka/*` plugins | The three needs (a validated multilingual document, an editor in French, our controls) are not Puck hooks; overrides of overrides and an adapter in front of a format we do not own. ADR-010's amendment holds. |
| ✕ Hard fork, cherry-pick only (ADR-010 § 6) | Rots: every divergence makes the next pick harder; no one sees how far we drifted. |
| ✓ **Fork with a seam, merged from upstream release tags, generic fixes proposed upstream** | Puck's mechanics stay upstream's; our code lives beside them; a measured divergence; security fixes within a week. |

- ✓ **The seam.** Krizaka code lives in new directories of `packages/core` — `document/` (until § 2 moves it), `krizaka/` (the token
  theme, the `@krizaka/ui` controls, the field types, the i18n catalogues and `t`), `codec/` (§ 4). Upstream files (reducer, store, dnd,
  canvas, outline, iframe, components) change **only** to add a hook (a label lookup, a field-type slot, an override point), each hook a
  candidate upstream PR. A behaviour of ours is never written inside an upstream file.
- ✓ **Divergence is measured.** CI script `divergence` (krizaka-composer): lines changed in upstream paths since the last merged upstream
  tag, per file, held by a ratchet (`divergence-ratchet.json`): it rises only in a PR that names its upstream PR or its reason. Shown in the
  README.
- ✓ **Sync by release merge, not by pick.** A weekly workflow (`upstream-sync.yml`) fetches `puckeditor/puck`; on a new release tag it opens
  `sync/puck-<version>` as a **merge** of the tag (history kept, conflicts limited to the seam), with Puck's own test suite and ours. Merged
  within two weeks or the PR says why not.
- ✓ **Security between releases: cherry-pick with `-x`** (the upstream commit named) within 7 days of a Puck advisory or a fix commit that
  touches parsing, the iframe, or a dependency with a CVE; Dependabot and the org's security scan on the fork as on any repository.
- ✓ **Upstream first for what is generic**: the label/i18n hook (C2), the accessibility fixes (C3), field-type hooks — one upstream PR each,
  linked from its issue. When upstream merges one, the next release merge replaces our copy and the divergence drops.
- ! **Review point**: if the divergence ratchet passes 1 500 lines in upstream paths, or two release merges in a row take more than a day,
  the fork's ADR is reopened (options: freeze on a Puck version and own the mechanics, or converge on upstream hooks).

### 2. Dependency direction and the document contract

```
@krizaka/tokens ─▶ @krizaka/composer-document ─▶ @krizaka/ui (blocks, renderers) ─▶ @krizaka/composer (editor) ─▶ products
   (no deps)          (zod, no React, no DOM)          (+ i18n)                          (+ ui, i18n)          (store, admin)
```

- ✓ **`@krizaka/composer-document`** — the `document/` folder of the fork becomes its own package (`packages/document`, same repository,
  same release): the envelope, the closed field types, `defineBlocks`, `validateDocument`, `createMigrator`, `resolveProps`, the safety
  checks, `fromPuckData`. React-free, DOM-free, zod 4 with the `zod/mini` API (the one `@krizaka/ui/shop` uses). `@krizaka/composer/document`
  re-exports it for one minor, then goes.
- ✓ The founder's rule holds where it matters: **the editor depends on the blocks, never the reverse**; products depend on the editor and the
  blocks, never the reverse. `@krizaka/ui` depends on the *format* (as it depends on tokens), never on the editor. The alternative — the same
  format redeclared in `@krizaka/ui` — is the duplication of § Context 3.
- ✓ Guards (dependency-cruiser, every repository): `@puckeditor/*` imported nowhere; `@krizaka/composer` imported only by studio routes; no
  file of `@krizaka/ui` or `@krizaka/composer-document` imports `@krizaka/composer`; `@krizaka/composer` (the editor) never imported by a
  server file.
- ✓ **The shop's migration leaves the editor**: `shopPageToDocument` moves from the fork to `@krizaka/ui/shop` (`migrateShopPage` 1 → 2).
  The fork keeps only envelope migrations and the generic `createMigrator`; a format's migrations live with the format's owner.

### 3. The block registry: declared once in the library, a product adds its own the same way

- ✓ **One declaration per block.** `defineSection` (in `@krizaka/ui/shop`) declares the block for both the renderer and the editor: its
  variants, its props in the closed field types of `@krizaka/composer-document` (text, localized, enum, number, boolean, asset, slot — the zod
  schema is derived from them, never written twice), its slots (allowed types, count, depth ≤ 2), its whole-block rules (`refine`: the
  audit's « no two Réserver with one name », « no empty tile », « text on photo ≥ 4.5:1 » — rules in the blocks, refused at the server),
  and its labels as `@krizaka/ui` message keys. `@krizaka/ui/shop` exports `shopCatalogue` (the definitions) and `shopRenderers`
  (type → React component, Server Component safe).
- ✓ **The registry is built by the product, in one line**: `defineBlocks({ catalogue: shopCatalogue, extra: akinazaBlocks })`, used by the
  editor (client) and by `validateDocument` (server) — the same object, so editor and server cannot disagree.
- ✓ **A product adds a block** with the same `defineSection`, in its own repository, with its renderer, when only it needs it (an Akinaza
  booking widget bound to its API). A block a second product needs moves into `@krizaka/ui` (library first). An editor-local component, a raw
  `px`, a `z-index` or a colour literal is refused by the lint of #2245.
- ✓ **The catalogue is versioned**: the document carries `catalogue: { id: "krizaka:shop", version: n }` beside `schema`. A change of a
  block's props in `@krizaka/ui` bumps the version and ships its pure block migration with round-trip fixtures; a CI check in krizaka-ui
  snapshots the catalogue's derived JSON Schema and fails when it changes without a version bump and a migration.

### 4. The document: schema 2, migrations, server validation, storage per product

- ✓ **Envelope (schema 2)**: `{ schema: 2, catalogue: { id, version }, locales, defaultLocale, root: { props }, blocks, demo? }`; a block is
  `{ id, type, variant, props, slots? }`; props are the closed field types, `{ var }` variables (the Style panel: look, accent, face,
  density, radius, motion — ids from the look's tested list), `{ bind }` bindings from an allow-list the host declares
  (`shop.name`, `shop.logo`, `shop.phone`, `shop.address`, `shop.hours`), `{ asset }` references. No markup, no URL, no code, no `style`.
  `demo: true` (and per-block `demo`) carries « demo said as demo »; the editor preserves it and the renderer shows it.
- ✓ **One source of truth: the stored document.** Inside the fork, Puck's in-memory state stays Puck's (so its reducer and store keep
  merging from upstream). One codec, `codec/` in the fork, turns a `ComposerDocument` into the editor state and back; it is internal (not
  exported), and a property test round-trips every fixture of every catalogue (`doc → state → doc` is identity). The host never sees Puck's
  shape. This is not the facade adapter ADR-010's amendment refused: it is one internal module of the fork, beside the code it serves.
- ✓ **Migrations are pure and lazy**: on read, envelope migrations then catalogue migrations run in memory; the next save writes the current
  version. A document newer than the code is refused, never guessed. A one-time backfill job per product (dry-run report, idempotent) brings
  every stored version to the current one before a migration's reader is ever removed.
- ✓ **The server is the judge**: every draft write runs `validateDocument(body, { registry, assets, bindings, limits })` → 422 with every
  path and a stable code. Assets are checked **against the tenant** (`assets.mimeOf(id)` answers only for the shop's own files: an id of
  another shop is « unknown »); bindings are resolved server-side at render from the allow-list; limits (bytes ≤ 256 kB, blocks, depth) are
  hard ceilings in code (`@fixed`), the per-plan counts are admin data (§ 6). Publish refuses a document whose `defaultLocale` text is empty
  in any visible block (Loi 96: the French is never missing).
- ✓ **Storage is the product's**, never the editor's: Akinaza keeps `shop_page_versions` (`doc` jsonb, `schema` and `catalogue_version`
  columns, draft/published, author, time), publish is a pointer move with the diff, rollback keeps the last 20 versions (a setting). A later
  product gets the same table shape from `@krizaka/composer-document`'s README, not a shared service.

### 5. Quality bar

- ✓ **Tokens only (#2245).** The fork maps `--puck-*` to `--kz-*` in one file (`krizaka/theme.css`); our new code has no raw length,
  z-index or colour (hard lint). Upstream CSS modules are a declared vendor path inside the ratchet: their raw values go down as we replace
  whole components by `@krizaka/ui` controls (fields, buttons, radios, the variant thumbnails), and through an upstream PR that turns Puck's
  remaining raw spacing and stacking into `--puck-*` variables — which the theme file then maps. The `--kz-z-*` stacking tokens come from
  #2245's tokens part.
- ✓ **Words (#1897)**: every editor string from `en` / `fr` catalogues through `@krizaka/i18n`, injected at the seam as `t`; a test fails on
  English left in the French editor. Block labels are `@krizaka/ui` messages. Owner content is data in the document (`localized`), never a
  catalogue message; the editor lists what is missing per locale.
- ✓ **Accessibility**: WCAG 2.2 AA in both themes, keyboard reorder (Alt+↑/↓, live region), titled and themed preview iframe, the #214 layout
  guard, phone first (preview at 360 px by default, viewports 360 · 768 · 1280).
- ✓ **Bundle**: the editor is one lazy chunk on the studio route — eager JS ≤ 200 kB gz over the app shell, CSS ≤ 20 kB gz (ADR-010); the
  fork's size-limit (editor entry, `rsc` entry, `composer-document`) only goes down. **Public pages import neither the editor nor the
  document validator**: they render the stored document with `shopRenderers` in a Server Component. Two guards: dependency-cruiser, and a
  build check in Akinaza that no chunk of `/s/*` contains a module of `@krizaka/composer` (the JS ratchet `perf-budgets.json` unchanged).
- ✓ **Tests (ADR-017)**: the fork tests its own code — document, migrations, codec round-trip, keyboard, i18n, axe on an editor fixture —
  and keeps Puck's suite green (it guards every release merge). `@krizaka/ui` tests the blocks, their rules and the catalogue migrations.
  Products write **journeys only**: edit → preview at 360 → publish → public page, FR and EN, both themes, axe on the published page; a
  keyboard-only journey; a forged write refused with its path.

### 6. Admin: the feature's other side

| What | Who | Where |
| :-- | :-- | :-- |
| Turn the editor on, per plan and per shop (`editor.engine`: `classic` · `composer`, § 8) | the platform admin; the shop's owner sees it | Akinaza admin console, settings in DB |
| Which blocks and presets a plan unlocks, the per-plan counts (sections, blocks) | the platform admin | price/plan catalogue (ADR-009), read by `defineBlocks` filters and the server validator |
| The example shops offered (the five of ADR-010 § 3 are code in `@krizaka/ui/shop`, tested; which are shown, in what order, per kind of shop) | the platform admin | settings in DB |
| Audit of page changes: every save, publish, rollback, « Start from this shop » and applied assistant suggestion is an audit event (actor, shop, version from → to, the block keys changed) | read by the admin and the owner; the admin can roll a shop back | Akinaza audit log + the versions table |
| The assistant: on/off (`assistant.editor.enabled`, off by default), the daily quota per shop, the Orazaka pack and model | the platform admin | settings in DB; credits from Orazaka's pricebook |

### 7. The assistant through Orazaka (Sovkora in production), confirm before apply

- ✓ Behind `AssistantPort` in Akinaza (Orazaka adapter only), answers from the editor's docs (`docs/editor/`, EN/FR) with their links.
- ✓ A suggestion is a list of typed operations of `@krizaka/composer-document` (`addBlock`, `moveBlock`, `setVariant`, `setProp`,
  `setStyle`, `startFromExample`), validated against the registry before it is shown, shown as a diff, applied to the **draft** on « Apply »,
  undoable, audited (§ 6). Never silent, never a publish; the save goes through the same server validation.
- ✓ It sends the question, the locale and the document's structure (types, variants, style ids), never owner text of a customer, a booking
  or a price; a test asserts the payload.
- ✕ The model writes no document and no UI spec of its own: the generative UI spec of `@krizaka/ui/genui` (A2UI subset) stays for chat
  surfaces; the editor speaks only its operations.

### 8. Migration from the hand-made composer (#1896), without breaking a shop

1. **A1**: the composer mounts behind `editor.engine` per shop, default `classic`. Both engines read schema 1 and 2 through the same
   `migrateShopPage`; the classic composer writes schema 1, the new one schema 2.
2. **One-way per shop**: a shop's first save in the composer (schema 2) locks its engine to `composer`; to go back the admin rolls back to
   the last schema-1 version (versions are kept). No down-migration to maintain.
3. **Rollout**: Krizaka's own shop, then the demo shops, then every shop by the admin, each step after the journey is green on it.
4. **A2** removes the flag and `ShopComposerPanel.tsx` when no shop is on `classic` (a query shown in the admin) and the journey has been
   green one release; the backfill job (§ 4) brings every stored version to schema 2.
5. **L4** then removes `@krizaka/ui/shop-composer` in a major, and keeps/moves `look-picker`, `thumbnails`, `diff`, `messages` as ADR-010
   lists. Nothing is removed while a shop can still use it.

### 9. Other consumers

- ✓ **Akinaza (Folioviv) only, now.** The fork and the contract are product-neutral so a second product costs a registry, a table and a
  journey — no editor work.
- ✕ **krizaka.com and the Krizaka sites**: their pages are code under templates (`lib/page-templates.ts`), words in messages, facts generated
  at build, reviewed in a pull request. An editor would be a second source of truth for content that must be proven at build; refused.
- ✕ **Yomizaka, Orazaka today**: no owner-composed page in their plans. **Trigger** to revisit: an issue that needs an end user to compose a
  page or a template (e.g. a report or a public profile) — then that product adds its catalogue and its table, nothing else.

### 10. Options weighed

- ✓ The thin-seam fork, release merges, one contract package, blocks declared once → long-term cost is measured and bounded; one source of
  truth; the editor never knows a product.
  ! One more package to release (same repo, same changeset); a codec inside the fork to keep round-trip tested; `@krizaka/ui` depends on a
  format package.
- ✕ Keep the plan as is (cherry-pick only, shop migration in the editor, blocks described twice, one version) → the four problems of the
  context, each cheaper to fix now than after A1.
- ✕ Rewrite Puck's state to be the `ComposerDocument` → the deepest divergence possible: the reducer and store would stop merging.
- ✕ A shared « page service » for every product → storage and audit are the product's (tenant, plan, Loi 25), a service would be a second
  owner.

## Accessibility, i18n, performance — summary

WCAG 2.2 AA both themes, keyboard-only journey, axe in the fork and on the published page; every editor string FR/EN, French never missing on
publish; editor lazy on one route, public pages free of editor code, both proven by guards.

## Consequences

- The plan of steps 2–3 changes order (§ 11): one new slice (D1) before C2/C3/L2, and C0 gains the sync and divergence tooling.
- `@krizaka/ui/shop`'s `defineSection` changes shape (props in composer field types) — inside L2, with schema 2.
- The fork's cost becomes a number on its README and a review point, not a feeling.

## 11. Steps 2–3, re-planned

| Order | Slice | Issue | Change from ADR-010 |
| :-- | :-- | :-- | :-- |
| 1 | C0 · fork hygiene + `upstream-sync.yml` (release merge), `divergence` script and ratchet, vendor paths for #2245 | krizaka-internal#1904 | + sync and divergence |
| 2 | **D1** · `@krizaka/composer-document` package; `shopPageToDocument` out of the fork; `catalogue` field; internal `codec/` with round-trip property test | krizaka-internal#2261 | new |
| 3 | C2 · editor words FR/EN, `t` at the seam, upstream labels PR | krizaka-internal#1897 | depends on D1 |
| 3 | C3 · tokens, `@krizaka/ui` controls, keyboard, a11y, phone-first preview, #214 guard | krizaka-internal#1905 | + 360 default, theme file, `--kz-z-*` from #2245; parallel with C2 |
| 4 | L2 · schema 2 in `@krizaka/ui/shop`: `defineSection` on composer field types, `shopCatalogue` + `shopRenderers`, block rules of the audit, catalogue version + JSON Schema snapshot, `migrateShopPage` 1 → 2 | krizaka-internal#1892 | + catalogue, rules, migration moved here |
| 5 | A1 · Akinaza mount behind `editor.engine`, registry in one line, tenant asset check, audit events, admin setting, journeys, `/s/*` chunk check | krizaka-internal#1893 | + admin, audit, one-way lock |
| 6 | A2 · example shops (admin chooses which), Start from this shop, Style panel, backfill, flag removed when no shop is `classic` | krizaka-internal#1894 | + backfill, removal condition |
| 7 | A3 · docs + assistant (typed operations, audited, admin quota) | krizaka-internal#1895 | operations from the contract |
| 8 | L4 · remove the hand-made composer | krizaka-internal#1896 | after A2 + backfill |
