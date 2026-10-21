#!/usr/bin/env bash
# Runs after the build (node-ci `after-build`): proves the script is found from working-directory and sees `env`.
set -euo pipefail
test -d .next/cache
test "${FIXTURE_FLAG:-}" = "on"
echo "after-build ok (FIXTURE_FLAG=$FIXTURE_FLAG)"
