# {{name}} — agent contract

<!-- krizaka-agents-template v2: rendered from krizaka/.github docs/standards/agents-template.md (scripts/agents-md.mjs). The one AGENTS.md standard: six sections in this order, at most 150 lines, bullets and imperatives. The conformance check « agents-template » reads the headings, the length and CLAUDE.md. Detail goes to docs/ via References, not here. -->

## Project context

- {{purpose}}
- Kind: `{{kind}}` · team: `{{team}}` · registry entry: [repos.json](https://github.com/krizaka/.github/blob/main/repos.json).
- Read this file first, then the section of [docs/agents.md](docs/agents.md) for what you touch.
- `CLAUDE.md` is the one line `@AGENTS.md` (or a symlink to this file): never a second copy of it.

## Essential commands

{{commands}}

- Run them on what you changed before every push; CI runs the rest.

## Architecture & conventions

- Follow the [krizaka-engineering skill](https://github.com/krizaka/krizaka-skills/blob/main/skills/krizaka-engineering/SKILL.md); search its [packages reference](https://github.com/krizaka/krizaka-skills/blob/main/skills/krizaka-engineering/references/packages.md) before writing anything generic.
- Take libraries first: a size check, a date sum, a money format, a fetch, a retry, a validation regex come from `@krizaka/*`; a missing function goes into the package first, never a local copy.
- Keep ports and adapters: domain code reads no env, no ambient clock, no database client; route handlers are thin (authenticate, parse, one service call, map the result).
- Write one job per function: cognitive complexity ≤ 15, nesting ≤ 2, a body under 60 lines; the same block twice is a function.
- Put limits, prices, durations and flags in settings an administrator changes, not in constants.
- Name things by what they do (`media-store.ts`, never `postgres.ts`); no `*Utils`, `*Helper`, `*Manager`.
- Type errors with a stable code, mapped to HTTP once; user messages come from the catalogues.
- Hierarchy: this root file holds the rules of the whole repository; a sub-folder with its own rules adds a local `AGENTS.md` that says only what differs there. The nearest file wins.

## Guard-rails & known pitfalls (read before coding)

- A recurring mistake becomes one rule here, one line; its detail goes to `docs/` and is linked from References.
- The checks are the judge ([ADR-015](https://github.com/krizaka/krizaka-internal/blob/main/docs/adr/.github/ADR-015-ai-code-audit-measured-and-enforced.md), [guards](https://github.com/krizaka/.github/blob/main/docs/standards/guards.md)): never `--no-verify`, never a new `eslint-disable`, never a raised ratchet or baseline; a rule is never silenced to get green.
- Anti-slop, what a model tends to write and the code does not need:
  - No defensive null on `@NullMarked` code: no `Objects.requireNonNull` or `if (x == null)` on a value the type guarantees (NullAway); a new package is `@NullMarked` (ArchUnit).
  - A closed set is a type (enum, sealed interface, `as const` object), never a string compared by hand; strategies are a `Map<Kind, Strategy>` built once.
  - HTTP in Java is a DTO record, `@Valid` and `ProblemDetail`: no `Map.of("error", …)`, no entity in a response, one `@RestControllerAdvice` per service (ArchUnit).
  - Use `?.` and `??` in TypeScript, not a chain of `&&` or a ternary on null.
- Start a fix with a failing test; every bug gets its guard; the journey (end to end) proves the feature.
- Never invent a URL, a law article, a price or a figure you did not read; write `TO VALIDATE` and say who decides.
- Never commit a secret, a capture or a log; no production data in a session, only the dev data.
- Keep the edit hook in `.claude/settings.json`: `npx --no-install krizaka-edit-check` on `Edit|Write` (`npx --yes -p @krizaka/config krizaka-edit-check` where `@krizaka/config` is not a dependency).

## Expected validation workflow

- [ ] Compile, format, lint and test what changed (the commands above); fix the cause of a red, never the guard.
- [ ] The « before you push » checklist of the skill holds for what changed.
- [ ] A feature or fix PR names its journey (`Journey: <name>` or `Journey: n/a — <reason>`).
- [ ] README and generated docs still say what the code does; the docs map category of the change is updated.
- [ ] One issue, one small PR (`Closes #<n>`); merge only with green CI.

## References

- [docs/agents.md](docs/agents.md): this repository's own detail, read by section.
- [Org standards](https://github.com/krizaka/.github/tree/main/docs/standards) of krizaka/.github; the [engineering charter](https://github.com/krizaka/.github/blob/main/AGENTS.template.md) (naming, tests, mobile, coding agents).
- [krizaka-engineering skill](https://github.com/krizaka/krizaka-skills/blob/main/skills/krizaka-engineering/SKILL.md).
