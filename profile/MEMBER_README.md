<div align="center">

<img src="assets/krizaka.svg" alt="Krizaka" width="96">

# Krizaka — Team & Contributor Cockpit

### Open source. Closed to compromise. Sovereign by design.

Welcome to the internal engineering workspace of **Krizaka**.  
This organization builds and maintains the sovereign AI orchestration platform (**Orazaka**), the creator video network (**Orochia**), and the public flagship showcase ([**krizaka.com**](https://krizaka.com)).

[Website](https://www.krizaka.com) · [Products](https://www.krizaka.com/en/products) · [Story](https://www.krizaka.com/en/story) · [Open source](https://www.krizaka.com/en/open-source) · [npm Packages](https://www.npmjs.com/org/krizaka)

</div>

---

## 🏛️ Ecosystem Overview & Primary Repositories

| Product / Workspace | Repository | Purpose & Stack | Governance |
| :--- | :--- | :--- | :--- |
| **Krizaka Platform** | [`krizaka/krizaka-com`](https://github.com/krizaka/krizaka-com) | Flagship Next.js 16 (App Router), dual-theme tokens, 3D WebGL scenes, full i18n | [`AGENTS.md`](https://github.com/krizaka/krizaka-com/blob/main/AGENTS.md) |
| **Orazaka Workspace** | [`krizaka/orazaka`](https://github.com/krizaka/orazaka) | Sovereign AI orchestration platform, local inference, multi-agent pipelines | [`AGENTS.md`](https://github.com/krizaka/orazaka/blob/main/AGENTS.md) |
| **Orochia Platform** | [`krizaka/orochia`](https://github.com/krizaka/orochia) | 4K creator video streaming, live auctions, signed playback, double-entry ledger | [`AGENTS.md`](https://github.com/krizaka/orochia/blob/main/AGENTS.md) |
| **Orochia Operator** | [`krizaka/orochia-admin`](https://github.com/krizaka/orochia-admin) | Back-office management, moderation, compliance verification & audits | Internal |
| **Brand & Motion** | [`krizaka/krizaka-ui`](https://github.com/krizaka/krizaka-ui) | `@krizaka/ui` — Canonical animated marks and motion tokens | Npm release |

---

## 📦 Core NPM Packages

Every application consumes shared design systems and typed schemas published on npm:

| Package | Version & Link | Role |
| :--- | :--- | :--- |
| **Brand Layer** | [![@krizaka/ui](https://img.shields.io/npm/v/@krizaka/ui?color=3b82f6)](https://www.npmjs.com/package/@krizaka/ui) | Brand marks (`KrizakaLogo`, `OrazakaLogo`, `OrochiaLogo`) & motion curve tokens |
| **Orochia Design System** | [![@krizaka/orochia-design-system](https://img.shields.io/npm/v/@krizaka/orochia-design-system?color=d946ef)](https://www.npmjs.com/package/@krizaka/orochia-design-system) | Tailwind CSS v4 components for creator streaming, reels, auctions and studio |
| **Orazaka Design System** | [![@krizaka/orazaka-design-system](https://img.shields.io/npm/v/@krizaka/orazaka-design-system?color=f59e0b)](https://www.npmjs.com/package/@krizaka/orazaka-design-system) | React components, theme tokens, and cognitive pipeline widgets |
| **Orazaka Shared** | [![@krizaka/orazaka-shared](https://img.shields.io/npm/v/@krizaka/orazaka-shared?color=b45309)](https://www.npmjs.com/package/@krizaka/orazaka-shared) | TypeScript contracts, Zod schemas, error models, and cognitive message frames |

---

## ⚔️ Engineering Principles & Governance

All contributors and AI pairing agents strictly adhere to the contracts codified in each repository:

1. **Read-Side Principle**: Architecture documents and schemas are **generated** from code (e.g. `orazaka docs sync`). Never hand-edit files under `app/data/` or `orazaka-content/`.
2. **Strict i18n Parity**: Zero hardcoded strings in components. Text lives in `messages/en.json` and `messages/fr.json`, validated by CI (`check-messages.mjs` / `check-i18n.mjs`).
3. **First-Class Theming**: Both dark (`:root`) and light (`html.light`) themes are mandatory. Never hardcode hex colors; always use `var(--kz-*)` design tokens.
4. **Reduced Motion Safe**: All 3D scenes, particle simulations, and CSS animations must respect `prefers-reduced-motion: reduce`.
5. **Double-Entry Financial Guarantees**: Every creator tip, auction escrow bid, and unlock is recorded on an immutable ledger. Zero phantom balances.

---

## 🌐 Staging & Live Endpoints

- **Krizaka Main Site**: [https://www.krizaka.com](https://www.krizaka.com)
- **Orochia Creator Staging**: [https://dev.orochia.com](https://dev.orochia.com)
- **GitHub Discussions**: Enabled on each product repository for architectural proposals and RFCs.
- **Security Inquiries**: Privately reported via [SECURITY.md](https://github.com/krizaka/.github/blob/main/SECURITY.md).

<sub>Made in Montréal · Krizaka Engineering · Apache-2.0</sub>
