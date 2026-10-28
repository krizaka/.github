# ADR-014 — The Bunny media library: `org/v<n>/` is the org's CDN, `apps/<app>/` holds each app's media

- **Status**: Accepted (layout and audit) · migration in progress
- **Date**: 2026-10-28
- **Deciders**: Oussama (direction), the CTO (layout)
- **Amends**: [ADR-011](ADR-011-default-media-in-the-org-json.md) §1 (the defaults move under `org/v<n>/defaults/`; the catalogue rule is unchanged)
- **Supersedes**: krizaka-com `docs/design/bunny-org-library.md` (the `krizaka/v1/` proposal, never built)
- **Layout code**: krizaka-com `scripts/bunny-layout.mjs` (the single source), audited by `node scripts/cdn-assets.mjs tree`

## Context

The storage zone `krizaka-assets` (pull zone `krizaka-assets.b-cdn.net`, ~12,150 objects, 5.7 GB on 2026-10-28) grew
one root per need: `brand/`, `people/`, `products/`, `site/`, `defaults/`, `maps/`, `org/`, `ui/`, `pr-assets/`,
`discovery/`. Facts that read badly:

- the org's own data is split across five roots: `org/v1/` (org.json, apps, schemas — published by `@krizaka/org`),
  `defaults/v1/` (the default pictures of ADR-011), `brand/` (marks), `maps/v1/` (the basemap of `@krizaka/ui/map`,
  136 MB) and `discovery/`; `org/v1/` itself was not in the layout, so the audit flagged it;
- two sets of default avatars: `people/defaults/v1/<brand>/` (289 files, the generated tones of `@krizaka/ui`, named by
  the org JSON's legacy `avatars` field and `DEFAULT_AVATAR_BASE`) and `defaults/v1/person/` (the illustrated set,
  named by the org JSON's `defaults` section);
- an app's media are spread over `site/home/`, `site/products/<p>/`, `site/docs/<p>/`, `site/people/<p>/` and a
  human-name mirror (`products/`, `people/personas/`) that doubles them.

Oussama, 2026-10-28: « structure par app, et l'org a les defaults, avatar, bannière… ; faut une structure claire » ·
« la carte c'est une donnée org » · « l'org a un CDN ».

## Decision

### 1. Four roots, at most five folder levels

```
README.txt                                          the layout, generated (cdn-assets readme)
org/v<n>/                                           THE ORG'S CDN: what the whole family reads
  org.json · org.<hash>.json · org.schema[.<hash>].json · app.schema[.<hash>].json      @krizaka/org publish (krizaka-ts)
  apps/<app>[.<hash>].json                          each app's public runtime config                 @krizaka/org publish
  defaults/<person|banner|shop|folder|organisation>/<id>-<size>.<ext> · defaults/manifest.json   export-defaults (krizaka-ui)
  brand/<brand>/<file> · brand/manifest.json · brand/index.json                         export-brand (krizaka-ui)
  maps/tiles/<region>-<YYYYMMDD>.pmtiles · maps/fonts/<stack>/<a>-<b>.pbf                map-assets (krizaka-ui)
  films/<series>/<name>.<hash>.<ext>                the films of the flock (krizaka-ui tools/brand-films, uploaded by cdn-assets)
  discovery/services.json                           the signed services manifest (ADR-003)             sign-services (krizaka-com)
apps/<app>/<kind>/[<sub>/[<sub>/]]<name>.<hash>.<ext>   one folder per app, hashed and immutable
ui/<area>/<name>.<hash>.<ext>                       ui.krizaka.com (krizaka-ui)
pr-assets/<repo>/<pr-or-topic>/[<sub>/]<file>       review evidence (scripts/pr-assets.mjs)
```

- `<app>`: `www` (krizaka.com), `blog`, and one per product (`orazaka`, `orochia`, `yasakia`, `yororis`, `yomizaka`,
  `kachizaka`, `akinaza`). `<kind>` names what the media are for: `home`, `tour`, `gallery`, `gallery-video`, `video`,
  `mobile`, `docs`, `personas`, `download`, `demo`, `defaults` (an app's own default art, e.g. Akinaza's trades), …;
  the blog's kind is the post (`apps/blog/<post>/…`).
- **Depth**: no object of `org/`, `apps/` or `ui/` sits under more than five folders; the audit refuses deeper paths.
  `pr-assets/` keeps what PR bodies already link (a few audits nest deeper); new captures follow the same cap.
- **One writer per prefix** stays (each writer refuses the others). `org/` is written only by the generators listed
  above; nothing is uploaded there by hand.
- **The version folder is the contract.** `org/v1/` changes only compatibly: a new file, a new id, a new dated extract.
  A changed picture gets a new id (the old one keeps serving); a breaking change of the JSON or of a path is `org/v2/`,
  published beside `v1/`.
- **The human-name mirror (`products/`, `people/personas/`) is retired**: it doubled the files; browsing is the
  cockpit's tree (`scripts/bunny-tree.mjs`), and hashed names stay readable (`<name>.<hash>.<ext>`).
- Orochia keeps its own zone (`orochia-dev`) and its Stream library; `apps/orochia/` holds only what is still in this
  zone until krizaka/orochia#153 moves it.

### 2. One set of default avatars — the org JSON's `defaults` section

`org/v1/defaults/person/` (today `defaults/v1/person/`, the set ADR-011 catalogues) is the only default-avatar set.
The org JSON's legacy `avatars` field and `@krizaka/ui`'s `DEFAULT_AVATAR_BASE` URL form (both on
`people/defaults/v1/<brand>/`) are deprecated and removed at their next major; `defaultAvatarSvg` as an inline
`data:` URL stays (code, not a URL). `people/defaults/v1/` is **frozen**: never re-exported, still served while a
published version names it (0.8 MB).

### 3. Migration without a broken URL

Published npm versions, store binaries and live sites name the old URLs, and hashed URLs are immutable. So:

1. **Layout and audit first** (krizaka-com): the target layout and the legacy map (`targetOf`) in `bunny-layout.mjs`;
   `cdn-assets tree` reports each object `ok`, `legacy` (old layout, with its target) or `misplaced`, and fails on
   `misplaced` (on `legacy` too with `--strict`). A daily workflow runs it.
2. **Copy** (`cdn-assets migrate`, a preview without `--yes`): every legacy object is copied to its target; already
   there with the same size, skipped. Old paths keep serving.
3. **Switch the writers and readers**, one PR per repository with tests and a changeset: `@krizaka/org` (krizaka-ts:
   URLs of brand, defaults), `@krizaka/ui` (krizaka-ui: `map/assets.ts`, export-defaults, export-brand, map-assets,
   brand-films), krizaka-com (`lib/cdn.ts` root `apps/`, `proxy.ts` maps rewrite, sign-services), akinaza (the
   `/maps/v1` proxy, its `lib/tour.ts`), each product site and the blog (their media maps).
4. **Freeze the legacy roots**: no writer writes them once its PR is released.
5. **Prune** a legacy root only when no maintained published version (npm, store build) and no live site names it —
   checked by a scan, not by memory. `site/` keeps its rule « named by no manifest of any unmerged branch ».

### 4. Dormant Bunny resources

Kept: anything referenced by a repository (deploy specs, Terraform, code) or costing nothing. Deleted only when it
costs money **and** nothing references it, after its content is saved to the private vault. Orochia's Stream library is
the one video library. The inventory of 2026-10-28 found nothing to delete (every zone is referenced; all but
`krizaka-assets` cost under a cent a month).

## Consequences

- One place to look for anything the family shares (`org/v1/`), one folder per app, and an audit that fails CI.
- A transition period where old and new paths both serve (storage roughly +3 GB until the legacy roots are pruned;
  cents a month).
- Each repository's writer and reader changes once; the sub-issues of the Feature track it.
