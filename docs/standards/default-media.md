# Default media — read from the Krizaka org JSON, never hard-coded

<!-- summary: Default avatars and banners are read from the Krizaka org JSON, versioned, and never hard-coded in an app. -->

> Rule (Oussama, 2026-10-26): **Default media URLs (avatars, banners, logos) come from the Krizaka org JSON — never hard-coded or bundled in an app.**
> Issues: [krizaka-ts#134](https://github.com/krizaka/krizaka-ts/issues/134), [yomizaka#433](https://github.com/krizaka/yomizaka/issues/433).
> Storage is the admin's choice ([ADR-010](../adr/ADR-010-krizaka-storage.md)); the deployed environments use Bunny.

## What it means

- The default pictures of the family live in **one place**: Bunny `org/v1/defaults/<kind>/<id>-<size>.<ext>` ([ADR-014](../adr/ADR-014-bunny-org-cdn-and-apps.md); `defaults/v1/` until the move lands) (kinds `person`, `folder`,
  `organisation`, `shop`, `banner`), written by one script, krizaka-ui `tools/export-defaults.mjs` (layout: krizaka-com `scripts/bunny-layout.mjs`).
- Their **catalogue is the `defaults` section of `https://krizaka-assets.b-cdn.net/org/v1/org.json`** (`@krizaka/org`): per kind, the items with
  an id, an alt text in English and French, and the URLs per size and format, plus the deterministic rule.
- An app **lists** with `listDefaults(kind)` and **picks** with `defaultFor(kind, seed)` (the entity's id as seed: the same entity keeps its picture
  everywhere). It may read the package or `fetchDefaults(ORG_URL)`; it never writes a default media path itself, never copies the files into its
  repository or bundle, never keeps its own list.
- **The kind decides.** A folder, a collection, an organisation or a shop is never offered a person. `@krizaka/ui`'s `Avatar` (`defaultAvatar.kind`)
  and `AvatarPicker` (`kind`) take the kind; a picker lists only options of its kind.
- A new picture is a new id in the generator and a line in `@krizaka/org`; a changed picture is a new version folder (`v2`), the old URLs keep serving.

## What is checked

- `@krizaka/org` tests: the schema, determinism, a folder never gets a person, **every URL answers 200**, and no NEQ or other private field ever
  appears in the section (the test fails if one does). The founder's source folder holds a manifest with private facts: it is never published or copied.
- krizaka-ui: `tools/export-defaults.test.mjs` (the writer is confined to `defaults/v1/`, the manifest holds paths, sizes and hashes only).
- Each repository: the ast-grep rule `no-hard-coded-default-media` (krizaka-com `rules/`, copied where an app has ast-grep) or a test that scans its
  sources for `people/defaults`, `defaults/v<n>/` and `krizaka-defaults`.
- Each focus repository's `AGENTS.md` repeats the rule in one line.

## Not covered

An app's **own** media (a product's tour, a user's uploaded picture, a shop's own banner) are not defaults and follow their own storage rules.
Offline fallbacks drawn from code (`@krizaka/ui` data-URL glyphs) are not URLs and remain allowed.
