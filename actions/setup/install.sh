#!/usr/bin/env bash
# Install a checkout's dependencies, the build pack's way (actions/setup and actions/agent-setup). Runs in the working directory.
#   STACK     node | blog | python | maven | workspace | iac
#   PM        npm | pnpm                 (node, blog)
#   INSTALL   replaces the default Node install when set
#   PY_PM     pip | uv                   (python)
#   REQUIREMENTS  newline-separated requirements files, relative to ROOT (pip)
#   EXTRA     packages installed after them (pip; word-split on purpose)
#   ROOT      the repository root
set -euo pipefail
case "$STACK" in
  node|blog)
    # From the lockfile only, and no dependency lifecycle script runs at install time. A step that must run scripts
    # (a generator, a native build) is the project's `afterBuild` (.krizaka/ci.json), or `install-command` for the caller.
    if [[ -n "${INSTALL:-}" ]]; then bash -c "$INSTALL"
    elif [[ "$PM" = pnpm ]]; then pnpm install --frozen-lockfile --ignore-scripts --prefer-offline
    else npm ci --ignore-scripts --prefer-offline --no-audit --no-fund; fi
    ;;
  python)
    if [[ "${PY_PM:-pip}" = uv ]]; then
      # `--locked` fails when uv.lock is out of date; `--no-build` refuses to run a source distribution's build backend
      # (wheels only). A project whose lock needs a source build vendors a wheel, or builds it in its `afterBuild`.
      uv sync --locked --no-build
    else
      args=()
      while IFS= read -r f; do [[ -n "$f" ]] && args+=(-r "$ROOT/$f"); done <<< "${REQUIREMENTS:-}"
      if [[ "${#args[@]}" -gt 0 ]]; then pip install "${args[@]}"; fi
      # shellcheck disable=SC2086  # packages are word-split on purpose
      if [[ -n "${EXTRA:-}" ]]; then pip install $EXTRA; fi
    fi
    ;;
  maven|workspace|iac) ;; # Maven resolves while it builds; OpenTofu initialises each module in the test step.
  *) echo "::error::unknown stack '$STACK'"; exit 1 ;;
esac
