# Contributing to Krizaka projects

Thank you for helping. Every Krizaka repository follows the same rules.

1. **Read the contract first.** Each repository has an `AGENTS.md` (its governance contract) — the
   architecture rules, invariants and definition of done. Changes that break it are not merged.
2. **Open an issue before large changes**, so the design is agreed before the code.
3. **No test, not done.** Every feature and every fix ships with its tests in the same pull request — a unit test for
   logic, an integration or end-to-end test for a route, an endpoint or a flow, a story or a render test for a
   component. **A fix starts with a failing test** that reproduces the bug. A test is never skipped, weakened or
   deleted to make CI pass.
4. **Keep the gates green.** Run the repository's quality gates locally (lint, type-check, tests,
   build, docs check — listed in its README) before opening a pull request; CI runs them again.
5. **Generated content is generated.** Documentation and data marked as generated are rebuilt from
   the code, never edited by hand.
6. **One change per pull request**, with [Conventional Commits](https://www.conventionalcommits.org/)
   messages (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`…).
7. **No secrets, ever** — configuration comes from the environment.
8. **Label and plan with the shared taxonomy** — [LABELS.md](LABELS.md) (`type:*`, `priority:*`, `product:*`, `area:*`);
   every issue lives on the [Krizaka Roadmap](https://github.com/orgs/krizaka/projects/4) ([ROADMAP.md](ROADMAP.md)).

By contributing you agree that your contributions are licensed under the repository's license
(Apache-2.0) and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
