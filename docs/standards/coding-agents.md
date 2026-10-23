# Coding agents

How GitHub coding agents (Copilot, Claude) work in the krizaka organisation. The rules are §8 of
[AGENTS.template.md](../../AGENTS.template.md); this page gives their reasons and the setup each repository owes them.

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
