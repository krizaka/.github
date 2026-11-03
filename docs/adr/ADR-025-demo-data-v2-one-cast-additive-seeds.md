# ADR-025 — Demo data v2: one cast, seed modules by domain, additive and the same everywhere

- **Status:** Proposed (founder brief, 2026-11-03)
- **Date:** 2026-11-03
- **Issue:** krizaka-internal#2331. **Builds on:** krizaka-internal#840 (one cast, one seed per app), [ADR-011](ADR-011-default-media-in-the-org-json.md)
  (default media), [ADR-014](ADR-014-bunny-org-cdn-and-apps.md) (Bunny layout v2), [ADR-022](ADR-022-dev-and-prod-environments.md)
  (prod holds no dev data), akinaza ADR-004 (look presets).
- **Scope:** `@krizaka/org` (the cast), yomizaka and akinaza (their seeds), `krizaka-agents` `tools/seed-dev.sh`. Orazaka keeps its
  `names` step.

## Context

The founder does not want the old demo data re-seeded. What exists today:

- **Cast v1** in `@krizaka/org` (`CAST_VERSION = 1`): Éric, Mira and Camille in Yomizaka; Éric, Mira, Léa and five clients in Akinaza.
  It is the right place and stays the one source.
- **Yomizaka** `scripts/demo-seed/` (`cast.mjs`, `seed.mjs`, `fingerprint.json`): one file mixes accounts, collections, documents,
  analyses and screenings; document ids come from `randomUUID()`, `--reset` deletes the owner's documents, the clock defaults to the
  real instant, and the fingerprint counts rows only.
- **Akinaza** `apps/web/scripts/seed-cast.mjs` plus seven `seed-*.mjs` and `packages/db/src/{seed-walker,seed-krizaka,demo-shops,
  demo-st-henri.json,demo-media.json,demo-community}.ts`: 27 Saint-Henri shops (salon, workshop, coaching, pets only, two
  templates per trade), a walker, the studio, `--clean` that deletes what journeys left. Media are **full CDN URLs typed in the data**
  (`https://krizaka-assets.b-cdn.net/sites/akinaza/demo/…`, even an `orazaka` gallery file). The shops do not show the 12 look presets.

Both seeds work, but they are hard to extend, partly random, and they delete. A demo, a recording and a hot fix need the same data on
the Mac and on dev, from one command, without ever erasing what someone made.

## Decision

### 1. The cast v2 (`@krizaka/org`, `CAST_VERSION = 2`)

One cast for the family. A persona is a **person who signs in**; ids of v1 are kept (`eric`, `mira`, `camille`, `lea`…), so the secrets
map (`APP_QA_*_<ID>_*`) does not change. Each app seeds only its slice. Mira, the administrator, exists for the admin journeys and is
never filmed. Every persona gets `title` `{ fr, en }` (the customer-value title a demo shows: « Gestionnaire, Gestion Rosemont »), not
a role word.

| App (public name) | Persona | Role · story |
|---|---|---|
| Yomizaka (Verikora) | **Éric Tremblay** | member · owns Gestion Rosemont, a small rental agency; he screens applicants and verifies their documents |
| | **Nadia Benali** | member · Éric's leasing agent, same organisation (shows sharing and roles) |
| | **Camille Tremblay** | member · an applicant who sends her file through Éric's link (the tenant side of the journey) |
| Akinaza (Folioviv) | **Léa Beaulieu**, **Éric Tremblay** + one owner per demo shop | owner · each owns one shop of § 3; Léa (pets) and Éric (studio) are the two featured ones |
| | **Camille, Jordan, Nadia, Étienne, Sofia** | client · book, review and receive reports, across several shops |
| both | **Mira Haddad** | admin · never in a demo |

The new owner names are fixed in the Akinaza issue, under three rules: Québec-plausible, no name shared with another persona, and
« (démo) » in every legal name. People who never sign in (a dossier's applicants, a shop's walk-in clients) are **fixtures** of the
app's seed module, not cast members, under the same rules.

### 2. Seed modules by domain

Each app has one entry point, `seed --cast` (`pnpm run dev:seed`), that runs its **domain modules in order**. A module is one file
`scripts/seed/<nn>-<domain>.ts` exporting `{ domain, version, plan(cast, clock), apply(db, plan) }`: `plan` is pure (data only,
unit-tested), `apply` writes it in one transaction. The data lives next to it as `scripts/seed/data/<domain>.v2.json`.

- **Yomizaka:** `10-agencies` (organisations, members, roles) · `20-dossiers` (screenings and their collections) · `30-tenants`
  (applicants as fixtures, share links) · `40-documents` (fixture PDFs built locally from text, through the storage port) ·
  `50-verifications` (seeded analyses and fraud signals, run ids prefixed `seeded-`, never a paid run).
- **Akinaza:** `10-shops` (shop, zone, rules, the page document with its preset) · `20-services` (prices from the catalogue) ·
  `30-staff` · `40-bookings` · `50-reviews` · `60-media` (wall, reels and videos by logical key) · `70-community`.

### 3. The demo shops are the Krizaka UI showcase

Twelve demo shops, **one per look preset** of `@krizaka/tokens/shop-presets` (two per trade: salon, coaching, workshop, cleaning,
pets, consulting), so no two shops look alike and every preset is seen on the TV and the map. Each shop uses a different section
mix of akinaza ADR-004 and an accent from its preset's tested list. A test asserts: 12 shops, 12 distinct presets, 6 trades, every
section type used at least once, AA proven per preset (the library's matrix). No café, restaurant or bar.

### 4. Ids and clock

- **Ids are UUIDv5** of a namespace per app and the key `v2:<domain>:<natural key>` (`v2:shops:salon-oree`). Same input, same id, on
  every database. No `randomUUID()`, no serial, in a seed.
- **The clock is injected.** `plan` takes `now`; the CLI is the only place that reads it (`--now <ISO>`, else `APP_VISUAL_NOW`, else
  the real instant). Every date is `now` minus or plus an offset written in the data (date-fns), so the content and the ids never
  depend on the day; visual runs freeze `now`.
- **Idempotent:** writes are `ON CONFLICT (id) DO NOTHING`, except the fields the seed owns (`seed_version`), so a second run changes
  nothing and a row a person edited on dev is not overwritten.

### 5. Retiring the old demo rows, additively

No `--reset`, no `--clean`, no `DELETE` in a seed. The v2 seed **marks** the v1 demo rows it knows by their v1 keys (the v1 slugs, the
v1 persona accounts' seeded documents): `demo_retired_at = now`, and the public surfaces filter them out (a shop unlisted from
Explore and the map, a document out of the default views). The rows stay, so nothing a journey or a person points at breaks. A later
purge is a separate, reviewed step (backup first, CTO), once nothing names them, like Bunny's legacy folders. Journey leftovers on
dev are accepted: the check counts « at least » there (§ 7).

### 6. Media

- Personas' avatars and banners: `castMedia(persona)` of `@krizaka/org` (ADR-011). Never a URL in an app.
- Demo media (shop walls, reels, videos, fixture covers): **a logical key** in the data (`demo/salon-oree/wall-1`), resolved by the
  app's manifest to `apps/<app>/demo/…` on Bunny (ADR-014 layout v2; `assertWritable` refuses anything else). The v1 files are copied
  there with `cdn-assets migrate` (copy, never move). A guard refuses `b-cdn.net` or `https://` in seed data.
- **No paid generation.** v2 uses the media already on Bunny; a shop whose trade has none yet (cleaning, consulting) shows its
  preset without photos until the founder approves new ones.

### 7. Never in production; local = dev

- `assertNotProduction` refuses unless `APP_ENVIRONMENT` is `local`, `ci` or `dev`, and refuses the databases `krizaka_accounts`,
  `krizaka_newsletter` and `defaultdb` whatever the environment. A prod host (commercial domain, ADR-022) is refused by name.
- **The fingerprint is content, not counts:** `seedHash` of `@krizaka/org` over the sorted ids per table, recorded in
  `seed/fingerprint.json`. `--check` is exact on local and CI, « every recorded id is there » on dev (lived in).
- **One path:** local and CI run `pnpm run dev:seed --check`; dev runs the same command from the Mac through
  `krizaka-agents/tools/seed-dev.sh <app>` (the dev database refuses runners). Run twice: the second run writes nothing.

### 8. The journey that proves it

One e2e journey per app on the seeded data, on green main (Playwright web, Maestro mobile), recorded for the videos (rule « videos
from tests »): **Yomizaka** — Éric signs in, opens Camille's dossier, reads the verification of her pay slip and shares the report;
**Akinaza** — Camille finds Léa's shop on the map, books a walk, Léa sees it in her day. Each journey names the persona and the
data by key, never by text the seed may change.

## Consequences

- ✓ The same people and rows on the Mac, in CI and on dev; a hot fix reproduces by construction.
- ✓ Adding a domain is one module and one data file; a demo look is a data change.
- ✓ Nothing is erased: a person's edits on dev survive a seed.
- ! Retired v1 rows stay in the dev database until a reviewed purge; queries of the public surfaces must filter `demo_retired_at`.
- ! `CAST_VERSION = 2` is a release of `@krizaka/org` before either app moves; the apps keep reading v1 until their issue lands.
- ✕ Refused: re-seeding v1, a reset, random ids, typed CDN URLs, generating media to fill the shops.
