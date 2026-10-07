# Contributing to Krizaka projects

Thank you for helping. Every Krizaka repository follows the same rules.

1. **Read the contract first.** Each repository has an `AGENTS.md` (its governance contract) — the
   architecture rules, invariants and definition of done. Changes that break it are not merged.
2. **Open an issue before large changes**, so the design is agreed before the code.
3. **Keep the gates green.** Run the repository's quality gates locally (lint, type-check, tests,
   build, docs check — listed in its README) before opening a pull request; CI runs them again.
4. **Generated content is generated.** Documentation and data marked as generated are rebuilt from
   the code, never edited by hand.
5. **One change per pull request**, with [Conventional Commits](https://www.conventionalcommits.org/)
   messages (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`…).
6. **No secrets, ever** — configuration comes from the environment.

By contributing you agree that your contributions are licensed under the repository's license
(Apache-2.0) and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
