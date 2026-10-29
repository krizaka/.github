# ADR-015 — The « AI code » audit: measured, then enforced as build rules, one source per ecosystem, ratcheted

- **Status:** Accepted (CTO, delegated). Slices are the sub-issues of [.github#384](https://github.com/krizaka/.github/issues/384).
- **Date:** 2026-10-29
- **Builds on:** [ADR-013](ADR-013-guards-and-local-sonar.md) (local Sonar, one source per rule set, ratchets), [a bug means a missing guard](../standards/bug-means-missing-guard.md).
- **Amends:** ADR-013 §1 « ✕ Error Prone ». Error Prone comes in only as NullAway's host, with every other check of its own turned off (decision 1).

## Context

An external audit, shared by the founder on 2026-10-28, says our code shows the « AI code » syndrome:

- cascades of `if (x != null)`;
- procedural services (an anemic domain);
- `if/else` and `switch` over providers (OAuth in krizaka-users and the BFFs);
- under-use of Java 21, Spring Boot and TypeScript.

Its premise is right: agents change style only when a deterministic tool fails the build. So every requirement we keep has to become a blocking rule.

Before deciding, we measured. `tools/code-health/` runs on the main-branch checkouts of nine repositories, read-only, on 2026-10-29. The full table is in [`tools/code-health/measures/2026-10-29.md`](../../tools/code-health/measures/2026-10-29.md).

- **TypeScript:** ESLint, programmatic and type-aware, `strict` on, with the candidate rules.
- **Java:** PMD 7 complexity metrics, plus javaparser counts.

The checkouts have no `node_modules`, so the TypeScript type-aware counts are a **lower bound**.

### What the numbers say

**Null handling (right, and the biggest signal):**

| Repo | null checks | `requireNonNull` | together, per kLOC | methods with ≥ 3 null checks |
|---|---:|---:|---:|---:|
| orazaka-ai-engine | 767 | 463 | 31 | 41 |
| krizaka-users | 174 | 296 | 47 | 7 |
| orazaka-conversation-service | 188 | 133 | 34 | 12 |

- No package anywhere carries `@NullMarked`, JSpecify or any nullness annotation, so nobody can tell which checks are needed.
- Only 5 checks are provably redundant: they test an injected constructor argument or a final field of a Spring bean. For example, `IdentityReconciliationServiceImpl.java:53` reads `verifiers != null ? List.copyOf(verifiers) : List.of()` on an injected list.
- The rest are defensive because nullness is undeclared. Only a nullness checker can sort them.

**TypeScript (right, at a lower bound).** Over 229 kLOC of main code:

| Rule | Hits | Most per kLOC |
|---|---:|---|
| `no-unnecessary-condition` | 599 | yomizaka, 5.1 |
| `prefer-nullish-coalescing` | 441 | orazaka-web-client, 4.2 |
| `prefer-optional-chain` | 31 | |

**Request validation (right).** 34 of the 35 DTO `@RequestBody` parameters have no `@Valid`: krizaka-users 15, orazaka-conversation-service 19.

- krizaka-users validates by hand in record compact constructors (`OAuthRequest`), which throw a domain exception.
- Its `AuthController.java:105–121` catches `IllegalArgumentException` and answers `Map.of(ERROR_KEY, …)` instead of a `ProblemDetail`.
- krizaka-users has 0 `ProblemDetail`. orazaka-conversation-service already uses it (10).

**OAuth provider ladders (overstated for Java and `@krizaka/auth`, right for one BFF):**

- krizaka-users already applies Strategy plus IoC:
  - `OAuth2ProviderVerifier` with `supports(String)`;
  - a `List<OAuth2ProviderVerifier>` injected into `IdentityReconciliationServiceImpl.java:41`;
  - one `@Bean` per provider, switched on by configuration (`FederationConfig`).
- What is weak there is the typing, not the dispatch:
  - the provider is a `String`, matched with `equalsIgnoreCase` in a linear scan (`AbstractProviderVerifier.supports`);
  - a duplicate or unknown provider fails only at request time.
- `@krizaka/auth` (krizaka-ts) has a closed union, `FederatedProvider` (`federation.ts:8`), behind a port. There is no ladder.
- The ladder is in **orazaka-web-client**, `src/core/auth/auth-options.ts`:
  - `account.provider === "github" || account.provider === "google"` (line 100);
  - `data && data.token` / `||` chains (lines 68–79);
  - an env fallback chain, `ROUTER_URL || GATEWAY_URL || "http://localhost:8080"`.
- Reading it showed a contract defect. The OAuth just-in-time call posts `{ email, username }` to `/api/v1/auth/oauth`, but krizaka-users' `OAuthRequest` requires `provider` and `idToken`. This is folded into the TypeScript slice, failing test first.
- Across the Java repositories:
  - string or constant `if` ladders of 3 or more branches: 1 (orazaka-ai-engine);
  - string `switch` statements: 2;
  - string `switch` expressions: 7.

**Complexity (mostly overstated).** These are counts of methods or functions over the threshold.

| Repo | Java cyclomatic > 10 | Java cognitive > 15 | Java NPath > 200 |
|---|---:|---:|---:|
| krizaka-users | 3 | 0 | 0 |
| orazaka-conversation-service | 8 | 2 | 2 |
| orazaka-ai-engine | 24 | 5 | 4 |

- Java p95 cyclomatic is 4–7; PMD cognitive 15 is already in `krizaka-parent` with baselines.
- TypeScript: 560 of 21,765 functions are cyclomatic > 10, mostly JSX components, where every `&&` render counts. 75 are cognitive > 15, and all of those are frozen by the existing ratchet (`sonarjs/cognitive-complexity`, threshold 15).
- The outliers are real: krizaka-ui `data-table.tsx:563` (cognitive 137), orazaka-web-client `useChatStreamClient.ts:30` (69), orazaka-ai-engine `PublicAddresses.java:68` (NPath 2480).
- They are tens of functions, not a pattern. That is a ratchet, not a flag day.

**Spring structure (the audit is wrong here):**

| Signal | Count |
|---|---:|
| `@Autowired` fields | 0 |
| non-final service fields | 2 |
| controllers touching persistence | 1 (conversation-service) |
| `*Utils/*Helper` classes | 4, all in orazaka-ai-engine: `PipelineUtils`, `CosineSimilarityUtil`, `LocalProcessorUtil`, `SecurityContextUtil` |
| `*Manager` classes | 0 |

**Java 21 use (half right):**

- Records are used well: 402.
- Sealed types (7), pattern `switch` (8) and `instanceof` patterns (85) are rare next to them.

## Decisions

Each lever is marked ✓ adopt, ≈ adjust or ✕ reject. → gives the reason and ! the cost.

### 1. Nullness: NullAway + JSpecify (≈ adjust)

- ✓ **JSpecify `@NullMarked`, checked by NullAway at compile time, in `krizaka-parent`.**
  - Error Prone runs only as NullAway's host: `-XepDisableAllChecks -Xep:NullAway:ERROR -XepOpt:NullAway:OnlyNullMarked=true`.
  - → Null handling is the strongest measured signal (≈ 2,000 sites in 59 kLOC), and only a checker can tell a needed check from a defensive one.
  - → Spring Framework 7 / Boot 4 already publish JSpecify nullness, so the checker sees through our framework calls.
  - → Turning every other Error Prone check off keeps ADR-013's objection (overlap with PMD and SpotBugs) answered.
- ≈ **No flag day: the ratchet is the set of `@NullMarked` packages, which only grows.**
  - A package opts in through its `package-info.java`.
  - A new package must be `@NullMarked` (an ArchUnit rule, frozen for existing packages).
  - Once a package is marked, its redundant checks and `requireNonNull` go. NullAway proves which ones.
  - ! Compile time goes up by about 10–20 %.
  - ! An Error Prone bump follows each JDK bump (we are on 21 LTS).
  - ! The flags live in one profile of `krizaka-parent`, so turning it off is one property.

### 2. Strategy, Spring IoC and sealed types (≈ adjust)

- ✓ **Closed sets are types: an `enum` or a `sealed` interface with exhaustive `switch`, never a `String` compared in a ladder.**
  - Strategies are injected as `Map<Kind, Strategy>`, built once at startup, failing on a duplicate or a missing kind.
  - krizaka-users' OAuth is the first proof (slice 2).
- ✓ **Two PMD rules (XPath) in `krizaka-quality`, under the existing `pmd-baseline.properties`:**
  - an `else if` chain of 3 or more branches comparing one subject to string literals or constants;
  - a `switch` statement over a `String`.
- ✕ **A rule that « requires Strategy ».** → No tool can decide that. The measured ladders are 3 in Java, so the PMD rules above hold the line, and design review does the rest.

### 3. Value objects and Bean Validation at the boundary (✓ adopt)

- ✓ **Request bodies are records with Jakarta constraints, received with `@Valid`.**
  - An ArchUnit rule in `krizaka-test-support` enforces it, frozen at today's 34.
  - → This is the audit's strongest Java claim, confirmed: 34 of 35.
  - → Validation in compact constructors throws a domain exception that each controller maps differently.
- ✓ **One `@RestControllerAdvice` per service answers `ProblemDetail`** (`spring.mvc.problemdetails.enabled=true`).
  - Controllers do not `try/catch` to build error bodies: a PMD XPath rule, with a baseline.

### 4. Complexity limits (≈ adjust: PMD yes, Checkstyle no, ratchet not flag day)

- ✓ **PMD in `krizaka-parent` gains `CyclomaticComplexity` (method 10), `NPathComplexity` (200) and `AvoidDeeplyNestedIfStmts` (3), next to `CognitiveComplexity` 15.**
  - Existing hits are frozen in each module's `pmd-baseline.properties`: today 35 cyclomatic and 6 NPath.
- ✕ **Checkstyle.** → It duplicates PMD's metrics, and Spotless already formats. A second Java linter is a second baseline to keep.
- ✕ **ESLint `complexity` (cyclomatic) for TypeScript.** → It counts every JSX `&&` (560 hits, mostly components). Cognitive complexity (S3776, already an error at 15) measures what hurts.
- ✓ **ESLint `max-depth` 4.** → 8 hits; it is cheap.

### 5. ArchUnit rules (✓ adopt into `krizaka-test-support`, ≈ trimmed)

`krizaka-test-support` is already the shared ArchUnit artifact (ADR-013 §4); existing hits freeze through `FrozenRules`.

| Rule | Decision | Measured |
|---|---|---|
| Controllers do not touch persistence (Repository, Dao, JdbcTemplate/JdbcClient, EntityManager) | ✓ adopt | 1 |
| No class named `*Utils` / `*Helper`: a function belongs to the type it serves | ✓ adopt | 4 |
| `@RequestBody` DTOs carry `@Valid` | ✓ adopt | 34 |
| Spring beans have final instance fields (no field injection) | ✓ adopt | 2 |
| New packages are `@NullMarked` | ✓ adopt | all |
| No class named `*Manager` | ✕ reject | 0 |

- → Banning `*Manager` guards nothing, and the name is legitimate where Spring defines it (`AuthenticationManager`, `TransactionManager`).

### 6. TypeScript strict (≈ adjust: adopt the rules, ratchet them)

- ✓ **`@krizaka/config` gains a type-aware layer.**
  - The layer: `@typescript-eslint/no-unnecessary-condition`, `prefer-optional-chain`, `prefer-nullish-coalescing` and `max-depth` 4.
  - It uses `parserOptions.projectService`, and consumers turn it on with one import.
- ≈ **No flag day.** Existing hits (at least 1,071 across six repositories) freeze in `eslint-suppressions.json`, which is ESLint's bulk suppressions (ADR-013 §5); new code is strict.
  - ! Lint gets slower (type information). It runs pre-push and in CI, not on every keystroke.
- ≈ **`sonarjs/no-duplicate-string` stays off for message catalogues and tests.** → The i18n catalogues and test titles repeat by design, and a hit there is noise.
- ✓ **dependency-cruiser as it is** (pure domain, no local reimplementation of an `@krizaka/*` domain, ADR-013 §2): nothing new to decide, only adoption.

### 7. Agents: the template section and the hook (≈ adjust the hook)

- ✓ **`AGENTS.template.md` gains a short « anti-slop » section.** Each line points at the rule that enforces it:
  - no defensive null on `@NullMarked` code;
  - closed sets are types;
  - DTO + `@Valid` + `ProblemDetail`;
  - no `*Utils`;
  - `??` and `?.`;
  - the build is the judge.
- ≈ **A Claude Code `PostToolUse` hook (Edit|Write) runs a fast single-file check, never Maven.**
  - It is `krizaka-edit-check <file>`, a bin of `@krizaka/config`, called with `npx` from the repositories' `.claude/settings.json`.
  - For TypeScript, it runs ESLint on the one file with the repository's config.
  - For Java, it runs PMD's CLI on the one file with the Krizaka ruleset. The PMD distribution is pinned by checksum and cached once.
  - Its budget is 10 s. A finding goes back to the agent (exit 2). A timeout is silent.
  - → A per-edit `mvn verify` costs 30–60 s for PMD and SpotBugs alone (ADR-013) and would stall every edit.
  - → NullAway and ArchUnit need a compile, so they run at pre-push and in CI.

### 8. The ratchet (✓ adopt, with no new tool)

- ✓ **The gates are the ratchets we already have:**
  - `pmd-baseline.properties` (PMD);
  - the ArchUnit freeze store (`FrozenRules`);
  - `eslint-suppressions.json` (ESLint);
  - the set of `@NullMarked` packages.

  Each only goes down (or, for `@NullMarked`, up) and fails CI on regression.
- ✓ **`tools/code-health` is the trend, not a gate.** The 3-hour checkpoint (`checkpoint-gen.sh`) gets a « code health » section: the measure on the index checkouts and its delta against the last committed measure.

### 9. Publishing

- New versions of `krizaka-parent`, `krizaka-quality` and `krizaka-test-support` publish to Maven Central when publishing resumes on **2026-11-01**.
- Until then, the Java slice lands in krizaka-build `main`, proven by its `canary` module. The consumers adopt the released version.

## Slices (sub-issues of .github#384, in order, one session each)

1. **Java build rules** ([krizaka-build#120](https://github.com/krizaka/krizaka-build/issues/120)): krizaka-build (`krizaka-parent` NullAway profile, PMD limits and XPath rules, ArchUnit rules in `krizaka-test-support`, canary). Released 2026-11-01.
2. **krizaka-users, the first proof** ([krizaka-users#63](https://github.com/krizaka/krizaka-users/issues/63)). Adopt slice 1, then:
   - OAuth `Provider` as a closed type with a `Map<Provider, OAuth2ProviderVerifier>` registry (fail fast);
   - drop the defensive checks;
   - `OAuthRequest` with Bean Validation and `@Valid`;
   - `ProblemDetail` through the advice;
   - `@NullMarked` on the federation and application packages;
   - baselines recorded.
3. **TypeScript strict preset** ([krizaka-ts#234](https://github.com/krizaka/krizaka-ts/issues/234)) in `@krizaka/config` (krizaka-ts), with the ratchet. Adopted in yomizaka, akinaza and orazaka-web-client, plus the `auth-options.ts` contract fix (failing test first).
4. **Agents** ([.github#385](https://github.com/krizaka/.github/issues/385)): the anti-slop section in `AGENTS.template.md`, and the `krizaka-edit-check` hook with its `.claude/settings.json` snippet.
5. **Ratchet in CI and the checkpoint** ([.github#386](https://github.com/krizaka/.github/issues/386)):
   - every focus repository's CI fails on a ratchet regression (Java repositories adopt slice 1);
   - the « code health » section in `checkpoint-gen.sh`.

## Consequences

- The audit's rules become build failures, and the debt they find becomes a count that only goes down. There is no flag day, and new code is strict.
- One source per ecosystem: `@krizaka/config` (TypeScript), `krizaka-parent`, `krizaka-quality` and `krizaka-test-support` (Java), and `AGENTS.template.md` with the hook (agents).
- ADR-013's rejection of Error Prone is narrowed: it is allowed as NullAway's host, and its own checks stay off.
