<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/krizaka-dark.svg">
  <img src="assets/krizaka-light.svg" alt="Krizaka" width="96">
</picture>

# Krizaka — for members

### Open source. Closed to compromise.

Everything a member needs to find their way: the products, the building blocks, where the docs are, how we work
and where the work is tracked. The public face of the organisation is the [profile README](README.md).

[Website](https://www.krizaka.com) · [Products](https://www.krizaka.com/en/products) · [Docs](https://www.krizaka.com/docs) · [Open source](https://www.krizaka.com/en/open-source) · [Our story](https://www.krizaka.com/en/story)

</div>

---

## Products

| Product | Workspace | What it is | Contract |
| :--- | :--- | :--- | :--- |
| **Orazaka** | [`krizaka/orazaka`](https://github.com/krizaka/orazaka) — clones every component; the [`orazaka` CLI](https://github.com/krizaka/orazaka-cli) installs, starts and seeds the demo (`orazaka demo seed`) | Multimodal AI orchestration — chat, RAG, agents, image, audio, video — on **local** models, behind a deterministic interceptor pipeline | [`AGENTS.md`](https://github.com/krizaka/orazaka/blob/main/AGENTS.md) |
| **Orochia** | [`krizaka/orochia`](https://github.com/krizaka/orochia) (web app, API, packages) · [`orochia-admin`](https://github.com/krizaka/orochia-admin) · [`orochia-design-system`](https://github.com/krizaka/orochia-design-system) · [`orochia-mobile`](https://github.com/krizaka/orochia-mobile) | The creator video platform: signed 4K streaming, Explore, stories, paid unlocks, **auctions** and **challenges** paid in credits held in escrow until delivery; creators keep **90 %**, settled once on a double-entry ledger; 18+ compliance built in | [`AGENTS.md`](https://github.com/krizaka/orochia/blob/main/AGENTS.md) |
| **krizaka.com** | [`krizaka/krizaka-com`](https://github.com/krizaka/krizaka-com) | The site: products, demos, the single docs site, interactive architecture views — dark and light, English and French | [`AGENTS.md`](https://github.com/krizaka/krizaka-com/blob/main/AGENTS.md) |

Running environments: Orochia's development deployment at [dev.orochia.com](https://dev.orochia.com) · the site at
[krizaka.com](https://www.krizaka.com). Video tours, recorded on the real applications:
[Orochia](https://www.krizaka.com/en/products/orochia#tour) · [Orazaka](https://www.krizaka.com/en/products/orazaka/demos).

## Building blocks

The products consume shared components; they never own or copy them. A change lands in the package first, is
released, then adopted.

**Java — `com.krizaka` on Maven Central.** The BOM [`com.krizaka:krizaka-bom`](https://central.sonatype.com/artifact/com.krizaka/krizaka-bom)
**0.2.0** aligns everything: the parent POM, `krizaka-web`, `krizaka-security`, `krizaka-messaging`,
`krizaka-observability`, `krizaka-test-support` and their Spring Boot starters are at 0.2.0; `krizaka-users`,
`krizaka-notifications` and `krizaka-billing` are published at **0.1.0** until their 0.2.0 (declare them with
`<version>0.1.0</version>`). Sources: [`krizaka-build`](https://github.com/krizaka/krizaka-build) ·
[`krizaka-platform-kit`](https://github.com/krizaka/krizaka-platform-kit) · [`krizaka-users`](https://github.com/krizaka/krizaka-users) ·
[`krizaka-notifications`](https://github.com/krizaka/krizaka-notifications) · [`krizaka-billing`](https://github.com/krizaka/krizaka-billing);
the release pipeline is [`maven.yml`](https://github.com/krizaka/.github/blob/main/.github/workflows/maven.yml) in this
repository (parent first, signed).

**TypeScript — `@krizaka` on npm.** From [`krizaka-ui`](https://github.com/krizaka/krizaka-ui) (Changesets releases):
`@krizaka/ui` (marks, primitives, section backdrops), `@krizaka/tokens`, `@krizaka/tailwind`, `@krizaka/icons`,
`@krizaka/intl`, `@krizaka/i18n` (with the `krizaka-i18n` catalogue checker) and `@krizaka/config` (ESLint, tsconfig,
Prettier, `krizaka-ratchet`). Product identities: `@krizaka/orochia-design-system`, `@krizaka/orazaka-design-system`,
`@krizaka/orazaka-shared`. All on the public registry: [npmjs.com/org/krizaka](https://www.npmjs.com/org/krizaka).

## Documentation — one place

[krizaka.com/docs](https://www.krizaka.com/docs): [Orazaka](https://www.krizaka.com/docs/orazaka) ·
[Orochia](https://www.krizaka.com/docs/orochia) · [UI components](https://www.krizaka.com/docs/ui) (interactive previews and
prop tables read from `@krizaka/ui`) · [Java building blocks](https://www.krizaka.com/docs/java).
Product docs are generated from the code (`orazaka docs sync`, `npm run docs:generate` in Orochia) and published
through krizaka.com's manifest — never edited by hand on the site.

## How we work

- **The contract comes first.** Every repository has an `AGENTS.md` — architecture, invariants, definition of done —
  that humans and AI agents follow alike. Read it before changing code.
- **`main` is protected everywhere.** Pull request, the required CI checks green (administrators included), squash
  merge only, [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`…).
  One change per pull request.
- **Generated is generated.** API contracts, database references, architecture data and synced docs are rebuilt from
  the sources; a CI check fails when they are stale.
- **Shared code is a package, never a copy** — Maven Central or npm, released, then adopted.
- **Interfaces:** `--kz-*` tokens only, dark and light both verified, reduced motion respected, every string in the
  message catalogues (English and French on the site); the UI debt ratchet only goes down.
- **Money is a ledger.** Tips, unlocks, auction bids and challenge pledges are recorded once on an append-only,
  double-entry ledger; payments are confirmed by the gateway, never by the client.
- **Demos are honest.** A credible persona with a first name (Eric for Orazaka; Alex and Elena for Orochia), never an
  "admin" account; real application, real flows, figures from the data on screen.

## Where the work is tracked

| Board | What it holds |
| :--- | :--- |
| [Orochia — road to production](https://github.com/orgs/krizaka/projects/1) | What stands between Orochia and its public production |
| [Orazaka — road to production](https://github.com/orgs/krizaka/projects/2) | The same for Orazaka |
| [krizaka.com — road to production](https://github.com/orgs/krizaka/projects/3) | The same for the site |

## Useful links

- [Contributing](https://github.com/krizaka/.github/blob/main/CONTRIBUTING.md) · [Code of conduct](https://github.com/krizaka/.github/blob/main/CODE_OF_CONDUCT.md) · [Support](https://github.com/krizaka/.github/blob/main/SUPPORT.md)
- [Security policy](https://github.com/krizaka/.github/blob/main/SECURITY.md) — vulnerabilities are reported privately, never in an issue
- Contracts: [krizaka-com](https://github.com/krizaka/krizaka-com/blob/main/AGENTS.md) · [orazaka](https://github.com/krizaka/orazaka/blob/main/AGENTS.md) · [orochia](https://github.com/krizaka/orochia/blob/main/AGENTS.md) · [krizaka-ui](https://github.com/krizaka/krizaka-ui/blob/main/AGENTS.md)
- Run locally: Orochia `npm run setup && npm run dev` (Node ≥ 20, Docker) · Orazaka through the [`orazaka` CLI](https://github.com/krizaka/orazaka-cli)
- Support policy for the packages: [`krizaka-ui/SUPPORT.md`](https://github.com/krizaka/krizaka-ui/blob/main/SUPPORT.md) — N and N-1 supported, deprecated for a full minor before removal

<sub>Made in Montréal · Open by default · Sovereign by design · Apache-2.0</sub>
