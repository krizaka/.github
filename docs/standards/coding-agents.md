# Coding agents

How GitHub coding agents (Copilot, Claude) work in the krizaka organisation. The rules are §8 of
[AGENTS.template.md](../../AGENTS.template.md); this page gives their reasons and the setup each repository owes them.

> **Copilot is no longer used (2026-10-25).** Copilot access is disabled in the organisation after a cost spike. Never assign issues or PRs to Copilot, and never mention `@copilot`. Work goes to Claude sessions. The Copilot sections below are kept as history until the `copilot-setup-steps.yml` workflows are removed.

## Why each rule exists (2026-10-23)

| Rule | What happened without it |
| :--- | :--- |
| Build before you push | orazaka-studio#73 arrived unformatted and did not compile: the agent's sandbox could not resolve the Orazaka parent POM, and it pushed anyway. |
| Say so and stop | The same PR claimed measurements it could not take. A clear « blocked » comment is worth more than a guess. |
| Hermetic tests | Five Akinaza and Yomizaka sessions were lost: a brand-icon test fetched the CDN, the sandbox has no network beyond an allowlist, the pre-push check refused the push, and the work stayed in the sandbox. |
| Never invent | A prompt generated for the legal review named repositories and government URLs that do not exist. |
| Never weaken a guard | A governance list (`GovernanceRules`, in orazaka-build) named methods the agent renamed. The fix belongs in that list, through its own PR. |
| Keep us posted | The owner follows the work from the issues, not from the agents' logs. |

## What a repository owes an agent

- **A brief in the issue body.** The agent reads the issue body, not its comments: the scope goes at the top, under
  « Scope of the agent's run ».
- **A setup that builds.** Orazaka's Java components call `krizaka/orazaka/.github/actions/copilot-workspace` from
  `.github/workflows/copilot-setup-steps.yml`. That clones the workspace, installs the upstreams and links the packs.
  A repository whose build needs more than its own checkout owes the same.
- **CI that runs on its pushes.** An agent's pushes may wait for approval. Until the setting allows them, a maintainer
  (or the krizaka-agents app) kicks the checks with an empty commit before reviewing.
- **A review.** Claude (CTO) reviews every agent PR: the build, the tests, the words, the admin side, the docs. Then
  Oussama approves and merges.

## The edit hook (ADR-015 §7)

`krizaka-edit-check` (a bin of [`@krizaka/config`](https://www.npmjs.com/package/@krizaka/config)) checks the one file
an agent just edited, from a Claude Code `PostToolUse` hook. TypeScript and JavaScript: the repository's ESLint on that
file. Java: PMD's CLI with the Krizaka rules (the PMD distribution is pinned by checksum and cached once under
`~/.cache/krizaka`; the first call installs it in the background and stays silent). It never runs Maven: a per-edit
`mvn verify` costs 30 to 60 s. Its budget is 10 s; a finding goes back to the agent on stderr with exit 2; a timeout is
silent. NullAway and ArchUnit need a compile, so they stay at pre-push and in CI.

The snippet every repository carries in `.claude/settings.json` is in [AGENTS.template.md §9](../../AGENTS.template.md).

## The model, chosen per task

| Kind of task | Model | Examples |
| :--- | :--- | :--- |
| Mechanical: one file, a clear fix, a rename, a baseline, a version bump without API change | `auto` (empty model: Haiku 5.5 is refused by the cloud agent — « ruleset violation » error on 2026-10-23) | DataTable wrap (ui#543), separator prop (ui#544), functional renames (ts#40) |
| A feature with a clear scope: a component, a CLI command, a screen, a refactor sweep, blog editing, dependency upgrades for CVEs | `claude-sonnet-5.5` | TextStyle (ui#561), KpiExplained (ui#558), `orazaka runs` (cli#90), the blog tidy (blog#103), the CVEs (build#79) |
| Judgement: ADRs, architecture, audits, security and CVEs, legal, cross-repository design | `claude-opus-5.5` | ADR-087/088, the UX audit (.github#215), Scorecard (.github#32) |
| Unsure | `auto` (the empty model) | — |

Rules:
- At most about 5 Copilot runs at a time. Opus runs count double in that budget.
- An Opus ADR, once validated, is implemented with Sonnet.
- Before a batch, check the last run log for « usage limit ».

Assign with the model: GraphQL `replaceActorsForAssignable` with `agentAssignment: { targetRepositoryId, baseRef, model }` and the header `GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection`.
