# ADR-011 — Default media are central: Bunny holds them, the org JSON lists them, apps never copy them

- **Status**: Accepted · §1 amended by [ADR-014](ADR-014-bunny-org-cdn-and-apps.md) (the defaults move to `org/v<n>/defaults/<kind>/`)
- **Date**: 2026-10-26
- **Issues**: [krizaka-ts#134](https://github.com/krizaka/krizaka-ts/issues/134), [yomizaka#433](https://github.com/krizaka/yomizaka/issues/433)
- **Standard**: [default-media](../standards/default-media.md)

## Context

Each product drew or embedded its own default avatars, and a folder in Yomizaka's binder was offered people. Oussama: centralise the assets
in Bunny according to a structure, and let the JSON that Krizaka exposes give the URLs to use by default.

## Decision

1. **Structure**: `defaults/v<n>/<kind>/<id>-<size>.<ext>` on the storage zone (`person`, `folder`, `organisation`, `shop`, `banner`), one writer
   (krizaka-ui `tools/export-defaults.mjs`), versioned by folder. Folders, organisations and shops are drawn from `@krizaka/ui`'s code, never by hand.
2. **Catalogue**: the `defaults` section of `org/v1/org.json` (`@krizaka/org`, schemaVersion 2, compatible with 1): id, alt EN/FR, URLs per size and
   format, plus the rule `defaultFor(kind, seed)` (FNV-1a of the seed modulo the list).
3. **One package fewer**: `listDefaults` and `defaultFor` live **inside `@krizaka/org`**, not in a new `@krizaka/defaults` or in `@krizaka/storage`.
   The JSON is the source; a separate package would only wrap it. The storage ADR still holds: the zone behind the URLs is the admin's choice, Bunny when deployed.
4. **Rule**: default media URLs come from the org JSON, never hard-coded or bundled; checked by ast-grep or a test per repository.

## Not done here

The admin's per-product switch to turn a set or an item off (krizaka-ts#134, later) will filter `listDefaults` through `@krizaka/settings`; the JSON stays the full catalogue.
