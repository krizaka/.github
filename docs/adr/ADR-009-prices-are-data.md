# ADR-009 — Prices are data: one price catalogue per product, edited by its admin, audited and dated

- **Status**: Accepted (shipped in `@krizaka/settings`; Orazaka's Java side planned)
- **Date**: 2026-10-26
- **Scope**: every Krizaka product that sells something (Yomizaka, Akinaza, Orazaka)
- **Issue**: [krizaka/.github#253](https://github.com/krizaka/.github/issues/253). Related: orazaka#416 (licence), #254 (SLA tiers), krizaka-ui#713 (admin block).

## Context

A price typed in a message file or a pricing module is a price only a developer can change, with no trace and no date. The admin
configures everything (settings in the database are the source of truth), and a price is a setting like another. Three
modules touch money and each does one job: `@krizaka/payments` moves it (Checkout, portal, webhook, lookup key),
`@krizaka/credits` counts credits (an append-only ledger), the coupons module (krizaka-ts ADR-002, proposed) will discount it. None of them decides
what a plan costs.

## Decision

1. **The catalogue lives in `@krizaka/settings`** (krizaka-ts), next to the registry, the audit table and the `Query` port it already
   has. Not in `@krizaka/payments` (it would tie every price to a processor port), and not in a new package (it would copy the
   registry and the audit).
2. **An entry is `product.plan`** with: `unit` (`month`, `year`, `once`, `document`, `order`, `pack`, `hour`), `amountCents` (integer
   cents, or `null` = on quote), `currency` (`CAD` only), `taxes` (`plus-taxes`: the processor adds GST and QST), `availability`
   (`public`, `internal`, `founder-limited`, `preparing`) and `limits` (named integers the product reads: `included`, `overageCents`,
   `founderCap`, `feeBps`…). An entry on sale has a figure; `preparing` is shown without one. Credits are sold as a `pack` entry;
   the ledger stays `@krizaka/credits`.
3. **A change is a new version with an effective date**, now or later, never in the past. A subscription records the version it
   was sold at (`versionId`) and keeps that price while it runs. Reading « the price at a date » returns the version in force then.
   The seed (the product's former pricing module, `definePrices(seed)`) is version zero, never what a page reads.
4. **The API** (`priceCatalogue(definition, store)`): `entry(key, at)`, `catalogue(at)`, `version(id)`, `schedule(actor, key, change,
   effectiveFrom, now)`, `history(key)`, `upcoming(key, at)`; `describePrices` gives the admin screen its JSON-safe description.
   Every scheduled change writes an audit line (who, when, before, after, effective from) in the same transaction.
5. **Public pages read only the catalogue** (`publicCatalogue`): `public` and `founder-limited` with their figure, `preparing`
   without, never `internal`. `findTypedPrices(messages)` fails a product's test suite when a message file types an amount.
6. **The processor follows the catalogue**: the entry's key is the lookup key; the amount the processor holds is built from the entry.

## What the admin configures

In the product's admin console, a prices page (Krizaka UI block `PriceCatalogueEditor`, krizaka-ui#713): each entry's amount,
unit, availability and limits, scheduled from a date, with its history and what is already scheduled. Nothing is in an
environment variable or in code. Nothing in an entry's words claims a conformity, an uptime, a residency or a response time.

## What each product does to adopt

| Product | State (2026-10-26) | Remaining |
|---|---|---|
| Yomizaka | Adopted: admin prices route and catalogue view, pricing page | None for the model (`findTypedPrices` runs in `lib/pricing.test.ts`); the amounts still held stay with Oussama (yomizaka#300) |
| Akinaza | Adopted: `lib/price-catalogue.ts`, admin prices page and routes, pricing page | None for the model (`findTypedPrices` runs in its pricing tests) |
| Orazaka | Planned (orazaka#417): the catalogue goes in `krizaka-billing` (Java) with the same rules (versions, effective dates, audit); web client reads it | Java module, then the licence and SLA entries (`slaEssential`, `slaBusiness`, `slaPremium`; the last two « preparing » until the status page measures) |

## Consequences

- A price change is an admin action, audited and dated; no deploy.
- Invoices and renewals can say which version applied.
- The catalogue is one more table per product database; the seed must be kept in step with the first migration.
- `unit` and `limits` are an enumeration and named integers: a new kind of unit is a package change, on purpose.
- Orazaka's Java side repeats the model in another language; the rules are written down here and tested on both sides.
