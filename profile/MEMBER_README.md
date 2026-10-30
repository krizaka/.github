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
| **krizaka.com** | [`krizaka/krizaka-com`](https://github.com/krizaka/krizaka-com) | The site: products, demos, the single docs site, interactive architecture views — dark and light, English and French | [`AGENTS.md`](https://github.com/krizaka/krizaka-com/blob/main/AGENTS.md) |

Running environments: [dev.orazaka.com](https://dev.orazaka.com), [dev.yomizaka.com](https://dev.yomizaka.com),
[dev.akinaza.com](https://dev.akinaza.com) · the site at [krizaka.com](https://www.krizaka.com).

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
Prettier, `krizaka-ratchet`). Product identities: `@krizaka/orazaka-design-system`,
`@krizaka/orazaka-shared`. All on the public registry: [npmjs.com/org/krizaka](https://www.npmjs.com/org/krizaka).

## Documentation — one place

[krizaka.com/docs](https://www.krizaka.com/docs): [Orazaka](https://www.krizaka.com/docs/orazaka) ·
[UI components](https://www.krizaka.com/docs/ui) (interactive previews and
prop tables read from `@krizaka/ui`) · [Java building blocks](https://www.krizaka.com/docs/java).
Product docs are generated from the code (`orazaka docs sync`) and published
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
- **Money is a ledger.** Payments are recorded once on an append-only,
  double-entry ledger; payments are confirmed by the gateway, never by the client.
- **Demos are honest.** A credible persona with a first name (Eric for Orazaka), never an
  "admin" account; real application, real flows, figures from the data on screen.

## Where the work is tracked

One board for every repository: [**Krizaka Roadmap**](https://github.com/orgs/krizaka/projects/4) — milestones, epics,
priorities; the summary and dates are in [ROADMAP.md](https://github.com/krizaka/.github/blob/main/ROADMAP.md), the label
taxonomy in [LABELS.md](https://github.com/krizaka/.github/blob/main/LABELS.md). The former boards 1–3 (road to production per
product) are closed; their issues live here.

| View | What it holds |
| :--- | :--- |
| [Board](https://github.com/orgs/krizaka/projects/4/views/2) · [Roadmap](https://github.com/orgs/krizaka/projects/4/views/3) | Every open issue by status, and on a timeline by milestone |
| [P0 / P1](https://github.com/orgs/krizaka/projects/4/views/5) · [Epics](https://github.com/orgs/krizaka/projects/4/views/6) | What blocks a launch, and the large initiatives |
| [Orazaka](https://github.com/orgs/krizaka/projects/4/views/9) · [Krizaka](https://github.com/orgs/krizaka/projects/4/views/10) · [Site](https://github.com/orgs/krizaka/projects/4/views/11) | One product at a time |
| [Oussama's actions](https://github.com/orgs/krizaka/projects/4/views/4) | `owner:oussama` — accounts, money, DNS: what only the owner can do |

## Funding and sponsorship

- Every repository without a `FUNDING.yml` of its own uses the organisation default
  ([`.github/FUNDING.yml`](https://github.com/krizaka/.github/blob/main/.github/FUNDING.yml)): GitHub Sponsors and the
  contact form (topic *partnership*, source *sponsor*).
- GitHub Sponsors for the organisation — enrolment, profile and proposed tiers: [.github#27](https://github.com/krizaka/.github/issues/27).
  Until it is live, the public README promises nothing beyond "write to us".
- Security tooling still to roll out (private reporting everywhere, secret scanning, CodeQL, OpenSSF Scorecard):
  [.github#28](https://github.com/krizaka/.github/issues/28).

## Useful links

- [Contributing](https://github.com/krizaka/.github/blob/main/CONTRIBUTING.md) · [Code of conduct](https://github.com/krizaka/.github/blob/main/CODE_OF_CONDUCT.md) · [Support](https://github.com/krizaka/.github/blob/main/SUPPORT.md)
- [Security policy](https://github.com/krizaka/.github/blob/main/SECURITY.md) — vulnerabilities are reported privately, never in an issue
- Contracts: [krizaka-com](https://github.com/krizaka/krizaka-com/blob/main/AGENTS.md) · [orazaka](https://github.com/krizaka/orazaka/blob/main/AGENTS.md) · [krizaka-ui](https://github.com/krizaka/krizaka-ui/blob/main/AGENTS.md)
- Run locally: Orazaka through the [`orazaka` CLI](https://github.com/krizaka/orazaka-cli)
- Support policy for the packages: [`krizaka-ui/SUPPORT.md`](https://github.com/krizaka/krizaka-ui/blob/main/SUPPORT.md) — N and N-1 supported, deprecated for a full minor before removal

<sub>Made in Montréal · Open by default · Sovereign by design · Apache-2.0</sub>
