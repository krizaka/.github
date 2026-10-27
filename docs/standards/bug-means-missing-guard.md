# A bug means a missing guard

Decision of Oussama, 2026-10-26: when a bug is found, we do not only fix it. We ask **why the guards that run while an agent develops did not catch it**, and we add the guard. Every Krizaka repository already has first layers of protection; a bug that reached a user is a hole in one of them.

## 1. The loop

1. **The bug issue** (form « Bug ») has a section **Why the guards missed it**, and a field **Which guard should have caught it**. Fill it before the fix, even with « none exists yet ».
2. **The fix PR** is built in this order, and says so in its body:
   1. add or extend a guard (a rule, a test, a check, a type);
   2. **prove it fails on `main`** (run it against the unfixed code, paste the failing line or link the red run);
   3. fix the bug; the guard turns green.
3. **The PR template** has the checkbox « a guard that fails without this fix is added ». A bug fixed with no guard says why in one line (a pure typo, a one-off data mistake).
4. A guard too large for the fix PR becomes an issue in its repository, on the board as **Next**, linked from the bug.
5. The registry of lessons → guards is [guards.md](guards.md). The retro-audit of recent bugs is kept in [docs/audits/2026-10-bug-guards.md](../audits/2026-10-bug-guards.md).

## 2. The guards available

| Layer | Catches | Where |
|---|---|---|
| **Types** | a missing or wrong value (a required `kind`, a union that must be exhaustive) | TypeScript, `satisfies`, `never` checks |
| **ArchUnit** (Java) | a forbidden dependency, a layer break, a naming rule; container ITs extend `AbstractContainerIntegrationTest` | krizaka-build, orazaka-build, Java repositories |
| **ast-grep + `sg-ratchet`** | a code pattern (ambient clock, enum string compare, hand-made nav) | `rules/*.yml`, `rule-tests/`, `sg-ratchet.json` |
| **ESLint `krizakaStack()`** | the stack rules (fetch in an effect, TanStack, hand tables and forms) | `@krizaka/config` |
| **dependency-cruiser** | a forbidden import, a cycle, a layer break | `.dependency-cruiser.cjs`, the shared preset |
| **Page audit** | overflow, containment, overlap, contrast, on real pages in both themes | `page-audit.mjs` (to become a shared package) |
| **Playwright / Maestro flows** | a broken journey, a missing state | `e2e/`, `.maestro/` |
| **Contract tests** | a producer and a consumer that drift (BFF, API, events) | per service |
| **Sonar** | code smells, complexity, duplication, coverage on new code | « Krizaka way » gate |
| **Trivy + licence allowlist** | a vulnerable dependency or image, a forbidden licence | CI, [supply-chain](supply-chain.md) |
| **CI gate + required checks** | a red PR merging; a release PR that never ran CI | `CI gate`, Sonar, [audit-guards](../../scripts/audit-guards.mjs) |

Choose the **earliest** layer that can express the rule: a type before a lint rule, a lint rule before a test, a test before a review comment. A guard that runs only in Sonar or at push is too late for the agent: it must also run in the local pre-commit lint.

## 3. Rules for a good guard

- It **fails on the bug** and **passes on the fix**; the PR shows both.
- It guards the **class** of the bug, not the one instance (« every picker passes a kind », not « this picker »).
- It lives where the rule is **owned**. A guard copied between repositories moves into a shared package: `@krizaka/config` (ESLint, ast-grep, dependency-cruiser, ratchets), krizaka-ui test tools (page audit, seeds), krizaka-build (Java, ArchUnit). See [rules.md](rules.md).
- A rule is never silenced or loosened to get a PR green.

## 4. Seeds must cover the states

A page audit, a screenshot flow or a demo seed is only as good as its data. The seed of every list or collection covers **three states**: **empty**, **one item**, **many items** (enough to overflow a row, a panel, a viewport). The binder overflow of yomizaka#435 slipped past the audit because the seed held one tidy folder. A list with no seed for each of the three states fails the seed check (to be built in the shared page-audit package).

## 5. Where it is wired

- Issue form: `.github/ISSUE_TEMPLATE/bug_report.yml` (what happened, expected, which guard should have caught it, why the guards missed it).
- PR template: `.github/pull_request_template.md`.
- Each focus repository's `AGENTS.md` carries one line pointing here.
- The org audit [`scripts/audit-guards.mjs`](../../scripts/audit-guards.mjs), run daily by `audit-guards.yml`, fails when a focus repository's `main` lacks the `CI gate` or Sonar required check, or when a release workflow does not use a GitHub App token.
