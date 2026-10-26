# Repository names

Every product and shared repository has one predictable name. The name describes its owner and its role; repository
names are not changed automatically.

## Rule

Use lower-case, hyphen-separated names in the form **`<owner>-<role>`**. A product's main repository is the one
exception: it is named after the product alone, with no role suffix.

- **Owner:** `krizaka` for shared repositories, or a product name. The products in focus are `akinaza`, `orazaka` and
  `yomizaka`. `kachizaka`, `orochia`, `yasakia` and `yororis` are paused (Oussama, 2026-10-25): their repositories are
  private and no new repository is named after them.
- **Product roles:** no suffix for the main repository; `web` for the web app when the main repository is an umbrella (Orazaka); `engine` for an engine product's core library; `mobile`, `desktop` or `admin` for another app; `<name>-service`
  for a deployable backend service; `services` for the umbrella repository; `worker-<name>` for a worker; and `packs`,
  `cli`, `contracts` or `build`.
- **Shared repositories:** `krizaka-ui` (all design kits are packages there), `krizaka-ts`, `krizaka-build` (Java),
  `krizaka-com` (company site), `krizaka-blog`, `krizaka-infra` (IaC), `krizaka-motion` (motion library) and `krizaka-qa` (internal end-to-end scenarios, private); or
  `krizaka-<capability>` for a shared service. The current capabilities are `accounts`, `billing`, `notifications`,
  `users`, `platform` (the Java cross-cutting blocks) and `desktop` (the shared Tauri crate).
- **Templates:** `template-<stack>-app`.

This is a closed role vocabulary. A new product or shared capability must be added to this standard and the name checker
before its repository name is considered compliant.

Never use `client`, `web-client`, `design-system` or `kit` in a repository name. A product's design kit is a package in
`krizaka-ui`, not a separate repository.

## Current repository names

Inventory as of 2026-10-23. It covers the 44 product and shared repositories; `.github` is the reserved organization
profile repository and is outside this naming rule. **Rename** and **Fold** are decided (Oussama, 2026-10-23) and are carried out in the order below. `To decide` marks a name whose current
shape fits, but whose role needs discussion.

| Repository | Current role | Status |
| :--- | :--- | :--- |
| `akinaza` | Main product repository | Complies |
| `kachizaka` | Main product repository | **Paused** (2026-10-25), private |
| `krizaka-accounts` | Shared capability service | Complies |
| `krizaka-billing` | Shared capability service | Complies |
| `krizaka-blog` | Shared blog | Complies |
| `krizaka-build` | Shared Java build | Complies |
| `krizaka-com` | Shared company site | Complies |
| `krizaka-infra` | Shared infrastructure as code | Complies |
| `krizaka-motion` | Shared motion library | Complies |
| `krizaka-qa` | Internal end-to-end scenarios (private) | Complies |
| `krizaka-notifications` | Shared capability service | Complies |
| `krizaka-platform-kit` | Java cross-cutting blocks | **Rename → `krizaka-platform`** |
| `krizaka-tauri-kit` | Shared Tauri crate | **Rename → `krizaka-desktop`** |
| `krizaka-ts` | Shared TypeScript building blocks | Complies |
| `krizaka-ui` | Shared design system | Complies |
| `krizaka-users` | Shared capability service | Complies |
| `orazaka` | Main product repository | Complies |
| `orazaka-ai-engine` | The engine's core library | **Rename → `orazaka-engine`** |
| `orazaka-automation-service` | Deployable backend service | Complies |
| `orazaka-build` | Product build repository | Complies |
| `orazaka-cli` | CLI | Complies |
| `orazaka-contracts` | Contracts | Complies |
| `orazaka-conversation-service` | Deployable backend service | Complies |
| `orazaka-edge` | The HTTP edge service | **Rename → `orazaka-edge-service`** |
| `orazaka-job-service` | Deployable backend service | Complies |
| `orazaka-knowledge-service` | Deployable backend service | Complies |
| `orazaka-mobile-client` | Mobile app | **Rename → `orazaka-mobile`** |
| `orazaka-packs` | Packs | Complies |
| `orazaka-studio` | The Studio service (with its API and client modules) | **Rename → `orazaka-studio-service`** |
| `orazaka-ui-kit` | Orazaka's UI packages | **Fold into `krizaka-ui`**, then archive |
| `orazaka-web-admin` | Former admin console, merged into `orazaka-web-client` (served on admin.orazaka.com by host routing) | **Archive** |
| `orazaka-web-client` | Web app | **Rename → `orazaka-web`** |
| `orazaka-worker-media` | Worker | Complies |
| `orochia` | Main product repository | **Paused** (2026-10-25), private |
| `orochia-admin` | Former admin console, merged into `orochia` (served on admin.orochia.com, `apps/web/app/console`) | **Archive** |
| `orochia-design-system` | Orochia's design packages | **Paused** (2026-10-25), private |
| `orochia-mobile` | Mobile app | **Paused** (2026-10-25), private |
| `template-expo-app` | Template | Complies |
| `template-next-app` | Template | Complies |
| `template-tauri-app` | Template | Complies |
| `yasakia` | Main product repository | **Paused** (2026-10-25), private |
| `yasakia-mobile` | Mobile app | **Paused** (2026-10-25), private |
| `yomizaka` | Main product repository | Complies |
| `yororis` | Main product repository | **Paused** (2026-10-25), private |
| `yororis-mobile` | Mobile app | **Paused** (2026-10-25), private |

## Check

The weekly **Repository names** workflow reports names outside the rule in its job summary. It is read-only: it does not
rename repositories or open issues. The checker and its unit tests are in `scripts/repository-names.mjs` and
`scripts/repository-names.test.mjs`.

## Decided renames (Oussama, 2026-10-23)

Renames run one at a time, by the orchestrator, when no agent run is open on the repository. GitHub redirects the old
name for git and the API, but everything that **names** the repository is updated in the same change:

1. `orazaka.workspace.json` (name and path), and every `component.yml` caller and `copilot-setup-steps` input.
2. Package `repository` fields, README links and badges, `AGENTS.md`, and the docs that link it.
3. krizaka.com and the blog (`lib/stack.ts`, `lib/org-data.ts`, the services map, the generated org data).
4. Deployments that build from it (DigitalOcean App Platform `source_repository`), krizaka-infra stacks, and Bunny
   prefixes that carry the name.
5. Dependabot, CodeQL and Scorecard settings that name it, and the branch protection, checked after the rename.

| Order | From | To | Risk |
| :--- | :--- | :--- | :--- |
| 1 | `krizaka-tauri-kit` | `krizaka-desktop` | low: no deployment |
| 2 | `orazaka-mobile-client` | `orazaka-mobile` | low |
| 3 | `krizaka-platform-kit` | `krizaka-platform` | medium: in the workspace, Maven artifacts unchanged |
| 4 | `orazaka-ai-engine` | `orazaka-engine` | medium: in the workspace, upstream of most services |
| 5 | `orazaka-edge` | `orazaka-edge-service` | medium: in the workspace, deployed |
| 6 | `orazaka-studio` | `orazaka-studio-service` | medium: in the workspace, deployed, many links |
| 7 | `orazaka-web-client` | `orazaka-web` | high: the public site's deployment builds from it |

Archive: `orochia-admin` (merged into `orochia`, orochia#232) and `orazaka-web-admin` (the console now lives in `orazaka-web-client`, under `src/app/console`; its last open issue moved there as orazaka-web-client#264). One app serves the site and the console: there is no separate admin repository for Orazaka.

Folds: `orazaka-ui-kit` becomes packages of `krizaka-ui` (the npm names stay), then the repository is archived. Each fold is its own issue.

A **new** repository is named by this standard before it is created; the weekly check reports any drift.
