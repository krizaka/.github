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
