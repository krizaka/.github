# Shared rules, by repository profile

<!-- summary: Shared lint and architecture rules written once in the package of their runtime, with each repository declaring its profile. -->

This is the standard behind [ADR-007](../adr/ADR-007-shared-rules.md) (krizaka/.github#217).

- **The idea:** a rule is written once, with its tests, in the package of its runtime. A repository declares its **profile**, keeps its **local rules** and its **ratchet counts**, and its `AGENTS.md` points here.
- **Status:** proposed. The packages do not exist yet; §5 is the migration plan.

## 1. The inventory (all 44 repositories, `main`, 2026-10-23)

| Piece | Files | Distinct | Kind | Where |
|---|---|---|---|---|
| `sgconfig.yml` | 10 | 1 | **copy** | akinaza, kachizaka, krizaka-com, krizaka-ts, krizaka-ui, orazaka-web-client, orochia, template-next-app, yasakia, yomizaka |
| ast-grep `rules/*.yml` | 149 | 46 | **variant**: same bodies; `files:`/`ignores:` follow each layout | the same 10 |
| `rule-tests/*-test.yml` | 139 | 17 | **copy** | the same 10 |
| `scripts/sg-ratchet.mjs` | 10 | 2 | **copy** (krizaka-com +1 line) | the same 10 |
| `scripts/sg-fix.mjs` | 10 | 2 | **copy** (krizaka-com +1 line) | the same 10 |
| `sg-ratchet.test.mjs` | 11 | 3 | copy | the same 10 (krizaka-com has two) |
| `sg-ratchet.json` | 10 | 10 | **truly local** (debt) | the same 10 |
| `lint-ratchet.json` (`krizaka-ratchet`) | 6 | 6 | **truly local** | krizaka-com, orazaka-web-client, orochia, yasakia, orazaka-ui-kit, orochia-design-system |
| `dup-ratchet.json` (jscpd) | 20 | 14 | **truly local** | 20 repositories |
| `scripts/check-seo-family.mjs` | 13 | 2 | **drifted copy**: 255 lines in 9, 235 in 4; 34 lines differ | 255: akinaza, kachizaka, krizaka-blog, krizaka-build `site/`, krizaka-com, krizaka-ts `site/`, krizaka-ui `apps/site/`, orochia, template-next-app; 235: orazaka-web-client, yasakia, yomizaka, yororis `site/` |
| `scripts/check-file-names.mjs` | 1 | 1 | local today, generic by nature | krizaka-ts |
| `.githooks/pre-push` | 4 | 1 | copy | akinaza, kachizaka, krizaka-ts, yomizaka |
| `eslint.config.*` | 26 | 16 | thin variants over `@krizaka/config` | 18 repositories |
| `@krizaka/config` version | 15 | — | **drift** `^0.1.0` … `^0.7.0` | 0.7: akinaza, krizaka-ts, orazaka-web-client, orochia, yasakia, yomizaka · 0.6: kachizaka, krizaka-com, yororis · 0.4: krizaka-blog, krizaka-build, krizaka-ts `site/`, orazaka-ui-kit, template-next-app · 0.1: orochia-design-system |
| `.dependency-cruiser.cjs` | 3 | 3 | variant over `@krizaka/config/dependency-cruiser` | krizaka-com, orazaka-cli, orazaka-web-client |
| ArchUnit governance tests | 33 | 33 | local wiring of two libraries | krizaka-*: `CodeRules`/`ArchitectureRules` (krizaka-build `krizaka-test-support`); orazaka-*: `GovernanceRules` (orazaka-build `orazaka-test-support`, 1,181 lines, 17 rule names duplicated from `CodeRules`) |
| `archunit_store/` (`FrozenRules`) | 6 | — | **truly local** (frozen debt) | orazaka-automation-service, orazaka-conversation-service, orazaka-job-service, krizaka-users (core, persistence), krizaka-notifications |
| Spotless, OpenRewrite | 1 | 1 | **shared already** | `krizaka-parent/pom.xml:83-91,185-187` |
| Rust (`cargo fmt`, `clippy -D warnings`) | — | — | shared within the Tauri kit's workflow | krizaka-tauri-kit `.github/workflows/rust.yml:24-25` |
| Python (`ruff check .`) | 1 config | — | **shared already** (workflow input) | `python-ci.yml:10,48`, 5 callers; config `orazaka-worker-media/pyproject.toml:14-30` |
| `copilot-setup-steps.yml` | 15 | 2 | copy | 14 Java/Orazaka repositories + krizaka-qa |
| AGENTS.md « Static rules » section | 21 | 7 | **restated**, 511 lines | every repository above |

**The rules themselves** (the ast-grep set, as counted per rule):

| Rule | Repos | Variants | What differs |
|---|---|---|---|
| `no-ambient-clock`, `no-env-in-domain`, `no-enum-string-compare`, `no-unjustified-numeric-export` | 10 | 6 | the `files:` globs; orochia's message (≤ 8 lines) |
| `no-db-in-service-or-rules`, `no-get-time-arithmetic`, `no-get-time-difference`, `no-hand-ms-{days,hours,minutes,one-hour}` | 10 | 2 | orochia (2 lines) |
| `no-ts-enum`, `no-types-at-package-root` | 10 | 1 | — |
| `no-hand-made-nav` | 8 | 2 | yomizaka (2 lines) |
| `no-hand-made-language-switch` | 8 | 1 | — |
| `no-hand-made-tab-bar` | 1 | 1 | local: orochia |
| `no-hand-written-email` | 1 | 1 | local: krizaka-ui |
| `no-raw-inner-html` | 1 | 1 | local: krizaka-com |

**Exact repeats, in lines:**

| Piece | Lines |
|---|---|
| `check-seo-family.mjs` | 2,745 |
| ast-grep rules | 2,213 |
| rule tests | 1,152 |
| `sg-ratchet.mjs` | 1,080 |
| `sg-fix.mjs` | 480 |
| ratchet tests | 360 |
| `copilot-setup-steps.yml` | 338 |
| **Total** | **≈ 8,400** |

## 2. The profiles

A repository declares one or more profiles. A monorepo declares one per folder: Yomizaka is `next-app` in `apps/web`, `expo-app` in `apps/mobile`, and `ts-library` in `packages/*`.

| Profile | Repositories today | Rules |
|---|---|---|
| `ts-library` | krizaka-ts `packages/*`, krizaka-ui `packages/*`, orazaka-ui-kit, orochia-design-system, krizaka-motion, orazaka-cli, the products' `packages/*` | ESLint `krizakaBase` + `krizakaStack()` + `envNames`. dependency-cruiser boundary (no app import, no cycle). ast-grep: the time rules (`no-hand-ms-*`, `no-get-time-*`), `no-ambient-clock`, `no-env-in-domain`, `no-db-in-service-or-rules`, `no-ts-enum`, `no-enum-string-compare`, `no-types-at-package-root`, `no-unjustified-numeric-export`. File names by function. Ratchets: ast-grep, `krizaka-ratchet`, duplication. |
| `next-app` (product or site) | yomizaka, akinaza, kachizaka, orochia, yasakia, yororis, orazaka-web-client `apps/web` or root, krizaka-com, template-next-app | `ts-library`, plus ESLint `krizakaNext` + `krizakaUi()` + `noLocaleTernary()`, plus ast-grep `no-hand-made-nav`, `no-hand-made-language-switch`, `no-raw-inner-html` (from krizaka-com) |
| `site` (public docs or blog) | krizaka-ui `apps/site`, krizaka-ts `site/`, krizaka-build `site/`, krizaka-blog, yororis `site/` | `next-app`, plus the SEO family check (`krizaka-rules seo-family`) |
| `expo-app` | orazaka-mobile-client, orochia-mobile, yasakia-mobile, yororis-mobile, template-expo-app, the products' `apps/mobile` | `ts-library`, plus ESLint for React Native, plus `no-hand-made-tab-bar` (from orochia), plus the charter §6 rules as they become rules |
| `tauri-app` | krizaka-tauri-kit, template-tauri-app | its front end: `next-app` or `ts-library`; its Rust: `cargo fmt --check` and `clippy -D warnings` (`rust.yml:24-25`), unchanged |
| `java-block` | krizaka-build, krizaka-platform-kit, krizaka-users, krizaka-billing, krizaka-notifications (libraries), orazaka-contracts, orazaka-build | `krizaka-parent` (Spotless, OpenRewrite dry run, javadoc, enforcer); `KrizakaRules.buildingBlock(classes)` (`CodeRules` + `ArchitectureRules` + `ConfigBindingRules` + `SourceRules`) |
| `java-service` | orazaka-ai-engine, orazaka-automation-service, orazaka-conversation-service, orazaka-edge, orazaka-job-service, orazaka-knowledge-service, orazaka-studio, and the `*-service` modules of users, billing, notifications | `java-block`, plus `KrizakaRules.service(classes)` (layers, `@Transactional` only on services, configuration only in config). Orazaka's own rules stay in `orazaka-test-support`. |
| `python-worker` | orazaka-worker-media, orazaka-packs | `ruff check .` (through `python-ci.yml`) with the repository's `[tool.ruff]` |
| `docs` | .github, krizaka-infra, krizaka-accounts | markdown and workflow lint only (`lint-workflows.yml`) |

**How a repository declares it** (`krizaka.rules.json`, read by `krizaka-rules sync`):

```json
{
  "profiles": {
    "apps/web": "next-app",
    "apps/mobile": "expo-app",
    "packages/*": "ts-library"
  },
  "roles": {
    "domain": ["packages/*/src/**", "apps/web/lib/**"],
    "ui": ["apps/web/app/**", "apps/web/components/**"]
  },
  "localRules": "rules"
}
```

`roles` replaces what each repository writes today in every rule's `files:`, which is the only real difference between the copies. Java declares its profile in the governance test (`KrizakaRules.service(classes)`), and Python in its workflow call.

## 3. Where each piece lives after the move

| Piece | Home | A repository keeps |
|---|---|---|
| ESLint presets, dependency-cruiser boundary, `krizaka-ratchet` | `@krizaka/config` (unchanged) | `eslint.config.mjs` (one line per preset), `lint-ratchet.json` |
| ast-grep rules, rule tests, `@ast-grep/cli` | `@krizaka/config/ast-grep` | `krizaka.rules.json`, `sg-ratchet.json`, local `rules/` + `rule-tests/` |
| `sg-ratchet`, `sg-fix`, `check-file-names`, `check-seo-family` | `@krizaka/config` bins (`krizaka-rules ratchet\|fix\|names\|seo-family`) | nothing |
| `sgconfig.yml` | generated by `krizaka-rules sync` (`ruleDirs: [.krizaka/ast-grep, rules]`) | nothing hand-written |
| ArchUnit generic rules | `krizaka-test-support` (`CodeRules` absorbs `GovernanceRules`' 17 duplicates; `KrizakaRules` profiles) | the governance test (profile call + local rules), `archunit_store/` |
| Orazaka-only rules (packs, capabilities, settlement, saga readers) | `orazaka-test-support` | — |
| Spotless, OpenRewrite | `krizaka-parent` (unchanged) | — |
| Running it all in CI | #113 `krizaka-ci.yml`, `quality` action: `krizaka-rules check`, `./mvnw verify` | `npm run lint` = `krizaka-rules check` |
| `copilot-setup-steps.yml` | a workflow template in `workflow-templates/` (#113) | the file, generated from the template |

**Local rules and exceptions:**
- **A local rule** is a file in the repository's `rules/`, with its test in `rule-tests/`. It is promoted to the package when a second repository needs it.
- **An exception** is a count in the ratchet, never a silenced line. A path that must not carry a role is left out of `roles`, in a reviewed PR.
- **`--off=<rule>`** is allowed only for a rule the profile does not fit yet, named in the repository's `AGENTS.md` with its issue.

**Versions:**
- `@krizaka/config` follows SemVer. A new rule is a minor version; a stricter rule is a major.
- Renovate/Dependabot groups `@krizaka/config`. ast-grep comes with it.
- A new rule fails the bump PR as `unrecorded` until `krizaka-rules ratchet --update` records its baseline. This is the review point; nothing enters silently.

**Offline:** the rules are in `node_modules` after install (the Copilot sandbox installs in `copilot-setup-steps`). The package tests its own rules with `ast-grep test`, with no network.

## 4. The slimmer agent files

**Before**: Yomizaka's `AGENTS.md:93-120`, 28 lines (21 repositories carry a variant of it):

```markdown
## Static rules & codemods (ast-grep)

The org code rules (addendum 2026-10-15) are lint rules, not review comments. [`@ast-grep/cli`](https://ast-grep.github.io)
is a **pinned devDependency** (no global install, CI reproduces local): `sgconfig.yml` + `rules/*.yml` (one rule per file,
with a message and, where safe, a `fix:`; …), `rule-tests/` (valid/invalid cases of each rule).

| Rule | What it refuses |
| :--- | :--- |
| `no-hand-ms-*`, `no-get-time-difference`, `no-get-time-arithmetic` | hand-written time arithmetic … |
| `no-env-in-domain` | an `env` import in domain code … |
| … 7 more rows … |

- **Run**: `npm run lint` runs everything …
- **Ratchet**: `scripts/sg-ratchet.mjs` counts the violations per rule … The script is identical in every
  Krizaka TypeScript repository (keep the copies identical; its unit test is `scripts/sg-ratchet.test.mjs`).
- **Codemods**: `npm run sg:fix` applies the `fix:` of the rules …
- A rule is never silenced to get a PR green; …
```

**After** (3 lines; the table is generated from the rules into `@krizaka/config`'s README by `krizaka-rules doc`):

```markdown
## Static rules
Profiles: `next-app` (apps/web), `expo-app` (apps/mobile), `ts-library` (packages/*), declared in `krizaka.rules.json`. The rules and
what each refuses: [@krizaka/config › Rules](https://github.com/krizaka/krizaka-ui/tree/main/packages/config#rules). `npm run lint` runs them through the
ratchet (`sg-ratchet.json`: the debt only goes down; `npx krizaka-rules ratchet --update` locks a gain). Local rules: `rules/`.
```

The charter (`AGENTS.template.md`) gets one line under §7: « Static rules: your profile, declared in `krizaka.rules.json`; see docs/standards/rules.md ». CONTRIBUTING §10 keeps its principle and links here instead of listing the rules.

## 5. The migration plan: one small PR per repository, pilots first

**Acceptance for every PR:**
- **The same violations before and after.** The sorted `ast-grep scan --json=stream` (`ruleId`, `file`, `range`), the ESLint `--format json` counts per rule, and the ArchUnit results, compared on the PR's base and head, show no difference.
- **The ratchet counts are unchanged.** `sg-ratchet.json`, `lint-ratchet.json`, `dup-ratchet.json` and `archunit_store/` have no diff.
- **No rule is weakened.** A rule that moves keeps its tests.

| # | Repository | PR | Specific acceptance |
|---|---|---|---|
| 1 | krizaka-ui | `@krizaka/config`: ast-grep rules (roles, not paths), their tests, `krizaka-rules` (`sync`, `check`, `ratchet`, `fix`, `doc`, `names`, `seo-family` = the 255-line version), `@ast-grep/cli` as dependency | every rule's tests pass in the package; `sync` reproduces each of the 10 repositories' current rule files from their `roles` (golden test per repo layout) |
| 2 | krizaka-build | `krizaka-test-support`: `KrizakaRules.buildingBlock` / `.service`; the 17 generic rules from `GovernanceRules` merged into `CodeRules` where they differ | `ArchitectureRulesTest` extended; released with the next `krizaka-build` |
| 3 | **krizaka-com** (pilot) | `krizaka.rules.json` (`next-app`, `site`); delete `rules/`, `rule-tests/` (except `no-raw-inner-html`, promoted in #1), `scripts/sg-*.mjs`, `check-seo-family.mjs`; AGENTS §« Static rules » → 3 lines | same violations; same counts |
| 4 | **yomizaka** (pilot) | three profiles (monorepo) | same; its `check-seo-family.mjs` moves from 235 to 255 lines (the drift): any new finding is fixed in this PR or counted |
| 5 | **akinaza** (pilot) | same as yomizaka | same |
| 6 | **krizaka-platform-kit** (Java pilot) | nine governance tests → `KrizakaRules.buildingBlock` + local rules | same test results |
| 7 | **orazaka-build + one service** (orazaka-edge) | `GovernanceRules` drops the 17 duplicates (delegates to `CodeRules`); `EdgeGovernanceTest` on `KrizakaRules.service` + Orazaka's rules | same results; `archunit_store/` unchanged |
| 8+ | the rest, one PR each: kachizaka, orochia, yasakia, orazaka-web-client, template-next-app, krizaka-ts, krizaka-ui itself; then the repositories without ast-grep today (mobile, design systems, cli, blog, motion, yororis) at their current counts; then the Orazaka services; the AGENTS.template.md and CONTRIBUTING §10 change last | per row |
