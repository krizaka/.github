# UI tests: the layers, the baselines, reading a diff (krizaka/.github#375)

A screen can be wrong in ways a unit test never sees: a flash of « Sign in » before the account mark, a map with no tiles,
a card cut at 360 px, a font that did not load. The UI is therefore tested in **layers**, from the cheapest to the most
complete. Each layer catches what the one below cannot, and each is automatic: nobody checks by hand (AGENTS rule « Automate
checks, not tokens »).

## 1. The layers

| Layer | Where | Catches | Fails the build when |
| :--- | :--- | :--- | :--- |
| **Unit / component** (Vitest, Jest, Testing Library) | the repository's `*.test.*` | logic, states of one component, i18n keys | an assertion fails |
| **Component baselines** (Storybook + Playwright, `krizaka-ui`) | `krizaka-ui` stories, `*-snapshots/` | the pixels of one component, both themes, phone and desktop | a story differs from its baseline |
| **axe** (`@krizaka/page-audit`, `a11y-audit`) | each app's page audit | accessibility violations on whole pages | the violation count rises over the ratchet |
| **Page audit** (`@krizaka/page-audit`) | each app's `scripts/check-*-pages.mjs` | layout facts: no horizontal overflow, one h1, no section covering another, no column cut off, no empty map, no unnamed button, at 360 / 390 / 1280 / 1440 / 1600 px, light and dark | a fact is false on any page, width or theme |
| **Page journeys** (`@krizaka/page-audit/visual`) | each app's `e2e/visual/` folder | the pixels of whole pages, signed in as the seeded cast | a screenshot differs from its baseline |
| **Perf budgets** | `perf-budgets.json` | JavaScript and CSS per route | a route is over its budget (never raised without a stated reason) |

Rules of thumb: a **fact** that can be written as a rule belongs in the page audit (exact, cheap, readable failure); only
what a rule cannot say (« it looks right ») is a screenshot. A bug found by a screenshot gets a **fact** in the page audit
as well when one can express it (« A bug means a missing guard »).

## 2. The page journeys

- One helper, `defineJourneyTests` (`@krizaka/page-audit/visual`, krizaka-ts), registers a Playwright `toHaveScreenshot`
  test per **journey x viewport** (desktop 1280, phone 390) **x theme** (light, dark). It freezes the clock, motion, caret,
  View Transition, locale and time zone.
- The app declares its journeys in `e2e/visual/journeys.visual.mjs`: a name, a route, the persona that signs in (the **seeded cast**
  of .github#356, the same people locally and deployed), a `ready` selector, and `mask` selectors for live values (dates,
  counters, anything that is data and not layout).
- `firstPaint: true` captures the HTML the server sent, JavaScript off. `firstPaint: { hold: [...] }` keeps JavaScript but
  never answers the held requests (the account query): a flash such as krizaka-ui#827 is then a visible diff.
- Journeys to have: the public landing, sign-in, the signed-in home, the product's main screen, and each journey a customer
  pays for. Yomizaka: landing, pricing, sign-in, home, report. Akinaza: a shop's page, explore with the map, a booking.

## 3. Where the pixels are taken

Always in CI, in the official Playwright container (same fonts and rendering as the baselines): the reusable workflow
`krizaka/.github/.github/workflows/visual-regression.yml`, pinned by SHA in each app, in two modes.

- **compare**: on every pull request. Red when a screenshot differs; the run uploads the artifact **visual-diffs**
  (expected, actual, diff).
- **update**: the app's *Update visual baselines* workflow, started by hand (Actions, Run workflow, the branch to update).
  It retakes the baselines in the container and **commits them on the branch**.

Never take baselines on a Mac, with local Docker, or from a browser you opened. They would differ by a pixel everywhere.

## 4. Updating a baseline

1. The check is red on your pull request: open the run and download **visual-diffs**.
2. Decide: **intended** change (you changed the screen) or **regression** (you did not mean this).
3. Regression: fix the code. Do not touch the baseline.
4. Intended: run *Update visual baselines* on the branch (the dispatch ref decides which workflow file and which pin run,
   so choose the branch). `git pull --rebase` before any further push: the workflow committed to the branch.
5. Review the new images in the pull request's **Files changed** like code: they are the change. Say in the description what
   moved and why.
6. If the workflow fails with « fetch first », another job pushed to the branch meanwhile (the update-behind cron): run it
   again and push nothing in between.

## 5. Reading a diff

The artifact holds three images per failing shot. Read them in this order.

1. **expected / actual** side by side: what a person sees first (a missing block, a different state, a wrong theme).
2. **diff**: red pixels are the changed ones. A few scattered pixels along text are a font or sub-pixel change; a block of
   red is layout. A shifted block pushes everything under it red: look for the **first** red row, that is the cause.
3. Name the cause before acting: *content* (data changed, so mask it), *layout* (CSS or a component), *timing* (the shot
   was taken before the page settled: add a `ready` selector), *environment* (a font or image did not load).

Common causes and the right fix:

| You see | Cause | Fix |
| :--- | :--- | :--- |
| a date or counter differs every run | live value | `mask` it (the value is data, the box stays tested) |
| the page is half drawn | shot taken early | a `ready` selector for the last thing that appears, not a sleep |
| a skeleton or spinner in the shot | the data did not arrive | wait for the data; the journey is then wrong or the cast not seeded |
| « Sign in » where the person is signed in | the flash krizaka-ui#827 describes | fix the app; keep the journey (`firstPaint.hold`) |
| a 1 px shift everywhere | unpinned font, or a baseline taken outside CI | retake in CI; check `@krizaka/fonts` loads |
| a map with no tiles | tiles blocked or slow in CI | the page audit's « empty map » fact names it; fix the source of tiles |

## 6. Rules

- A flaky journey is **fixed** (a mask, a `ready` selector, a seeded value), never retried and never loosened. Flakiness is
  counted in the test-efficacy KPIs (#357).
- A baseline is never regenerated to turn a red check green without reading the diff.
- Baselines live in the app repository next to the tests. PR captures for a description go to Bunny `pr-assets/`
  (AGENTS.md section 5.1), never into the repository.
- Demo data only, the seeded cast: no customer name, no company identifier.
- Not a required check until it has been green on main for a week; making it required is the CTO's call.

## 7. Where to find it in an app

Each app's README links here under « Tests » and gives its own commands: the page audit script, the journeys folder, the
*Update visual baselines* workflow. See also `visual-regression.md` (the workflow's inputs), `guards.md` (the other guards)
and `bug-means-missing-guard.md`.
