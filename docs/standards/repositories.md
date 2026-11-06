# Repository names

Every product and shared repository has one predictable name. The name describes its owner and its role; repository
names are not changed automatically.

## Rule

Use lower-case, hyphen-separated names in the form **`<owner>-<role>`**. A product's main repository is the one
exception: it is named after the product alone, with no role suffix.

- **Owner:** `krizaka` for shared repositories, or a product's **commercial name**: `verikora`, `folioviv`, `sovkora`
  (the engine) and `kridoc` (in design). No code name in a repository name (founder, 2026-11-06: `yomizaka`, `akinaza`,
  `orazaka` and `kachizaka` were renamed that day). The other products left the org on 2026-10-29 (krizaka/.github#413).
- **Product roles:** no suffix for the main repository; `web` for the web app when the main repository is an umbrella (Sovkora); `engine` for an engine product's core library; `mobile`, `desktop` or `admin` for another app; `<name>-service`
  for a deployable backend service; `services` for the umbrella repository; `worker-<name>` for a worker; and `packs`,
  `cli`, `contracts` or `build`.
- **Shared repositories:** `krizaka-<thing>`, the thing being what it is for a person (never a tool word such as `kit` or
  `build`): `krizaka-ui` (all design kits are packages there), `krizaka-ts`, `krizaka-java` (Java),
  `krizaka-com` (company site), `krizaka-blog`, `krizaka-infra` (IaC), `krizaka-lab` (the family lab) (no end-to-end repository: journeys live in each product, `e2e/journeys`); or
  `krizaka-<capability>` for a shared service. The current capabilities are `desktop` (the shared Tauri crate) and
  `composer` (Krizaka Composer, the Krizaka fork of Puck published as `@krizaka/composer`: the visual page editor,
  folioviv ADR-010). Company repositories: `krizaka-agents`, `krizaka-internal`, `krizaka-restricted`,
  `krizaka-cla-signatures`, `krizaka-coming-soon`.
- **Templates:** `krizaka-template-<target>` (`web`, `desktop`).

This is a closed role vocabulary. A new product or shared capability must be added to this standard and the name checker
before its repository name is considered compliant.

Never use `client`, `web-client`, `design-system` or `kit` in a repository name. A product's design kit is a package in
`krizaka-ui`, not a separate repository.

## Current repository names

Inventory as of 2026-11-06, after the renames of that day (code names → commercial names, `krizaka-build` → `krizaka-java`,
`krizaka-tauri-kit` → `krizaka-desktop`, the templates → `krizaka-template-*`, `cla-signatures` → `krizaka-cla-signatures`).
It covers the 35 repositories; `.github` is the reserved organization profile repository and is outside this naming
rule. GitHub redirects every old name; the old → new table is `docs/standards/renames-2026-11-06.md`.

| Repository | Current role | Status |
| :--- | :--- | :--- |
| `folioviv` | Main product repository (Folioviv) | Complies |
| `kridoc` | Kridoc: product repository, a web app (www.kridoc.com) whose coming-soon page is its stable face while the product is in design; mobile and macOS apps follow | Complies |
| `krizaka-agents` | How the agents work: rules, scripts, skills (private) | Complies |
| `krizaka-blog` | Shared blog | Complies |
| `krizaka-cla-signatures` | Signatures of the CLA, written by the CLA workflow | **Paused** (data only, no code: out of the matrix) |
| `krizaka-com` | Shared company site | Complies |
| `krizaka-coming-soon` | The coming-soon pages of the products' commercial domains (www.verikora.com, www.folioviv.com, www.sovkora.com), static sites in the DigitalOcean team krizaka-prod, until each product opens there | Complies |
| `krizaka-composer` | Shared visual page editor: the Krizaka fork of Puck (`@krizaka/composer`) | Complies |
| `krizaka-desktop` | Shared Tauri crate | Complies |
| `krizaka-infra` | Shared infrastructure as code | Complies |
| `krizaka-internal` | Internal issues and notes (private) | **Paused** (issues only, no code: out of the matrix) |
| `krizaka-java` | Shared Java build | Complies |
| `krizaka-lab` | The family lab: UI, motion, Java, AI and data experiments; publishes nothing (formerly krizaka-motion) | Complies |
| `krizaka-restricted` | Restricted issues (founder and company bots only) | **Paused** (issues only, no code: out of the matrix) |
| `krizaka-template-desktop` | Template | Complies |
| `krizaka-template-web` | Template | Complies |
| `krizaka-ts` | Shared TypeScript building blocks | Complies |
| `krizaka-ui` | Shared design system | Complies |
| `sovkora` | Main product repository | Complies |
| `sovkora-automation-service` | Deployable backend service | Complies |
| `sovkora-build` | Product build repository | Complies |
| `sovkora-cli` | CLI | Complies |
| `sovkora-contracts` | Contracts | Complies |
| `sovkora-conversation-service` | Deployable backend service | Complies |
| `sovkora-edge-service` | The HTTP edge service | Complies |
| `sovkora-engine` | The engine's core library | Complies |
| `sovkora-job-service` | Deployable backend service | Complies |
| `sovkora-knowledge-service` | Deployable backend service | Complies |
| `sovkora-mobile` | Mobile app | Complies |
| `sovkora-packs` | Packs | Complies |
| `sovkora-studio-service` | The Studio service (with its API and client modules) | Complies |
| `sovkora-ui-kit` | Sovkora's UI packages | **Fold into `krizaka-ui`**, then archive |
| `sovkora-web` | Web app | Complies |
| `sovkora-worker-media` | Worker | Complies |
| `verikora` | Main product repository (Verikora) | Complies |

## Check

The weekly **Repository names** workflow reports names outside the rule in its job summary. It is read-only: it does not
rename repositories or open issues. The checker and its unit tests are in `scripts/repository-names.mjs` and
`scripts/repository-names.test.mjs`.

## Renames

The renames decided on 2026-10-23 were superseded and carried out on 2026-11-06 (CTO, founder's go): see
`docs/standards/renames-2026-11-06.md`. GitHub redirects the old names for git and the API; everything that **names** a
repository (registries, workflows, deploy specs, package `repository` fields, links) is updated to the new name.
