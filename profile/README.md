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
contacts, paid unlock, invited people and private lists), video auctions and challenges — goals, dares and open
calls — paid in credits held in escrow until delivery, collections, gateway-confirmed payments on a double-entry ledger, built-in 18+ compliance.

[Try it](https://dev.orochia.com) · [Repository](https://github.com/krizaka/orochia) · [Docs](https://www.krizaka.com/en/products/orochia/docs) · [Video tour](https://www.krizaka.com/en/products/orochia#tour)

</td>
</tr>
</table>

<table>
<tr>
<td width="50%" valign="top"><img src="assets/orazaka-tour.gif" alt="Orazaka's web client: sign in, then a streamed answer from a local model"></td>
<td width="50%" valign="top"><img src="assets/orochia-tour.gif" alt="Orochia, recorded on the latest build"></td>
</tr>
<tr>
<td align="center"><sub>Orazaka — sign in, ask, the answer streams from a local model. <a href="https://www.krizaka.com/en/demos">More demos</a></sub></td>
<td align="center"><sub>Orochia — recorded on the latest build. <a href="https://dev.orochia.com">Try it</a></sub></td>
</tr>
</table>

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

Every product is built on **Krizaka building blocks** — open-source components any application can take on its own,
published on Maven Central and npm. The products consume them; they do not own them.

| Layer | Repositories |
| :--- | :--- |
| **Building blocks** (Java, `com.krizaka`) | [`krizaka-platform-kit`](https://github.com/krizaka/krizaka-platform-kit) — JWT security baseline, service tokens, idempotent messaging, outbox · [`krizaka-users`](https://github.com/krizaka/krizaka-users) — sign-up, sign-in, OAuth, profiles, API keys · [`krizaka-notifications`](https://github.com/krizaka/krizaka-notifications) — e-mail, SMS, webhooks · [`krizaka-billing`](https://github.com/krizaka/krizaka-billing) — credits, plans, metering · [`krizaka-build`](https://github.com/krizaka/krizaka-build) — parent POM, BOM, test kit |
| **Building blocks** (TypeScript, `@krizaka`) | [`krizaka-ui`](https://github.com/krizaka/krizaka-ui) — the brand layer every product builds on |
| Orazaka — foundation | [`orazaka-build`](https://github.com/krizaka/orazaka-build) · [`orazaka-contracts`](https://github.com/krizaka/orazaka-contracts) · [`orazaka-edge`](https://github.com/krizaka/orazaka-edge) · [`orazaka-ui-kit`](https://github.com/krizaka/orazaka-ui-kit) |
| Orazaka — AI engine | [`orazaka-studio`](https://github.com/krizaka/orazaka-studio) · [`orazaka-ai-engine`](https://github.com/krizaka/orazaka-ai-engine) · [`orazaka-conversation-service`](https://github.com/krizaka/orazaka-conversation-service) · [`orazaka-job-service`](https://github.com/krizaka/orazaka-job-service) · [`orazaka-knowledge-service`](https://github.com/krizaka/orazaka-knowledge-service) · [`orazaka-automation-service`](https://github.com/krizaka/orazaka-automation-service) · [`orazaka-worker-media`](https://github.com/krizaka/orazaka-worker-media) |
| Orazaka — applications | [`orazaka-web-client`](https://github.com/krizaka/orazaka-web-client) · [`orazaka-web-admin`](https://github.com/krizaka/orazaka-web-admin) · [`orazaka-mobile-client`](https://github.com/krizaka/orazaka-mobile-client) · [`orazaka-cli`](https://github.com/krizaka/orazaka-cli) · [`orazaka-packs`](https://github.com/krizaka/orazaka-packs) |
| Orochia | [`orochia`](https://github.com/krizaka/orochia) · [`orochia-admin`](https://github.com/krizaka/orochia-admin) · [`orochia-design-system`](https://github.com/krizaka/orochia-design-system) |
| Site | [`krizaka-com`](https://github.com/krizaka/krizaka-com) |

Clone the whole Orazaka platform — building blocks included — with [`krizaka/orazaka`](https://github.com/krizaka/orazaka).

## Artifacts on Maven Central

[![Maven Central](https://img.shields.io/maven-central/v/com.krizaka/krizaka-bom?label=com.krizaka%3Akrizaka-bom&color=3b82f6)](https://central.sonatype.com/artifact/com.krizaka/krizaka-bom)

Import the BOM once and every `com.krizaka` artifact resolves to one coherent release — **0.1.0 is out**, signed
(`B523D2E9DE35AE17882361BE25DF268F9213EB5D`, on keyserver.ubuntu.com).

| Artifact | What it is |
| :--- | :--- |
| `com.krizaka:krizaka-bom` | Every Krizaka artifact at one version — changes no third-party version |
| `com.krizaka:krizaka-security` | Session-JWT verification, the security baseline every filter chain starts from, `SERVICE` tokens |
| `com.krizaka:krizaka-messaging` | Message deduplication that claims atomically and releases on failure; the transactional outbox relay |
| `com.krizaka:krizaka-users-api` · `-client` · `-core` · `-persistence` | User management as a contract, a typed client, or a library |
| `com.krizaka:krizaka-notifications-api` | Request an e-mail, SMS or webhook notification |
| `com.krizaka:krizaka-billing-api` · `-client` | Credits, entitlements and metering as a contract and a typed client |
| `com.krizaka:krizaka-test-support` | ArchUnit code rules, configuration-binding checks and Testcontainers helpers |
| `com.krizaka:krizaka-parent` | The parent POM: Central metadata, Java 21 conventions, the signed release |

```xml
<dependency>
    <groupId>com.krizaka</groupId>
    <artifactId>krizaka-bom</artifactId>
    <version>0.1.0</version>
    <type>pom</type>
    <scope>import</scope>
</dependency>
```

[All artifacts →](https://central.sonatype.com/namespace/com.krizaka) · [How they fit together](https://www.krizaka.com/en/open-source#maven)

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
- **Shared code is a package, never a copy.** Security, messaging, users, notifications and billing are released on
  Maven Central; brand marks, motion and each product's kit on npm. Architecture rules fail the build on a local copy;
  a change lands in the package first.
- **Tested on every commit.** Unit, architecture (ArchUnit) and end-to-end suites run in CI; a release
  never starts on an older database schema.

Everything is **Apache-2.0**, built and tested on every commit, documented from the code.

<sub>Made in Montréal · Open by default · Sovereign by design</sub>
