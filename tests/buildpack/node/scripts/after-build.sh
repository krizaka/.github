#!/usr/bin/env bash
# Runs after the build (.krizaka/ci.json `afterBuild`): proves the script is found from the project folder and sees `env`.
set -euo pipefail
[[ -d dist ]]
[[ "${FIXTURE_FLAG:-}" = "on" ]]
echo "after-build ok"
