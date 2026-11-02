# ADR-023: One OpenTofu stack per environment and provider; prod and non-prod separated; two database clusters on DigitalOcean

- **Status:** Proposed. The founder approved the direction on 2026-11-01 (krizaka-internal#2228). This ADR builds nothing, creates
  or deletes no cloud resource and changes no DNS record.
- **Date:** 2026-11-01
- **Decision by:** the founder, 2026-11-01. Sources: krizaka-internal#2228, its body, and his three comments of that day.
  - « on sépare la prod de la non-prod ».
  - « les sites statiques etc., si besoin, pointent vers la non-prod ».
  - The budget: step 1 adds about +15 USD/month to the bill, no more.
- **Amends:** [ADR-022](ADR-022-dev-and-prod-environments.md).
  - § 3: a single stack replaces `stacks/prod/shared` + `stacks/prod/<brand>`.
  - § 3: the prod Postgres starts at 1 vCPU / 1 GiB.
  - § 5: the steps and their costs are re-cut so step 1 nets ≤ +15 USD.
  - Everything else in ADR-022 stands: the hosts, promotion by digest, prod starting empty, the walls inside the shared prod, and Verikora as the pilot.
- **Builds on:** krizaka-infra ADR-001 (a human applies; agents only plan) and ADR-020 (managed document storage).

## Context: what runs today (inventory, read-only, 2026-11-01)

The inventory was read with read-only list calls on the DigitalOcean API, in the one team that exists today. That team holds
every resource. No secret, address or IP is recorded here.

| Kind | Count | Detail | List price, USD/month |
| :-- | :-- | :-- | --: |
| App Platform, static-only apps | 4 | `krizaka-blog` (+ one function), `krizaka-ui-site`, `krizaka-java-site`, `krizaka-ts-site`. The first 3 are free; the 4th is billed | 3.00 |
| App Platform, `krizaka-com` | 1 | one service, 512 MiB | 5.00 |
| App Platform, `yomizaka-dev` | 1 | one service, 512 MiB (`www.`, apex, `dev.`, `admin.yomizaka.com`) | 5.00 |
| App Platform, `akinaza-dev` | 1 | one service, 512 MiB (`basic-xxs`) | 5.00 |
| App Platform, `orazaka-dev` | 1 | `web` 512 MiB (5), `core` 2 GiB `basic-s` (20), `gpu-relay` 512 MiB (5) | 30.00 |
| Managed PostgreSQL | **1** | `krizaka-dev-pg`, pg 18, one node of 1 vCPU / 1 GiB with 10 GiB, in `tor1`. It holds 11 databases: 5 for Orazaka, 1 for Yomizaka, 1 for Akinaza, the platform's accounts, users and billing, the newsletter, and `defaultdb`. It has 10 pools | 15.15 |
| Droplet | 1 | `orazaka-broker-dev`, `s-1vcpu-512mb-10gb`, no backups | 4.00 |
| Spaces | 1 bucket | `yomizaka-documents-prod`, created by krizaka-infra `stacks/prod/yomizaka-documents`. **This is a prod bucket, in the dev team** | 5.00 |
| Load balancers, Kubernetes, registry, volumes, snapshots, CDN endpoints, DigitalOcean DNS domains | 0 | none. DNS is at Porkbun (krizaka-infra `stacks/dns`) and media are on Bunny | 0 |
| Projects | 8 | `krizaka`, `yomizaka`, `akinaza`, `orazaka`, plus 4 empty projects of departed products | 0 |
| **Total** | | before taxes and any transfer overage | **≈ 72.15** |

- **The invoice was not read.** The billing endpoints (`balance`, `invoices`) answered 403. The token in use has no billing scope,
  and the vault has no DigitalOcean token under the name documented in krizaka-infra `docs/SECRETS.md`. The total above is
  therefore the list price of every resource. Slice 2 reads the measured invoice before step 1 is planned.
- **There is already only one non-prod database cluster.** No per-app cluster remains: `orazaka-admin-dev`, named by ADR-022, is
  gone. « Two clusters » therefore means keeping `krizaka-dev-pg` as the non-prod cluster and adding exactly one prod cluster.
  Consolidation saves no money on the databases; step 1's savings come from the apps and from Spaces (§ 6).

What krizaka-infra already codes (main, 2026-11-01):

- **Provider-neutral role modules:** `modules/{app,database,broker,dns,cdn,object-storage,document-storage}`.
- **Adapters:**
  - `providers/digitalocean/{app,database,broker,object-storage}`;
  - `providers/porkbun/dns`;
  - `providers/ovh/document-storage`.
- **Tests:** each module and adapter has a mocked `tofu test`.
- **Stacks, three of them, each on a local state outside the repository:**
  - `stacks/dev/orazaka` (10 imported resources, plan no-op);
  - `stacks/prod/yomizaka-documents` (the bucket above);
  - `stacks/dns` (8 zones, 134 records, plan in CI and as a daily drift check).
- **Not coded:** a remote state backend, the other apps, a `machine` adapter and an `environment` / `provider` switch.

## Decision

### 1. One stack, two parameters, one state per environment

```
stack/                          the one root module: what a complete Krizaka environment is
  variables.tf                  environment = "dev" | "prod"; provider = "digitalocean" | "<cloud>" | "machine";
                                region, sizes, ha, backup_retention_days, products = { <id> = { web, db, bucket, hosts… } }
envs/dev/   backend.tf + dev.tfvars      non-prod: its own backend, its own credentials
envs/prod/  backend.tf + prod.tfvars     prod: its own backend, its own credentials
modules/<role>/                 the contract (variables + outputs), unchanged roles
providers/<provider>/<role>/    the adapters; `machine` is new
stacks/dns/                     stays apart (one Porkbun account serves the zones of both sides; ADR-001)
```

- **Choosing the provider.**
  - The root picks an adapter with `source = "../providers/${var.provider}/<role>"`. OpenTofu has evaluated variables in module
    sources and backends early since 1.8, and krizaka-infra pins 1.13.2.
  - A provider that lacks a role fails at `tofu init` with the missing role's name. It never falls back to another provider.
- **Products are data.** A product is an entry in `products`. Adding a product, or moving a site from one side to the other, is a
  variable change. It is not a new stack and not a fork.
- **Importing what runs.** The existing stacks move in with `moved` and `import` blocks. The acceptance test is a plan that changes
  nothing (« import before change », PLAN.md).
- **Protecting what holds data.** Databases, buckets and the state bucket carry `prevent_destroy`. A CI check fails any plan that
  destroys or replaces a stateful resource.

### 2. The provider contract: the same outputs everywhere

Every adapter of a role exposes the same outputs, with the same names and types. A product reads only these outputs and never
learns which provider runs it.

| Role | Outputs (sensitive in **bold**) |
| :-- | :-- |
| `network` | `network_id`, `private_cidr` |
| `database` | `host`, `port`, `ca_cert`, `databases` (map id → name), **`migrator_url`**, **`app_url`** (one pair per product) |
| `app` | `urls` (map product → default URL), `ingress_target` (for DNS) |
| `object-storage` | `endpoint`, `region`, `bucket`, **`access_key`**, **`secret_key`** (scoped to the bucket) |
| `broker` | `amqp_url` (**sensitive**), `ca_cert` |
| `dns` | `records` (name → value, for the plan's review) |
| `observability` | `uptime_check_ids`, `alert_policy_ids` |

- **The contract test.** `scripts/check-provider-contract.mjs`, run in CI, compares the `outputs.tf` names of
  `providers/*/<role>` with `modules/<role>`. A missing or extra output fails the check.
- **Each adapter's own test.** Its `tofu test` asserts the types with a mocked provider.

### 3. Prod and non-prod, separated at every layer

| Layer | Non-prod | Prod | The test that proves the wall |
| :-- | :-- | :-- | :-- |
| Account | today's DigitalOcean team | a separate team (founder step, krizaka-internal#2138), with its own login, billing alerts and 2FA | a non-prod token gets 403/404 on a prod resource id (slice 4, weekly) |
| State | `pg` backend in a `tofu_state` database of the non-prod cluster. Free; no app role can connect to it | S3 backend in a versioned prod Spaces bucket, with native locking (`use_lockfile`) | the prod backend refuses non-prod keys (slice 4) |
| State encryption | OpenTofu client-side state encryption, with a key from the non-prod vault | the same, with a key from the prod vault that exists nowhere else | `tofu show` on the raw state shows ciphertext (CI) |
| Credentials | `@<p>-dev` in the vault, plus a read-only planning token | `@<p>-prod`, all values new; one apply token and one read-only plan token | `secret-distinct` (krizaka-internal#2129) |
| Network | non-prod VPC; the cluster trusts the non-prod apps only | prod VPC; the cluster trusts the prod apps only, with TLS and the CA required | a connection from a non-prod app to the prod database is refused (slice 4) |
| Object storage | Bunny `krizaka-assets` (ADR-014); no Spaces bucket once step 1 is done | prod Spaces: the state bucket and the documents bucket; one Bunny zone per product later (ADR-022) | the bucket key fails on any other bucket (`tofu test` + slice 4) |
| CI identity | GitHub environment `nonprod` of krizaka-infra: PR plan and daily drift, read-only token | GitHub environment `prod`: plan only on a protected dispatch with the founder as reviewer; no prod secret in any product repository | the environment's protection rules are read by a conformance check |
| Applying | the founder (ADR-001) | the founder (ADR-001) | no `apply` step exists in any workflow (CI grep) |
| Data | the persona cast (krizaka/.github#356) | starts empty; no copy in either direction (ADR-022 § 2) | the seed refuses production (#2129) |

DNS (Porkbun) and Bunny each have one account-wide API key that reaches both sides. This is the one shared credential left.

- **DNS.** Applying DNS stays a founder step (ADR-001). Prod records are reviewed in the plan.
- **Bunny.** Prod zones use per-zone keys, kept in the prod vault. The Bunny account key is the operator's alone.
- **Revisited when either vendor offers scoped keys:** a second Porkbun account for the commercial zones, and per-zone Bunny tokens.

### 4. Which side every site and service runs on

| Side | Sites and services |
| :-- | :-- |
| **Non-prod** | www.krizaka.com · blog.krizaka.com (and its OAuth function) · ui. / java. / ts.krizaka.com · `yomizaka-dev`, `akinaza-dev`, `orazaka-dev` (`web`, `core`, `gpu-relay`) on their code-name hosts · the dev broker · `krizaka-dev-pg` and its 11 databases · Bunny `krizaka-assets` · Stripe test keys |
| **Prod** | Verikora (`www.verikora.com`, its database, its documents bucket) from step 1. Later, each with its own step: the headless engine (`api.sovkora.com`), Folioviv, Sovkora public, Stripe live, Kridoc (ADR-022 § 6) |

- **The test for prod.** A site or service runs in prod only if it holds customer data or takes payments.
- **Moving a site.** Moving a site that starts holding personal data means changing its `side` in `products`. It then gets a new
  database in prod. Nothing is copied: Loi 25 forbids copying the data across.
- **To check: `krizaka_newsletter`.** It sits on non-prod and may hold the addresses of real subscribers. Slice 2 counts its rows
  without reading them. If it holds real people, it moves to prod in step 1 at no added cost, as one database inside the prod
  cluster, and the newsletter form reads the prod URL.

### 5. The « machine » target

- **What it is.** `provider = "machine"` means one Linux server reached by SSH. The founder chose « one server » in #2228.
  - The adapters render a **Docker Compose** project:
    - Caddy for TLS;
    - one container per app;
    - Postgres 18 in a container with a volume;
    - RabbitMQ;
    - nightly encrypted `pg_dump` per database to any S3-compatible bucket.
  - The project is pushed over SSH, with key authentication only, a firewall that allows 22/80/443 only, and unattended upgrades.
  - Compose outputs the same contract as § 2.
- **k3s is refused for now.** It adds a control plane to run for no current need. It is reconsidered only if a single machine
  must run more than about ten long-lived services.
- **How CI tests it.** It costs nothing; no cloud is involved.
  - A GitHub-hosted runner is the machine. The workflow `machine-e2e.yml` starts an SSH-enabled container on the runner, then
    applies `envs/ci-machine`, a throwaway local state.
  - It then checks four things:
    - each app's `/healthz` answers;
    - the database roles see only their own database;
    - a backup is written;
    - the backup restores into a fresh Postgres, with matching row counts.
  - It destroys everything at the end of the job.
  - It runs on every pull request that touches `providers/machine` or `stack/`, and weekly.

### 6. Migration into the one non-prod cluster, with no data loss

All dev databases already live in `krizaka-dev-pg`, so no database moves. The migration is about code, keys and one misplaced
bucket:

1. **Restore drill first (slice 5).**
   - Fork `krizaka-dev-pg` from its latest backup into a temporary cluster of the same size. It lives a few hours, under USD 0.25
     at USD 0.02254 an hour.
   - Compare every database's table list and row counts with the source (read-only, through the db-drift tooling).
   - Write one encrypted (`age`) logical dump per database, kept off DigitalOcean.
   - Destroy the fork.
   - The drill is repeated before any change to the cluster, and every 30 days.
2. **Import (slice 2).** Import into `envs/dev`:
   - the 8 apps;
   - the cluster with its 11 databases and 10 pools;
   - the broker droplet, its firewall and the VPC.

   The plan must change nothing. The 4 empty projects of departed products are listed for removal; projects are free.
3. **Move the prod bucket out of the dev team (slice 7).** The bucket is created in the prod team, and the objects are copied
   with checksums (`rclone check`: counts and hashes equal). The old bucket stays read-only for 7 days. After that, the founder
   deletes it and revokes the dev team's Spaces keys.
4. **Rollback.** Every step can be reversed by re-applying the previous plan. No step ever destroys a database. A drop is only
   ever the founder's separate decision, after a drill younger than 30 days.

### 7. Steps and monthly cost

Prices are DigitalOcean list prices, in USD a month before taxes. They were read on 2026-11-01 from three sources:
`digitalocean.com/pricing/app-platform`, `digitalocean.com/pricing/managed-databases`, and the API's App Platform instance-size
list. Spaces is USD 5 a month (250 GiB, 1 TiB out), as noted in `stacks/prod/yomizaka-documents`; this is confirmed at signing.

| Step | What | Change | Net / month | Cumulative vs today (≈ 72.15) |
| :-- | :-- | :-- | --: | --: |
| 0 | Code only: the one stack, the contract, the machine target, the imports, the isolation proofs, the drill (slices 1–5) | a drill fork, a few hours | 0 (< 0.25 per drill) | 0 |
| **1** | **Non-prod savings** (slice 6), **then the prod pilot base** (slice 7) | see the next table | **+7.15** | **+7.15** (≤ +15) |
| 2 | Headless prod engine for Verikora (`api.sovkora.com`: core 1 GiB at 12, edge 512 MiB at 5) | ADR-022 step 2a | +17 | +24.15 |
| 3 | Verikora opens: prod Postgres 1 → 2 GiB (30.45 − 15.15), web 512 MiB → 1 GiB (12 − 5) | sizes from measured load | +22.30 | +46.45 |
| 4 | Folioviv in prod: one web (5–12), a database inside the prod cluster (0) | ADR-022 step 3 | +5 to +12 | +51 to +58 |
| 5 | Sovkora public | ADR-022 step 4 | +20 to +40 | +71 to +98 |
| 6 | Opening HA: Postgres standby, two web instances | priced from the vendor's page at that step | to be read | — |

Each step after step 1 gets its own plan and cost, and the founder's go.

Step 1, line by line:

| Line | USD / month |
| :-- | --: |
| `orazaka-dev` `core`: 2 GiB `basic-s` (20) → 1 GiB `apps-s-1vcpu-1gb-fixed` (10). Done only if its memory p95 stays under 700 MiB over 7 days (measured in slice 2) | −10.00 |
| The 4th static-only app becomes a static component of `krizaka-com`. DigitalOcean bills nothing for a static site inside a paid app | −3.00 |
| The non-prod Spaces subscription ends: the prod bucket leaves the dev team, and the non-prod state uses the `pg` backend | −5.00 |
| Prod: team and VPC | 0.00 |
| Prod: Postgres, 1 node, 1 vCPU / 1 GiB, 10 GiB (no standby) | +15.15 |
| Prod: Spaces (the state bucket and Verikora's documents bucket) | +5.00 |
| Prod: Verikora web, one 512 MiB container (sign-up closed; engine features off until step 2, because prod never calls a dev host) | +5.00 |
| **Net** | **+7.15** |

The step-1 rule: savings first, prod second. Slice 7 is planned only after slice 6's savings appear on an invoice. If `core` cannot
shrink, the net would be +17.15, which is over the cap. In that case slice 7 stops with the numbers, and the founder chooses
between keeping step 1 at +17.15 or waiting.

## What a security reviewer would refuse, and how it is contained

| Refused | Containment | Guard |
| :-- | :-- | :-- |
| **Today:** a prod bucket in the dev team, which dev-team operator keys can reach | moved to the prod team in step 1; old keys revoked | slice 7 acceptance: the dev token lists no prod bucket |
| One state for all of prod: a bad plan reaches every product | `prevent_destroy` on stateful resources; CI fails a plan that destroys or replaces them; versioned, encrypted state; the founder applies | plan guard in `ci.yml` |
| The non-prod state stored in the cluster it describes | accepted for non-prod only: encrypted, backed up with the cluster, and fully re-creatable by import. Prod never does this | backend check: `envs/prod` must be S3 |
| A dev or CI credential able to change prod | separate team; the prod token is held only in the protected `prod` environment; no apply step in any workflow | slice 4: a non-prod token gets 403 on prod |
| A prod database reachable from non-prod | trusted sources limited to the prod apps; TLS with the CA; role per product without DDL (ADR-022) | slice 4: a connection from non-prod is refused |
| Shared Porkbun and Bunny account keys | operator-only; DNS applied by the founder; prod Bunny zones use per-zone keys | residual, recorded here |
| A machine target with password SSH or no backups | key-only SSH, a firewall, encrypted dumps to object storage, a restore tested in CI | `machine-e2e.yml` |
| Real personal data on non-prod (the newsletter) | counted in slice 2; moved to prod if it holds real people | slice 2 acceptance |
| A bill nobody measured | the invoice is read before step 1 is planned; each paid slice states its cost | founder step in slice 2 |

## Slices (sub-issues of krizaka-internal#2228, in order, Backlog)

1. krizaka-internal#2231 the one stack, the contract, a backend per side
2. krizaka-internal#2232 non-prod imported, daily drift, the step-1 measurements (founder: #2238 billing-read token)
3. krizaka-internal#2233 the machine target, tested on the CI runner
4. krizaka-internal#2234 isolation proofs, weekly
5. krizaka-internal#2235 restore drill of `krizaka-dev-pg` (founder: #2239, < USD 0.25)
6. krizaka-internal#2236 step-1 savings, −18 (founder: #2240)
7. krizaka-internal#2237 step-1 prod pilot base, +25.15, net +7.15 (founder: #2241; needs #2138)

## What needs the founder

- **A read-only DigitalOcean token with billing read, put in the vault** (slice 2), so the bill is measured.
- **The prod team** (krizaka-internal#2138).
- **Each paid apply, with its plan and cost:**
  - the drill fork, < USD 0.25 (slice 5);
  - the savings, −18 (slice 6);
  - the prod pilot base, +25.15 (slice 7);
  - the deletion of the old bucket and keys, after 7 days.
- **The newsletter decision**, if it holds real people.

## Consequences

- One root module serves every environment and provider. A second cloud or a single server is a new adapter, proven by the
  contract test. It never requires a fork.
- On DigitalOcean there are exactly two database clusters, one on each side, and no per-app cluster ever again.
- The company and tool sites stay on non-prod, where they cost what they cost today.
- The prod pilot exists at about +7 USD a month. It cannot use the engine until step 2.
- ADR-022 § 3 and § 5 are read with this ADR's sizes and steps. Its walls, hosts and promotion are unchanged.
