# Architecture as code (ADR-027) — 2026-11-19

**5 / 18** active repositories in sync with `main` · **87** drift items · homes: 4 ok, 8 missing, 0 invalid.

Drift by kind: undocumented 79, phantom 0, reached 0, gone 0, missing 8, invalid 0. Read from krizaka/.github at `aebfce5`, LikeC4 1.60.0, @krizaka/org 1.5.0.

| repository | commit | verdict | why |
| :-- | :-- | :-- | :-- |
| .github | `aebfce5` | pass |  |
| folioviv | `6a997cb` | fail | undocumented: folioviv is on main and no current element binds it; undocumented: folioviv/apps/desktop is on main and no current element binds it; undocumented: folioviv/apps/mobile is on main and no current element binds it (+2) |
| kridoc | `065c839` | pass |  |
| krizaka-agents | `afbfaca` | pass |  |
| krizaka-agents-site | `5478f2b` | fail | undocumented: krizaka-agents-site is on main and no current element binds it |
| krizaka-blog | `5510a9c` | fail | undocumented: krizaka-blog is on main and no current element binds it; missing: krizaka-blog is the home of blog and has no docs/architecture/*.c4 |
| krizaka-com | `de2ac1c` | fail | undocumented: krizaka-com is on main and no current element binds it; missing: krizaka-com is the home of krizaka and has no docs/architecture/*.c4 |
| krizaka-coming-soon | `b41f873` | fail | undocumented: krizaka-coming-soon is on main and no current element binds it |
| krizaka-infra | `74624d9` | pass |  |
| krizaka-java | `fc1c0d9` | fail | undocumented: krizaka-java is on main and no current element binds it; undocumented: krizaka-java/krizaka-billing is on main and no current element binds it; undocumented: krizaka-java/krizaka-bom is on main and no current element binds it (+8) |
| krizaka-lab | `8f61cd9` | fail | undocumented: krizaka-lab is on main and no current element binds it; missing: krizaka-lab is the home of lab and has no docs/architecture/*.c4 |
| krizaka-rust | `9b9170c` | fail | undocumented: krizaka-rust is on main and no current element binds it |
| krizaka-social | `cd40793` | fail | undocumented: krizaka-social is on main and no current element binds it |
| krizaka-ts | `b52ab9d` | fail | undocumented: krizaka-ts is on main and no current element binds it; undocumented: krizaka-ts/packages/api-keys is on main and no current element binds it; undocumented: krizaka-ts/packages/architecture is on main and no current element binds it (+28) |
| krizaka-ui | `baa7c60` | fail | undocumented: krizaka-ui/apps/site is on main and no current element binds it; undocumented: krizaka-ui/apps/storybook is on main and no current element binds it; undocumented: krizaka-ui/packages/a11y-audit is on main and no current element binds it (+20) |
| krizaka-ui-builder | `b3a638e` | fail | undocumented: krizaka-ui-builder is on main and no current element binds it; undocumented: krizaka-ui-builder/packages/core is on main and no current element binds it |
| sovkora | `6f008c8` | pass |  |
| verikora | `174c5b0` | fail | undocumented: verikora is on main and no current element binds it; undocumented: verikora/apps/desktop is on main and no current element binds it; undocumented: verikora/apps/mobile is on main and no current element binds it (+2) |

| system | home | model | repositories bound |
| :-- | :-- | :-- | --: |
| Krizaka Agents | krizaka-agents | ok | 1 |
| Blog | krizaka-blog | missing | 0 |
| Folioviv | folioviv | missing | 0 |
| Krizaka Java | krizaka-java | missing | 0 |
| Kridoc | kridoc | ok | 1 |
| Krizaka | krizaka-com | missing | 0 |
| Krizaka Lab | krizaka-lab | missing | 0 |
| Krizaka platform | .github | ok | 3 |
| Sovkora | sovkora | ok | 2 |
| Krizaka TypeScript | krizaka-ts | missing | 0 |
| Krizaka UI | krizaka-ui | missing | 0 |
| Verikora | verikora | missing | 0 |
