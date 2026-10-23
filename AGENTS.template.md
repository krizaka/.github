# Krizaka engineering charter — AGENTS.md template

Generic rules for every Krizaka repository, for humans and AI agents. A repository's `AGENTS.md` starts with
"Inherits the Krizaka engineering charter (krizaka/.github `AGENTS.template.md`)" and adds only what is its own
(architecture, invariants, commands). It never copies this text. Rules that are already decided elsewhere are linked,
not restated: [CONTRIBUTING.md](CONTRIBUTING.md) (tests, environment-variable contexts, static rules & codemods),
[LABELS.md](LABELS.md), [ROADMAP.md](ROADMAP.md).

## 1. Principles

1. **Simplicity first.** Code reads like prose. Complexity needs a proven constraint (a measurement), not a hunch.
2. **Atomic pieces.** No monolithic function, no file that is a dumping ground for unrelated responsibilities.
3. **Do not reinvent.** Cross-cutting bricks (UI, query, auth, tokens) come from the official packages
   (`@krizaka/ui`, `@krizaka/query`, `@krizaka/tokens`). A missing generic piece is added to its package, released,
   then used — never copied locally.
4. **No ad-hoc or phantom dependencies.** Do not add a library when `@krizaka/ui` already has the primitive. Every
   package in `package.json` is imported by the source; unused ones are purged.
5. **Dev tooling stays in dev.** Diagnostic tools (e.g. TanStack Query devtools) are `devDependencies`, loaded
   dynamically and only when `NODE_ENV === "development"`.

## 2. No-Scroll rule (at most 35 lines)

A reader never scrolls to understand a function.

- A function or method has at most **35 useful lines** (comments and blank lines excluded).
- Beyond that it is split into pure helper functions, dedicated hooks (state, async flows, forms) and atomic
  sub-components (JSX).
- At most **2 levels** of nested conditionals or callbacks; use an early return or a named function beyond that.
- Enforced by lint with a ratchet (counts only go down), not by review alone.

## 3. Documentation (JSDoc / TSDoc)

Every exported class, method, function, hook and component carries a doc block: what it does, `@param`, `@returns`,
`@throws`. Undocumented exports do not pass review.

## 4. Naming

| Entity | Convention | Valid | Forbidden |
| --- | --- | --- | --- |
| Component files | PascalCase | `StudioCard.tsx` | `studio-card.tsx`, abusive `index.tsx` |
| Utility / hook files | camelCase | `useChatStream.ts`, `formatCurrency.ts` | `helpers.ts` |
| Documentation files | kebab-case | `guide-architecture-mobile.md` | `Guide_Mobile.md` |
| Business functions | verb + context | `calculateSubscriptionProrata()` | `calc()`, `run()` |
| Hooks | `use` prefix | `useAuctionBids()` | `getBids()` |
| Booleans | state verb | `isLoading`, `canSubmit` | `loading`, `flag` |
| Global constants | UPPER_SNAKE | `MAX_RETRY_ATTEMPTS` | `maxRetry` |

Named values (statuses, entry types, roles) are centralised enums: Postgres enums with the TS type derived, or
`as const` objects — not the TS `enum` keyword. Cryptic identifiers (`e`, `res`, `d`, `tmp`, `val`, `item`, `stuff`,
`info`) are forbidden, except loop indexes `i`, `j`.

## 5. Tests

- **Tests are never next to the code.** `src/` holds code only; `test/` mirrors it
  (`test/auctions/auctions.rules.test.ts`), with `test/integration/` and `test/fixtures/` — the same split as Java's
  `src/main` / `src/test`. Runner config and tsconfig paths follow.
- A fix starts with a failing test (see CONTRIBUTING).

## 6. Mobile (React Native / Expo)

- **Expo SDK 57+ with Continuous Native Generation**: no committed `ios/` or `android/`; native config lives in
  `app.json` and config plugins (list the exceptions in the repository's AGENTS.md).
- **Expo Router** (`src/app/`, typed routes) for new apps and rewrites, not hand-built imperative navigators.
- **Server state through `@krizaka/query`** (TanStack Query v5): no home-made `useApi` with `useState`/`useEffect`;
  keys via `defineKeys()` / `queryOptions()`; `bindNativeLifecycle({ appState, netInfo })`; offline persistence with
  `PersistQueryClientProvider` on MMKV/AsyncStorage; real-time through `useLiveInvalidation()`, not polling.
- **Design system**: buttons, cards, text, loaders, fields, checkboxes, badges and headers come only from
  `@krizaka/ui/native` and `@krizaka/tokens`. A missing component is built in krizaka-ui first.
- **Feature-sliced `src/`**:

```
src/
├── app/            # Expo Router routes only (light screens, <= 100 lines)
├── features/<name>/{components,hooks,queries,types}
├── components/     # shared visual components, not tied to a feature
├── core/           # config (validated env), api client, secure storage
├── i18n/           # typed translations (en.json, fr.json)
└── assets/
test/               # mirrors src/ (section 5)
```

## 7. Definition of done (AI agents and humans)

1. `typecheck` passes with 0 errors; `lint` passes with 0 new warnings (ratchets only go down).
2. `test` is green; a bug fix started with a failing test.
3. No function above 35 lines; every export documented.
4. Light and dark themes work (`useTheme()`); accessibility roles and labels are present.
5. The pull request is merged with green CI (no merge with a pending check).

## 8. Coding agents (GitHub Copilot, Claude, any agent)

The rules every agent follows on an issue, learned from the first runs (2026-10-23). The full standard and its
reasons are in [docs/standards/coding-agents.md](docs/standards/coding-agents.md).

1. **Read first.** The repository's `AGENTS.md`, then this charter. The issue's « Scope of the agent's run » is the brief.
2. **Build before you push.** Compile, format (the repository's formatter), lint and run the tests before every push.
   A pull request that was never built is not done. If your sandbox cannot build (a missing workspace, a parent
   POM, a service), **say so on the issue and in the PR, and stop**: never push code you could not compile.
3. **Keep us posted.** Comment on the issue at each milestone: your plan (what already exists, what you will change),
   the first push, tests green, and every blocker. Oussama follows the work from the issues.
4. **Tests are hermetic.** A unit test never needs the network. A check that must reach a service (a CDN manifest, a
   registry) runs in CI after the build, not in the pre-push check.
5. **Never invent.** No repository, URL, law article, price, address, figure or result that you did not read in a
   source. When you are not sure, write `TO VALIDATE` and say who should.
6. **Never weaken a guard.** A rule, a ratchet or a test is never skipped, loosened or deleted to get green. When a
   guard lives in another repository (a governance list, a shared rule), open the change there or say so on the
   issue. Do not work around it.
7. **The admin configures.** Every knob is a row the administrator edits (settings in the database), never a
   constant or an environment-only value. Words live in the message catalogues (FR and EN).
8. **One issue, one pull request.** It is small, says `Closes #<n>`, and changes nothing unrelated. No captures, logs or
   secrets are committed: captures go to Bunny, secrets stay in the environment.
