# ADR-017 — Tests prove the product: journeys first, a product never tests the library

- **Status:** Accepted (CTO, delegated) as the direction. The kit, the audits and the lint rule are slices of [#423](https://github.com/krizaka/.github/issues/423).
- **Date:** 2026-10-29
- **Builds on:** [ui-testing.md](../standards/ui-testing.md) (layers, page journeys, baselines), [app-videos.md](../standards/app-videos.md) (videos recorded by e2e), [bug-means-missing-guard.md](../standards/bug-means-missing-guard.md), the seeded cast of [#356](https://github.com/krizaka/.github/issues/356).
- **Repositories:** every product (Yomizaka, Akinaza, Orazaka) and their web, mobile and admin clients; `krizaka-ts` (`@krizaka/page-audit`) for the shared kit; `krizaka-ui` keeps the component tests.

## Context

Founder direction (2026-10-29): build the customer journeys, strengthen them, and cut the tests that cost time and
maintenance for little product value. « On ne teste pas les composants »: `@krizaka/ui` has its own tests, and a product
that uses it does not write them again.

Today a product carries slow or brittle tests (snapshots of library components, copies of what `@krizaka/ui` already
asserts, long e2e runs rerun after a flake) while the journeys that prove a customer can use the product are partial.

## Decision

### 1. The rule

**A product does not test the library.** A product test has one of three subjects: its rules (unit), its server and API
(integration), its journeys (e2e). A bug found in a library component gets its test in the library, never a copy in the
product. Enforced by an ast-grep rule in product repositories (see §6).

### 2. The test shape of a product

| Layer | Subject | Runs | Share |
| :--- | :--- | :--- | :--- |
| **Journeys (e2e)** | one customer promise from a persona's point of view | Playwright (web), Maestro (mobile), on the seeded dataset | the main proof, few and complete |
| **Rules and domain (unit)** | pure functions, state machines, validation | Vitest / Jest / JUnit, in memory | many, fast |
| **Server and API (integration)** | a boundary: HTTP, database, queue | real database (Testcontainers / docker) | few, on the boundaries |
| **Visual regression** | whole screens a journey reaches | `@krizaka/page-audit/visual`, dates and ids masked | journey screens only, never a component |

Removed or reduced: component tests of library pieces, snapshots of large trees, duplicate e2e paths, tests nobody reads
when they fail. A removal is listed in its PR with **what covers it instead** (a journey or a library test); a test is
never deleted silently, and never weakened to turn a check green.

### 3. The journey catalogue format

Each product repository holds `journeys/<id>.journey.ts` (one journey per file) and a generated index `journeys/journeys.json`.
The index is the catalogue; a check fails when a file has no row or a row has no file.

```json
{
  "id": "lease-check-to-report",
  "promise": "A tenant checks a lease and gets a signed report",
  "persona": "eric",
  "platforms": ["web"],
  "steps": ["sign in", "upload a lease", "read the findings", "pay with a launch code", "download the report"],
  "video": true,
  "budgetSeconds": 90,
  "tags": ["smoke", "paid"]
}
```

- `persona` is a member of the seeded cast (the same people locally and deployed); no customer name, no company identifier.
- `video: true` makes the same run the source of the product video (rule « videos from tests »): one source, two uses.
- `tags`: `smoke` runs on every pull request, `paid` and the rest run in the nightly full pass.
- First catalogues (from #423): Yomizaka lease check, report, Section G, pay with a launch code; Akinaza owner sets up a
  shop, publishes, a customer orders; Orazaka chat with a tool call, studio run.

### 4. Budgets

| What | Budget |
| :--- | :--- |
| Pull request CI, end to end | 15 minutes at most |
| One journey | its `budgetSeconds` (default 90 s); over it, the journey is split or the product is slow: both are bugs |
| `smoke` journeys on a pull request | parallel and sharded to fit the 15 minutes |
| Nightly full pass on dev | every journey, records videos to Bunny, a red night opens an issue |

Budgets only go down; raising one needs a stated reason in the PR (same ratchet idea as `lint-ratchet.json`).

### 5. Flake policy

A flake is a bug, not a retry.
- **Retries are 0 on main** and on pull requests. A silent rerun is forbidden.
- Fix the cause (a mask, a `ready` selector, a seeded value, a wait on a real signal such as a lazy chunk), never loosen a threshold.
- If the fix is not immediate, **quarantine with an issue**: an entry naming the test, the reason and the issue; the audit
  (axe) keeps running, only the unstable assertion is skipped. The quarantine is capped (today one entry in `krizaka-ui`'s
  test-runner: a second one fails the run).
- Flake rate and quarantine count are test-efficacy KPIs (#357).
- A journey becomes a required check only after a week green on main (CTO's call), then it is required on the merge queue.

### 6. Enforcement: a rule that reaches every repo

- Lint rule `no-library-component-test` (ast-grep, in the rule registry of this repository): refuses a test file whose
  only subject is a `@krizaka/*` component (it imports a component and renders it with no product code). Ratcheted at
  today's count per repository (`sg-ratchet.json`, only goes down), rolled out by fan-out PRs to every active product
  repository; the conformance matrix (repo x rule) must be green for #423 to close.
- Conformance also checks that `journeys/journeys.json` exists, matches the files, and that no `retries` above 0 is
  configured for main.

### 7. The shared journey kit

Lives in `krizaka-ts` (`@krizaka/page-audit`, extended), not copied into products. It provides: persona sign-in once per
worker (storage state reuse, rate-limit-safe), seeded-data helpers, masks for dates and ids, video capture hooks, the
quarantine helper. Mobile reuses the catalogue through Maestro flows named by the same ids.

## Consequences

- Slower tests of library pieces leave the products; the saved minutes go to journeys.
- Each product gets one honest answer to « does the customer path work today »: the journey list and its last result.
- Journeys cost real time: sharding, seeded data and the 90 s default keep the 15-minute budget.
- Risk: a journey that only asserts « page loaded » proves nothing. A journey states its promise and asserts the result
  the customer sees (a report, a published shop, an order), and review rejects shallow ones.

## Slices (tracked in #423)

1. This ADR.
2. The journey kit in `@krizaka/page-audit` (sign-in reuse, masks, video hooks, quarantine helper).
3. The catalogue per product (three products).
4. The audit per product: each test with runtime, flake rate and last failure value; removals listed in their PRs.
5. The lint rule, its registry entry, ratchets and the fan-out.
6. CI: `smoke` journeys on the merge queue, nightly full run on dev recording videos to Bunny.
