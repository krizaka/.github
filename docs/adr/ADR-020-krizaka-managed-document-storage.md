# ADR-020 — Krizaka managed document storage: an option the admin turns on, kept in Québec, encrypted per tenant, with published evidence

- **Status:** Proposed (CTO, delegated). It needs Oussama for three things: opening the provider account (and paying for it), the
  offer and its prices, and the processor agreement template before the lawyer reads it. The slices are the sub-issues
  of the epic (internal tracker).
- **Date:** 2026-10-30
- **Builds on:** [ADR-010](ADR-010-krizaka-storage.md) (`@krizaka/storage`: the admin chooses where files live, claims follow
  the configuration), [ADR-009](ADR-009-prices-are-data.md) (prices are data), [ADR-016](ADR-016-identity-federation-trusted-devices-risk.md)
  (tenants, trusted devices, secrets sealed under one vault key), [ADR-004](ADR-004-expo-app-shell.md) and
  [ADR-005](ADR-005-tauri-app-kit.md) (phone and Mac shells), krizaka-ts ADR-005 (providers as data, credentials sealed).
- **Scope:** the apps that run on Orazaka: Yomizaka, Akinaza, Orazaka (web, Mac, phone). The engine's analysis packs read
  documents only through the consent grant below.

## Context

The founder wants (2026-10-31) a storage service **run by Krizaka** for the apps on Orazaka. Clients would keep their documents
in one place, Orazaka's analysis packs would give better advice from them, and sharing and access would work well on Mac and
phone. Requirements: encryption at rest with per-tenant keys and in transit; Québec's Law 25 and federal PIPEDA by design;
residency in Canada, Québec preferred; deletion on request; a breach register; access logs; disaster recovery and high
availability **backed by numbers**.

Two rules already hold and shape everything below:

1. **Less responsibility on our side, more flexibility for users.** Bring-your-own storage stays the default. A client keeps
   their own bucket or cloud (S3-compatible, Dropbox…) as ADR-010 allows. The managed service is **an option the
   administrator turns on**, per product, plan or tenant. It is never imposed, and it changes nothing in the apps' screens: the
   same `@krizaka/storage` port, one more provider.
2. **Storage is a port.** The web never writes the server's local disk. Mac and phone may keep a local cache. The provider is
   a setting in the database, not a deployment variable.

`@krizaka/storage` 0.8.1 already exports the pieces this design composes: `encryptedStore` and a `Keyring`, the S3 adapter
(Signature V4, no SDK), `countryOf` / the region table, the provider registry, and `provider-admin`. `@krizaka/privacy` 0.2.2
already exports consents by purpose, the export and erasure, and an incident register. `@krizaka/audit` keeps the append-only
trail. This ADR adds no copy of any of them: what is missing is added to those packages.

### The trade-off, said plainly

With this option on, **Krizaka holds its clients' documents**. For a business client (a landlord on Yomizaka, a shop on
Akinaza) we become their **service provider (mandataire)** for the personal information of *their* customers, under Law 25
s. 18.3 and PIPEDA principle 4.1.3. For an individual client we are the enterprise responsible. Both bring obligations
that bring-your-own does not:

- a **written mandate or contract** with each business client that lists the protection measures, limits use to the mandate,
  requires us to tell them of any breach without delay, and requires destruction at the end (Law 25 s. 18.3; PIPEDA 4.1.3);
- **our own** privacy impact assessment (Law 25 s. 3.3), and one for every communication or storage outside Québec (s. 17) —
  the Toronto replica is outside Québec. We give business clients the elements they need for theirs;
- **incident management**: register every confidentiality incident, assess the risk of serious injury, and notify the
  Commission d'accès à l'information (CAI) and the persons concerned (Law 25 s. 3.5 to 3.8; Regulation respecting confidentiality
  incidents). Federally: record every breach of security safeguards for 24 months, and report the ones that create a real risk of
  significant harm (PIPEDA s. 10.1; SOR/2018-64 s. 6);
- **destruction on request and at the end of the purpose** (Law 25 s. 23 and s. 28; PIPEDA 4.5), including backups,
  within a delay we publish;
- documents are often **sensitive** (identity papers, leases, tax slips, the social insurance number): consent is express
  (Law 25 s. 12) and the safeguards follow the sensitivity (s. 10; PIPEDA 4.7);
- the **availability we publish becomes a commitment**. It must be measured, never typed.

This is why the service is an option, and why the default stays bring-your-own.

## Decision 1 — Provider: OVHcloud, Beauharnois (Québec) primary, Toronto replica; AWS Canada as the ready fallback

Evaluation read on **2026-10-30**. The sources are dated below. Prices and egress figures are in the internal epic, not here,
because they change and public documents stay neutral.

| Provider | Regions in Canada | Inside the primary region | DR inside Canada | Published durability · availability | Certifications (provider level) | Keys | Parent company |
|---|---|---|---|---|---|---|---|
| **OVHcloud** | Beauharnois `bhs` (QC), Toronto `ca-east-tor` | 1-AZ | Async replication between buckets of one project, across regions | 11 nines · 99.9 % (single-zone Standard) | ISO 27001 / 27017 / 27018 / 27701 for Object Storage; SOC 2 scope for the Canadian sites **to be confirmed** | SSE-C, SSE-OMK; OKMS in `ca-east-bhs` with a backup in `ca-east-tor` | French (OVH Groupe) |
| AWS | ca-central-1 Montréal (QC), ca-west-1 Calgary | 3 AZ in Montréal | Cross-region replication to Calgary | 11 nines (design) · 99.9 % (S3 Standard) | SOC 1/2/3, ISO 27001 / 27017 / 27018 / 27701, CCCS-assessed | KMS customer-managed keys, per region | US |
| Google Cloud | Montréal, Toronto | 3 zones | Configurable dual-region `CA` (Montréal + Toronto), turbo replication | 11 nines · 99.95 % (dual-region) | SOC 2, ISO family | Cloud KMS, CMEK | US |
| Azure | Canada East (Québec City), Canada Central (Toronto) | LRS (Canada East) | GRS / RA-GRS paired Canada East ↔ Central | 16 nines (GRS) · 99.9 % / 99.99 % read (RA-GRS) | SOC 2, ISO family | Key Vault, CMK | US |
| DigitalOcean Spaces | TOR1 only | one datacentre | **none in Canada** (DR gap) | not published for Standard | SOC 2 Type II | SSE-C only | US |
| Bunny Storage | **none** (storage regions: DE, UK, SE, NY, LA, SG, SYD, BR, JH) | — | — | — | — | — | Slovenia |

**Why OVHcloud:**

- **Québec first.** The primary copy is in Beauharnois. The Toronto replica is the only copy that leaves Québec, and it stays
  in Canada, under PIPEDA. That replica is the one s. 17 assessment we must write (in the EFVP).
- **Sovereignty fits the brand.** Orazaka sells sovereign AI. A provider with a non-US parent avoids the US CLOUD Act reach
  that applies to AWS, Google and Microsoft. The encryption in Decision 3 makes the provider unable to read the documents
  anyway, whoever it is.
- **No egress charges.** Sharing and Mac/phone sync are download-heavy, so egress dominates the bill elsewhere.
- **S3-compatible.** The `s3` adapter of `@krizaka/storage` already speaks it, so this is a provider entry, not new code.

**What it costs us, honestly:**

- **1-AZ regions.** One Canadian site can fail as a whole. The Toronto replica and the restore drills (Decision 8) are the
  answer. The availability we publish is the one we measure, not the provider's SLA.
- **SOC 2 for the Canadian sites is not confirmed.** Slice 1 starts by asking OVHcloud for the current SOC 2 Type II
  report and the ISO certificates, with Beauharnois and Toronto in scope. **Gate:** if they cannot provide them, we switch the
  same slice to AWS ca-central-1 + ca-west-1 (3 AZ in Montréal, SOC 2, KMS). That switch is a provider entry and an OpenTofu
  module, because everything above the port is identical.

Sources, read 2026-10-30: OVHcloud Object Storage (durability, SLA, ISO, SSE) <https://www.ovhcloud.com/en-ca/public-cloud/object-storage/>;
endpoints and geo-availability <https://docs.ovhcloud.com/en/guides/storage-and-backup/object-storage/s3-location>; asynchronous
replication <https://docs.ovhcloud.com/en/guides/storage-and-backup/object-storage/s3-asynchronous-replication>; OKMS architecture
<https://docs.ovhcloud.com/en/guides/manage-and-operate/kms/architecture-overview>; ISO certifications by product
<https://docs.ovhcloud.com/en/guides/account-and-service-management/account-information/security-certifications>; OVHcloud public
catalogue (CA) `https://ca.api.ovh.com/1.0/order/catalog/public/cloud?ovhSubsidiary=CA`; AWS price list API (S3 and
AWSDataTransfer, ca-central-1 / ca-west-1, published 2026-10-15 and 2026-09-16); Azure retail prices API (Blob, canadacentral);
Google Cloud Storage locations <https://docs.cloud.google.com/storage/docs/locations>; DigitalOcean regional availability
<https://docs.digitalocean.com/platform/regional-availability/> and Spaces SLA <https://www.digitalocean.com/sla/spaces>; Bunny
Storage endpoints <https://docs.bunny.net/storage/http>.

## Decision 2 — Tenancy

- **Tenant = the workspace of krizaka-users** (an organization or a personal account, ADR-016). Every object, key, share,
  grant and audit line carries `tenantId`.
- **One bucket per environment and region pair** (`docs-<env>` in Beauharnois, its replica in Toronto). Inside it, keys are
  `t/<tenantId>/<objectId>` with an **opaque** `objectId`. File names, folders and tags live **encrypted** in the metadata
  database, never in the object key.
- **Bucket per tenant** is an Entreprise option (a data setting), for clients whose contract requires it.
- Isolation is enforced three times: the service checks tenant scope on every call; the keys are per tenant (Decision 3);
  and a contract test in `@krizaka/storage/testkit` proves that tenant A's credentials cannot read tenant B's objects.

## Decision 3 — Envelope encryption with per-tenant keys

```text
KMS root key (OKMS ca-east-bhs; backup ca-east-tor)  ── wraps ──►  tenant KEK (one per tenant, stored wrapped in the DB)
tenant KEK  ── wraps ──►  DEK (one per object version, AES-256-GCM)  ── encrypts ──►  object bytes and encrypted metadata
```

- Encryption is **client-side to the provider**: our service encrypts before `put` (`encryptedStore` over the `s3` adapter).
  The bucket only ever holds ciphertext. Provider-side encryption (SSE) stays on as defence in depth.
- A **`KeyService` port** (in `@krizaka/storage`, beside `Keyring`) with adapters `okms` (OVHcloud KMS), `aws-kms` (the
  fallback) and `memory` (tests). It does `wrap`, `unwrap` and `rotate`. The root key never leaves the KMS.
- **Rotation:** the root key yearly (the KMS keeps the old versions for unwrapping); a tenant KEK on request or after an
  incident. Rewrapping DEKs is a background job, idempotent and audited; the bytes are never re-encrypted to rotate.
- **Crypto-shredding:** closing a tenant destroys its KEK, which makes every copy unreadable, including the replica and the
  backups. Erasure becomes provable without waiting for backup expiry.
- **Entreprise:** a dedicated KMS key per tenant (BYOK), at the cost the price catalogue states.
- **In transit:** TLS 1.2+ everywhere, HSTS; the service talks to the provider over TLS only.

## Decision 4 — Sharing: expiring links, permissions, audit

- **Roles per folder or document:** `owner`, `editor`, `viewer`, plus `uploader` (a « drop box » where a client can upload
  but not list). A share to a **known person** goes to a krizaka-users identity, so a guest account is created on first open.
- **Links:** always expiring. The default and the maximum are settings (the admin sets the maximum per plan). Optional
  passcode, view-only or download, a maximum number of opens, revocable at once. A link resolves through our service, which
  checks it, decrypts and streams. **The bucket is never public**, and no CDN serves private documents.
- **Audit:** every open, download, share, revoke, permission change, export and deletion is an `@krizaka/audit` line (who,
  what, when, from which device or link). The owner sees their document's history; the admin exports it.
- **End-to-end where possible:** a folder can be marked **Private**. Its tenant KEK is then wrapped to the members' device keys
  (Mac Keychain, phone Keystore / Secure Enclave, ADR-016 trusted devices), not to the root key. We cannot read it, and
  **Orazaka packs cannot analyse it**. The screen says so before the switch. Links on Private folders carry the key in the URL
  fragment, which never reaches the server.

## Decision 5 — Mac and phone: offline cache and sync

- The server is the **source of truth**. Each object version is immutable; a folder has a change feed (`cursor` →
  changes). Clients pull from their cursor and push new versions.
- **Offline cache:** on Mac (`@krizaka/app-desktop`, Tauri) and phone (`@krizaka/app-client`, Expo), the cache is encrypted
  with a device key held in the Keychain / Keystore, and its size is a setting. « Keep offline » is per folder. A device removed
  from trusted devices loses its key, so its cache becomes unreadable.
- **Conflicts:** never a silent overwrite. Two versions from the same base → both kept, the second one named « copy from
  <device> », and the user picks.
- **Uploads:** resumable and multipart, sent as ciphertext chunks. The phone keeps uploading in the background within the
  OS limits.
- The web keeps no cache beyond the browser's.

## Decision 6 — Orazaka packs read documents only with consent

- A pack reads a document through a **grant**: `tenantId`, the scope (documents or folders), the purpose (« lease analysis »),
  the pack, the expiry, and who gave it. It is recorded as a consent by purpose in `@krizaka/privacy`, with the notice version
  shown.
- The pack receives a **short-lived, read-only capability** for that scope, never storage credentials. Each read logs the pack
  run id in the document's history.
- The engine **keeps no copy** beyond the run. What a run keeps (extracted fields, a summary) follows the tenant's retention
  setting and is listed in the person's export.
- Packs that read managed documents run on **models hosted in Canada**. Routing to a model outside Canada needs an admin setting,
  its own s. 17 assessment, and is shown to the user.
- A decision based **exclusively** on automated processing (for example a screening result) is disclosed to the person,
  with the right to have it reviewed (Law 25 s. 12.1). That is the product's duty; the grant carries the flag.
- **Private** folders are never readable by a pack (Decision 4).

## Decision 7 — Admin controls, retention, deletion

- **Settings in the database** (`@krizaka/settings`, resolved tenant > plan > product > global): the managed service on or off;
  which providers a tenant may pick (managed, bring-your-own, both); quota; maximum link lifetime; the Private folder option;
  packs allowed to read; the tenant retention policy; the cache limit on devices. Every change is audited.
- **Offers are data** (ADR-009): `storage.managed` is an entry of the price catalogue, with the quota included per plan, the
  overage and the BYOK add-on. Public pages read the catalogue, and the dedicated bucket and BYOK belong to the Entreprise offer.
  This ADR sets no price.
- **Retention:** the tenant chooses within bounds the admin sets. Deleted items go to a trash for a set number of days, then are
  removed with every version. The replica follows. Backups of the metadata database expire after a set number of days, and
  because keys are shredded, an expired backup holds nothing readable.
- **Deletion on request** (Law 25 s. 28, PIPEDA 4.5.3) runs through `@krizaka/privacy`'s erasure. It leaves a record without
  personal data, and a published maximum delay applies. Closing a tenant = export offered, then crypto-shred.
- **Portability:** the export is a structured archive of the documents and their metadata (Law 25 s. 27).

## Decision 8 — DR / HA, and the evidence we publish

| Item | Design | Target (stated as a target until measured) |
|---|---|---|
| Objects | Versioned buckets; async replication Beauharnois → Toronto; object lock (governance) on the replica | RPO ≤ 15 min (replication lag, measured p99) |
| Metadata DB | Managed Postgres in Canada, PITR, daily snapshot copied to the other region | RPO ≤ 5 min |
| Keys | OKMS with its Toronto backup; the wrapped tenant KEKs are in the DB backups | as the DB |
| Failover | Read-only from Toronto first (documents viewable), then read-write after a decision logged in the incident register | RTO ≤ 4 h |

- **Restore drills:** a scheduled workflow (monthly; quarterly for a full tenant). It restores a random sample of objects and one
  tenant from the replica and the backups into a scratch project, checks every hash, and records the **measured** RPO and RTO
  as JSON.
- **Availability:** synthetic probes (put, get, signed link, delete) every five minutes from two locations, giving a monthly
  availability per product.
- **Published:** the trust page reads the latest drill results, the monthly availability and the replication lag p99 **at
  build time**, as ADR-010 does for residency. A figure we did not measure is not shown. A missed target is shown with its date.
- **Provider failure:** the port allows a full copy to the fallback provider. Its runbook is tested once a year, as a drill.

## Decision 9 — Breaches

1. **Detect:** alerts on unusual reads (volume, a new device, a tenant mismatch refused), on KMS unwrap spikes, and on
   permission changes.
2. **Register:** every confidentiality incident is a `@krizaka/privacy` incident (kept at least five years). PIPEDA breach
   records are kept at least 24 months.
3. **Assess** the risk of serious injury (Law 25 s. 3.7: sensitivity, consequences, likelihood of misuse).
4. **Notify** the CAI and the persons concerned when the risk is serious (s. 3.5), and the federal Commissioner and the
   individuals when the risk of significant harm is real (PIPEDA s. 10.1). Each **business client** is told without delay (our
   contract target: 24 h), with what they need for their own notices.
5. **Contain** (revoke links, rotate the tenant KEK, cut access), then a post-mortem with its guard (« bug means missing guard »).

The person in charge of the protection of personal information (Law 25 s. 3.1) is named on the privacy page.

## Consequences

- One more provider in `@krizaka/storage`, a `KeyService` port, and a document service with its metadata database. The apps do
  not change, because they already use the port.
- We take on a processor's duties (contracts, EFVP, incidents, deletion delays, measured availability). The EFVP and a points
  list for the lawyer are written with this ADR. **No public sign-up for the managed option before the lawyer's review.**
- Costs: storage is cheap at our scale; operations are not (drills, probes, on-call). That is why the option is a priced
  entry, not a free default.
- Reversible: the provider is a setting and an OpenTofu module. AWS Canada is the documented fallback.

## Legal references (read for this ADR; to be confirmed by the lawyer before opening)

- Act respecting the protection of personal information in the private sector, CQLR c P-39.1 (Law 25): s. 3.1, 3.3, 3.5–3.8,
  10, 12, 12.1, 17, 18.3, 23, 27, 28 — <https://www.legisquebec.gouv.qc.ca/en/document/cs/P-39.1>
- Regulation respecting confidentiality incidents (made under CQLR c P-39.1)
- PIPEDA, S.C. 2000, c. 5, Schedule 1 (principles 4.1–4.10) and s. 10.1 —
  <https://laws-lois.justice.gc.ca/eng/acts/P-8.6/>; Breach of Security Safeguards Regulations, SOR/2018-64
- OPC, « Guidelines for processing personal data across borders » (2009)
