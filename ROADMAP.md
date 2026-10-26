# Krizaka roadmap

> The live roadmap is the GitHub project **[Krizaka Roadmap](https://github.com/orgs/krizaka/projects/4)** — every issue of
> every repository, with its status, priority, product, milestone and target date. This page explains it and is
> refreshed at each weekly review; when the two disagree, the project wins.

_Last reviewed: 2026-10-25._

## Vision

Krizaka builds **open-source building blocks** (`@krizaka/*` on npm, `com.krizaka` on Maven Central) and the products
that consume them. The products in focus are **Yomizaka**, rental verification (the lease read rule by rule, the
application screened), **Akinaza**, bookings, invoices and the books of independent shops, and **Orazaka**, sovereign
AI that runs on your own machines and powers both. In that order:

1. Yomizaka's B2B verification and screening (P0),
2. Akinaza's shop (P1),
3. the Orazaka adjustments they need (P2),

with the company and its accounts in order (M0), a public launch (M2) and Orazaka out of its local phase (M3), while the
platform keeps shipping — Krizaka UI, the Java and TypeScript building blocks from CI.

**Paused** (Oussama, 2026-10-25): Orochia, Yasakia, Yororis and Kachizaka. Their environments are deleted and their
repositories are private; their milestones are closed.

## Milestones

| Milestone | Target | What "done" means | Epic |
| :--- | :--- | :--- | :--- |
| **M0 · Société & comptes** | 2026-11-30 | Registration numbers, bank, verified domain, public address, npm / Renovate set up, site legal pages | [.github#24](https://github.com/krizaka/.github/issues/24) |
| **Novembre · Maven 0.2.0** | 2026-11-20 | krizaka-build 0.3.0, then users / notifications / billing 0.2.0, published from CI | [krizaka-build#16](https://github.com/krizaka/krizaka-build/issues/16) |
| **Krizaka UI · W1–W5** | 2026-12-18 | Signature components, effects, `@krizaka/charts`, blocks, adopted by every product | [krizaka-ui#49](https://github.com/krizaka/krizaka-ui/issues/49) |
| **M2 · Lancement public & marketing** | 2027-02-26 | Three blogs live, Product Hunt / Show HN, campaign running with analytics | [krizaka-com#55](https://github.com/krizaka/krizaka-com/issues/55) |
| **M3 · Orazaka hors phase locale** | 2027-03-31 | GPU target decided (ADR), staging and production from code, secrets, images, observability, billing | [orazaka#30](https://github.com/krizaka/orazaka/issues/30) |

Dates are targets, not promises. They assume the company's registration and bank account arrive in November, merchant
underwriting takes four to six weeks after that.

## Now, next, done

**In progress**

- Krizaka UI: layouts and templates, the signature visual, mascot states ([#100](https://github.com/krizaka/krizaka-ui/issues/100), [#101](https://github.com/krizaka/krizaka-ui/issues/101), [#102](https://github.com/krizaka/krizaka-ui/issues/102)); our story ([krizaka-com#92](https://github.com/krizaka/krizaka-com/issues/92))

**Next**

- Company and accounts (M0): registration, bank, verified domain, contact address, npm trusted publishing, Renovate
- Mobile: Apple activation → EAS → TestFlight, push keys
- November Java releases from CI (token, organisation secrets, then the tags)

**Recently done** (October 2026)

- Yasakia announced: its brand in `@krizaka/ui`, a coming-soon page on krizaka.com, its two repositories
- `@krizaka/realtime` and `@krizaka/push` extracted from Orochia, `@krizaka/fonts`, `@krizaka/ui` 2.8
- Orochia: creator onboarding that follows who is looking, error pages, connection budget
- `@krizaka/ui` 2.0.0 stable, `@krizaka/icons`, `@krizaka/i18n`, `@krizaka/intl`; every product on the shared primitives
- One brand identity: Krizaka blue, Orazaka orange, Orochia violet → magenta
- krizaka.com/docs: one documentation, component docs generated from the code
- Maven Central 0.2.0: build, BOM, platform kit and the four Spring Boot starters
- Orochia: a home that sells, Explore phase 0, the complete story viewer, configurable e-mail templates
- Orazaka: home and feature pages, Eric's demo recorded on the real app

## How we plan

- **Everything is an issue**, labelled with the [shared taxonomy](LABELS.md) (`type:*`, `priority:*`, `product:*`,
  `area:*`, `owner:oussama`, `status:blocked`), and added to the project.
- **Large work is an epic** (`type:epic`) whose pieces are GitHub sub-issues — the progress bar is the status. One epic per
  product (each carries its **Dev preview** gaps as sub-issues, north star of the roadmap) and per org-wide stream (Krizaka UI,
  site and blog, Infra and costs, Security, Company, Krizaka Java). Ideas not started live in the product's « queued » and
  « parked » epics, so a product epic's percentage counts committed work only.
- **Milestones carry the dates**; the same milestone exists in each repository it spans.
- **Manual actions** — accounts, payments, DNS, Apple, Bunny, npm 2FA, legal — are issues labelled `oussama-action`
  (and `owner:oussama`) and assigned to Oussama, so the view *Actions d’Oussama* is the founder's to-do list and nothing waits silently.
- **Status stays true on its own**: `scripts/roadmap-sync.mjs` (workflow *Roadmap sync*, daily) moves an item to *Done* when its
  issue is closed, to *In review* when an open pull request closes it, to *In progress* for a draft, and adds every new
  open issue of the org to the board. It needs the organisation secret `ROADMAP_TOKEN` (the default token cannot reach an
  organisation project); without it the job does nothing.
- **Weekly review (15 min)**: Board → move what changed; *Actions d’Oussama* → the next five; *P0 / P1* → anything
  blocked; *Roadmap* → does a milestone date still hold. Then refresh "Now, next, done" above.

Want to help? Pick a [`good first issue`](https://github.com/search?q=org%3Akrizaka+label%3A%22good+first+issue%22+state%3Aopen&type=issues)
and read [CONTRIBUTING](CONTRIBUTING.md).
