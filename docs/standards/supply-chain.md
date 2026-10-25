# Supply chain — the Krizaka standard (OpenSSF Scorecard)

Every public repository of the org runs the [OpenSSF Scorecard](https://scorecard.dev) (`.github/workflows/scorecard.yml`, weekly and on
push to `main`, `publish_results: true`), and shows its badge. The public viewer
(`https://scorecard.dev/viewer/?uri=github.com/krizaka/<repo>`) is what search engines show for our projects, so it is kept honest and as high
as it can truthfully be. **A check is never weakened, silenced or faked to raise a score.**

Measure the whole org: `node scripts/scorecard-report.mjs > scorecard.md` (reads `api.scorecard.dev`, table repo x check).

## What every repository owes

| Check | The rule | How it is kept |
| :--- | :--- | :--- |
| Pinned-Dependencies | Every `uses:` by full commit SHA with a `# <tag>` comment; every Docker `FROM` by digest. | `node scripts/pin-supply-chain.mjs [dir]` (`--check` in CI, `--refresh` for first-party pins commented `# main`); Dependabot bumps the SHAs and digests. |
| Token-Permissions | Top-level `permissions: contents: read` in every workflow; write only on the job that needs it. | Reviewed per workflow. |
| Dependency-Update-Tool | `.github/dependabot.yml`: one ecosystem per manifest kind (npm, maven, pip, cargo, docker, github-actions), **monthly, one grouped PR per ecosystem, limit 1** (decision of 2026-10-13: fewer mails). Security updates arrive grouped apart. | Copy the file of a sibling repository. |
| Security-Policy | The org default `SECURITY.md` of this repository is detected on every repo (check = 10); a repository may add its own. | Nothing to do. |
| SAST | CodeQL default setup, on every repository with code. It reads 10 only once the last 30 commits all went through a CodeQL-checked PR: it climbs by itself. | Nothing to do. |
| License | `LICENSE` (Apache-2.0, SPDX-detected) in every repository. | Nothing to do. |
| Vulnerabilities | No known OSV advisory on a dependency in a lockfile. | Dependabot security updates; for a transitive dependency without a bump, a pinned override (`pnpm.overrides` / `overrides` / constraint) with the advisory in the commit. |
| Branch-Protection | `main`: PR required, required status checks, administrators included, **linear history, conversation resolution, no force push, no deletion**. | Same on all repositories (checked by `gh api repos/krizaka/<repo>/branches/main/protection`). |

Pinning our own reusable workflows (`krizaka/orazaka/.github/workflows/component.yml`, `krizaka/.github/.github/workflows/maven.yml`) by SHA is
what Scorecard asks for, and it has a price: a change of the shared pipeline reaches a repository when its pin moves. Dependabot follows tags only,
so those pins are refreshed with `node scripts/pin-supply-chain.mjs --refresh` (one PR per repository, or a loop) after a pipeline change.

## What cannot reach 10, and why

- **Code-Review** (0) counts the last 30 changesets that were approved by someone other than their author. Krizaka has one maintainer: nobody can
  review Oussama's PRs. We do **not** self-approve through a second account that is the same person, nor a bot that approves on green CI — that would
  satisfy the number and not the intent. Real options, in order of honesty:
  1. **A second maintainer** (a person, or a machine account Oussama controls but that does the review work: a real read of the diff) with
     write access, then *Require 1 approval* on `main`. Scorecard then counts their approvals and Branch-Protection climbs.
  2. **A review GitHub App** that runs a reviewer (an AI code review such as Claude's `/code-review`, or CodeRabbit) and posts a formal *Approve* only
     when its review finds nothing blocking. Scorecard counts it as a reviewer; whether it is a *review* is a judgement the repository owner makes
     and states in `CONTRIBUTING.md`.
  3. Stay as is and document it (this page). Never enable *Require approvals* without 1 or 2: with one maintainer it blocks every merge.
- **Branch-Protection** (3) is capped for the same reason (the higher tiers need required reviewers), and the Scorecard Action's default token cannot
  read the "PR required" rules (the viewer says "PRs are not required ... or we don't have data"). A fine-grained token with *Administration: read*
  stored as the secret `SCORECARD_TOKEN` and passed as `repo_token:` lets the Action see the real settings (an `oussama-action`: a token is a secret).
- **Maintained** (0) needs the repository to be older than 90 days; it rises by itself with age and activity. Nothing to fake.
- **Contributors** (0) counts contributing organisations. Nothing to fake.
- **CII-Best-Practices** (0) needs a project registered at <https://www.bestpractices.dev> by a signed-in maintainer (GitHub login). Done by
  Oussama for `orazaka` and `krizaka-ui`; the answers come from this page, `CONTRIBUTING.md`, `SECURITY.md` and the CI.
- **Fuzzing** (0): not applicable to most of our code (Spring services, UI). Skipped on purpose; a property-based test is added where it is cheap
  (parsers, the pack catalogue), and Scorecard only recognises OSS-Fuzz, ClusterFuzzLite, Go native fuzzing, fast-check and similar.
- **Signed-Releases** and **Packaging** (-1 = not applicable) appear when a repository publishes releases / packages through a workflow Scorecard
  recognises. npm: see below. Maven Central is frozen until November (free quota used); when it resumes, `maven.yml` already signs every artifact with
  OpenPGP, and a release carries the signatures.

## npm provenance and trusted publishing (steps for Oussama)

`krizaka-ui`'s `release.yml` already publishes with `NPM_CONFIG_PROVENANCE=true` from Actions (OIDC), but npm refuses the publish until each
package trusts the workflow, which needs the 2FA-protected settings page. Per `@krizaka/*` package (about 20, one minute each):

1. npmjs.com > the package > *Settings* > *Trusted Publisher* > *GitHub Actions*.
2. Organization `krizaka`, repository `krizaka-ui`, workflow filename `release.yml`, environment empty. Save (2FA code).
3. Optionally *Publishing access* > *Require two-factor authentication and disallow tokens*: from then on only the workflow publishes.
4. Re-run the workflow (`workflow_dispatch`): the version page then shows the *Provenance* badge, and the local `pnpm changeset publish` step
   of the orchestrator addendum is no longer needed.

The same for `krizaka/orochia-mobile` and every other repository that publishes to npm (`release.yml`).

## Secrets never reach a pull request

No secret on `pull_request` jobs. Signing and deploy secrets live in a protected environment (`release`), used only on `main` or tags.
A caller of a reusable workflow lists the secrets it passes by name (never `secrets: inherit`) and only from the job that runs on `push`;
the pull-request job passes none. Coding agents' PRs run CI before any human review, so a secret there is a secret handed to unreviewed code.
`tauri-macos.yml` enforces it (`sign: false` by default and refuses secrets; `sign: true` refuses anything but `push` to `main` or a tag);
`tests/tauri-macos.test.mjs` checks it.
