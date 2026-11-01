# ADR-022 — Code-name hosts are dev, commercial hosts are prod, on one shared prod infrastructure rolled out one product at a time

- **Status:** Proposed (the founder amends it on its pull request). Nothing is built, no cloud resource is created and no DNS changes
  with this ADR.
- **Date:** 2026-11-01
- **Decision by:** the founder, 2026-11-01 (krizaka-internal#2126 and its comment; add-ons the same day: « on déploie la prod petit
  à petit, pas d'un coup » and « sa propre infra mais réduction des coûts : un seul cluster, une BD prod »).
- **Supersedes:** the « `www.<product>.com` is the product's public, indexed address » policy of epic krizaka/.github#119, the
  lines of krizaka-com `AGENTS.md` §2 / §2.4 / §2.5 that carry it, and the plan of krizaka-internal#2037 (commercial zones pointing
  at the dev apps, merged in krizaka-infra `stacks/dns`, never applied).
- **Builds on:** ADR-003 (signed service discovery), ADR-014 (Bunny layout v2), ADR-020 (managed document storage), krizaka-infra
  ADR-001 (DNS by pull request, applied by a human).

## Context

Every product runs today on one DigitalOcean App Platform app per product in `tor1` (`yomizaka-dev`, `akinaza-dev`, `orazaka-dev`,
`orazaka-admin-dev`), one managed Postgres `krizaka-dev-pg` (1 vCPU / 1 GB) and a broker droplet. Each app answers on its code-name
hosts (`www.`, apex, `dev.`, `admin.`). Sign-up is closed everywhere; the public opening comes later.

The products' visible names are now commercial (krizaka-internal#2103): **Verikora** (code name yomizaka), **Folioviv** (akinaza),
**Sovkora** (orazaka), **Kridoc** (the managed storage). Their domains (verikora.com, folioviv.com/.app/.shop, sovkora.com,
kridoc.com) are registered at Porkbun with no live record. The visible name is the admin setting `brand.displayName`.

What does not work with « one environment that slowly becomes public »: demo personas and test data share the database real
customers would use; test and live payment keys would sit in the same app; a code change reaches users the minute it merges; and
Verikora's server calls the engine on a dev host (`AI_API_URL=https://dev.orazaka.com/edge`).

## Decision

### 1. Two environments, two families of hosts, no redirect between them

| | Dev (code names) | Prod (commercial names) |
| :-- | :-- | :-- |
| Purpose | integration, demos with the persona cast, recordings, mobile dev builds | real customers, after the opening |
| Web + app + `/api` | `www.yomizaka.com`, `www.akinaza.com`, `www.orazaka.com` | `www.verikora.com`, `www.folioviv.com`, `www.sovkora.com` |
| Apex | 308 → `www.` | 308 → `www.` |
| API, auth callbacks, webhooks for mobile dev builds | `dev.<code>.com` (HTML 308 → `www.<code>.com`, as today) | on `www.<brand>.com` (one host per product; no `dev.` in prod) |
| Engine, server to server | `dev.orazaka.com/edge` | `api.sovkora.com` (no HTML, `noindex`) |
| Admin console | `admin.<code>.com` | `admin.<brand>.com` (IP-gated, host-only cookie, `noindex`) |
| Media of the app (runtime) | Bunny `krizaka-assets`, `apps/<app>/…` (ADR-014) | one Bunny prod storage zone per product, `media.<brand>.com`, same `apps/<app>/<kind>/` layout inside |
| Shops (Folioviv) | `akinaza.shop` | `folioviv.shop`, `*.folioviv.shop` |
| Indexing | **`noindex` everywhere**: robots `Disallow: /`, `X-Robots-Tag: noindex`, `APP_SEARCH_INDEXING=off` | indexed: sitemap, hreflang, canonical on the prod host, Search Console by DNS TXT |

- **No redirect** from a code-name host to a commercial host or back (founder, #2126): they are two different deployments.
- `folioviv.app` (HSTS-preloaded TLD) stays parked until a use is decided. `kridoc.com` waits for § 6.
- The company sites (www.krizaka.com, ui., java., ts., the blog) are not split: they have one environment, as today.
- krizaka.com's product cards link the prod host once a product's prod step is live (`prodUrl` in `lib/products.ts`), the dev
  host before. Code names never appear in rendered text (#2103).

### 2. Promotion: the same artefact goes from dev to prod

- **One build.** main builds the image once and pushes it to GHCR by digest (`ghcr.io/krizaka/<repo>@sha256:…`; public repositories,
  no cost). Dev deploys that digest automatically and runs its smoke and journeys.
- **Release train.** A release-please tag of the product promotes **the same digest** to prod, through one reusable workflow whose
  prod credential lives only in krizaka-infra's GitHub environment `prod` (required reviewer: the founder until the opening, then the
  CTO). Product repositories hold no prod credential; they dispatch the promotion.
- **Migrations** are expand/contract only, run as a pre-deploy job with the product's migrator role. Every release runs on the
  schema of release N-1, so a rollback is « redeploy the previous digest ». No down migration runs in prod.
- **Seed data.** Dev carries the persona cast (one seed per app, krizaka/.github#356). **Prod starts empty** except reference data
  (settings defaults, the price catalogue of ADR-009). The seed entry point refuses `APP_ENVIRONMENT=production` for anything else.
- **Data never crosses.** No dev row is copied to prod; no prod dump goes to dev or to a laptop (Loi 25). A prod bug is reproduced
  with the cast in dev. Restore drills restore prod into a throwaway prod database, destroyed after.
- **Feature flags** are admin settings in the database (`@krizaka/settings`), per environment, audited; prod defaults are off for
  anything not ready. `AUTH_SIGNUP_ENABLED=false` in prod until the founder opens. Code never branches on the environment beyond
  configuration.

### 3. Prod infrastructure: separate from dev, shared across products for cost

| Layer | Dev (unchanged) | Prod |
| :-- | :-- | :-- |
| Provider | DigitalOcean, tor1 | DigitalOcean, tor1 (no real flaw found: Canadian region, managed Postgres with PITR, the team already runs it). Kridoc storage stays on ADR-020's provider. |
| Account | the current team | a **separate team `krizaka-prod`** (own login, own tokens, own billing alerts): a dev token cannot reach prod |
| Compute | one App Platform app per product | **one prod App Platform** in the prod team and VPC, one *app* per product (App Platform bills per container, not per app, so one app per product costs the same as one shared app and keeps each product's env and deploy apart) |
| Database | `krizaka-dev-pg` | **one managed Postgres 18 cluster `krizaka-prod-pg`**: a database per product, a `<p>_migrator` role (owns the schema) and a `<p>_app` role (DML only) |
| Backups | as today | cluster daily backups + 7-day PITR (included), and per-product encrypted logical backups (age) to a prod Spaces bucket so one product restores alone |
| Secrets | `@<product>-dev` in the vault | `@<product>-prod`, all values new, written with `env-set.sh`, never printed; the operator's `doadmin` only in the vault |
| Deploy identity | as today | one prod token in krizaka-infra's `prod` environment, rotated every 90 days |
| Observability | as today | shared: App Platform alerts, an uptime check per prod host, one log sink tagged by product, personal data scrubbed, 30-day retention, founder and CTO only |
| Infra as code | krizaka-infra `stacks/dev/*` | `stacks/prod/shared` (team, VPC, Postgres, Spaces, alerts), `stacks/prod/<brand>` per product, `stacks/dns` records for the commercial zones; OpenTofu, its own state; agents only plan, the founder applies (krizaka-infra ADR-001) |

The existing `stacks/prod/yomizaka-documents` (the Spaces bucket for Verikora's documents) becomes part of Verikora's prod step.
Kubernetes (DOKS) is not chosen for the opening: a cluster's minimum (nodes, load balancer, upgrades) costs more money and more
operations than the handful of containers we run; it is reconsidered when the prod runs more than about ten long-lived services.

### 4. Mobile, OAuth, payments, mail, search

- **services.json per environment** (ADR-003). The signed manifest already has an entry per product and environment; each product's
  prod step adds a `production` entry with its commercial hosts only. Dev entries do not change, so builds already installed keep
  working. Store builds read `production`, internal builds read `dev`; `@krizaka/discovery`'s host allow-list accepts the commercial
  domains (a package release first). No backend address is ever hard-coded.
- **OAuth.** Separate prod clients (Google, Apple) named after the brand, whose redirect URIs list only the prod host. A dev callback
  is never added to a prod client.
- **Stripe.** Dev keeps test keys; prod holds the live keys and the only live webhook endpoint
  (`https://www.<brand>.com/api/webhooks/stripe`). Recommended: one Stripe account per brand (statement descriptor, blast radius).
- **Mail.** Prod sends from `mg.<brand>.com` (SPF, DKIM, DMARC `p=none` then `reject` after two clean weeks); dev never sends from a
  commercial domain. A commercial zone that sends nothing yet has SPF `-all`, DMARC `reject` and a null MX.
- **Search Console / Bing** by DNS TXT on each commercial domain, in `stacks/dns`; never a file or token in a repository.

### 5. Rollout: one product first, smallest viable prod, each step gated and reversible

The pilot is **Verikora**: it is sold first (P0), it is the smallest stack (one web, a backup job, a bucket already written as
code), and its prod stack (`stacks/prod/yomizaka-documents`) and Stripe flow already exist. Its one dependency is the engine:
because a prod product never calls a dev host, the pilot brings a **headless prod engine** (`api.sovkora.com`, core and edge only,
a key per consuming product) — Sovkora's public site comes later.

Every step has the same gate: dev is green (CI and journeys); the preflight passes (`prod-isolation`, `secret-distinct`,
`check-seo-family.mjs` against the prod host, accessibility, a restore drill younger than 30 days); the rollback is written and
rehearsed; the founder applies the plan. A step is reversible: DNS records are removed, an app is scaled to zero or deleted; a
database is never destroyed by a rollback. The next product starts only when the previous one ran **14 days clean** (no Sev1, one
prod deploy and one rollback done, backups fresh).

| Step | What | Issue | Monthly cost, USD (DigitalOcean list prices, to confirm at signing) | Cumulative |
| :-- | :-- | :-- | :-- | :-- |
| 0 | Commercial zones stop pointing at dev apps; prod guards | krizaka-internal#2128, #2129 | 0 | 0 |
| 1 | Prod team, VPC, one Postgres cluster (1 node, 1 vCPU / 2 GB), Spaces; promotion workflow | #2130, #2131 | ~35 | ~35 |
| 2a | Headless prod engine for the pilot (`api.sovkora.com`) | #2132 | 15–30 | 50–65 |
| 2b | **Verikora (pilot)**: one web, backup job, documents bucket, Bunny zone; dev hosts `noindex`; governance docs | #2133, #2134 | 20–35 | 70–100 |
| 3 | Folioviv (after 14 clean days of Verikora) | #2135 | 12–25 | 82–125 |
| 4 | Sovkora public: site, console, broker, workers (GPU runs billed per use, capped in the admin) | #2136 | 20–40 | 102–165 |
| 5 | Scale for the opening, from measured load: Postgres standby, two instances per public web | #2137 | 35–100 | **~135–265** |

Per product at the opening that is about USD 30–70 a month, plus about USD 35–65 for what they share. A mail plan, if the current
one does not cover the new sending domains, adds USD 15–35. Kridoc's storage is costed in ADR-020, outside this range.

### 6. Kridoc — open question

ADR-020 makes managed document storage an option the admin turns on inside the products. It is not settled whether Kridoc in prod
is (a) that option, with `kridoc.com` serving share links and later a console, or (b) a fourth product with its own sign-up, billing
and site. This ADR proposes (a) for the opening, its prod step after Sovkora, its storage on ADR-020's provider (OVHcloud
Beauharnois) rather than the shared DigitalOcean prod, its API on the shared prod. The founder decides (krizaka-internal#2143).

## What a security reviewer would refuse, and how it is contained

| Refused | Containment | Guard |
| :-- | :-- | :-- |
| Dev data in prod (personas, test rows) | prod starts empty; seeds refuse production; no DB copy either way | seed test per repo (#2129) |
| A shared secret between dev and prod | every prod value is new; hashes of each key compared across `@<p>-dev` / `@<p>-prod` | `secret-distinct` (#2129) |
| Prod trusting a dev host | no code-name or `dev.` host in a prod spec, CORS, OAuth client, webhook or services.json entry | `prod-isolation` conformance rule (#2129) |
| A commercial name serving a dev app | the merged-but-unapplied records of #2037 removed before anything is applied | `tofu test` in `stacks/dns` (#2128) |
| A live key in dev | dev specs never reference a live key; live webhooks point at prod only | `prod-isolation` (#2129) |
| A dev or CI token deploying prod | separate DigitalOcean team; the prod token only in one protected environment with a reviewer | GitHub environment rules (#2131) |

**Blast radius of the shared prod, and its walls.** Sharing one Postgres cluster and one App Platform team is the cost choice; what
it shares and how each product stays in its lane:

- **Postgres.** A leaked app role reaches only its own database: `REVOKE ALL ON DATABASE … FROM PUBLIC`, `CONNECT` granted to its
  own roles only, the app role has no DDL, trusted sources are the prod apps only (no IP), TLS with the CA required. A noisy
  neighbour is capped by a `CONNECTION LIMIT` and a `statement_timeout` per role and one pool per database. What remains shared:
  `doadmin` (operator only, in the vault, never in an app or CI), one maintenance window and one major-version upgrade for all, and a
  PITR that restores the whole cluster — which is why each product also has its own logical backup.
- **App Platform team.** Each product is its own app with its own env, so one app's secrets give nothing in another; DigitalOcean
  tokens are scoped by resource type, not by app, so the one prod token is held in a single protected environment, never in a
  product repository.
- **The engine.** Products call `api.sovkora.com` with a key per product, with its own quota and rate limit; a leaked key is revoked
  without touching the others.
- **Media and documents.** One Bunny storage zone per product in prod (Bunny keys are per zone) and the documents bucket's key
  limited to that bucket.
- **Observability.** One sink, tagged by product, personal data scrubbed, access limited to the founder and the CTO.

## What needs the founder (Blocked, `oussama-action`)

krizaka-internal#2138 the DigitalOcean prod team, payment and the budget per step · #2139 Stripe live per brand · #2140 OAuth prod
clients (Google, Apple) · #2141 mail sending domains and Search Console · #2142 legal before the opening (policies under the brand
names, the DigitalOcean DPA, the EFVP, the lawyer review #72; not a blocker while sign-up is closed) · #2143 what Kridoc is. Every
`tofu apply` stays his (krizaka-infra ADR-001).

## Consequences

- Two of everything that holds a secret (vault entries, OAuth clients, Stripe endpoints, sending domains): more setup, on purpose.
- A merge to main no longer reaches customers; a tag does, and only after dev is green.
- The code-name sites lose their indexing; they were never open, so nothing ranks today.
- The epic #119 policy and krizaka-com AGENTS.md are rewritten with the pilot (#2134); until then this ADR wins where they disagree.
- The 301 from the code-name hosts to the commercial hosts on the dev apps (krizaka-internal#2037, and the domain parts of the brand
  slices #2038, #2039) is superseded: their lanes keep the brand strings and drop the redirect.
