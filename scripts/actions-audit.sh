#!/usr/bin/env bash
# Weekly org audit of GitHub Actions (.github/workflows/actions-audit.yml). GH_TOKEN reads every repository of the org.
# For each active repository: zizmor online with the org configuration, then the pin check. Prints every finding, exits 1
# when there is one. The shallow clones live in a temp directory of the runner.
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
config="$here/../actions/security-tools/zizmor.yml"
work="$(mktemp -d)"
failed=()
mapfile -t repos < <(gh repo list krizaka --no-archived --limit 200 --json name --jq '.[].name')
[[ "${#repos[@]}" -gt 0 ]] || { echo "no repository listed: the token cannot read the org" >&2; exit 1; }
for repo in "${repos[@]}"; do
  dir="$work/$repo"
  gh repo clone "krizaka/$repo" "$dir" -- --depth 1 --quiet || { failed+=("$repo (clone)"); continue; }
  [[ -d "$dir/.github/workflows" ]] || [[ -d "$dir/.github/actions" ]] || [[ -d "$dir/actions" ]] || continue
  echo "::group::$repo"
  zizmor --config "$config" --min-severity medium --no-progress "$dir" || failed+=("$repo (zizmor)")
  node "$here/pin-supply-chain.mjs" "$dir" --no-docker --exact --check || failed+=("$repo (pins)")
  echo "::endgroup::"
done
if [[ "${#failed[@]}" -gt 0 ]]; then
  printf 'Findings in %s repositories:\n' "${#failed[@]}"
  printf -- '- %s\n' "${failed[@]}"
  exit 1
fi
echo "actions ok on ${#repos[@]} repositories"
