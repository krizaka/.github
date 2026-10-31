# ADR-019 — The Java building blocks are published on GitHub Packages

- Status: Accepted (decision; the roll-out is krizaka-internal#1879, one pull request per repository)
- Date: 2026-10-31
- Owner: Platform lane
- Founder's decision (2026-10-31): since 2026-10-01 Maven Central asks for the paid Publisher Pro plan for artifacts of a
  commercial nature, and the free monthly quota is far below what the building blocks need. The `com.krizaka` building
  blocks move to GitHub Packages now.

## Decision

- **Where.** `krizaka-build`, `krizaka-platform-kit`, `krizaka-users`, `krizaka-notifications` and `krizaka-billing`
  publish new versions to `https://maven.pkg.github.com/krizaka/<repository>`. Versions already on Maven Central
  (0.1.0, 0.2.0) stay there, since Central cannot remove them; nothing new is sent to Central.
- **Release.** The shared `maven.yml` publishes on a tag with the workflow's `GITHUB_TOKEN` (`packages: write`). No external
  signing secret or account token. Sources and javadoc jars and the SBOM stay part of the release.
- **Consumers.** `krizaka-parent` declares the GitHub Packages repository (server id `github`). In CI, the workflow's
  `GITHUB_TOKEN` (`packages: read`) resolves it; each package grants read access to the repositories that use it (package
  settings), and a consumer build in CI proves it by resolving the latest building block. Local development uses
  `~/.m2/settings.xml` with a `read:packages` token (documented in the READMEs). Container builds receive the token as a
  build secret and never bake it into a layer.
- **Guards.** The BOM guard (krizaka-internal#1878) reads GitHub Packages. java.krizaka.com and the READMEs say honestly
  how to consume the blocks (repository plus token).

## Consequences

- Positive: no recurring Central fee, no signing key to keep, releases need no secret beyond the workflow token.
- Cost: a read token is needed outside CI (GitHub Packages asks for authentication even for public packages), so the
  open-source promise « add one dependency » becomes « add the repository and a token ». The READMEs say it.
- Reversible: coordinates do not change, so moving back to Central only changes the repository and the release job.

## Order

`.github` at 0 open PRs (this ADR, the `maven.yml` release job) → `krizaka-build` (it holds `krizaka-parent`) →
`krizaka-platform-kit` → `krizaka-users`, `krizaka-notifications`, `krizaka-billing` → the Orazaka services. One fan-out
pull request per repository.
