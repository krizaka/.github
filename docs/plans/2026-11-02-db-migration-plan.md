# Database migration plan: Flyway on, migrations in the deploy, dev data reset in one click

- **Date:** 2026-11-02. **Epic:** krizaka/krizaka-internal#2255. **Owner:** platform lane. **Status:** approved by the founder (go for the dev reset given, no dev data to keep).
- **Reads:** sovkora `docs/PRODUCTION_READINESS_AUDIT.md` §2.2, `docs/DEV_DATABASE.md`, `docs/ARCHITECTURE_ASSESSMENT.md` (Flyway, T2), krizaka-build branch `feat/flyway-baseline-2255` (ae30aa3), verikora#705, ADR-022, ADR-023.

## 0. Decisions this plan applies

1. **Flyway is on** in every Java service. verikora keeps its own migrator (`apps/web/lib/db.ts`, `migrate()` under a lock), folioviv keeps Drizzle (`packages/db/drizzle`).
2. **The deploy applies the migrations, never a person.** `psql -f`, `scripts/dev-db-migrate.sh` and the hand ledger `dev_migration_ledger` are retired once the reset is done.
3. **Dev data is disposable.** The 8 product databases start again from zero, then a seed loads the **dev prototype dataset**. The founder gave the go. The backup is a cheap safety net, not a gate.
4. **"Reset dev" is a repeatable one-click operation**, the same locally and on dev, and it can never reach prod. It is not a one-time window.
5. **The dev prototype dataset is versioned data in the repos**, reviewed like code. It lets a human walk every main flow as a real user (§ 7).
6. Out of scope, never touched: `krizaka_newsletter` (possible real subscribers), `krizaka_accounts` (not a product database), `defaultdb`, `_dodb`, `tofu_state`, and the founder's cockpit (local SQLite, no connection to the cluster: inventory comment on #2255).

## 1. Target per database

**Roles (ADR-023 § 2, `database` module outputs `migrator_url` / `app_url`):**

- **owner** = the existing role of the same name as the database. It owns the schema and is the only one that runs DDL. It is used only by the migrator, on the **direct port 25060** (Flyway takes a session advisory lock, which the transaction pooler on 25061 would break).
- **runtime** = a new role `<db>_app`. It gets `USAGE` on the schemas and DML on the tables and sequences, given through `ALTER DEFAULT PRIVILEGES FOR ROLE <owner>`. No DDL, no `TRUNCATE`. It is what the pools (`pool-*`, 25061) bind to.
- The owner keeps its current password, so no rotation is needed. Only the new runtime role gets a new password, stored in the vault under `@<p>-dev`.
- **Extensions** need an admin: pgvector is not a trusted extension. They are created by the **bootstrap** (krizaka-infra, as `doadmin`, at provisioning time), never inside a `V` file. A `V` file may only *assert* that an extension exists (`SELECT 1 FROM pg_extension WHERE extname='vector'` raises if it is missing), so a missing bootstrap fails loudly.

| Database | Owning service(s) (repo) | Migrator · history table | V1 baseline = | Extensions (bootstrap) |
|---|---|---|---|---|
| `krizaka_users_db` | users (krizaka-build `krizaka-users`) | Flyway · `flyway_schema_history` (V1..V6 exist) | `V1__users_baseline.sql` (branch ae30aa3); V2–V6 stay | none |
| `krizaka_billing_db` | billing (krizaka-build `krizaka-billing`) | Flyway · `flyway_schema_history` | `V1__billing_baseline.sql` (branch): 70-billing + the folded `infra/migrations` (incl. `2026-10-30-offers-versioned`) | none |
| `sovkora_db` | conversation, job, ai-engine governance (3 repos, one database) | Flyway, **one history table per context**: `flyway_history_conversation`, `flyway_history_job`, `flyway_history_governance` | 20-conversation, 30-jobs-config, 60-governance + the folded workspace `infra/migrations/*` of each context | `vector` (job) |
| `sovkora_studio_db` | studio (sovkora-studio) | Flyway · `flyway_schema_history` | 80-studio + its 3 migrations | none |
| `sovkora_knowledge_db` | knowledge (sovkora-knowledge-service) | Flyway · `flyway_schema_history` | 40-knowledge + migrations | `vector` |
| `sovkora_automation_db` | automation (sovkora-automation-service) | Flyway · `flyway_schema_history` | 50-automation + migrations | none |
| `verikora_db` | verikora web (+ mobile backend) | verikora `migrate()` · its own history | `0001_baseline` (exists since #697/#705) | per its baseline |
| `folioviv_db` | folioviv web | Drizzle · `drizzle.__drizzle_migrations` | `0000_baseline.sql` (exists) | `btree_gist`, `pg_trgm`, `unaccent` (moved from the baseline to the bootstrap) |

The platform kit's JDBC stores (`KrizakaMigrations`, history `krizaka_schema_history`, Java migrations) stay where they are and run **after** the service's Flyway (`@DependsOnDatabaseInitialization`, branch ae30aa3). Any service that uses the kit therefore has two history tables, and they never mix.

**What a V1 holds.** The schema, plus the **reference data the product needs in every environment** (plans, pricebook, model registry, grants, consent statements). It holds no persona, no demo row and no `90-dev-fixtures`. Those belong to the seed (§ 7).

**Flyway settings** (every Java service, one shared default in krizaka-build `krizaka-platform-kit/krizaka-persistence` so the services do not repeat it):

- `enabled: true`, `validate-on-migrate: true`, `clean-disabled: true`, `out-of-order: false`.
- `baseline-on-migrate: true` **only until the first reset** (it adopts today's databases while the slices land). It becomes `false` in the post-reset PR: from then on, a non-empty database without history is an error, not something to adopt.
- `spring.flyway.url/user/password` are the **migrator** credentials (direct, owner role). They are distinct from `spring.datasource` (runtime role, pool). The variables are named by context and declared once (`DATABASE_<CTX>_MIGRATOR_URL`, `DATABASE_<CTX>_URL`, …; the org naming rule).

**Cross-context foreign keys (SEAM-001).** There is no FK between two contexts, including the three contexts that share `sovkora_db`. A reference to another context is an id column with no constraint, and the link is checked by the service. `SqlBoundaryRules` (sovkora-build) scans `src/main/resources/db/migration/**` in addition to `infra/initdb/**`. A `REFERENCES` to a table that another context's V files create fails the build. There are no cross-database FKs (PostgreSQL cannot have them).

## 2. The steps, in order

Each step has an entry and an exit. Until step E, everything is undone by reverting PRs. After E, dev is rebuilt by running the reset again: there is no dev data to restore.

### A. Code: one PR per repo, in dependency order (each `--refs 2255`)

| # | Repo | Content | Lane |
|---|---|---|---|
| A0 | krizaka-infra | `database` module: runtime role `<db>_app` + default privileges, extensions in the bootstrap, outputs `migrator_url`/`app_url` per database; `prevent_destroy` kept (the reset never drops a database, see E) | platform |
| A1 | krizaka-build | **the existing branch `feat/flyway-baseline-2255`**: users + billing V1, Flyway flags, kit after the service, empty-DB-twice ITs; plus the shared Flyway default and the migrator/runtime split in `krizaka-persistence` | platform |
| A2 | sovkora-build | `SqlBoundaryRules` on `db/migration/**`; `SeedBootstrapIT` applies the V files instead of initdb; a reusable `MigrationContract` test fixture (empty twice, upgrade from the previous release, validate); BOM bump to A1's release | platform |
| A3–A8 | sovkora-conversation-service, sovkora-job-service, sovkora-engine, sovkora-knowledge-service, sovkora-automation-service, sovkora-studio | V1 = initdb + folded migrations − fixtures; Flyway on with their history table; `infra/initdb` keeps only role, database and extension creation for local compose; `MigrationContract` IT | sovkora |
| A9 | sovkora (workspace) | `dev-redeploy`: migrations before traffic + post-deploy schema-version check (C); local compose = same Flyway; `dev-reset` (step R); `DEV_DATABASE.md` rewritten; `dev-db-migrate.sh`, `dev-migrations.mjs` and the ledger retired after E; sovkora#575 log net kept | platform |
| A10 | verikora | migrations in the pre-deploy job on the direct URL (already started by #705), runtime role on the pool, `dev:seed --cast` completed for § 7, empty-DB + upgrade tests kept | verikora |
| A11 | folioviv | `drizzle migrate` in a pre-deploy job (owner, direct), extensions moved out of the baseline, empty-DB-twice + upgrade test, `dev:seed` completed for § 7 | folioviv |
| A12 | krizaka/.github | the cast file `personas/dev-cast.json` (names, roles, product, the vault key of each credential; no secret), its schema test; this plan | platform |

**Entry:** this plan is merged. **Exit:** every PR is merged, green, and released (the Java modules on Central, the BOM bumped).

**Proof before E (read only).** `scripts/schema-diff.mjs` compares `pg_dump --schema-only` of each current dev database with a database built from the V files in a container. Every difference is either fixed in V1 or written down as dead. This catches initdb drift, the same kind as the 8 files `verify` found in #442.

### B. CI proofs (held by every repo with a migrator; required checks)

1. **Empty database, applied twice.** Migrate, start the service, migrate again: 0 pending, `validate` OK.
2. **Upgrade path.** Build the schema from the **previous release** (Java: the `db/migration` of the previous version's jar, resolved from Central; apps: the migration folder of the previous tag), insert a few rows from the seed, then apply the new files. The service starts, and the seed rows are still readable. Every migration must be expand/contract: the previous release must still run on the new schema, because a failed deploy keeps the previous release running on that schema.
3. **`validate-on-migrate`** is on in tests, and editing an applied file fails (checksum).
4. **Release guard:** a release fails if a migration file in the tree is missing from what the migrator lists (`flyway info` / the Drizzle journal / verikora's list).
5. **SEAM-001:** `SqlBoundaryRules` on `db/migration/**`.

**Exit:** the 5 checks are required on main of krizaka-build, sovkora-build, the 6 services, verikora and folioviv.

### C. Deploy pipeline

- **Migrations before traffic.**
  - Java: Flyway runs at startup on the migrator URL, before the readiness probe. A failure means no health, so DigitalOcean keeps the previous deployment and the deploy fails.
  - verikora and folioviv: a `PRE_DEPLOY` job. A failure stops the deploy.
- **Connection budget.** The migrator opens one direct connection per service at boot and closes it. Startups are sequential inside `core`. `DEV_DATABASE.md` reserves the slot (22/22 today: the `doadmin` slot is the one migrations use, so this must be measured by `db-connections.mjs` during the first reset).
- **Post-deploy check** (`dev-redeploy.mjs --check`, and the same step in the verikora/folioviv deploy workflows): for each database, the highest successful version in the history equals the highest version in the released artifact. A mismatch fails the run and opens an alert. `/health` exposes `schemaVersion` per service (admin "Health" page, #885).
- **Exit:** a deliberately broken migration in a test branch fails the dev deploy, and dev keeps serving the previous version.

### D. Backup (safety net, not a gate)

`pg_dump -Fc` of the 8 databases is written to `~/.krizaka-private/backups/dev-2026-11-02/` (private, never in a repo or a public bucket), with one test `pg_restore` of `sovkora_db` into a scratch database. If it costs more than 10 minutes, skip it: the founder accepted the loss.

### E. The first reset of DEV, run with the reset tool (R)

- **Entry:** A0–A12 merged and deployed, B required, C live, the schema diff explained.
- **Order:**
  1. `krizaka_users_db`, `krizaka_billing_db`
  2. `sovkora_db`, `sovkora_studio_db`, `sovkora_knowledge_db`, `sovkora_automation_db`
  3. `verikora_db`, `folioviv_db`

  There are no cross-database FKs. The order exists for the seed: identities, then plans and grants, then the engine, then the apps.
- **How the data is cleared.** Connected as the **owner** role in each database: `DROP OWNED BY <owner> CASCADE`, then `CREATE SCHEMA public AUTHORIZATION <owner>`.
  - The database, its roles, its pools and the extensions (owned by `doadmin`) remain, so OpenTofu sees no drift and `prevent_destroy` holds.
  - The owner credentials cannot reach `krizaka_newsletter` or `krizaka_accounts`.
- **Duration and impact.**
  - It takes about 20 min, mostly the `core` rebuild.
  - Unavailable meanwhile: the dev sites of the products being reset (dev.sovkora.com, dev.verikora.com, dev.folioviv.com), their APIs and the mobile builds pointed at them.
  - Not affected: www.krizaka.com, the blog and its newsletter, ui./java./ts., accounts, the cockpit.
- **Exit:** § 2 F, G and H are green.

### F. The first deploy creates the schemas

The reset triggers the products' deploys. The migrations run from V1 on empty databases, and C's check matches. Then the post-reset PR sets `baseline-on-migrate: false` and retires the ledger and `dev-db-migrate.sh` (A9).

### G. Seed: the dev prototype dataset

The products' own seeds load the cast and the demo data (§ 7), idempotently. It is the same command locally (compose) and on dev.

### H. Verification

- Every service reports `/health` UP with the expected `schemaVersion`.
- `dev-persona-smoke.yml` passes: each persona signs in on each product.
- The live journeys of § 7 pass, run by the e2e suites (Playwright/Maestro) against dev.
- `db-connections.mjs` stays under 80 %.
- The cockpit's `npm test` passes.
- `dev-redeploy --check` stays green over the next 2 runs.

### I. Rollback at each step

| Step | Rollback |
|---|---|
| A | revert the PR (dev keeps running, `baseline-on-migrate` adopts) |
| B | nothing to undo (checks only) |
| C | revert the workflow PR. A failed deploy is already rolled back by DigitalOcean |
| D | none needed |
| E–G | rerun **R** (drop + migrate + seed). If the code itself is wrong, revert to the last good release, then rerun R. Restoring D's dump (`pg_restore` as owner) is possible but is not the plan |
| H | as E–G |

### R. Deliverable: "Reset dev data" in one click (built in A9, used in E, kept for good)

- **One command:** `node scripts/dev-reset.mjs <verikora|folioviv|sovkora|all> --target <local|dev>`, wrapped in a `workflow_dispatch` called "Reset dev data" in the sovkora workspace (input: product). It runs in the GitHub environment `dev`, which holds only `@<p>-dev` owner credentials.
- **Steps per product:**
  1. clear the product's databases (E's statement)
  2. trigger the product's deploy and wait for health; locally, `docker compose up` and the services' Flyway
  3. run the C check
  4. run the product's seed (G)
  5. run the persona smoke
- **Guards, all tested.**
  - The target host must equal the dev cluster's id and host from the non-prod OpenTofu outputs.
  - `APP_ENV` must be `dev` or `local`.
  - The database names must be in a closed list of the 8; any other name is refused before connecting, including the excluded ones.
  - Prod credentials never exist in the `dev` environment or on a non-prod runner (`secret-distinct`, krizaka-internal#2129), and a non-prod token gets 403 on prod (ADR-023 slice 4).
  - A `prod`, `verikora`, `folioviv`, `sovkora` or `kridoc` host in any URL is refused.
- **Logged:** a job summary (who, when, products, versions, seed counts, smoke results) and one JSON line appended to the run artifact. No secret is printed (`redact.py`).
- **Tests:** unit tests of the guards (a prod host, an excluded database, a wrong `APP_ENV`: each is refused), the order, and idempotence (run R twice locally gives the same counts); a CI job runs `--target local` end to end on compose.

## 3. Risks and how each is covered

| Risk | Cover |
|---|---|
| A cross-context FK (inside `sovkora_db`) | SEAM-001 on `db/migration/**` (A2), plus a schema test that lists `pg_constraint` FKs per history table |
| Sequences and identity columns after the seed | the seed uses stable UUIDs; the few serial tables get `setval(max)` in the seed; the empty-twice test reads `nextval` |
| Extensions (non-trusted pgvector) | created by the bootstrap as `doadmin`; V files assert; reset keeps them (owned by `doadmin`) |
| Roles and grants | runtime role with default privileges from the owner; a test connects as the runtime role and proves DML works and DDL fails |
| initdb drifted from migrations | schema diff before E; V1 fixed, not the database |
| Flyway behind the transaction pooler | migrator on the direct port only; test config is the same |
| Connection ceiling (22/22) | one short direct connection per service, sequential; measured during E |
| Two migrators in one database (service + kit) | separate history tables; kit after the service (branch ae30aa3) |
| A deploy running ahead of its database (the billing 500 of 2026-11-02) | migrations in the deploy + C's version check + sovkora#575 log net |
| Secrets | no rotation: owners keep theirs; only the new runtime roles get new vault entries |
| Newsletter and accounts | outside the closed list; the owner credentials used cannot reach them |
| Data the founder might want | answered: none on dev (go of 2026-11-02) |
| A reset reaching prod | § R guards + separate team, credentials and network per ADR-023 |

## 4. The same plan for PROD (ADR-023)

What is the same: the same V files, the same migrator, the same pipeline order (migrations before traffic, failure stops the deploy, version check after), the same CI proofs.

What differs:

- **There is never a reset** and `dev-reset` refuses prod by construction.
- The prod database is created **empty** by the prod OpenTofu stack: bootstrap (roles, extensions), then the deploy runs V1..Vn. `baseline-on-migrate` stays `false`, because there is nothing to adopt. It is used only if a database that already exists is ever adopted, and then with a schema diff first.
- Nothing is copied from dev (Loi 25). The seed loads **reference data only**, which lives in the V files, never the persona cast.
- Backups: managed PITR, plus a nightly encrypted `pg_dump` per database to a private S3-compatible bucket, with a restore drill on a scratch database each month.
- Migrations follow the expand/contract rule strictly. A destructive change ships in two releases.
- Every prod deploy that carries a migration needs a dump taken in the same run.
- Credentials are `@<p>-prod`, the apply token is prod-only, and the prod network trusts only the prod apps.
- Order: Verikora first (ADR-023 step 1), then the engine, then Folioviv and Sovkora.

## 5. Who does what

| Step | Lane | Oussama |
|---|---|---|
| A0, A1, A2, A9, A12, R | platform | — |
| A3–A8 | sovkora | — |
| A10 | verikora | — |
| A11 | folioviv | — |
| B | each lane, in its PRs; the platform lane makes them required | — |
| C, D, E, F, G, H, I | platform (executor), with the product lanes for H | go already given (2026-11-02) |
| Review of roles, grants and the R guards | security | — |

## 6. Checklist (mirrored on #2255)

- [ ] A0 krizaka-infra: runtime roles, bootstrap extensions, migrator/app URLs
- [ ] A1 krizaka-build: users + billing on Flyway (branch `feat/flyway-baseline-2255`)
- [ ] A2 sovkora-build: SEAM-001 on db/migration, MigrationContract fixture, BOM
- [ ] A3–A8 the 6 Sovkora services on Flyway (V1 baselines)
- [ ] A9 sovkora workspace: deploy order, version check, dev-reset, docs
- [ ] A10 verikora: pre-deploy migrations, runtime role, seed for § 7
- [ ] A11 folioviv: pre-deploy Drizzle, extensions out, seed for § 7
- [ ] A12 .github: dev cast file + schema test
- [ ] B the five CI proofs required everywhere
- [ ] C deploy: migrations before traffic, failure stops, version check
- [ ] Schema diff of dev vs V files explained
- [ ] D best-effort dump (optional)
- [ ] R "Reset dev data" one click, guarded, tested
- [ ] E + F + G first reset of the 8 databases, schemas from V1, seed
- [ ] H verification: health, persona sign-in, § 7 journeys, cockpit
- [ ] post-reset PR: `baseline-on-migrate: false`, ledger retired

## 7. The dev prototype dataset, and the acceptance test of the reset

**Cast.** It is defined once in `krizaka/.github` `personas/dev-cast.json` (.github#356: one cast, one seed per app) and is the same locally and on dev.

- The QA personas **Eric**, **Camille** and **Mira**, plus the Sovkora accounts **PERSONA** and **KRIZAKA** (admin).
- Credentials come from the vault, read at seed time. They never appear in a repo or a log.

**Per product data.** Each product seeds coherent demo data, marked as demo, from files reviewed in its repo:

- verikora: `scripts/demo-seed`
- folioviv: `packages/db/src/seed*.ts`
- Sovkora: the seed in the workspace, through its admin APIs

The seeds are idempotent upserts on stable ids, and running one twice changes nothing.

**Acceptance journeys.** Each is run end to end as a persona, first by the e2e suites, then once by a human after E.

| Product | Journey |
|---|---|
| **Verikora** (verikora) | sign in → upload a document → the check runs → report → signed PDF downloaded |
| **Folioviv** (folioviv) | public shop page → book a slot (no double booking) → invoice with GST/QST → owner dashboard shows the booking and the tax ledger |
| **Sovkora** (sovkora) | sign in → a chat turn → a Studio run with its result → admin settings, including `brand.displayName`, saved and shown |
| All | each persona signs in on each product where the cast gives them an account; the cockpit is unaffected |

The reset is done only when every journey is green.
