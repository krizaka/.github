# Guards: the registry

This page lists the guards that catch each lesson, and the repos where each guard runs. It applies [a bug means a missing guard](bug-means-missing-guard.md). The decisions behind it are in [ADR-013](../adr/ADR-013-guards-and-local-sonar.md), and the earlier retro-audit is in [docs/audits/2026-10-bug-guards.md](../audits/2026-10-bug-guards.md).

**Rule:** a fix lands with its guard. A row whose guard is « missing » points to its issue. When a guard ships, update the row in the same PR.

## 1. Lessons → guards (2026-10-25 → 27)

| Bug or lesson | Guard that catches it now | Repos covered | Evidence / issue |
|---|---|---|---|
| ffmpeg operands read as options, path escape | unit test: the encoder confines its output; operands never read as flags | orazaka-worker-media, orazaka-cli | orazaka-worker-media#84, orazaka-cli#94 |
| Prompt carried in a GET query | `CodeRules.assertNoContentOnGet` (krizaka-test-support, frozen) | orazaka-conversation-service | #66 → krizaka-build#103 (krizaka-build#106) |
| Payment webhooks applied twice | one-transaction test; **missing** shared replay-twice contract | akinaza | akinaza#453 → krizaka-ts#169 |
| Stale pack consent on runs | governance test: consent re-checked at run start | orazaka-studio | orazaka-studio#92 |
| Tokens inside git remote URLs | **missing** | tools, every clone | .github#324 |
| Secrets in an example config | Sonar S6718 only (late); push protection misses non-provider patterns | krizaka-platform-kit | #71 → .github#324 |
| Connection string logged | **missing** lint rule | yomizaka | #400 → krizaka-ts#167 |
| Static mutable crypto state, `getenv` in code | `CodeRules.assertNoStaticMutableState`, `assertNoGetenvOutsideConfig` (krizaka-test-support, frozen) | krizaka-users | #57 → krizaka-build#102 (krizaka-build#106) |
| `Math.random` in an auth testkit | Sonar S2245; local `sonarjs/pseudo-random` once enabled | krizaka-ts | #158 → krizaka-ts#164 |
| View Transitions broke the page audit | the audit waits for a running transition | yomizaka (copy) | yomizaka#378 → krizaka-ui#747 |
| Binder and button overflow | page audit (containment, overlap) | yomizaka; others pending | krizaka-ui#729, krizaka-ui#747, akinaza#405, orazaka-web-client#295 |
| Wall-clock flaky tests | ast-grep `no-ambient-clock` (TS domain code only); **missing** for Java and tests | TS apps | krizaka-build#104 |
| Import layout collapsed by OpenRewrite | explicit import layout in `krizaka-parent` (rewrite + spotless) | krizaka-users, krizaka-platform-kit; **not** the orazaka services | krizaka-build#101 → orazaka-ai-engine#141 |
| Cognitive complexity (every red Sonar gate) | `sonarjs/cognitive-complexity` + ratchet in `@krizaka/config` 0.11; **missing** for Java (PMD) | TS consumers of 0.11 | .github#319, krizaka-build#105, krizaka-ui#785, krizaka-blog#166 |
| Server code calling client code (dossiers crash) | `krizaka-server-client-boundary` (`@krizaka/config` 0.10) | yomizaka, akinaza, orazaka-web-client, krizaka-com, krizaka-blog; **not** krizaka-ui | yomizaka#458 → krizaka-ui#785, krizaka-ts#165 |
| Dev migrations not applied; numbering collision | **missing** | yomizaka, akinaza | krizaka-ts#168 |
| A committed `.vitest` output | repo-layout check (clean root) should refuse it | krizaka-ui | krizaka-ui#783 |
| Docs-only PRs blocked: required checks never report | workaround: docs-only PRs run the full CI so Sonar posts (heavy) | all | akinaza#456 → .github#330 |
| Packs step ids versus refs | blueprint step-id guard on every pack | orazaka-packs | orazaka-packs#160, #161 |
| GitHub Actions injection, permissions, unpinned steps | Sonar only (actionlint does not check them) | all | .github#268 → .github#325 |
| OS command resolved by PATH | Sonar S4036; local `sonarjs/no-os-command-from-path` once enabled | all TS | krizaka-com#408 → krizaka-ts#164 |
| Orphan ratchet counter (`pageTemplate`: no rule measures it) | **missing**: the ratchet keeps unknown counters | akinaza, orazaka-web-client, yomizaka | krizaka-ts#172 |
| A fix with no guard | **missing** CI check | all | .github#323 |

## 2. The matrix (2026-10-27, read from the GitHub API)

`Y` = present, `–` = absent. A number is the current ratchet total (the sum of the counters).

| Repo | ESLint | lint-ratchet | ast-grep (rules) | sg-ratchet | depcruise | ArchUnit | rewrite + spotless | page audit | a11y-audit | hook | Sonar required |
|---|---|---|---|---|---|---|---|---|---|---|---|
| yomizaka | Y | 47 | 17 | 22 | Y | – | – | Y | – (local branch) | Y | Y |
| akinaza | Y | 41 | 21 | 33 | Y | – | – | #405 | Y | – | Y |
| orazaka-web-client | Y | 61 | 15 | 113 | Y | – | – | #295 | Y | – | Y |
| krizaka-com | Y | 2 | 16 | 4 | Y | – | – | – | Y | – | Y |
| krizaka-ui | Y (0.9.1) | – | 14 | 122 | – | – | – | – | – | – | Y |
| krizaka-ts | Y (source) | – | 14 | 0 | Y | – | – | – | – | – | Y |
| krizaka-blog | – | – | – | – | – | – | – | – | – | – | Y |
| orazaka-ai-engine | – | – | – | – | – | Y (frozen: spring-ai-outside-adapter, spring-in-core) | orazaka-parent | – | – | – | Y |
| orazaka-studio | – | – | – | – | – | Y | orazaka-parent | – | – | – | Y |
| orazaka-conversation-service | – | – | – | – | – | Y (frozen store) | orazaka-parent | – | – | – | Y (added 2026-10-27) |
| krizaka-users | – | – | – | – | – | Y (frozen store) | Y (krizaka-parent) | – | – | – | Y |
| krizaka-platform-kit | – | – | – | – | – | Y | Y (krizaka-parent) | – | – | – | Y (added 2026-10-27) |
| krizaka-build | – | – | – | – | – | Y (source: test-support) | Y (source) | – | – | – | Y |

No repo runs SpotBugs, PMD, Error Prone, gitleaks or zizmor yet.

## 3. One source per rule set

Every rule set has **one** home. A repo only consumes it.

| Rule set | The single source | What a repo keeps |
|---|---|---|
| ESLint presets, the sonarjs layer | `@krizaka/config` (krizaka-ts) | `eslint.config.mjs` = `krizakaStack()`, its suppressions baseline |
| ast-grep rules + `sg-ratchet` | `@krizaka/config` pack + bin (krizaka-ui#613, krizaka-ts#166) | `sgconfig.yml` pointing at the pack, `sg-ratchet.json` |
| dependency-cruiser | `@krizaka/config/dependency-cruiser` (krizaka-ts#165) | `.dependency-cruiser.cjs` extending it, known-violations baseline |
| SEO family check | `@krizaka/config` bin (krizaka-ts#166) | the call in CI |
| ArchUnit | `krizaka-test-support` (krizaka-build) | one architecture test calling the entry points, the `archunit_store` |
| Java format, imports, PMD, SpotBugs | `krizaka-parent` | the parent version, the baseline files |
| CI steps | krizaka/.github reusable workflows | a caller workflow of a few lines |
| Page audit + a11y | one shared package (krizaka-ui#747) | seeds and routes |

- **Copies found:**
  - `sg-ratchet.mjs` in 6 repos;
  - `check-seo-family.mjs` in 9;
  - `rules/*.yml` in 6 (14 to 21 rules each);
  - a page audit in yomizaka;
  - hand-written CI in krizaka-ui and krizaka-blog (.github#328).

  Each copy has its move filed.
- **Local exceptions:** a repo-specific rule (for example yomizaka's `no-direct-organize-write`) stays in the repo, listed in its `sgconfig.yml` with one line of reason.
- **Upgrades:** each source ships versioned releases, and Renovate bumps the consumers (.github#332). Since nothing is copied, no drift check is needed.
