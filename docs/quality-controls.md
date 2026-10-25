# Quality controls: inventory, gaps and plan

- **Issue:** krizaka/.github#230 (Phase 1: an audit and a plan, docs only; nothing is built or filed before « validé »).
- **Builds on:** [ADR-007](adr/ADR-007-shared-rules.md) and [standards/rules.md](standards/rules.md) (accepted 2026-10-23, #217). ADR-007 decided *where* the rules live (one package, profiles, no copies). This page adds what ADR-007 does not cover: *which rules are missing*, *which tool carries each*, and *why the past code-smell runs were not caught*.
- **Measured on** `main`, shallow clones of 2026-10-24: .github `d9747d2`, krizaka-ui `35ccec0` (`@krizaka/config` 0.7.0), krizaka-com `278ab9c`, krizaka-ts `c7118bc`, yomizaka `bca15a1`, orazaka-build `0b7d565`, krizaka-build `ab5daeb`. Counts come from the files; nothing was built or run.

## 0. The five gaps that matter most

1. **The rules do not look where the bug was.** The one clock rule (`no-ambient-clock`) is scoped to `packages/*/src` and `apps/*/lib`. yomizaka's UTC-day slices sit in `apps/web/components/console/`, which no rule scans. Scope is a per-repository copy of the rule file, so it drifted (6 versions of the same rule).
2. **"Krizaka first" has no rule.** `krizakaStack()` carries 5 rules (fetch in an effect, TanStack, table or form, family switcher, route state) and is used by **2 of 11** repositories (krizaka-com, krizaka-ui). Nothing refuses `date-fns` (6 repositories, 77 files), `lucide-react` (orochia, 86 files), `new Intl.*Format` (10 repositories, 66 occurrences) or a local copy of a krizaka-ts capability.
3. **Our own messages point the wrong way.** Six ast-grep rules tell the developer « use date-fns » (`no-hand-ms-*`, `no-get-time-arithmetic`, `no-get-time-difference`), while krizaka-ui#609 wants `date-fns` refused in apps. The two must be reconciled before #609 lands.
4. **Dependency-cruiser is nearly empty.** The shared preset holds **one** rule (`krizaka-no-direct-tanstack`, also an ESLint rule: the same rule in two tools). Only krizaka-com extends it. orazaka-web-client has 10 rules of its own and does **not** extend the preset, so it imports `@tanstack/*` in 23 files with no refusal. Nine repositories have no `.dependency-cruiser.cjs`.
5. **The shared setup is still copies, and the ADR-007 move has not started.** `@krizaka/config` 0.7.0 has no `krizaka-rules` bin (only `krizaka-ratchet`). 4 pre-push hooks, 9 `sgconfig.yml`, 9 `sg-ratchet.mjs` (2 contents) and 12 `check-seo-family.mjs` (2 contents) are copies. Seven of the eleven TypeScript repositories have no `lint-ratchet.json`, and the pre-push hook exists in 4 of them.

## 1. Inventory

### 1.1 Per repository

`✓` present, `–` absent. « stack » is `krizakaStack()`; « preset » is `@krizaka/config/dependency-cruiser`.

| Repository | ESLint | stack | dep-cruiser | extends preset | ast-grep rules | `sg-ratchet.json` | `lint-ratchet.json` | jscpd `dup-ratchet.json` | pre-push |
|---|---|---|---|---|---|---|---|---|---|
| krizaka-com | `krizakaNext` | ✓ | ✓ (1 rule + preset) | ✓ | 16 | ✓ | ✓ | ✓ (0) | – |
| krizaka-blog | none (`tsc` + i18n + content check) | – | – | – | – | – | – | – | – |
| krizaka-ui | `krizakaBase` + stack, per package | ✓ | – (it holds the preset) | n/a | 14 | ✓ | – | ✓ (744) | – |
| krizaka-ts | `krizakaBase`, 8 packages (3 lines each); `site/` none | – | – | – | 13 | ✓ | – | ✓ (0) | ✓ |
| yomizaka | web `krizakaNext` + `krizakaUi`; **mobile: bare typescript-eslint, no `@krizaka/config`** | – | – | – | 15 | ✓ | – | ✓ (102) | ✓ |
| akinaza | web as yomizaka; **mobile bare** | – | – | – | 15 | ✓ | – | ✓ (79) | ✓ |
| orochia | web `krizakaNext` + `krizakaUi`, ad-hoc overrides | – | – | – | 16 | ✓ | ✓ | – | – |
| orazaka-web-client | own 141-line config (`eslint-config-next` + `krizakaUiRestrictedSyntax` + hand `no-restricted-imports`) | – | ✓ (10 own rules) | **no** | 15 | ✓ | ✓ | ✓ (131) | – |
| yororis | web `krizakaNext`; no ast-grep | – | – | – | – | – | – | – | – |
| kachizaka | web `krizakaNext` | – | – | – | 15 | ✓ | – | – | ✓ |
| yasakia | web and site `krizakaNext` | – | – | – | 15 | ✓ | ✓ | – | – |
| orazaka-build | Java | | | | | | | ✓ (0) | – |
| krizaka-build | Java (+ `site/` Node) | | | | | | | – | – |
| orazaka-ai-engine | Java | | | | | | | ✓ (215) | – |
| .github | reusable workflows, `actions/dup-check`, charter | | | | | | | fixture only | – |

`@krizaka/config` versions pinned: `^0.7.0` (ts packages, yomizaka, akinaza, orochia, yasakia, orazaka-web-client), `^0.6.0` (krizaka-com, yororis, kachizaka web), `^0.4.x` (krizaka-blog, krizaka-ts `site/`).

### 1.2 ESLint (`@krizaka/config`, krizaka-ui `packages/config/eslint/`)

- **Base:** `krizakaBase` (js + typescript-eslint recommended, react-hooks, import sort, env names by bounded context), `krizakaNext` (eslint-config-next), `krizakaUi()` (4 className rules: raw palette, `light:`, arbitrary `[var()]`, className template), `krizakaStack()` (5 rules, warnings by default), `no-locale-ternary`.
- **Not in the package, anywhere:** `complexity`, `max-lines`, `max-lines-per-function`, `max-depth`, `no-magic-numbers`, `jsdoc` (all planned in krizaka-ui#265, open), `no-restricted-imports` for covered domains, a banned-API list.
- **`krizakaStack()` is used by 2 repositories.** The other products run the base without the stack rules, so « no fetch in a client effect », « no hand `<table>` or multi-field `<form>` » and « selection state in the URL » are not enforced there. The warnings are counted by `krizaka-ratchet` only in the 4 repositories that have `lint-ratchet.json`.
- **Mobile apps** (yomizaka, akinaza) use `tseslint.configs.recommended` alone.

### 1.3 dependency-cruiser

- **Preset** (`packages/config/dependency-cruiser.cjs`, 31 lines): one forbidden rule, `krizaka-no-direct-tanstack`, plus resolver options. No layer rule, no cycle rule, no covered-domain rule.
- **krizaka-com:** extends the preset, adds `no-circular`. Runs inside `npm run lint`.
- **orazaka-web-client:** 10 own rules (`no-circular`, `no-flat-feature-modules`, `no-feature-cross-import`, `no-components-import-features`, `no-orphan-modules`, `no-types-import-implementation`, `no-direct-graphql-access`, `no-leaking-feature-constants`, `enforce-shared-isolation`, `no-auth-config-in-routing`), no `extends`. Runs in `build` and `validate`, **not in `lint`**, so the pre-push check and the lint step do not run it.
- **Everyone else: none.** There is no cycle check in yomizaka, akinaza, kachizaka, orochia, yasakia, yororis, krizaka-ts, krizaka-ui.
- **No ratchet for it.** `krizaka-ratchet` counts ESLint patterns by regex; dependency-cruiser's own baseline (`--ignore-known`) is not used.

### 1.4 ast-grep

- 18 distinct rules over 9 repositories (krizaka-com 16, orochia 16, yomizaka 15, akinaza 15, kachizaka 15, yasakia 15, orazaka-web-client 15, krizaka-ui 14, krizaka-ts 13). Not present: krizaka-blog, yororis, krizaka-build `site/`, the three Java repositories (not applicable), the mobile apps.
- `sgconfig.yml`: 9 copies, **1 content** (hash `a5e674ed`). `sg-fix.mjs`: 9 copies.
- Baselines (sum of `sg-ratchet.json`): `no-enum-string-compare` 323, `no-ambient-clock` 208, `no-unjustified-numeric-export` 112, `no-env-in-domain` 26, `no-get-time-arithmetic` 23, `no-get-time-difference` 7, `no-types-at-package-root` 4, `no-hand-ms-hours` 1, `no-hand-ms-minutes` 1, the rest 0.
- Three rules exist in a single repository: `no-hand-made-tab-bar` (orochia), `no-hand-written-email` (krizaka-ui), `no-raw-inner-html` (krizaka-com). `no-hand-made-nav` and `no-hand-made-language-switch` are in 7 (not krizaka-ts, krizaka-ui; `no-hand-made-nav` has 2 contents, orochia's messages).
- **Drift measured by hash** (rule body with `files:`/`ignores:` removed vs the whole file):

| Rule | Repositories | Distinct bodies | Distinct files |
|---|---|---|---|
| `no-ambient-clock`, `no-enum-string-compare`, `no-env-in-domain`, `no-unjustified-numeric-export` | 9 | 1 | **6** |
| `no-db-in-service-or-rules`, `no-get-time-*`, `no-hand-ms-*` | 9 | 1 | 2 |
| `no-ts-enum`, `no-types-at-package-root` | 9 | 1 | 1 |

  The bodies and messages are the same; **only the `files:` globs differ**. That is ADR-007's finding, confirmed. The cost is not the copying: it is that the scope is decided by hand in each repository, and nobody reviews it against the layout. Examples of `no-ambient-clock` scope: krizaka-com `lib/**`; orazaka-web-client `src/**`; yomizaka and krizaka-ts `packages/*/src/**` + `apps/*/lib/**`; yasakia adds `apps/web/lib`, `apps/site/lib`; orochia `packages/*/src` + `src/**` (its Next app lives in `apps/web`, so **orochia's `apps/web/lib` is not scanned**).
- `rule-tests/`: 5 contents over 9 repositories (the 5 repositories on the template share one).

### 1.5 The « identical in every repository » copies

| File | Copies | Contents | Drift |
|---|---|---|---|
| `scripts/sg-ratchet.mjs` | 9 | 2 | krizaka-com `78fde236` (134 lines) vs 8 others `88096036` (135 lines): one `eslint-disable no-console` line. Harmless, but it shows the copy is edited by hand. |
| `scripts/check-seo-family.mjs` | 12 | 2 | 8 copies `e2b74759` (255 lines): krizaka-com, krizaka-blog, krizaka-ts `site/`, krizaka-build `site/`, krizaka-ui `apps/site/`, orochia, akinaza, kachizaka. **4 copies `ecd54c0e` (235 lines): yomizaka, yasakia, orazaka-web-client, yororis.** Neither is a superset: the 255-line version adds the dev-host redirect audit (`auditDevRedirect`, `--redirects-to`); the 235-line version has a rule the 255 lacks (a site that is not indexed must not advertise a sitemap) and an `eslint-disable` header. |
| `.githooks/pre-push` | 4 | 1 (`0f4c2d26`) | none, but absent from the other 10 repositories. |
| `sgconfig.yml` | 9 | 1 | none |
| `scripts/sg-fix.mjs` | 9 | not compared | – |
| `rules/*.yml` | 9 | see 1.4 | `files:` scope |
| `scripts/check-file-names.mjs` | 1 (krizaka-ts) | 1 | only krizaka-ts enforces « files named by what they do » (ADR-007 plans `krizaka-rules names`). |
| `scripts/check-page-templates.mjs` | 1 (krizaka-com) | 1 | site-specific, fine. |

### 1.6 Ratchets

- `sg-ratchet.json`: 9 repositories. `lint-ratchet.json` (`krizaka-ratchet`): **4** (krizaka-com, orazaka-web-client, orochia, yasakia). `dup-ratchet.json` (jscpd, `actions/dup-check`): 8, 5 of them at a non-zero count (krizaka-ui 744, ai-engine 215, web-client 131, yomizaka 102, akinaza 79). Not in orochia, yasakia, kachizaka, krizaka-blog, yororis, krizaka-build.
- Ratchet non-zero state that explains the next sections: orazaka-web-client `directTanstackImport` 24, `localTableOrForm` 5, `fetchInClientEffect` 4; krizaka-com `localTableOrForm` 2.
- Java: the `FrozenRules` store (`archunit_store`) in the Orazaka modules; not inventoried per module here.

### 1.7 Java: ArchUnit

- **krizaka-build `krizaka-test-support`** (Maven Central): `ArchitectureRules` (layers, package cycles, naming of controller, service and repository, `@Value` and `Environment` only in config, `@Transactional` only on services), `CodeRules` (one class per file, no standard streams, no field injection, domain purity, mappers, fields private), `ConfigBindingRules`, `SourceRules`, `FrozenRules`. 33 assert or rule methods. Tested on fixtures only; krizaka-build has no production Java of its own to govern.
- **orazaka-build `orazaka-test-support`:** `GovernanceRules` (47 assert methods), `PackPurityRules`, `PackCoherenceRules`, `RunSurfaceRules`, `LoggedContentRules`, `SqlBoundaryRules`, `ExecutorCoherenceRules`, `LaneCoherenceRules`, `MeteringMarkerRules`, `ConfigBindingRules`. **19 method names exist in both libraries**; the ones I opened in `GovernanceRules` delegate to `CodeRules` (`assertNoStandardStreams`), so that part of ADR-007 step 2 looks done; the remaining overlap needs a pass (ADR-007 counted 17 duplicates).
- **orazaka-ai-engine:** 14 test classes use ArchUnit across 6 modules (`GovernanceTest`, `BoundaryTest`, `EncapsulationTest`…), calling both libraries.
- **No Java rule for the clock**: `Instant.now()` / `LocalDate.now()` / `System.currentTimeMillis()` appear 23 times in `orazaka-ai-engine/*/src/main`, and neither library has a rule (the TypeScript side has `no-ambient-clock`).
- **No Java pre-push hook and no local `dup` ratchet outside the 3 above.**

### 1.8 Pre-push hooks

`.githooks/pre-push` (set by `prepare`) in krizaka-ts, yomizaka, akinaza, kachizaka: it syncs the lockfile, then runs `pnpm run check` (lint, typecheck, tests). Not in krizaka-com, krizaka-ui, orochia, yasakia, orazaka-web-client (npm repositories, so the hook would differ), yororis, krizaka-blog, the Java repositories. Consequence: the dependency-cruiser step is in the hook only through `lint` of krizaka-com (which has no hook).

## 2. What the code-smell runs found, and which tool should have refused it

Source: issues and PRs whose title says refactor, duplication or code smell, org-wide (155 matches for « refactor » in title or body; about 100 titles read). Group by kind.

| Kind | Real examples | Tool that should refuse | Why it did not |
|---|---|---|---|
| **A. A local copy of a capability a Krizaka package owns** | rate limit copied: kachizaka#113, akinaza#272, yomizaka#260; auth: yomizaka#263, akinaza#274, kachizaka#114; audit yomizaka#259; db yomizaka#258, akinaza#270; mail akinaza#275; payments/credits yomizaka#261; privacy yomizaka#264; client-ip, password reset, rate limit kachizaka#83; bespoke `useApi` orazaka-mobile-client#29, orochia-mobile#45; local components orochia-mobile#71, #61, #48, orazaka-mobile-client#32; last local primitives orochia#66; keyring orazaka-ai-engine#38 | dependency-cruiser (a named list of local paths that must not exist or be imported) + ast-grep (the patterns) | No rule names the covered domains. `krizakaStack()` knows only TanStack, tables and forms, and 9 of 11 repositories do not run it. jscpd only compares inside one repository, so a copy in a product against a package in krizaka-ts is invisible. |
| **B. A function written twice inside a repository** | 4x newsletter handlers krizaka-blog#78; confirm-email and verify-email pages yomizaka#180, #181; film.vtt routes krizaka-com#342, #343; walker routes akinaza#152, #153; legal pages and SSE proxy orazaka-web-client#243, #244; `broker.py` x3 orazaka-packs#95; `OutboxMessage` twice orazaka-contracts#20 | jscpd ratchet (`actions/dup-check`) | The ratchet exists in 8 repositories and **only goes down**: it never refuses the first copy when the baseline is above 0 and a PR also removes another. Missing in orochia, yasakia, kachizaka, krizaka-blog, yororis, krizaka-build. Cross-repository duplicates (the outbox, the keyring) are out of its reach. |
| **C. Monoliths: long files, long functions, many parameters** | ShopSetup 486 lines akinaza#104; DocumentView 467 yomizaka#110; AccountView 286 yasakia#156; tables.tsx 790 orochia#372; MomentView 353 yororis#80; cartesian.tsx 503 krizaka-ui#426; translations 1,920 lines orazaka-web-client#190; icon.registry 713 orazaka-ui-kit#53; sign-up.tsx 417 orochia-mobile#46; 14-parameter constructor orazaka-job-service#50; 11-dependency service orazaka-studio#39 | ESLint (`max-lines`, `max-lines-per-function`, `complexity`, `max-depth`); ArchUnit for constructor size and dependency count | krizaka-ui#265 plans them and is still open. Nothing in `@krizaka/config` sets a limit, so the agent run was the first check. For Java, no rule bounds a constructor or the collaborators of a service. |
| **D. Hard-coded values and strings** | the « code-health sweep » opened in 9 repositories: krizaka-ts#42, krizaka-ui#552, krizaka-blog#101, orazaka-web-client#268, yasakia#176, orochia#405, kachizaka#111, yororis#130, krizaka-com#370; magic numbers krizaka-com#380 | ast-grep `no-unjustified-numeric-export` (exists), `krizaka-i18n scan` (user-facing strings), ESLint `no-magic-numbers` | The ast-grep rule covers only **exported** numeric constants, and only under the domain globs. `krizaka-i18n scan` runs in 1 repository (yororis). No rule for inline magic numbers. |
| **E. Time handled by hand** | UTC day slice in yomizaka (yomizaka#309); a private week and local-date function in krizaka-ts `packages/brief/src/week.ts`; UTC days in jobs-per-day orazaka-web-client#205 (React #418); hand `n * 60 * 1000` | ast-grep (pattern) | See section 3. |
| **F. Technology in names, wrong layer, wrong package** | `postgresAccounts`, `pgApiKeyStore` krizaka-ts#30; adapters under `application.service` krizaka-users#29; raw SQL in services krizaka-billing#31; eager container init orazaka-build#28, krizaka-build#63 | file-name check (a script), ArchUnit (layers, packages, static initialisers) | `check-file-names.mjs` exists in 1 repository. In Java, `ArchitectureRules.layersRule` is opt-in per module; the repositories named here have not wired it, and no rule forbids a static container field. |
| **G. Dependencies that should not be there** | ghost dependencies orazaka-web-client#102; two test runners orazaka-cli#52; duplicate design system orochia#383, orochia-design-system#27 | dependency-cruiser (`no-unresolvable`, `not-to-dev-dep`) and `knip` | Planned in krizaka-ui#265 (phantom dependencies), not shipped. dependency-cruiser's usual rules (`not-to-unresolvable`, `no-orphans`) are absent from the preset. |
| **H. Mobile style and structure** | 145 inline style literals orochia-mobile#79; handmade `useApi` | ESLint (`react-native/no-inline-styles`, a `krizaka/` rule) | The mobile apps lint with bare typescript-eslint. |

## 3. The real case: the UTC day

yomizaka computed « today » for the law's date with `new Date().toISOString().slice(0, 10)`, which is the UTC day: wrong every evening in Montréal (yomizaka#309). Meanwhile `@krizaka/intl` exists, and krizaka-ts `packages/brief/src/week.ts` carries its own `localParts()` (an `Intl.DateTimeFormat` + `formatToParts` for the local date), the same logic in private.

**Where it lives (measured):** yomizaka `apps/web/components/console/DocumentView.tsx:46, 145, 312`, `components/console/start-check.ts:23`, `lib/analyses.ts:25`. The same slice appears in non-test code of **8 of the 10 product and site repositories, 37 occurrences** (krizaka-com 3, krizaka-blog 7, yomizaka 7, akinaza 7, orochia 7, kachizaka 4, orazaka-web-client 1, yasakia 1), and in krizaka-ui's examples and parts.

**Why no tool caught it:**

1. **No rule names the pattern.** `no-ambient-clock` forbids `new Date()` in domain code with the message « inject the clock »; it says nothing about the UTC day, and `.toISOString().slice(0, 10)` on an injected date is also wrong.
2. **The scope missed the files.** `no-ambient-clock` runs on `packages/*/src/**` and `apps/*/lib/**`. The components are in `apps/web/components/`.
3. **The ratchet hid the rest.** yomizaka records 4 ambient-clock hits, and the repository-wide total is 208. A baseline above zero never says which hit is the dangerous one.
4. **The messages push the other way.** The time rules answer « use date-fns », which also computes in the runtime's zone.
5. **The capability was incomplete.** `@krizaka/intl` has `formatDate` and `formatRelative` but no function that returns the calendar day in a zone; this is krizaka-ui#610 (`localDay`). A rule that refuses the slice must name its replacement, so the function comes first.
6. **No cross-repository check.** `week.ts` is a private copy in the repository that publishes the neighbouring packages. Only a rule on `new Intl.DateTimeFormat` (outside `@krizaka/intl`) would see it.

## 4. One tool per kind of rule, one source per rule

**The test for a rule's tool:** *what does it look at?* An import edge or a path → dependency-cruiser. A syntax pattern in a file → ast-grep. A framework or React concept (hooks, JSX, props, rendering) → ESLint. A compiled Java structure → ArchUnit. A number or a text → the tool that already counts it (jscpd, `krizaka-i18n`). **No rule in two tools.**

| Kind of rule | Tool | Single source (inherited, never copied) |
|---|---|---|
| Imports and layers: no cycle, no import from a banned package, features do not cross, `lib/` does not import `components/`, no orphan, no unresolvable, no dev dependency in prod code | **dependency-cruiser** | `@krizaka/config/dependency-cruiser` (preset), generated from the same covered-domains map as below. A repository adds only its own layer rules. |
| Code patterns: `.toISOString().slice(0, 10)`, `new Intl.DateTimeFormat`, hand time arithmetic, ambient clock, `enum`, `status === "OPEN"`, inline magic numbers | **ast-grep** | A rule pack published with `@krizaka/config` (ADR-007 point 2: rules by **role**, not by path; `krizaka.rules.json` maps roles to paths). |
| Framework and React: hooks, a fetch in an effect, hand table or form, className rules, route-state selection, long functions and files, JSDoc, inline styles (native) | **ESLint** | `@krizaka/config/eslint` (`krizakaBase`, `krizakaNext`, `krizakaUi`, `krizakaStack`, and the size limits of krizaka-ui#265). |
| Java architecture: layers, packages, naming, domain purity, constructor size, static initialisers, ambient clock, SQL boundary | **ArchUnit** | `krizaka-test-support` (krizaka-build) for the generic rules; `orazaka-test-support` (orazaka-build) for the engine's own (packs, runs, metering). One entry point per profile, as ADR-007 point 3. |
| Duplicated code inside one repository | **jscpd** through `actions/dup-check` | `.github` |
| Duplicated code or a copy of a package across repositories | **jscpd on several roots**, as a weekly report first (see 5.3) | `.github` |
| User-facing strings | **krizaka-i18n** (`check`, `scan`) | `@krizaka/i18n` |
| File names | **`krizaka-rules names`** (ADR-007) | `@krizaka/config` |

**Rules that today sit in two tools and must end up in one:**

| Rule | Where it is now | Decision |
|---|---|---|
| No direct `@tanstack/*` import | ESLint `krizaka/no-direct-tanstack-import` **and** dependency-cruiser `krizaka-no-direct-tanstack` **and** the `krizaka-ratchet` regex `directTanstackImport` | dependency-cruiser keeps it (an import edge); the ESLint rule is retired once the preset is adopted; the `krizaka-ratchet` counter is replaced by the dependency-cruiser known-violations file. |
| Hand-written date arithmetic | ast-grep `no-hand-ms-*`, `no-get-time-*` (message: use date-fns) | stays in ast-grep; the **message** changes to the Krizaka home once krizaka-ui#609 decides date-fns's status. |
| Palette and className rules | ESLint `krizakaUi()` **and** the `krizaka-ratchet` counters `palette`, `light`, `arbitraryVar`, `classNameTemplate` | ESLint only; the counters stay while a repository is above zero, then are removed (orochia and others have reached 0). |

## 5. The new rules, first

### 5.1 « Krizaka first » (krizaka-ui#609): which tool carries which part

The covered-domains map is **one data file** in `@krizaka/config` (domain → Krizaka home → refused packages → refused patterns → message). Three generators read it, so a domain is written once and each tool receives only what it can check:

| Part of the rule in #609 | Carried by | Reason |
|---|---|---|
| Refused packages: `date-fns*`, `dayjs`, `luxon`, `moment`, `lucide-react`, `react-icons`, `@heroicons/*`, `@radix-ui/*`, `@tanstack/*`, other i18n libraries | **dependency-cruiser** (`krizaka-first-<domain>`, `from` = app sources, `to` = the package) | An import is an edge. It also catches re-exports and dynamic imports that a per-file lint misses, and the same file carries the layers. |
| Refused patterns: `.toISOString().slice(0, 10)` and its variants (`.split("T")[0]`, `.substring(0, 10)`), `new Intl.DateTimeFormat / NumberFormat / RelativeTimeFormat / ListFormat / PluralRules` | **ast-grep** | Syntax, not imports. |
| `fetch` in a client effect, hand `<table>`, multi-field `<form>`, direct `@radix-ui` in JSX | **ESLint** (already `krizakaStack()`) | React semantics. Not duplicated in the map. |
| A local re-implementation of a krizaka-ts capability | **dependency-cruiser** on named local paths (5.3) | A path rule. |
| Docs page « Use Krizaka first » on ui.krizaka.com | generated from the map | One source. |

Rules inside the Krizaka packages themselves are excluded by `from.pathNot`. Severity: error for new code; existing hits go to the ratchet (section 6, issue 5). The message names the home: « use `localDay` from `@krizaka/intl`; missing function? add it to the package first ».

### 5.2 The UTC day slice

- **ast-grep rule `no-utc-day-slice`** (role: any; not `tests`): `$X.toISOString().slice(0, 10)`, `.split("T")[0]`, `.split('T').at(0)`, `.substring(0, 10)`, and `$X.toISOString().slice(0, 10)` on `new Date(...)` or `Date.now()`. Message: « the UTC day, wrong in the evening in Montréal: use `localDay(instant, { timeZone })` from `@krizaka/intl` ».
- **Prerequisite:** krizaka-ui#610 (`localDay`) released. Until then the rule would name a function that does not exist, so it ships after it.
- **Scope is the role, not the path:** every source file except tests, which removes the `apps/web/components` hole. Its baseline is the ratchet count (37 non-test occurrences in 8 repositories), fixed in each adoption PR.
- A companion rule, **`no-intl-format-outside-intl`**, flags `new Intl.*Format` outside `@krizaka/intl`; this is the rule that would have found `week.ts`.
- Also widen **`no-ambient-clock`** from `lib/**` to the `domain` and `ui` roles for the same reason, and reword the six « use date-fns » messages to name the facade.

### 5.3 A local re-implementation of a krizaka-ts or @krizaka capability

Three layers, from cheapest to broadest:

1. **A named list** (in the same map): `local paths that must not exist` per domain, for example `**/lib/rate-limit.ts`, `**/lib/audit.ts`, `**/lib/client-ip.ts`, `**/lib/password.ts`, `**/lib/session*.ts`. dependency-cruiser refuses **an import of** such a module; the file-name check (`krizaka-rules names`) refuses its existence. Seeded from the copies the refactor issues of section 2 already named (kind A).
2. **A syntax fingerprint** for the cases the list cannot name (the `Intl` rule above).
3. **Cross-repository duplicate detection.** A weekly job in `.github` (next to `weekly-digest`) clones the `@krizaka` package sources (krizaka-ts, krizaka-ui `packages/`) and each product, runs `jscpd` with the org thresholds across the roots, and keeps the clones that span one package and one product. First a **report** (an issue per product, counts only down), then a gate if the noise is low. It is not a pull-request check: it needs several repositories and takes minutes.

## 6. The cut: ordered issues

Each issue is one pull request. Order matters: a rule that names a function waits for the function. Nothing is filed before « validé ». Issues 1 to 3 are the « one PR per tool preset »; 5 onwards are the « one adoption PR per repository ». They fit inside ADR-007's migration table: issue 2 is its row 1, issue 4 is its rows 3 to 5 as the pilot.

| # | Repository | Issue | Acceptance |
|---|---|---|---|
| 0 | krizaka-ui | **Close the prerequisites:** `localDay` in `@krizaka/intl` (#610); date-fns is refused in apps (decision 2), with `@krizaka/time` created in krizaka-ts on the first real need | `localDay(instant, { timeZone })` released with tests (a Montréal evening gives the Montréal day); the refusal of date-fns is written in #609, and the six `no-hand-ms-*` / `no-get-time-*` messages are listed for change. |
| 1 | krizaka-ui | **Covered-domains map + dependency-cruiser preset:** `krizaka-first-*` generated from the map; add `no-circular`, `not-to-unresolvable`, `not-to-dev-dep`; retire the ESLint `no-direct-tanstack-import`; a known-violations baseline that only shrinks | Per domain: an app import is refused, the facade's own import is allowed, the message names the Krizaka home. `depcruise` of a fixture app fails on a forbidden import and on a cycle. The TanStack rule exists in one tool only. Minor changeset. |
| 2 | krizaka-ui | **The shared ast-grep rule pack in `@krizaka/config`** (ADR-007 row 1): rules by role, `krizaka-rules sync/check/ratchet`, `@ast-grep/cli` as dependency, plus the new rules `no-utc-day-slice` and `no-intl-format-outside-intl` | Each rule has a valid and an invalid test. `sync` reproduces the 9 repositories' current rule files from their roles (same violations before and after). The UTC-day fixture from yomizaka (`new Date().toISOString().slice(0, 10)` in `components/`) fails. |
| 3 | krizaka-ui | **ESLint size and hygiene limits** (krizaka-ui#265 reused): `max-lines`, `max-lines-per-function`, `complexity`, `max-depth`, `no-magic-numbers` (warn), React Native `no-inline-styles`; make `krizakaStack()` part of `krizakaNext` | The preset lints a fixture with a 36-line function and a 400-line file. Adopting `krizakaNext` gives the stack rules without a second import. |
| 4 | krizaka-build | **Java generic rules complete:** a static-initialiser rule for containers, a constructor-size and a collaborators rule, an ambient-clock rule (`Instant.now`, `LocalDate.now`, `System.currentTimeMillis` in production code), the remaining overlap with `GovernanceRules` merged; ADR-007 row 2 | Each rule has a good and a bad fixture. `GovernanceRules` has no method with the same name as `CodeRules`. The 23 clock hits of orazaka-ai-engine are listed for the adoption issue. |
| 5 | krizaka-com (pilot) | **Adopt the preset, the pack and the map**; delete `rules/`, `scripts/sg-*.mjs`; lock the ratchet | `npm run lint && npm test && npm run build` green; the same violations as before except the new rules, which are recorded; counts only go down. |
| 6 | yomizaka | **Adopt**, fix the 7 UTC-day hits first (yomizaka#309), add `.dependency-cruiser.cjs`, the mobile app on `@krizaka/config` | No `toISOString().slice(0, 10)` left in non-test code; the new rules' baselines are recorded; the mobile lint uses `@krizaka/config`. |
| 7 | akinaza | **Adopt** (same as yomizaka; 7 UTC-day hits) | same |
| 8 | orazaka-web-client | **Adopt** and reconcile its 10 local layer rules with the preset (extend it); the 23 `@tanstack` files are baselined | The local config extends the preset; `depcruise` runs in `lint`; `directTanstackImport` moves from the regex counter to the known-violations file. |
| 9 | orochia | **Adopt** (86 `lucide-react` files, 17 `date-fns`, scope hole at `apps/web/lib`); add jscpd | Baselines recorded; its scope comes from roles. |
| 10 | kachizaka, yasakia | **Adopt**, one PR each; add jscpd to both | same |
| 11 | krizaka-ts | **Adopt**, and move `week.ts` to `localDay` (after 0); add `.dependency-cruiser.cjs` | `packages/brief/src/week.ts` has no `Intl.DateTimeFormat`; the new rules pass or are baselined. |
| 12 | krizaka-blog, yororis | **Bring under the pack** at their current counts (blog: 7 UTC-day hits, no ESLint today); add `krizaka-i18n scan` to the blog | The lint scripts run the pack, the counts are recorded. |
| 13 | orazaka-build, orazaka-ai-engine | **Adopt the Java entry points** (ADR-007 row 7), the clock rule frozen in `FrozenRules` | `archunit_store` shows only the 23 known clock hits as new entries; no other change. |
| 14 | .github | **Cross-repository duplicate report** (5.3, layer 3) and the **drift check**: a test that fails when a repository's `check-seo-family.mjs`, `sg-ratchet.mjs` or hook differs from the source, until issue 2 removes them | The weekly report lists, per product, clones against the package sources; the drift check names the 4 old `check-seo-family.mjs` copies. |
| 15 | .github | **Charter and agent files last:** `AGENTS.template.md`, CONTRIBUTING §10 and each `AGENTS.md` « Static rules » section point to the generated table (ADR-007 point 6) | One table; no restated rule. |

## 7. Decisions (CTO, 2026-10-24, on #232)

1. **dependency-cruiser carries the refused imports.** ESLint keeps the framework rules. The import part of krizaka-ui#609 moves to the dependency-cruiser preset, and its map stays the single source.
2. **date-fns is refused in apps.** It is allowed only inside a Krizaka package, which is its facade, as with TanStack.
   - Formatting and the local day stay in `@krizaka/intl`.
   - Date arithmetic (add days, ISO weeks, durations read from settings) gets one facade, `@krizaka/time`, created in **krizaka-ts** (krizaka-ts#76) on the first real need. It wraps date-fns and `@date-fns/tz`, and the clock is always injected.
   - The six rule messages that say « use date-fns » are changed to name the facade (issue 2).
   - The 77 existing files are baselined, and the counts only go down.
3. **Cross-repository duplicates start as a weekly report, not a gate.**
4. **The map stays in `@krizaka/config`.**

*Measured by reading files and issues, 2026-10-24; no check was executed. Counts of grep hits ignore files named `*test*` or `*spec*`.*
