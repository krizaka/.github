# ADR-006 — Krizaka TS, and `@krizaka/organize`: name, avatar, description, tags, collections for every entity

- Status: accepted (2026-10-22)
- Issues: krizaka/.github#183 (Krizaka TS), krizaka/.github#196 (the « organize » block)
- Deciders: Oussama (« des modules pour faire cela en 2-2, et non les écrire à chaque fois »)

## Context
Every user-owned entity of a Krizaka product needs the same essentials: a name, an avatar, a description, tags, a place in a
collection, and a default collection that can never be deleted. Yomizaka wrote them for libraries, collections, files and
tags (yomizaka#163, #205, #206). Akinaza must now let an owner run several shops with the same essentials; Orazaka will want
them for studios and projects. Writing them again per product is the debt Krizaka Java avoids with its building blocks.

## Decision
1. **A repository `krizaka/krizaka-ts`**: a pnpm + Turborepo + Changesets monorepo of backend packages published on npm
   under `@krizaka/` (Apache-2.0), built like krizaka-ui's packages (tsup, ESM + types, vitest, publint), documented on its own site.
   No runtime service: products compose the packages. `@krizaka/organize` is its first package; `@krizaka/api-keys`
   (from yomizaka#214), settings and storage follow.
2. **`@krizaka/organize` is a table-per-kind generator, not a polymorphic table.** Real foreign keys beat a `(kind, id)` pair
   that the database cannot check, and it keeps Yomizaka's existing tables as they are.
   - Shared tables per product database: `collections` (owner, name, description, avatar, `is_default`) and `tags` (owner, name,
     colour **name** mapped to tokens by the UI, never a hex).
   - Per kind, the product declares its entity table and the package generates the join (`<table>_tags`) and the migration
     SQL (`organizeMigration({ kinds })`); the entity table takes the standard columns from a mixin (`name`, `slug`,
     `description`, `avatar`, `collection_id`, `archived_at`, dates).
   - **Invariants live in the database**: exactly one default collection per owner (exclusion constraint + deferred
     constraint trigger), never deleted while the owner exists, entities with no collection fall into it (trigger), the owner's
     account creating it (trigger), a backfill for what exists. Shown in yomizaka#205.
3. **Ports, no vendor and no ambient state**: `OrganizeStore` over a `Query` function (the product passes its own), an
   `AvatarProcessor` (square, no metadata: the product brings the image library) and an object store for uploaded avatars
   (the DocumentStore port of `@krizaka/storage`), `Clock` injected. Rules (name length, tag colours, avatar set, sizes) are data.
4. **The service**: create, rename, describe, set avatar (a seed of the set, or an upload through the pre-flight), tag and untag, move
   to a collection, set the default, list and search with URL-state parameters (`?q=&tags=&collection=&page=&size=&sort=`), audit
   hooks, Loi 25 export and delete. Stable refusal codes (`DEFAULT_COLLECTION`, `NAME_TAKEN`, `AVATAR_NOT_ALLOWED`…).
5. **A conformance test kit** (`@krizaka/organize/testkit`) every product runs: each declared kind exposes a name, an avatar,
   a description, tags, a collection and the default-collection invariant — the rule « no product hand-writes these again ».
6. **UI**: the blocks (`EntityHeader`, `EntityCard`, `EntityGrid`, `TagPicker`, `TagFilter`, `CollectionSwitcher`, `AvatarPicker`) are
   Krizaka UI's (krizaka/.github#196). Until they ship, a product composes existing Krizaka UI parts behind one thin local
   wrapper, deleted the day the block lands.
7. **Rollout**: extract from Yomizaka (libraries and folders stay Yomizaka's levels, built on the package's collections),
   behaviour unchanged and its tests green; then Akinaza's multi-shop; then Orazaka.

## Consequences
- One place to fix and test the invariants; every product gets them by declaring its kinds.
- A product keeps its own domain levels (Yomizaka's folders, Akinaza's staff) on top; only the common essentials move.
- Publishing needs the npm trusted publisher declared for the new scope's packages (Oussama), until then a local publish.
- The package never imports a product, an environment variable or a vendor SDK; a dependency-cruiser rule and the
  conformance kit keep it that way.

## Update 2026-10-26 (B66, krizaka/.github#196): where it stands, and the UI blocks' contract

**Shipped.** `@krizaka/organize` 0.5.0: collections and tags with the database invariants, `organizeSchema` / `workspaceSchema` as
`@krizaka/db` modules, the workspace layer (tags with colour markers, status sets as data, saved views, bulk actions), the browser-safe
`/contract` and the `/testkit`. Yomizaka runs on it (organize routes, applicant files). Akinaza has the shop tables (migration
`0014_organize_shops`) and its admin configures kinds through `@krizaka/organize/contract`; the essentials UI of a shop is still
assembled locally. Orazaka has not started.

**Open: the UI blocks (point 6).** Krizaka UI's ADR-006 (reduction) forbids a new entry where one does the job, so the block list
shrinks to what is really missing. Agreed API, web first, then the native twin of each (krizaka-ui#740):

| Need | Krizaka UI entry | Status |
|---|---|---|
| Name, avatar, description, tag chips of one entity, inline-editable, refusals shown by code | **`EntityHeader`** (new) | to build |
| Collection switcher and tree, nesting optional, the default collection marked and never removable, the current one in the URL | **`CollectionSwitcher`** (new) | to build |
| A card and a grid of entities | `Card` / `ArgumentCard` in `CardGrid` | exists |
| A list of entities | `DataTable` | exists |
| Tag input and filter chips with counts, tag marker palette, `TagChip` | `tag-selector creatable`, `filter-bar`, `TagChip` (krizaka-ui#627, #690) | in progress |
| Avatar choice (set or upload) | `AvatarPicker` (account-settings) | exists |
| Shop (entity) switcher in the shell | `CollectionSwitcher` in its `entity` mode, current id in the URL | to build |

Props are plain data from `@krizaka/organize/contract` (`OrganizeError` codes drive the messages); no block imports the package's server code.

**Rule kept.** A product does not hand-write name, avatar, description, tags or collections: it composes `@krizaka/organize` and
these blocks. The conformance kit already checks the data side; the UI side is checked by the product's own test per kind that its
screen renders the `EntityHeader`. **Rollout order is unchanged**: Akinaza multi-shop (P0) on the blocks as they land, then Orazaka (studios, projects).
