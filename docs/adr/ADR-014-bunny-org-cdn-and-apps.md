# ADR-014 — The Bunny media library: `org/v<n>/`, then `sites/<site>/`, then `apps/<app>/` (layout v2)

- **Status**: Accepted (layout v2, 2026-10-28) · migration in progress
- **Revision**: v2 replaces the first draft's `apps/<app>/` for site media and `ui/` as a root (Oussama, 2026-10-28: « on peut faire mieux dans l'organisation : defaults et people, ui, et l'intérieur de site, pas très clair » · « clean le reste, pas besoin de garder des trucs qu'on n'utilise plus »)
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

### 1. Org, then sites, then apps — four roots, at most five folder levels

The order is the reading order: what Krizaka owns as an organisation (« notre maison mère », the values every site and
app takes by default), then what each public site shows, then what an application reads or stores at runtime.

```
README.txt                                          the layout, generated (cdn-assets readme)
org/v<n>/                                           THE ORG: Krizaka's own data, the defaults of the whole family
  org.json · org.<hash>.json · org.schema[.<hash>].json · app.schema[.<hash>].json      @krizaka/org publish (krizaka-ts)
  apps/<app>[.<hash>].json                          each app's public runtime config                 @krizaka/org publish
  defaults/<person|banner|shop|folder|organisation>/<id>-<size>.<ext> · defaults/manifest.json   export-defaults (krizaka-ui)
  defaults/tones/<brand>/<file> · defaults/tones/manifest.json   the generated avatar tones of Avatar   export-brand (krizaka-ui)
  brand/<brand>/<file> · brand/manifest.json · brand/index.json                         export-brand (krizaka-ui)
  maps/tiles/<region>-<YYYYMMDD>.pmtiles · maps/fonts/<stack>/<a>-<b>.pbf                map-assets (krizaka-ui)
  films/<series>/<name>.<hash>.<ext>                the films of the flock (krizaka-ui tools/brand-films)
  discovery/services.json                           the signed services manifest (ADR-003)             sign-services (krizaka-com)
sites/<site>/<kind>/[<sub>/[<sub>/]]<name>.<hash>.<ext>   THE SITES: what one public site shows, hashed, immutable
apps/<app>/<defaults|uploads|generated>/[<sub>/…]<name>.<hash>.<ext>   THE APPS: runtime data of one application
pr-assets/<repo>/<pr-or-topic>/[<sub>/]<file>       review evidence (scripts/pr-assets.mjs)
```

- `<site>`: `www` (krizaka.com), `blog`, `ui` (ui.krizaka.com), `java` (java.krizaka.com) and each product's dev site
  (`orazaka`, `orochia`, `yasakia`, `yororis`, `yomizaka`, `kachizaka`, `akinaza`). `<kind>` says what the media are
  for: `home`, `tour`, `gallery`, `gallery-video`, `video`, `cinema`, `compare`, `showcase`, `web`, `mobile`, `docs`,
  `personas`, `download`, `demo`, `demo-stories`, `films`, `landing`, `maps`, `shop`; the blog has `posts/<post>/` and
  `shared/`. The list is code (`SITE_KINDS`); a new kind is added there with its test.
- `<app>`: one per product, only when the application itself reads or stores media of its own: `defaults` (its own
  default art, read at runtime — Akinaza's trades), `uploads` (what its users send), `generated` (what it produces).
  An app with nothing of its own has no folder. Orochia keeps its own zone (`orochia-dev`, krizaka/orochia#153).
- **Depth**: no object of `org/`, `sites/` or `apps/` sits under more than five folders; the audit refuses deeper.
- **One writer per prefix**; `org/` only by the generators above, never a hand upload.
- **A new write outside v2 fails**: every writer calls `assertWritable` (krizaka-com `scripts/bunny-layout.mjs`) before
  a PUT. The one exception is a refresh — never a creation — of a legacy file a published reader still names
  (`discovery/services.json` while `@krizaka/discovery` reads it).
- **The version folder is the contract.** `org/v1/` changes only compatibly; a breaking change is `org/v2/` beside it.

### 2. Where each folder of the old layout goes

| Old folder | Goes to | Switch (sub-issue of .github#368) |
| :-- | :-- | :-- |
| `brand/` | `org/v1/brand/` | krizaka-ui#817 (export-brand, @krizaka/email), krizaka-ts#200 |
| `defaults/v1/` | `org/v1/defaults/` | krizaka-ts#200 (@krizaka/org), krizaka-ui#817 |
| `people/defaults/v1/<brand>/` | `org/v1/defaults/tones/<brand>/` — the org offers them too, beside the illustrated `person/` set | krizaka-ts#200, krizaka-ui#817 |
| `people/personas/` | deleted — the human-name mirror; `people/personas/ui/` kept until Yororis reads `sites/ui/personas/` | yororis#136 |
| `products/` | deleted — the human-name mirror of `site/` | — |
| `maps/v1/` | `org/v1/maps/` | krizaka-ui#817, akinaza#493 (its `/maps/v1` proxy) |
| `discovery/` | `org/v1/discovery/` | krizaka-com#450, then @krizaka/discovery |
| `ui/<area>/` | `sites/ui/<area>/` | krizaka-ui#817 |
| `site/home/` | `sites/www/home/` | krizaka-com#450 |
| `site/blog/<post>/` · `site/blog/shared/` | `sites/blog/posts/<post>/` · `sites/blog/shared/` | krizaka-blog#176 |
| `site/products/<p>/<kind>/` | `sites/<p>/<kind>/` | each product's issue (akinaza#493, yomizaka#494, yasakia#182, kachizaka#121, yororis#136, orochia#425, orazaka-web-client#320) |
| `site/products/akinaza/defaults/` | `apps/akinaza/defaults/` — trade art the app shows at runtime | akinaza#493 |
| `site/docs/<p>/` | `sites/<p>/docs/` | krizaka-com#450 (manifest), the product's issue |
| `site/people/ui/` · `site/people/<p>/` | `sites/ui/personas/` · `sites/<p>/personas/` | krizaka-ui#817 · the product's issue |
| `site/brand-films/<series>/` | `org/v1/films/<series>/` | krizaka-ui#817, krizaka-com#450 |
| `site/brand-films/orochia/` | `sites/orochia/films/` | orochia#425 |
| `site/products/yazakia/` | deleted (renamed product) | — |

The map is code (`targetOf`, `SWITCH_ISSUES`); the cockpit's tree shows each legacy folder with its switch issue.

### 2b. Nothing kept that nothing uses

A legacy object is **used** while any of these names it — its URL, a folder URL above it, or its content hash: the code
on main of every krizaka repository, the latest published tarball of every `@krizaka/*` package, the live pages of the
sites (sitemaps), every unmerged branch's manifest, or a folder the code builds (`brand/`, `defaults/v1/`…). Used: kept
until its switch PR is released. **Unused: deleted now** (`cdn-assets purge-unused --refs <dir> --backup <vault> --yes`),
after the list is written to the inbox and each non-empty object is saved to the private vault. Nothing uploaded in the
last 24 h is touched; `pr-assets/` is evidence, outside this rule.

### 3. Migration without a broken URL

Published npm versions, store binaries and live sites name the old URLs, and hashed URLs are immutable. So:

1. **Layout and audit first** (krizaka-com): the target layout, the legacy map (`targetOf`) and the switch issues in `bunny-layout.mjs`;
   `cdn-assets tree` reports each object `ok`, `legacy` (old layout, with its target) or `misplaced`, and fails on
   `misplaced` (on `legacy` too with `--strict`). A daily workflow runs it.
2. **Copy** (`cdn-assets migrate`, a preview without `--yes`): every legacy object is copied to its target; already
   there with the same size, skipped. Old paths keep serving.
3. **Switch the writers and readers**, one PR per repository with tests and a changeset: `@krizaka/org` (krizaka-ts:
   URLs of brand, defaults, tones), `@krizaka/ui` (krizaka-ui: `map/assets.ts`, export-defaults, export-brand,
   map-assets, brand-films, its `ui/` media → `sites/ui/`), krizaka-com (`lib/cdn.ts` on `sites/`, `proxy.ts` maps
   rewrite, sign-services), akinaza (the `/maps/v1` proxy, `lib/tour.ts`, its defaults under `apps/akinaza/`), each
   product site and the blog (their media maps on `sites/<site>/`).
4. **Freeze the legacy roots**: no writer writes them once its PR is released.
5. **Prune** a legacy folder as soon as nothing names it (§2b) — checked by the scan, not by memory. `site/` keeps its
   rule « named by no manifest of any unmerged branch ». Goal: the root holds only `org/`, `sites/`, `apps/`,
   `pr-assets/` and `README.txt`.

### 4. Dormant Bunny resources

Kept: anything referenced by a repository (deploy specs, Terraform, code) or costing nothing. Deleted only when it
costs money **and** nothing references it, after its content is saved to the private vault. Orochia's Stream library is
the one video library. The inventory of 2026-10-28 found nothing to delete (every zone is referenced; all but
`krizaka-assets` cost under a cent a month).

## Consequences

- One place for what the family shares (`org/v1/`), one folder per site, one per app only when it has data of its own, and an audit that fails CI.
- A transition period where old and new paths both serve (storage roughly +3 GB until the legacy roots are pruned;
  cents a month).
- Each repository's writer and reader changes once; the sub-issues of the Feature track it.
