# Krizaka roadmap

> The live roadmap is the GitHub project **[Krizaka Roadmap](https://github.com/orgs/krizaka/projects/4)** — every issue of
> every repository, with its status, priority, product, milestone and target date. This page explains it and is
> refreshed at each weekly review; when the two disagree, the project wins.

_Last reviewed: 2026-10-11._

## Vision

Krizaka builds **open-source building blocks** (`@krizaka/*` on npm, `com.krizaka` on Maven Central) and two products
that consume them: **Orochia**, the video platform where creators keep 90 %, and **Orazaka**, sovereign AI that runs on
your own machines. The next six months take both products from "running in dev" to "open to the public":

1. the company and its accounts in order (M0),
2. Orochia in production on orochia.com (M1),
3. a public launch with blogs and a measured campaign (M2),
4. Orazaka out of its local phase (M3),

while the platform keeps shipping — Krizaka UI beyond shadcn / Aceternity / ECharts, the mobile app on TestFlight, and
the November Java releases from CI.

## Milestones

| Milestone | Target | What "done" means | Epic |
| :--- | :--- | :--- | :--- |
| **M0 · Société & comptes** | 2026-11-30 | Registration numbers, bank, verified domain, public address, npm / Renovate set up, site legal pages | [.github#24](https://github.com/krizaka/.github/issues/24) |
| **Mobile · iOS TestFlight** | 2026-11-20 | Orochia on a real iPhone (internal TestFlight) and a release-signed APK, push on both | [orochia-mobile#11](https://github.com/krizaka/orochia-mobile/issues/11) |
| **Novembre · Maven 0.2.0** | 2026-11-20 | krizaka-build 0.3.0, then users / notifications / billing 0.2.0, published from CI | [krizaka-build#16](https://github.com/krizaka/krizaka-build/issues/16) |
| **Krizaka UI · W1–W5** | 2026-12-18 | Signature components, effects, `@krizaka/charts`, blocks, adopted by every product | [krizaka-ui#49](https://github.com/krizaka/krizaka-ui/issues/49) |
| **M1 · Production Orochia** | 2027-01-29 | orochia.com live: managed database, real payments, Bunny production, 18+ legal pack, KYC, CSAM detection, monitoring | [orochia#76](https://github.com/krizaka/orochia/issues/76) |
| **M2 · Lancement public & marketing** | 2027-02-26 | Three blogs live, Product Hunt / Show HN, campaign running with analytics | [krizaka-com#55](https://github.com/krizaka/krizaka-com/issues/55) |
| **M3 · Orazaka hors phase locale** | 2027-03-31 | GPU target decided (ADR), staging and production from code, secrets, images, observability, billing | [orazaka#30](https://github.com/krizaka/orazaka/issues/30) |

Dates are targets, not promises. They assume the company's registration and bank account arrive in November, merchant
underwriting takes four to six weeks after that, and Apple activates the developer account in October.

## Now, next, done

**In progress**

- Krizaka UI W1 — signature & feedback components ([krizaka-ui#56](https://github.com/krizaka/krizaka-ui/issues/56))
- Krizaka UI W3 — `@krizaka/charts` ([krizaka-ui#58](https://github.com/krizaka/krizaka-ui/issues/58))

**Next**

- Company and accounts (M0): registration, bank, verified domain, contact address, npm trusted publishing, Renovate
- Mobile: Apple activation → EAS → TestFlight, push keys
- November Java releases from CI (token, organisation secrets, then the tags)
- Orochia production prerequisites: Bunny dev playback (403), dev webhook

**Recently done** (October 2026)

- `@krizaka/ui` 2.0.0 stable, `@krizaka/icons`, `@krizaka/i18n`, `@krizaka/intl`; every product on the shared primitives
- One brand identity: Krizaka blue, Orazaka orange, Orochia violet → magenta
- krizaka.com/docs: one documentation, component docs generated from the code
- Maven Central 0.2.0: build, BOM, platform kit and the four Spring Boot starters
- Orochia: a home that sells, Explore phase 0, the complete story viewer, configurable e-mail templates
- Orazaka: home and feature pages, Eric's demo recorded on the real app

## How we plan

- **Everything is an issue**, labelled with the [shared taxonomy](LABELS.md) (`type:*`, `priority:*`, `product:*`,
  `area:*`, `owner:oussama`, `status:blocked`), and added to the project.
- **Large work is an epic** (`type:epic`) whose pieces are GitHub sub-issues — the progress bar is the status.
- **Milestones carry the dates**; the same milestone exists in each repository it spans.
- **Manual actions** — accounts, payments, DNS, Apple, Bunny, npm 2FA, legal — are issues labelled `owner:oussama`, so
  the view *Actions d’Oussama* is the founder's to-do list and nothing waits silently.
- **Weekly review (15 min)**: Board → move what changed; *Actions d’Oussama* → the next five; *P0 / P1* → anything
  blocked; *Roadmap* → does a milestone date still hold. Then refresh "Now, next, done" above.

Want to help? Pick a [`good first issue`](https://github.com/search?q=org%3Akrizaka+label%3A%22good+first+issue%22+state%3Aopen&type=issues)
and read [CONTRIBUTING](CONTRIBUTING.md).
