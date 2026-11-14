# Architecture as code (ADR-027) — 2026-11-14

**4 / 16** active repositories in sync with `main` · **84** drift items · homes: 2 ok, 8 missing, 0 invalid.

Drift by kind: undocumented 76, phantom 0, reached 0, gone 0, missing 8, invalid 0. Read from krizaka/.github at `330e970`, LikeC4 1.60.0, @krizaka/org 1.1.0.

| repository | commit | verdict | why |
| :-- | :-- | :-- | :-- |
| .github | `330e970` | pass |  |
| folioviv | `f8110e6` | fail | undocumented: folioviv is on main and no current element binds it; undocumented: folioviv/apps/desktop is on main and no current element binds it; undocumented: folioviv/apps/mobile is on main and no current element binds it (+2) |
| kridoc | `92696b8` | fail | undocumented: kridoc is on main and no current element binds it; undocumented: kridoc/apps/web is on main and no current element binds it |
| krizaka-agents | `234993e` | pass |  |
| krizaka-blog | `bc2e7c4` | fail | undocumented: krizaka-blog is on main and no current element binds it; missing: krizaka-blog is the home of blog and has no docs/architecture/*.c4 |
| krizaka-com | `3153e94` | fail | undocumented: krizaka-com is on main and no current element binds it; missing: krizaka-com is the home of krizaka and has no docs/architecture/*.c4 |
| krizaka-coming-soon | `5ca7736` | fail | undocumented: krizaka-coming-soon is on main and no current element binds it |
| krizaka-infra | `23e1878` | pass |  |
| krizaka-java | `3c8247c` | fail | undocumented: krizaka-java is on main and no current element binds it; undocumented: krizaka-java/krizaka-billing is on main and no current element binds it; undocumented: krizaka-java/krizaka-bom is on main and no current element binds it (+8) |
| krizaka-lab | `6163219` | fail | undocumented: krizaka-lab is on main and no current element binds it; missing: krizaka-lab is the home of lab and has no docs/architecture/*.c4 |
| krizaka-rust | `1c994f7` | fail | undocumented: krizaka-rust is on main and no current element binds it |
| krizaka-ts | `dd2fd22` | fail | undocumented: krizaka-ts is on main and no current element binds it; undocumented: krizaka-ts/packages/api-keys is on main and no current element binds it; undocumented: krizaka-ts/packages/architecture is on main and no current element binds it (+25) |
| krizaka-ui | `4e55a68` | fail | undocumented: krizaka-ui/apps/site is on main and no current element binds it; undocumented: krizaka-ui/apps/storybook is on main and no current element binds it; undocumented: krizaka-ui/packages/a11y-audit is on main and no current element binds it (+20) |
| krizaka-ui-builder | `3d6e36b` | fail | undocumented: krizaka-ui-builder is on main and no current element binds it; undocumented: krizaka-ui-builder/packages/core is on main and no current element binds it |
| sovkora | `9859ed5` | pass |  |
| verikora | `3c39fdc` | fail | undocumented: verikora is on main and no current element binds it; undocumented: verikora/apps/desktop is on main and no current element binds it; undocumented: verikora/apps/mobile is on main and no current element binds it (+2) |

| system | home | model | repositories bound |
| :-- | :-- | :-- | --: |
| Blog | krizaka-blog | missing | 0 |
| Folioviv | folioviv | missing | 0 |
| Krizaka Java | krizaka-java | missing | 0 |
| Krizaka | krizaka-com | missing | 0 |
| Krizaka Lab | krizaka-lab | missing | 0 |
| Krizaka platform | .github | ok | 4 |
| Sovkora | sovkora | ok | 2 |
| Krizaka TypeScript | krizaka-ts | missing | 0 |
| Krizaka UI | krizaka-ui | missing | 0 |
| Verikora | verikora | missing | 0 |
