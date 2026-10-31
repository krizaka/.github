# Critical journeys (krizaka-internal#1939)

A product's critical journeys are Playwright tests in a project named `critical`, run as the **seeded demo cast** (never a real account)
with **test-mode payments** (a live key is refused). Two reusable workflows run them:

| Workflow | When | Check |
| :-- | :-- | :-- |
| `journeys.yml` | PR, merge_group, push to main, on the CI build | `journeys / gate` (required on main and in the merge queue; the job is named `gate`, literal, never skipped) |
| `post-deploy-journeys.yml` | after each deploy, dev and prod (`workflow_run`), against the deployed URL | `post-deploy journeys`; red opens or updates one issue per product, environment and lane |
| `journey-line.yml` | PR | `Journey line`: a `feat`/`fix` PR has `Journey: <name>` or `Journey: n/a — <reason>` |

Rules the scripts (`scripts/journeys.mjs`, tested in `tests/journeys.test.mjs`) enforce:

- A missing credential **fails** the run (`persona-password`, and `payments-test-key` when `needs-payments`): a run that checks nothing is never green.
- A report with no test, a skipped test or a flaky one (passed only on retry) is red.
- A known bug is written first as a journey marked `test.fail()` with the bug issue linked in the test (never `skip`); the summary lists it. When the fix lands the test passes and the run goes red until the marker is removed.
- Personas are `name@demo` or `name@example.*`; the films (`video: "on"`) and the JSON report are uploaded (`journeys-films`, `post-deploy-journeys-<env>`).
- Conformance rule `journeys` (registry): the product repository calls both workflows and requires `journeys / gate` on main.
