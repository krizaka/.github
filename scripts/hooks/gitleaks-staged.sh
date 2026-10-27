#!/usr/bin/env bash
# pre-commit hook `krizaka-gitleaks`: scans the staged changes with the org's central config (.gitleaks.toml of
# krizaka/.github). Findings are redacted: a value is never printed.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks is not installed: brew install gitleaks (or https://github.com/gitleaks/gitleaks#installing)" >&2
  exit 1
fi
exec gitleaks git --staged --redact --no-banner --config "$here/../../actions/security-tools/gitleaks.toml" -v
