# CI and deploy — one pipeline, one tool (epic [#113](https://github.com/krizaka/.github/issues/113))

Thirty-nine repositories used to carry a near-identical CI, and each deploy lesson lived in one repository or in a rule. Two shared pieces
now hold them, released from this repository with one tag (`v1`, then `v1.x.y`). Repositories pin the **commit SHA** of a release
(`uses: krizaka/.github/.github/workflows/node-ci.yml@<sha> # v1.0.0`), as the supply-chain standard asks; Dependabot moves the pin.

## Reusable CI — `node-ci.yml`, `java-ci.yml`

A repository's `ci.yml` keeps its triggers, its `concurrency` and a read-only `permissions`, and calls the workflow:

```yaml
jobs:
  ci:
    permissions: { contents: read }
    uses: krizaka/.github/.github/workflows/node-ci.yml@<sha> # v1.0.0
    with:
      package-manager: pnpm
      typecheck-script: typecheck
```

| Job | What it does |
| :--- | :--- |
| `changes` | The [`changes.yml`](../../.github/workflows/changes.yml) gate: a docs-only change skips the heavy jobs. **Fail-open**: the heavy jobs run unless the gate answered exactly `false`. |
| `verify` | Checkout, install (npm / pnpm store cached), lint, typecheck, tests, build (`.next/cache` restored), optional PostgreSQL, optional Playwright (browsers cached), a repository script after the build. Java: JDK + `~/.m2` cache, `mvnw verify`, OpenRewrite dry run, or the Orazaka workspace flow. |
| `container` | (node, optional) `docker build`, then a repository smoke script against the image. |
| `gate` | **Always reports.** Red on a failure, a cancellation, or a heavy job skipped without the gate's `false`; green otherwise. |

Every job has a timeout, every action is pinned by SHA, the token is `contents: read`. The unit tests of the gate verdict are
`tests/ci-workflows.test.mjs`; `selftest-ci.yml` runs both workflows on the fixtures of `tests/fixtures/` and proves that a relevant
change runs the jobs and an irrelevant one skips them while the gate stays green.

**Required checks.** GitHub names a reusable workflow's checks `<caller job> / <job>`. A repository whose protection still requires `Build & Validate`
keeps that name with a three-line shim job (see the header of `node-ci.yml`); once the protection requires `ci / CI gate`, the shim goes.

**The `ignore` expression.** Keep out of it every file a test reads (a README whose env table is checked, `AGENTS.md` read by a lint, `content/`).
The default only skips the files that no test or build can read: changesets, licence and policy text, issue and PR templates.

### v1.3 — parallel, sharded, per technology (CI-CARBURE, [#113](https://github.com/krizaka/.github/issues/113))

| Workflow | For | What it adds |
| :--- | :--- | :--- |
| `node-ci.yml` | Next.js, Node, monorepos | `parallel: true`: lint, typecheck, test and build are **side by side** legs (each installs from the npm / pnpm cache) instead of one serial job. `turbo-cache: true`: `.turbo` restored and saved. `e2e-script` + `e2e-shards` (1 to 8) + `e2e-relevant`: Playwright runs as **shards in parallel**, and **only when a changed file matches `e2e-relevant`** (the UI files; a second `changes.yml` call). The gate stays one check, `ci / CI gate`. |
| `expo-ci.yml` | Expo apps | lint, typecheck and test side by side; the **EAS build exists only on a `v*` tag** and when `eas-profile` is set (official `expo/expo-github-action`, secret `EXPO_TOKEN`). |
| `mobile-e2e.yml` | Expo apps with `.maestro/` flows | Builds a self-contained x86_64 Android APK (prebuild + Gradle), boots an emulator with KVM (SHA-pinned action), installs the pinned, sha256-checked Maestro CLI and runs the flows; screenshots, screen recording and JUnit report are artifacts. `setup-command` starts a backend and seeds the demo account (persona « Eric », masked credentials). The required check is **`mobile-e2e / gate`** (caller job named `mobile-e2e`), required on main after three green runs in a row; a flaky flow is fixed or tagged `manual` with an issue, never deleted ([#241](https://github.com/krizaka/.github/issues/241)). |
| `python-ci.yml` | workers, scripts | `pip` (setup-python wheel cache) or `uv` (setup-uv cache); lint and test side by side; `pytest -n auto` (pytest-xdist). |
| `java-ci.yml` | Maven | unchanged (JDK + `~/.m2` cache, workspace flow). Parallel unit / IT jobs: [#150](https://github.com/krizaka/.github/issues/150). |

All of them: the `changes.yml` gate (fail-open), an always-reporting `gate`, `contents: read`, a timeout per job, actions pinned by SHA
(Dependabot's `github-actions` group moves the SHAs of the actions here **once**; a caller only moves the pin of this repository's release).
`concurrency` with `cancel-in-progress` on pull requests stays in the caller's `ci.yml` (a reusable workflow cannot cancel its caller's runs):

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

`paths` filters are replaced by the gate (a path filter on a required check leaves it pending forever; the gate reports « skipped » instead).

## The build pack — `krizaka-ci.yml` (v2, slice 1)

One line for a repository; the pack detects the stack and runs the right pipeline:

```yaml
jobs:
  ci:
    uses: krizaka/.github/.github/workflows/krizaka-ci.yml@v2
    secrets: inherit
```

(`v2` is cut after review. Until then, and as the supply-chain standard asks afterwards, pin the SHA: `@<sha> # v2.0.0`.)
Jobs: `detect` (the stack, a few seconds) → `changes` (the same `changes.yml` gate, fail-open, with the stack's paths) →
`verify` → `CI gate` (always reports; red when no stack is found or `.krizaka/ci.json` is invalid). The required check is
`ci / CI gate`. Inputs: `working-directory` (default `.`), `timeout-minutes` (default: the stack's).

### Detection order (`actions/detect`)

The first match wins, in the caller's checkout (`working-directory`):

| # | Stack | When | Pipeline | Timeout |
| --: | :--- | :--- | :--- | --: |
| 1 | `workspace` | The repository's name is a member of krizaka/orazaka's `orazaka.workspace.json` (read from main; unreadable is an error, never a guess). | Today's `component.yml`: the workspace cloned beside the component, `node scripts/workspace.mjs ci <component>`, then the OpenRewrite dry run only if the pom has the plugin. Nothing is published, no image is built. | 60 |
| 2 | `maven` | `pom.xml` | Java 21 (Temurin, `~/.m2` cached), Spotless check and OpenRewrite dry run (when the pom names them or inherits `krizaka-parent`/`orazaka-*`; `"rewrite": false` opts out), `mvnw`/`mvn verify`. | 45 |
| 3 | `blog` | `package.json` **and** MDX under `content/` | The Node pipeline. | 25 |
| 4 | `node` | `pnpm-workspace.yaml` or `package.json` | `node-ci.yml`'s: npm or pnpm (from the lockfile), lint, quality scripts that exist (depcruise, ast-grep, ratchets), typecheck, test, build, a container image when there is a `Dockerfile`, the after-build script; jscpd when `dup-ratchet.json` exists. | 25 |
| 5 | `python` | `pyproject.toml` | Python (uv when `uv.lock` exists, else pip), ruff when configured, `pytest -n auto` when there are tests. | 20 |
| 6 | `iac` | `*.tf` | OpenTofu `fmt -check`, `init -backend=false`, `validate`, `test`. **Never `apply`, never `plan` against real state, never a deploy**: a `run` block without `command = plan` makes `tofu test` refuse to start. | 15 |

The blog is checked **before** plain Node, not last as listed in the epic: every Krizaka blog is a Next.js app, so an
MDX `content/` folder only tells a blog apart from another Node repository; MDX alone is "no stack detected".

The steps are composite actions in [`actions/`](../../actions), so `node-ci.yml` and the pack run the same code:
`setup` (toolchains, caches, `.krizaka/ci.json` env, PostgreSQL, install), `quality`, `test`, `build` (the build script,
then a buildx image when there is a Dockerfile, layers cached, written on main only), `after-build` (Playwright browsers,
the repository's script, `CI_IMAGE` set when an image was built) and `agent-setup` (below).

### `.krizaka/ci.json` — values, never steps

Optional, in the project folder. Unknown keys are an error ("it never lists steps"); keys starting with `$` are comments.

```json
{
  "$comment": "Read by krizaka-ci.yml (docs/standards/ci-and-deploy.md).",
  "postgres": "pgvector/pgvector:pg17",
  "postgresName": "akinaza",
  "env": { "NEXT_TELEMETRY_DISABLED": "1", "AUTH_URL": "http://localhost:3000" },
  "ignore": "^docs/",
  "afterBuild": "scripts/ci-after-build.sh",
  "playwright": "chromium"
}
```

Keys: `workingDirectory`, `postgres`, `postgresName`, `env`, `ignore`, `relevant`, `afterBuild`, `playwright`, `rewrite`,
`nodeVersion`, `javaVersion`, `pythonVersion`, `timeoutMinutes`. `ignore`/`relevant` replace the stack's defaults of the
`changes` gate. An Orazaka component cannot declare `afterBuild` (component.yml has none).

### `agent-setup` — a coding agent's sandbox

`uses: krizaka/.github/actions/agent-setup@<sha>` in a repository's `copilot-setup-steps.yml`, after the checkout. It
generalises orazaka's `copilot-workspace`: for a workspace component, Java 21 + Node 22, the workspace cloned,
`node scripts/workspace.mjs upstreams <component>`, and the workspace's manifest and packs linked beside the checkout; for
the other stacks, the toolchain and the dependencies.

### Migrating a caller

1. Replace the `jobs:` of `ci.yml` with the three lines above (keep the triggers, `concurrency`, `permissions: contents: read`).
2. Move what the old inputs said into `.krizaka/ci.json` (PostgreSQL, env, after-build, ignore); drop what the pack detects
   (package manager, scripts, Java version).
3. Required checks become `ci / CI gate` (or keep a shim job until protection is switched).
4. `node-ci.yml` callers do not have to move: it keeps its inputs, jobs and check names and runs the same actions.

The pack's own action pins are `@<sha> # main`: after the merge, `node scripts/pin-supply-chain.mjs --refresh` moves them
to main's head, then `v2` is tagged.

### The registry — `repos.json`

One row per repository: `name`, `owner` (product or `krizaka`), `role` (from [repositories.md](repositories.md)), `team`
(the owner until GitHub teams exist — to validate), `kind` (`maven`, `npm`, `app`, `site`, `iac`, `python`, `rust`, `none`),
`deploy` (its apps in `deploy/apps.json`), `archived`, `visibility`, `status` (and `renameTo` / `foldInto`). Generated by
`node scripts/gen-repos.mjs` from the GitHub API, the standard and `deploy/apps.json`, never by hand; the weekly
**Repository registry** workflow runs `--check` and reports drift in its summary (read-only). Repositories the token cannot
see (private) keep what the standard says.

### Renames — `scripts/rename-repo.mjs`

`GITHUB_TOKEN=… node scripts/rename-repo.mjs <from> <to> --dry-run` checks `<from>` in the registry and `<to>` against the
naming checker, then lists every file of the org that names `<from>` (code search, whole-name matches only) and what code
search cannot see (deploy targets, settings). It changes nothing. The real mode is not written yet (TODO in the script).

## `krizaka-deploy` — `deploy/` (CLI) and `actions/deploy` (the same, as a step)

Located **here** and not in a new repository: the CI workflows and the deploy tool share one release tag and one review path; this repository
already holds the org's shared tooling and standards; a repository of 600 lines would need its own protection, CI and Dependabot for nothing.

A repository adds `.krizaka-deploy.json`:

```json
{
  "app": "akinaza-dev",
  "url": "https://dev.akinaza.com",
  "health": "/api/healthz",
  "indexing": "off",
  "spec": "deploy/digitalocean/app.yaml",
  "product": "akinaza",
  "seoFamily": { "script": "scripts/check-seo-family.mjs" }
}
```

`krizaka-deploy deploy` (locally: `node <this repo>/deploy/bin/krizaka-deploy.mjs deploy`, after `npm ci` in `deploy/`):

1. **Context.** doctl runs with `--context default` only; `DIGITALOCEAN_CONTEXT` or `--context` set to anything else is refused. It also asks `doctl account get`
   and refuses credentials that are not the `Krizaka-team` team (`KRIZAKA_DO_TEAM` overrides the name).
2. **Indexing.** `indexing` is mandatory (`on` for an indexed site, `off` for a noindex one). `APP_SEARCH_INDEXING` is asserted on the live spec, on the file with `--apply`,
   on the merged spec, and on the live spec again after the deployment is ACTIVE. A mismatch is refused. (`"indexingVariable": false` for an app that has no such switch.)
3. **Apply (opt-in, `--apply`).** The repository's spec is completed from the live app so nothing is blanked: a variable without a value keeps the live (encrypted) value; a `__NAME__`
   placeholder or a missing secret comes from `KRIZAKA_SECRET_<NAME>` (CI) or `secret.sh @<product> <NAME>` (local); a live variable the file omits would be deleted and is refused unless
   `--allow-drop KEY`. Secrets are never printed: errors name keys only.
4. **Force-rebuild.** `create-deployment --force-rebuild`, then it waits for ACTIVE (ERROR, CANCELED, SUPERSEDED and a timeout are failures). `--expect-sha` refuses a deployment that built another commit.
   (An apply alone keeps the previous image; and a Dockerfile change needs apply **then** force-rebuild.)
5. **Live checks.** The health URL, `robots.txt` (indexed: no `Disallow: /` and a Sitemap; noindex: `Disallow: /` and a noindex header or meta), and `scripts/check-seo-family.mjs` if configured.
6. **Rollback note.** The previous ACTIVE deployment id and commit, printed (and put in the job summary) before anything changes and again on any failure.

`--dry-run` reads everything (guards, live spec, the merge, the live site) and changes nothing. `krizaka-deploy check` runs only the live checks.

In CI: `uses: krizaka/.github/actions/deploy@<sha>` with `digitalocean-token` (the Krizaka team's token, a repository secret) and `contents: read`.
The unit tests (`deploy/tests`) mock doctl and HTTP and cover each guard.

## What it costs and saves (phase 1, measured)

GitHub bills **each job rounded up to a minute**, so a pipeline of small jobs costs more than its seconds. The shared pipeline has a `changes` job
(krizaka-com and the Orazaka repositories already had one), the `gate` job and, while the required checks keep their old names, one shim job per name.
Measured on the pilots, pull-request runs of `ci.yml`: **billed minutes** (sum of jobs rounded up) · **compute** (sum of job seconds) · wall clock.

| Pilot | Code PR, before | Code PR, after | Docs-only PR, before | Docs-only PR, after |
| :--- | :--- | :--- | :--- | :--- |
| orazaka-knowledge-service | 3 min · 146 s · ~190 s | 6 min · 174 s · 184 s | 3 min · ~150 s (everything ran) | 3 min · **13 s** · 19 s |
| akinaza | 5 min · 249 s · 269 s | 8 min · 282 s · 292 s (warm main push: 9 · 315 s) | 5 min · ~250 s (everything ran) | 3 min · **10 s** · 17 s |
| krizaka-com | 8 min · 352 s · 265 s (gate and `.next` cache already there) | 12 min · 452 s · 405 s (includes a check another PR added to the container smoke, +~60 s) | ~1 min · ~5 s (gate already there) | 4 min · **15 s** · 19 s |

What the numbers say, honestly:

- The **seconds** of a code PR do not fall: the Next.js build cache saves ~15–20 s and the Playwright browsers cache ~10 s; PostgreSQL in Docker and the
  gate add about as much. The big costs (tests, the browser checks after the build, the Maven build of the upstreams) are not cache problems.
- The **billed minutes** of a code PR rise by the three small jobs (`changes` where it did not exist, `gate`, one shim per required check).
- A **docs-only PR** stops building: 10–15 s of compute instead of 2.5–4.5 minutes, and a green required check at once.
- The repositories are public: nothing is charged today, but the report that counts minutes counts these.

Two follow-ups remove most of the rise: (1) require `ci / CI gate` instead of the former names and delete the shims (−1 to −2 billed minutes per PR);
(2) take the `changes` decision inside the verify job instead of in a job of its own (−1). A buildx + Actions-cache layer cache for the container job was
tried and removed: 94 s against 77 s for a plain `docker build`, and its export competes with the other caches for the repository's 10 GB.

## Findings the pilots surfaced

- A reusable workflow's **skipped** job shows its raw `name:` expression (`inputs.x`): job names are static.
- `defaults.run.working-directory` applies to the first `run` step, before the checkout: validate inputs after it.
- Repositories' own tests read `ci.yml` (`check:overflow`, `check-motion`): when a step moves to a script, the test reads the script.
- `krizaka-deploy --dry-run --apply` found real drift in `akinaza-dev` (the file lacked the `MEDIA_*` variables, a lowered connection budget and a second allowed address that the live app has): an apply of the file would have deleted or reverted them.
- doctl parses a spec as YAML 1.1, where an unquoted `off` is a boolean: the tool sends JSON.
- A flaky or externally-driven check surfaced on the way (`check-motion` once, `java-redirects` against krizaka-build's guide list, the Dev-preview evidence of `admin.orazaka.com/robots.txt`): the pilots never merged red, and each was fixed or waited for at its source.

## Rolling out

Phase 1 piloted both on `krizaka-com`, `orazaka-knowledge-service` and `akinaza`; the rollout list for the other repositories is in the epic.

## Ingress routes — never one by one (2026-10-21)

- App Platform's `ingress.rules[].match` takes `path` and `authority`, each with `prefix` **or** `exact`. **No regex** (checked 2026-10-21: absent from the app-spec reference; `doctl apps spec validate` answers `unknown field "regex"`; regex exists only in `cors`).
- So a spec keeps **one broad prefix per component** (`/`, plus one sibling-service prefix such as `/api` or `/edge`), and the fine routing — redirects, locale, which page — is done **in the app** with regex or matchers (Next.js `proxy.ts` / `next.config` `redirects` with `source` patterns, Spring path patterns), as tested code.
- `krizaka-deploy` refuses a spec with more than `MAX_PATH_RULES` (3) routing rules (those with a `component`) for one component (`assertIngressRoutes`, run by `deploy --apply`). Redirects of **retired URLs** keep their real 308 in the spec, capped at `MAX_REDIRECT_RULES` (10) per app, all listed there; more than that belongs in the app. Offline, in a repository's CI: `krizaka-deploy routes deploy/…/app.yaml`. Authority-only rules (the apex → www 308) are free.
