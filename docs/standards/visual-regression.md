# Visual regression of the journeys (krizaka/.github#375)

Layers of UI tests, from the smallest: **component baselines** (Storybook, krizaka-ui), **axe** (ratcheted), **page-audit**
(layout facts: overflow, covered sections, empty maps), and **page journeys** (this document: pixels of whole pages).

## How it works

- One helper, `@krizaka/page-audit/visual` (krizaka-ts): `defineJourneyTests` registers a Playwright `toHaveScreenshot` test per
  journey x viewport (desktop 1280, phone 390) x theme (light, dark). It freezes the clock, motion, caret, View Transition,
  locale and time zone; the app gives its routes, the persona that signs in (the cast of #356) and the selectors of live values to mask.
- One workflow, `.github/workflows/visual-regression.yml`, in two modes: **compare** (pull requests) and **update** (the
  `update-visual-baselines.yml` dispatch of the app: commits the changed baselines on the branch). Both run in the
  official Playwright container, so fonts and rendering are the baselines'. Never take baselines on a Mac or with local Docker.
- **First paint**: a journey with `firstPaint: true` is captured with JavaScript off (the HTML the server sent);
  `firstPaint: { hold: [...] }` keeps JavaScript but never answers the held requests (the account query), so a flash like
  krizaka-ui#827 (« Sign in » before the account mark) is a visible diff.

## Updating a baseline

1. The check fails on your PR: open the run, download the artifact **visual-diffs** (expected, actual, diff per journey).
2. If the change is intended: Actions > *Update visual baselines* > Run workflow > your branch. The new images are committed on the branch.
3. Review the images in the pull request diff like code. An unintended change is a bug to fix, not a baseline to accept.

## Rules

- A flaky journey is fixed (a mask for a live value, a `ready` selector), never retried or loosened. Flakiness is counted in the test-efficacy KPIs (#357).
- Baselines live in the app repository, next to the tests. PR captures for a description go to Bunny `pr-assets/` (AGENTS.md section 5.1), never into the repository.
- Not a required check until it has been green on main for a week; making it required is the CTO's call.
