# Rust and Python guards (krizaka-internal#2115)

Quality is checked by tools, not by reviews. TypeScript has ESLint, ast-grep and depcruise; Java has PMD, ArchUnit and NullAway.
Rust and Python have the same kind of guards, with the same ratchet: existing debt is counted and may only go down, new code is clean,
a rule is never silenced to get green.

| | Rust (`rust-quality.yml`) | Python (`python-quality.yml`) |
| :-- | :-- | :-- |
| Format | `rustfmt --check` | `ruff format --check` |
| Lint | clippy, pedantic plus `unwrap_used`, `expect_used`, `panic` | ruff: bugbear `B`, bandit `S`, `BLE`, `T20`, `DTZ`, `TRY`, `PT`... (`docs/standards/lang/ruff.toml`) |
| Types | the compiler | pyright (`pyright-paths`, new typed code first) |
| Architecture (our ArchUnit) | module visibility; a forbidden crate edge is a `bans.deny` entry with a reason | import-linter contracts (`.importlinter`) |
| Supply chain | cargo-deny: RustSec advisories, licences, bans, sources (`docs/standards/lang/deny.toml`) | pip-audit, deptry |
| Tests | `cargo test` under `timeout` | pytest with pytest-timeout (`--timeout=120`) |
| Ratchet | `lang-ratchet.json`, counted per clippy lint | `lang-ratchet.json`, counted per ruff rule and pyright rule |

`scripts/lang-ratchet.mjs <ruff|clippy|pyright> <report> [--update]` fails when a rule is above its recorded count; `--update` lowers
counts and records a new rule at its current count, never raises one. Conformance rules: `rust-guards`, `python-guards` (`rules.json`).
A caller triggers on `pull_request`, `merge_group` and `push` so the required check reports in the queue. The shared configs are read from
krizaka/.github at `shared-ref` (default `main`): one place to edit, every repository follows.
