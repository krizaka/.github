# Architecture as code (ADR-027) — 2026-11-22

**5 / 18** active repositories in sync with `main` · **124** drift items · homes: 4 ok, 8 missing, 0 invalid.

Drift by kind: undocumented 116, phantom 0, reached 0, gone 0, missing 8, invalid 0. Read from krizaka/.github at `c290c27`, LikeC4 1.60.0, @krizaka/org 1.5.0.

| repository | commit | verdict | why |
| :-- | :-- | :-- | :-- |
| .github | `c290c27` | pass |  |
| folioviv | `2f8047a` | fail | undocumented: folioviv is on main and no current element binds it; undocumented: folioviv/apps/desktop is on main and no current element binds it; undocumented: folioviv/apps/mobile is on main and no current element binds it (+2) |
| kridoc | `1888e0d` | pass |  |
| krizaka-agents-site | `a2b022d` | fail | undocumented: krizaka-agents-site is on main and no current element binds it |
| krizaka-blog | `9bfbd40` | fail | undocumented: krizaka-blog is on main and no current element binds it; missing: krizaka-blog is the home of blog and has no docs/architecture/*.c4 |
| krizaka-com | `017b84f` | fail | undocumented: krizaka-com is on main and no current element binds it; missing: krizaka-com is the home of krizaka and has no docs/architecture/*.c4 |
| krizaka-java | `4fb8788` | fail | undocumented: krizaka-java is on main and no current element binds it; undocumented: krizaka-java/krizaka-billing is on main and no current element binds it; undocumented: krizaka-java/krizaka-bom is on main and no current element binds it (+8) |
| krizaka-lab | `0c85ff8` | fail | undocumented: krizaka-lab is on main and no current element binds it; missing: krizaka-lab is the home of lab and has no docs/architecture/*.c4 |
| krizaka-rust | `d0544b2` | fail | undocumented: krizaka-rust is on main and no current element binds it |
| krizaka-ts | `0f6529f` | fail | undocumented: krizaka-ts is on main and no current element binds it; undocumented: krizaka-ts/packages/api-keys is on main and no current element binds it; undocumented: krizaka-ts/packages/architecture is on main and no current element binds it (+29) |
| krizaka-ui | `6339be1` | fail | undocumented: krizaka-ui/apps/site is on main and no current element binds it; undocumented: krizaka-ui/apps/storybook is on main and no current element binds it; undocumented: krizaka-ui/packages/a11y-audit is on main and no current element binds it (+20) |
| krizaka-ui-builder | `30cbf0a` | fail | undocumented: krizaka-ui-builder is on main and no current element binds it; undocumented: krizaka-ui-builder/packages/core is on main and no current element binds it |
| sovkora | `9a800a9` | pass |  |
| verikora | `231380c` | fail | undocumented: verikora is on main and no current element binds it; undocumented: verikora/apps/desktop is on main and no current element binds it; undocumented: verikora/apps/mobile is on main and no current element binds it (+2) |

| system | home | model | repositories bound |
| :-- | :-- | :-- | --: |
| Blog | krizaka-blog | missing | 0 |
| Folioviv | folioviv | missing | 0 |
| Krizaka Java | krizaka-java | missing | 0 |
| Kridoc | kridoc | ok | 1 |
| Krizaka | krizaka-com | missing | 0 |
| Krizaka Lab | krizaka-lab | missing | 0 |
| Krizaka platform | .github | ok | 2 |
| Sovkora | sovkora | ok | 2 |
| Krizaka TypeScript | krizaka-ts | missing | 0 |
| Krizaka UI | krizaka-ui | missing | 0 |
| Verikora | verikora | missing | 0 |
