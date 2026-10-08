<div align="center">

<img src="assets/krizaka.svg" alt="Krizaka" width="96">

# Krizaka

### Open source. Closed to compromise.

We build what others take years to get right — AI that never leaves your walls, a video platform
that pays every cent exactly once. Compliance and security aren't add-ons: they're compiled in.

[Website](https://www.krizaka.com) · [Products](https://www.krizaka.com/en/products) · [Open source](https://www.krizaka.com/en/open-source) · [Contact](https://www.krizaka.com/en/contact)

</div>

---

<table>
<tr>
<td width="50%" valign="top">

<img src="assets/orazaka-logo.svg" alt="Orazaka" width="300">

**The AI that never leaves home.**
A multimodal AI orchestration engine — chat, RAG, agents, image, audio, video — where every
request crosses a deterministic interceptor pipeline to the best local model. Law 25 and GDPR by design.

[Workspace](https://github.com/krizaka/orazaka) · [Docs](https://www.krizaka.com/en/products/orazaka) · [How it works](https://www.krizaka.com/en/products/orazaka/architecture)

</td>
<td width="50%" valign="top">

<img src="assets/orochia-logo.svg" alt="Orochia" width="96">

**Creators get paid. Every cent, exactly once.**
The creator video platform: direct-to-CDN 4K streaming, audiences the creator chooses (followers,
contacts, paid unlock, invited people and private lists), collections, gateway-confirmed payments on a
double-entry ledger, built-in 18+ compliance.

[Try it](https://dev.orochia.com) · [Repository](https://github.com/krizaka/orochia) · [Docs](https://www.krizaka.com/en/products/orochia/docs) · [Video tour](https://www.krizaka.com/en/products/orochia#tour)

</td>
</tr>
</table>

<p align="center"><img src="assets/orochia-tour.gif" alt="Orochia, recorded on the latest build" width="720"></p>

## Start here

| You want to… | Go to |
| :--- | :--- |
| **See the products** | [krizaka.com/products](https://www.krizaka.com/en/products) · Orochia running: [dev.orochia.com](https://dev.orochia.com) |
| **Run Orochia locally** | [`krizaka/orochia`](https://github.com/krizaka/orochia) — `npm run setup && npm run dev` (Node ≥ 20, Docker) |
| **Run Orazaka locally** | [`krizaka/orazaka`](https://github.com/krizaka/orazaka) — clones every component; the [`orazaka` CLI](https://github.com/krizaka/orazaka-cli) does install → start → dev |
| **Understand the architecture** | [Orazaka, interactive](https://www.krizaka.com/en/products/orazaka/architecture) · [Orochia docs](https://www.krizaka.com/en/products/orochia/docs) |
| **Contribute** | [Contributing](https://github.com/krizaka/.github/blob/main/CONTRIBUTING.md) · good first issues in each repository · [Code of conduct](https://github.com/krizaka/.github/blob/main/CODE_OF_CONDUCT.md) |
| **Report a vulnerability** | Privately — [Security policy](https://github.com/krizaka/.github/blob/main/SECURITY.md) |
| **Talk to the team** | [krizaka.com/contact](https://www.krizaka.com/en/contact) · GitHub Discussions in each product repository |

## Pick only what you need

Orazaka is one repository per component, so any application can reuse users, notifications or
billing on its own. Clone everything at once with [`krizaka/orazaka`](https://github.com/krizaka/orazaka).

| Layer | Repositories |
| :--- | :--- |
| Foundation | [`orazaka-build`](https://github.com/krizaka/orazaka-build) · [`orazaka-contracts`](https://github.com/krizaka/orazaka-contracts) · [`orazaka-edge`](https://github.com/krizaka/orazaka-edge) · [`orazaka-ui-kit`](https://github.com/krizaka/orazaka-ui-kit) |
| Domain services | [`orazaka-users`](https://github.com/krizaka/orazaka-users) · [`orazaka-notifications`](https://github.com/krizaka/orazaka-notifications) · [`orazaka-billing`](https://github.com/krizaka/orazaka-billing) |
| AI engine | [`orazaka-studio`](https://github.com/krizaka/orazaka-studio) · [`orazaka-ai-engine`](https://github.com/krizaka/orazaka-ai-engine) · [`orazaka-conversation-service`](https://github.com/krizaka/orazaka-conversation-service) · [`orazaka-job-service`](https://github.com/krizaka/orazaka-job-service) · [`orazaka-knowledge-service`](https://github.com/krizaka/orazaka-knowledge-service) · [`orazaka-automation-service`](https://github.com/krizaka/orazaka-automation-service) |
| Workers | [`orazaka-worker-media`](https://github.com/krizaka/orazaka-worker-media) |
| Applications | [`orazaka-web-client`](https://github.com/krizaka/orazaka-web-client) · [`orazaka-web-admin`](https://github.com/krizaka/orazaka-web-admin) · [`orazaka-mobile-client`](https://github.com/krizaka/orazaka-mobile-client) · [`orazaka-cli`](https://github.com/krizaka/orazaka-cli) |
| Content | [`orazaka-packs`](https://github.com/krizaka/orazaka-packs) |
| Orochia | [`orochia`](https://github.com/krizaka/orochia) · [`orochia-admin`](https://github.com/krizaka/orochia-admin) · [`orochia-design-system`](https://github.com/krizaka/orochia-design-system) |
| Shared | [`krizaka-ui`](https://github.com/krizaka/krizaka-ui) — the brand layer every product builds on |
| Site | [`krizaka-com`](https://github.com/krizaka/krizaka-com) |

## Packages on npm

Every interface is built from layers published on the public npm registry — no account or token to install,
each release built in CI with provenance.

| Package | What it is |
| :--- | :--- |
| [![@krizaka/ui](https://img.shields.io/npm/v/@krizaka/ui?label=%40krizaka%2Fui&color=3b82f6)](https://www.npmjs.com/package/@krizaka/ui) | The brand layer: animated marks of Krizaka, Orazaka and Orochia, and the Krizaka motion signature |
| [![@krizaka/orochia-design-system](https://img.shields.io/npm/v/@krizaka/orochia-design-system?label=%40krizaka%2Forochia-design-system&color=d946ef)](https://www.npmjs.com/package/@krizaka/orochia-design-system) | Orochia's kit — the components of the Orochia apps, on Tailwind CSS v4 |
| [![@krizaka/orazaka-design-system](https://img.shields.io/npm/v/@krizaka/orazaka-design-system?label=%40krizaka%2Forazaka-design-system&color=f59e0b)](https://www.npmjs.com/package/@krizaka/orazaka-design-system) | Orazaka's kit — React components, theme and icon registry of the web clients |
| [![@krizaka/orazaka-shared](https://img.shields.io/npm/v/@krizaka/orazaka-shared?label=%40krizaka%2Forazaka-shared&color=b45309)](https://www.npmjs.com/package/@krizaka/orazaka-shared) | Orazaka's contracts — TypeScript types, Zod schemas and design tokens |

[All packages →](https://www.npmjs.com/org/krizaka) · [How they fit together](https://www.krizaka.com/en/open-source#packages)

## How we work

- **One contract per product.** Every repository carries an `AGENTS.md` — the rules its code must keep
  (architecture, security, compliance) — that humans and AI agents follow alike.
- **Documentation generated from the code.** API contracts, database references and architecture maps
  are extracted from the sources and published on [krizaka.com](https://www.krizaka.com); they cannot drift.
- **Shared UI is a package, never a copy.** Brand marks, motion and each product's kit are released on npm and
  imported by the apps; a change lands in the package first.
- **Tested on every commit.** Unit, architecture (ArchUnit) and end-to-end suites run in CI; a release
  never starts on an older database schema.

Everything is **Apache-2.0**, built and tested on every commit, documented from the code.

<sub>Made in Montréal · Open by default · Sovereign by design</sub>
