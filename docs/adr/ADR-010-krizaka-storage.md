# ADR-010 — `krizaka-storage`: where files live is the admin's choice, and every claim follows the configuration

- **Status**: Accepted (design; the packages are not published yet)
- **Date**: 2026-10-26
- **Scope**: every Krizaka product that keeps files (Yomizaka, Akinaza, Orazaka, then the others)
- **Issues**: [krizaka/.github#248](https://github.com/krizaka/.github/issues/248); TypeScript package [krizaka/krizaka-ts#44](https://github.com/krizaka/krizaka-ts/issues/44). Legal questions: akinaza#364, orazaka#393 (they do not block the code).

## Context

Each product re-implements storage. Yomizaka has the most complete one (`apps/web/lib/storage/`): a `DocumentStore` port
(`@yomizaka/core`), adapters for Bunny, S3-compatible services and memory, the customer's own storage with a connection test,
encryption at rest with a vault, a region-to-country table (`regions.ts`, `where.ts`), the settings in its database, a contract
test kit and `residency-claims.test.ts`, which refuses a public sentence the configuration does not prove. Akinaza keeps photos
and files on Bunny (New York) through its own `media-upload.ts`; it had to remove every « Canada » sentence about them
(akinaza#362) and a test now keeps the text true. If the admin could choose a Canadian store, a product could say « Canada » truthfully,
because the sentence would follow the setting. Yomizaka's kept documents are in its own database (Toronto).

## Decision

One name, two implementations, one source of truth for the region list.

1. **TypeScript: `@krizaka/storage` in krizaka-ts**, extracted from Yomizaka, not rewritten.
   - Port: `put`, `get`, `head`, `delete`, `list(prefix)`, `signedUrl`, plus `verify` (write, read, delete a probe object).
   - Adapters, named by what they speak: `s3` (any S3-compatible service: DigitalOcean Spaces, AWS, MinIO, Azure through S3; endpoint,
     region, bucket, keys, path or virtual-host style), `http` (a provider's own REST API such as Bunny Storage, or a generic
     HTTP store the admin describes: base URL, auth header, one method per operation), `memory` (tests), `own` (the customer's
     own S3-compatible storage).
   - A contract test kit every adapter passes. Encryption at rest is an option over any adapter, keys from a vault port; never a
     key in clear in the database.
   - `where(object)` answers « where is this file », from the object's recorded store and the region table.
   - No environment read in the domain: configuration arrives as a parameter.
2. **Spring: `com.krizaka:krizaka-storage` in krizaka-build**, a building block in the BOM with a starter: `StoragePort`, the same two
   adapters as beans, `@ConfigurationProperties` for defaults, the same contract tests through `krizaka-test-support`. The
   admin's choice, read from the database through the settings block, wins over properties.
3. **The region table is data, published once** (`regions.json`: provider region to ISO country) and consumed by both. A region
   that is not listed is « unknown »: nothing claims a country for it.
4. **The admin chooses**, per product and per kind of data (documents, photos, exports): provider and region, whether the
   customer's own storage is allowed, the default. Settings in the database are the source of truth; every change is audited
   (`@krizaka/audit`). The admin screen is a Krizaka UI block: it asks only for the fields of the chosen kind, runs the connection
   test before saving, and shows the country derived from the region. Secrets go to the vault port and are never shown again
   (« set » or « not set »).
5. **The user may choose, when the admin allows it**: a short list in words (« Canada (Toronto) », « United States (New York) »)
   and their own storage. The choice is stored per workspace (account or shop), and the country is shown in words.
6. **Changing the choice never lies.** New files go to the new store. Existing files stay where they are until a background
   job moves them (idempotent, verified, audited). `where()` is true at every moment, per object.
7. **Claims follow the configuration.** Public text about residency is generated from the effective configuration, never typed.
   `residency-claims` moves into the package and every app runs it. No sentence claims a legal conformity; only facts such as
   « stored in Canada (Toronto) ».
8. **A CDN in front** (Bunny) may have a Canadian origin. The edge caches outside Canada, so the sentence names the origin
   (« stored in Canada (Toronto), served through a CDN ») until the lawyer answers akinaza#364.

## Costs and limits

Each region's storage and egress price is noted in the package README from the provider's public price page when its adapter
ships, with the date read; this ADR does not copy figures that would age. Limits (size, type, magic-number check) are passed in
by the product and set by the admin, not typed in the adapter.

## What each product does to adopt

Issues: Spring block krizaka-build#94, Yomizaka yomizaka#430, Akinaza akinaza#397.

1. **Yomizaka** first: swap its local module for the package, no behaviour change, its tests unchanged and green.
2. **Akinaza**: photos and files move behind the port; a Toronto option is configured by the admin; its public text goes back to
   « Canada » only where the configuration proves it.
3. **Orazaka** (Java `krizaka-storage` for the services, the package for the web client), then the others.

## Consequences

- One place for signatures, key layout, encryption and the contract tests; a fix reaches every product by a version bump.
- A Canadian claim becomes possible and checkable instead of removed.
- Two implementations to keep in step: the contract tests and the shared `regions.json` are what keeps them honest.
- Migration of existing files is real work and is its own job, not a side effect of changing a setting.
- Not decided here: legal wording about CDN edges and the disclosure of the processor (akinaza#364, orazaka#393).
