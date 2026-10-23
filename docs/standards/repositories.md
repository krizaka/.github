# Repository names

Every product and shared repository has one predictable name. The name describes its owner and its role; repository
names are not changed automatically.

## Rule

Use lower-case, hyphen-separated names in the form **`<owner>-<role>`**. A product's main repository is the one
exception: it is named after the product alone, with no role suffix.

- **Owner:** `krizaka` for shared repositories, or a product name. The current products are `akinaza`, `kachizaka`,
  `orazaka`, `orochia`, `yasakia`, `yomizaka` and `yororis`.
- **Product roles:** no suffix for the main repository; `mobile`, `desktop` or `admin` for another app; `<name>-service`
  for a deployable backend service; `services` for the umbrella repository; `worker-<name>` for a worker; and `packs`,
  `cli`, `contracts` or `build`.
- **Shared repositories:** `krizaka-ui` (all design kits are packages there), `krizaka-ts`, `krizaka-build` (Java),
  `krizaka-com` (company site), `krizaka-blog`, `krizaka-infra` (IaC), `krizaka-motion` (motion library) and `krizaka-qa` (internal end-to-end scenarios, private); or
  `krizaka-<capability>` for a shared service. The current capabilities are `accounts`, `billing`, `notifications` and
  `users`.
- **Templates:** `template-<stack>-app`.

This is a closed role vocabulary. A new product or shared capability must be added to this standard and the name checker
before its repository name is considered compliant.

Never use `client`, `web-client`, `design-system` or `kit` in a repository name. A product's design kit is a package in
`krizaka-ui`, not a separate repository.

## Current repository names

Inventory as of 2026-10-23. It covers the 44 product and shared repositories; `.github` is the reserved organization
profile repository and is outside this naming rule. **Breaks — to decide** means the name is outside the rule; it does
not propose a rename, archive or fold. Any such decision belongs to Oussama. `To decide` marks a name whose current
shape fits, but whose role needs discussion.

| Repository | Current role | Status |
| :--- | :--- | :--- |
| `akinaza` | Main product repository | Complies |
| `kachizaka` | Main product repository | Complies |
| `krizaka-accounts` | Shared capability service | Complies |
| `krizaka-billing` | Shared capability service | Complies |
| `krizaka-blog` | Shared blog | Complies |
| `krizaka-build` | Shared Java build | Complies |
| `krizaka-com` | Shared company site | Complies |
| `krizaka-infra` | Shared infrastructure as code | Complies |
| `krizaka-motion` | Shared motion library | Complies |
| `krizaka-qa` | Internal end-to-end scenarios (private) | Complies |
| `krizaka-notifications` | Shared capability service | Complies |
| `krizaka-platform-kit` | Contains forbidden `kit` | Breaks — to decide |
| `krizaka-tauri-kit` | Contains forbidden `kit` | Breaks — to decide |
| `krizaka-ts` | Shared TypeScript building blocks | Complies |
| `krizaka-ui` | Shared design system | Complies |
| `krizaka-users` | Shared capability service | Complies |
| `orazaka` | Main product repository | Complies |
| `orazaka-ai-engine` | Role not in the vocabulary | Breaks — to decide |
| `orazaka-automation-service` | Deployable backend service | Complies |
| `orazaka-build` | Product build repository | Complies |
| `orazaka-cli` | CLI | Complies |
| `orazaka-contracts` | Contracts | Complies |
| `orazaka-conversation-service` | Deployable backend service | Complies |
| `orazaka-edge` | Role not in the vocabulary | Breaks — to decide |
| `orazaka-job-service` | Deployable backend service | Complies |
| `orazaka-knowledge-service` | Deployable backend service | Complies |
| `orazaka-mobile-client` | Contains forbidden `client` | Breaks — to decide |
| `orazaka-packs` | Packs | Complies |
| `orazaka-studio` | Role unclear (API, client and service modules) | Breaks — to decide |
| `orazaka-ui-kit` | Contains forbidden `kit` | Breaks — to decide |
| `orazaka-web-admin` | Role not in the vocabulary | Breaks — to decide |
| `orazaka-web-client` | Contains forbidden `client` | Breaks — to decide |
| `orazaka-worker-media` | Worker | Complies |
| `orochia` | Main product repository | Complies |
| `orochia-admin` | Admin app | Complies |
| `orochia-design-system` | Contains forbidden `design-system` | Breaks — to decide |
| `orochia-mobile` | Mobile app | Complies |
| `template-expo-app` | Template | Complies |
| `template-next-app` | Template | Complies |
| `template-tauri-app` | Template | Complies |
| `yasakia` | Main product repository | Complies |
| `yasakia-mobile` | Mobile app | Complies |
| `yomizaka` | Main product repository | Complies |
| `yororis` | Main product repository | Complies |
| `yororis-mobile` | Mobile app | Complies |

## Check

The weekly **Repository names** workflow reports names outside the rule in its job summary. It is read-only: it does not
rename repositories or open issues. The checker and its unit tests are in `scripts/repository-names.mjs` and
`scripts/repository-names.test.mjs`.
