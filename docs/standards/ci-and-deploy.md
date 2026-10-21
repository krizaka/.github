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
| `container` | (node, optional) `docker build` with the layer cache, then a repository smoke script against the image. |
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

## Rolling out

Phase 1 piloted both on `krizaka-com`, `orazaka-knowledge-service` and `akinaza`; the rollout list for the other repositories is in the epic.
