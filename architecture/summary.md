# Architecture as code (ADR-027) — 2026-11-18

**5 / 16** active repositories in sync with `main` · **85** drift items · homes: 4 ok, 8 missing, 0 invalid.

Drift by kind: undocumented 77, phantom 0, reached 0, gone 0, missing 8, invalid 0. Read from krizaka/.github at `8644369`, LikeC4 1.60.0, @krizaka/org 1.5.0.

| repository | commit | verdict | why |
| :-- | :-- | :-- | :-- |
| .github | `8644369` | pass |  |
| folioviv | `72fbb11` | fail | undocumented: folioviv is on main and no current element binds it; undocumented: folioviv/apps/desktop is on main and no current element binds it; undocumented: folioviv/apps/mobile is on main and no current element binds it (+2) |
| kridoc | `606096c` | pass |  |
| krizaka-agents | `92743c2` | pass |  |
| krizaka-blog | `f11e900` | fail | undocumented: krizaka-blog is on main and no current element binds it; missing: krizaka-blog is the home of blog and has no docs/architecture/*.c4 |
| krizaka-com | `4547752` | fail | undocumented: krizaka-com is on main and no current element binds it; missing: krizaka-com is the home of krizaka and has no docs/architecture/*.c4 |
| krizaka-coming-soon | `e9a8e60` | fail | undocumented: krizaka-coming-soon is on main and no current element binds it |
| krizaka-infra | `3432df6` | pass |  |
| krizaka-java | `975f52f` | fail | undocumented: krizaka-java is on main and no current element binds it; undocumented: krizaka-java/krizaka-billing is on main and no current element binds it; undocumented: krizaka-java/krizaka-bom is on main and no current element binds it (+8) |
| krizaka-lab | `9f21150` | fail | undocumented: krizaka-lab is on main and no current element binds it; missing: krizaka-lab is the home of lab and has no docs/architecture/*.c4 |
| krizaka-rust | `af4c188` | fail | undocumented: krizaka-rust is on main and no current element binds it |
| krizaka-ts | `65a5870` | fail | undocumented: krizaka-ts is on main and no current element binds it; undocumented: krizaka-ts/packages/api-keys is on main and no current element binds it; undocumented: krizaka-ts/packages/architecture is on main and no current element binds it (+28) |
| krizaka-ui | `f30d6d2` | fail | undocumented: krizaka-ui/apps/site is on main and no current element binds it; undocumented: krizaka-ui/apps/storybook is on main and no current element binds it; undocumented: krizaka-ui/packages/a11y-audit is on main and no current element binds it (+20) |
| krizaka-ui-builder | `4f26622` | fail | undocumented: krizaka-ui-builder is on main and no current element binds it; undocumented: krizaka-ui-builder/packages/core is on main and no current element binds it |
| sovkora | `5e82898` | pass |  |
| verikora | `8141605` | fail | undocumented: verikora is on main and no current element binds it; undocumented: verikora/apps/desktop is on main and no current element binds it; undocumented: verikora/apps/mobile is on main and no current element binds it (+2) |

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
