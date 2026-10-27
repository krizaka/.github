# Secrets and workflow security — caught at the earliest stage

One source (krizaka/.github), every repository consumes it ([ADR-013](../adr/README.md), issues #324 and #325).

| Stage | Secrets | Workflows |
|---|---|---|
| Developer's machine, `git commit` | pre-commit hook `krizaka-gitleaks` (staged changes) | hook `krizaka-zizmor` (workflow files) |
| Pull request CI | `security-scan.yml`, job `gitleaks` (whole history) | `security-scan.yml`, job `zizmor` |
| Push | GitHub push protection (provider patterns, plus non-provider patterns and validity checks, org setting) | – |
| Sonar | S6718 and friends, now a late net | S6505, S8543, S8234, a late net |

CI runs everything again, because hooks can be bypassed.

## Use it in a repository

1. `.github/workflows/security.yml`: a thin caller of `krizaka/.github/.github/workflows/security-scan.yml@<sha>` (`permissions: contents: read`).
2. `.pre-commit-config.yaml`: `repo: https://github.com/krizaka/.github`, `rev: <sha>`, hooks `krizaka-gitleaks` and `krizaka-zizmor`; then once `brew install pre-commit gitleaks && pre-commit install`.
3. An exception goes in **`actions/security-tools/gitleaks.toml` of krizaka/.github** (path-scoped, with its reason), never in the repository. A workflow finding is fixed, or ignored on its line with `# zizmor: ignore[audit] reason`.

## zizmor audits and the Sonar keys they replace

| zizmor audit | Sonar key |
|---|---|
| `template-injection` | S6505 (script injection) |
| `unpinned-uses`, `ref-confusion`, `impostor-commit` | S8543 (unpinned step) |
| `excessive-permissions`, `github-app`, `dangerous-triggers`, `artipacked` | S8234 (over-privileged) |
