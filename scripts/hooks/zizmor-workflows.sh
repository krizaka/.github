#!/usr/bin/env bash
# pre-commit hook `krizaka-zizmor`: audits the workflows with the org's configuration. Online audits (known vulnerable
# actions, impostor commits) run when GH_TOKEN is set (`export GH_TOKEN=$(gh auth token)`); without a token zizmor
# runs the offline audits only and says so. CI runs everything with a token.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v zizmor >/dev/null 2>&1; then
  echo "zizmor is not installed: brew install zizmor" >&2
  exit 1
fi
exec zizmor --config "$here/../../actions/security-tools/zizmor.yml" --min-severity medium --no-progress "$@"
