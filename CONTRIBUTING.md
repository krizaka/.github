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
8. **Environment variables are named by bounded context**, not by product or vendor:
   - `<CONTEXT>_<THING>`, CONTEXT one of `APP_` (URL, environment, release), `DATABASE_`, `AUTH_` (session secret,
     OAuth, owner/operator), `MEDIA_` (streaming, storage, CDN, signing), `MAIL_`, `PUSH_`, `PAYMENTS_`, `REALTIME_`,
     `ABUSE_` (bot challenge, quotas, rate limits), `OBSERVABILITY_`, `AI_` (the Orazaka client), `OPERATOR_` (admin console).
   - The vendor is a **value**: `MEDIA_STORAGE_PROVIDER=bunny`, `MAIL_PROVIDER=mailgun`, `PUSH_PROVIDER=expo`; its settings
     sit under the context (`MEDIA_STREAM_LIBRARY_ID`, `MAIL_API_KEY`). Never `BUNNY_…`, `MAILGUN_…`, `GOOGLE_…`.
   - **No product name** (`OROCHIA_…`, `YASAKIA_…`): the deployment already says which product it is.
   - `NEXT_PUBLIC_` / `EXPO_PUBLIC_` only where the framework requires a client-exposed value, then the context
     (`NEXT_PUBLIC_APP_URL`, `EXPO_PUBLIC_APP_URL`).
   - **One typed env module per app** (zod): every variable declared once with its context, whether production needs
     it, whether it is a secret; fail-closed in production; a docs table generated from it, grouped by context.
   - Enforced by `krizaka/env-name` in [`@krizaka/config`](https://github.com/krizaka/krizaka-ui/tree/main/packages/config)
     (on in `krizakaBase` / `krizakaNext`). Renames ship without backward compatibility: code, `.env.example`,
     deployment specs and secrets change in the same window.
9. **Label and plan with the shared taxonomy** — [LABELS.md](LABELS.md) (`type:*`, `priority:*`, `product:*`, `area:*`);
   every issue lives on the [Krizaka Roadmap](https://github.com/orgs/krizaka/projects/4) ([ROADMAP.md](ROADMAP.md)).
10. **Static rules & codemods — the code rules are checked by tools, and the debt only goes down.** Every repository
    carries an `AGENTS.md` section « Static rules & codemods » that says exactly what runs; the shape is the same everywhere:
   - **TypeScript** — [`@ast-grep/cli`](https://ast-grep.github.io) as a **pinned devDependency** (never a global install):
     `sgconfig.yml`, `rules/*.yml` (message + `fix:` where safe), `rule-tests/`. `scripts/sg-ratchet.mjs` counts the
     violations per rule and refuses any increase against `sg-ratchet.json` (same idea as `krizaka-ratchet`); it runs in
     `npm run lint` and so in CI. `npm run sg:ratchet:update` locks a gain; `npm run sg:fix` applies the codemods
     (hand-written time arithmetic → date-fns). The rules: no hand-written ms arithmetic, no `env` in domain code, no db
     import in a service/rules file, no TS `enum`, no string-literal comparison of an enum field, no ambient
     `new Date()`/`Date.now()` in domain code, no `types.ts` at a package root, no unjustified numeric `export const`
     (`// @fixed:`).
   - **JVM** — OpenRewrite (`rewrite-maven-plugin`, configured once in `krizaka-parent`): `./mvnw rewrite:dryRun` fails
     when a recipe would change code (CI: `rewrite: true` on the [maven workflow](.github/workflows/maven.yml)),
     `./mvnw rewrite:run` applies it. ArchUnit rules are shared in `krizaka-test-support` (`CodeRules`,
     `ArchitectureRules`: layers, no cycles, naming, configuration only in config, `@Transactional` only on services);
     what a service cannot satisfy yet is **frozen** with `FrozenRules` (`archunit_store/`, committed): a new violation
     fails, a fixed one leaves the store.
   - A rule is never skipped, weakened or deleted to get a PR green: fix the code, or (JVM) freeze the debt that exists.

By contributing you agree that your contributions are licensed under the repository's license
(Apache-2.0) and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
