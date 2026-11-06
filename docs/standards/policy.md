# The org policy

<!-- summary: policy.json, the one manifest of how the org runs: why it exists, each value, who reads it, how it changes, what never goes in it. -->

Founder, 2026-11-06: « une seule source de vérité, un seul manifest ». Before, one rule (the open-PR cap) had four values in
four places and five tools bypassed the check on purpose. [policy.json](../../policy.json) at the root of this repository is the
one place; every guard, cron and CI job reads it, and the cockpit shows it
([krizaka-internal#2781](https://github.com/krizaka/krizaka-internal/issues/2781)).

## The files

| File | What it is |
| :-- | :-- |
| [policy.json](../../policy.json) | the values |
| [policy.schema.json](policy.schema.json) | JSON Schema (draft 2020-12): every key described, every object closed (`additionalProperties: false`), numbers bounded, strings a constant or one of a set |
| `scripts/policy.mjs` | the Node reader (CI scripts): validates, fails closed; `node scripts/policy.mjs get train.prCapPerLane` prints one value, `check` validates the file |
| krizaka-agents `tools/policy.py` | the Python reader (the agents' tools): same schema, same verdicts, found through `~/.local/bin/kz-config policy` |

## The values (version 1)

| Key | Value | Meaning | Unit |
| :-- | :-- | :-- | :-- |
| `version` | `1` | the shape of the file; a reader refuses a version it does not know | whole number |
| `train.prCapPerLane` | `5` | the most open pull requests one lane may hold in one repository; a new pull request that would be the next one over fails the `PR cap` check | pull requests, 1 to 10 |
| `train.capScope` | `lane-per-repository` | what the cap counts: the open pull requests of one lane (its `lane:<name>` label) in one repository. A Dependabot pull request without a lane label counts in the lane `dependabot`, any other unlabelled one in the lane `unlabelled` | the only value known today |
| `train.fixMainExempt` | `true` | a `fix(main)` pull request (title `fix(main)` or label `fix-main`) is neither blocked by the cap nor counted in it, so a red main can always be repaired | true or false |

Still exempt from the check, and still counted: Dependabot security updates, the repository's one pin PR (`deps/<label>`), the
release PRs. They land the backlog, so the cap never blocks them.

## Who reads it

- CI: `scripts/pr-cap.mjs` (the `PR cap` check of every product repository, and the scheduled report that keeps the tracking issue — in krizaka/krizaka-internal, alert key `pr-cap`, never in a public repository).
- krizaka-agents tools, through `tools/policy.py`: `kz.PR_CAP` (so `pr-open`, `pr-train.sh`, `train-queue.py`, `infra-retry.py`, `watchdog.py`), `crack-metrics.py`, `lane-dispatch.py`.
- The cockpit: shows the policy and the live open-PR counts against it.

A reader that finds the file missing, not JSON, with an unknown key, a wrong type or a value out of bounds **stops with a message
that names the problem**. It never falls back to a default and never guesses.

## How to change it

1. Open an issue in krizaka-internal saying which value moves and why.
2. A pull request changes `policy.json` (and the schema and this page when a key is added or its meaning moves). `CODEOWNERS`
   asks the founder's review for `policy.json` and `policy.schema.json`.
3. After the merge, the 15-minute pull refreshes the reference copy of this repository, so the agents' tools read the new value;
   CI reads it from the branch it checks out. The cockpit shows the new value.

A new key needs its schema entry first (description with the unit and who reads it, bounds or a set), the test of
`tests/policy.test.mjs` that keeps the schema closed, and a line in the table above.

## What never goes in it

- **Secrets**: no key, token, password. A test fails when a key is named like one (`secret`, `token`, `key`, `password`, `url`).
- **Machine paths and addresses**: those are the local, never committed `krizaka.config.json`, which only points here (its key `policy`).
- **Product display data** (names, status, footer): the app admin settings in the database, not the org policy.
- **Public discovery data** (API URLs, app versions): the org JSON.
- **Free text**: a string value is a constant or one of a fixed set, so the file cannot carry a payload.
- **Kill switches**: they stay local.

## Open next steps (same epic)

Apps and lanes, sessions (models, caps, budgets) and the freeze as data move into this file one step at a time, each with its
schema entry and its docs.
