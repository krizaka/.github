#!/usr/bin/env bash
# strict branches (« require branches up to date ») stall an auto-merge-armed PR that falls behind main, because nothing updates it.
# Run by the sweep: for each repo, `gh pr update-branch` on every open PR with auto-merge armed that is behind. Needs GH_TOKEN (agents app).
#   scripts/update-behind-prs.sh krizaka/yomizaka krizaka/akinaza ...
set -euo pipefail
for repo in "$@"; do
  gh pr list -R "$repo" --state open --json number,autoMergeRequest,mergeStateStatus \
    --jq '.[] | select(.autoMergeRequest != null and .mergeStateStatus == "BEHIND") | .number' |
  while read -r pr; do
    echo "$repo#$pr is behind: updating its branch"
    gh pr update-branch "$pr" -R "$repo" || echo "::warning::$repo#$pr could not be updated"
  done
done
