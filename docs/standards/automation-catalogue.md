# The automation catalogue

<!-- summary: What the daily automation catalogue lists, where it is published, what each field and flag means, and how to read one repository's rows. -->

Founder, 2026-11-06 ([ADR-026](../adr/ADR-026-automation-strategy.md), [krizaka-internal#2755](https://github.com/krizaka/krizaka-internal/issues/2755)):
**one** catalogue of every automation of the org, **generated** from the code, **no file committed per repository**. It answers
« what runs, where, when, who owns it, who calls it, is it tested, can a person read it » without anyone typing a fact.

## Where it is

The daily run of the [Conformance workflow](../../.github/workflows/conformance.yml) (job « Automation catalogue », 06:00 UTC, beside
the matrix) publishes on the data branch `conformance-matrix`, under `automation/`:

| File | What |
| :-- | :-- |
| [catalogue.json](https://raw.githubusercontent.com/krizaka/.github/conformance-matrix/automation/catalogue.json) | every unit, the summary, schema `krizaka.automation/1` ([automation-catalogue.schema.json](automation-catalogue.schema.json)) |
| [catalogue.md](https://github.com/krizaka/.github/blob/conformance-matrix/automation/catalogue.md) | the same, summarised: counts, the repositories, the units behind each flag |
| [history.json](https://raw.githubusercontent.com/krizaka/.github/conformance-matrix/automation/history.json) | one line of counts per day (kept 400 days) |

The founder reads it in the cockpit, view « Automatismes »: filters by repository and kind, the flags, the counts over time.

## How it is generated

`tools/automation-catalogue/catalogue.mjs` (tests beside it, run by `automation-catalogue.yml`). For each active repository of
`repos.json` it reads the tracked files at the default branch's commit: **two requests** (the commit, one tarball), plus one for
the last workflow runs. Nothing is read file by file and nothing is paged. Then:

- **units** are found by their place: scripts in `scripts/`, `tools/`, `bin/`, hook folders and this repository's action folders;
  workflows, workflow templates and composite actions; custom npm scripts (`build`, `test`, `lint`… are standard and left out);
  hook configurations; agent hooks (`.claude/settings.json`); Dockerfile entrypoints that run a script; and, from krizaka-agents
  `tools/install.json`, the Mac's crons, machine-wide agent hooks and LaunchAgents (when the manifest lists them);
- **parsing is done by parsers**: YAML with the `yaml` package, `package.json` and settings as JSON, JavaScript and TypeScript with the
  TypeScript compiler (regex literals and `new RegExp`), Python with its own `ast`. Shell has no parser to borrow: a small
  tokenizer reads the patterns given to `grep`, `sed`, `awk`, `jq` and `=~` (a heuristic, it can miss a pattern);
- **callers** are the workflows, actions, npm scripts, hooks, crons, Makefiles, Dockerfiles, configs and other scripts whose text
  names the unit's path, or its file name as a whole word. A published bin (`package.json` `bin`) is called wherever its name is run.
  Heuristic, as the ADR says: a wrong « nothing calls it » is fixed by naming the tool in its repository's README, never by an
  exception list.

## The fields of a unit

| Field | Meaning |
| :-- | :-- |
| `repo`, `path` | where it is (`path#name` for an npm script, an agent hook or a machine entry) |
| `type` | `script`, `workflow`, `template`, `action`, `npm-script`, `hook-config`, `agent-hook`, `entrypoint`, `cron`, `launchagent` |
| `kind` | what it is for: `CI check`, `git hook`, `cron`, `dev tool`, `generator`, `deploy`, `one-off`, `agent hook`, or `library` (a script only other scripts call). Read from the name and from what calls it |
| `language` | `javascript`, `typescript`, `python`, `shell`, `yaml`, `npm`, `json`, `dockerfile` |
| `lines`, `owner` | size; the repository's team in `repos.json` (the lane for krizaka-agents) |
| `what` | the first sentence of the header |
| `header`, `manual` | a header says why and what (at least 60 letters of prose at the top); `manual` is true when it says « manual » |
| `tests` | `required` for checks, generators, deploy steps, crons and hooks; `has` when a test file has its name or names it |
| `regex` | `count`, `longest`, `over80` (patterns longer than 80 characters) and the long ones (cut at 200) |
| `calledBy` | `[{ type, by }]`: `workflow`, `action`, `npm`, `hook`, `cron`, `script`, `docker`, `config`, `make`, `agent-hook`, `event` (a workflow's trigger), `template` |
| `documented` | a README or doc names it (it can still be called by nothing) |
| `copies` | the same file in another repository: same content, or the same name and at least 80 % of the lines |
| `triggers`, `schedules`, `lastRun` | for workflows: events, cron lines, the last of the 100 latest runs (`null` when unknown) |
| `changedAt` | the day the unit's content last changed **as seen by the daily runs**: a tarball carries no history, so a unit seen for the first time has `null` and the day grows from there |
| `flags` | `nothingCalls`, `noTest`, `regexOver80`, `overSize` (a script over 400 lines), `noHeader`, `copied` |

## Reading one repository

```bash
node tools/automation-catalogue/catalogue.mjs --repo <path of a reference copy>   # that repository's rows, callers from it only
node tools/automation-catalogue/catalogue.mjs --local <folder of copies> --out out   # all repositories from local copies, no network
```

## The norms the catalogue's own code follows

One job per file, a header, at most 400 lines, a test with a failing case first, no regex over 80 characters (it has none: parsers
and word lists). Its dependencies (`typescript`, `yaml`) are pinned with a lockfile in `tools/automation-catalogue/`, as for
`tools/code-health/`.
