# ADR-028 — The Security, Observability & SRE lane: one Grafana per environment, reading surfaces as code checked on every push, SLOs, load tests and the service graph

- **Status:** Proposed. The lane, the strategy, the reading surfaces, SLOs, load tests and the service graph are delegated to
  the CTO. The prod stack, the tokens, the alert channel and the processor agreement are **the founder's**
  (§ « What the founder decides »). None of those is taken here.
- **Date:** 2026-11-07
- **Issue:** krizaka-internal#2817. **Epic:** krizaka-internal#2816, a child of the ops epic krizaka-restricted#272. It folds in
  krizaka-internal#2702 (closed as a duplicate) and krizaka-internal#2805 (an alert reaches the founder and starts a session).
- **Builds on:**
  - [ADR-022](ADR-022-dev-and-prod-environments.md) (« one sink, tagged by product, personal data scrubbed »);
  - [ADR-023](ADR-023-one-iac-stack-prod-nonprod-separation.md) (prod and non-prod walls);
  - [ADR-026](ADR-026-automation-strategy.md) (shared bins in `@krizaka/config`, one hook chain, guards in the matrix);
  - [ADR-027](ADR-027-architecture-as-code.md) (C1/C2 « current » from code: the runtime graph sits next to it);
  - the org policy ([policy.md](../standards/policy.md), krizaka-internal#2781).
- **Asked by:** the founder, 2026-11-07:
  - « il doit s'attaquer à Grafana : il doit définir une stratégie, un lien pour l'env de dev et un lien pour l'env de prod, et à
    chaque push il doit s'assurer de la conformité pour atteindre son objectif de construire des dashboards Grafana utilisables ;
    s'il manque un truc il le corrige, ou il fait évoluer ou reformate selon son besoin. C'est une vraie ligne, mais pas en
    continu. »
  - Then, the same day: « il évolue aussi SRE en plus, et il doit configurer Grafana avec des tests de charge » ;
    « peut-être ça va me donner aussi une vue sur les assets qui communiquent entre eux » ; « les liens dans le cockpit » ;
    « le cockpit peut lire ses métriques de Grafana aussi ».
  - On his own Grafana Page: « je préfère cette version… s'il peut aller dans cette direction… sauf s'il y a un bloquant », and
    « il doit cleaner tout ce bordel ».

## Context

Measured on 2026-11-07 against the stack's API (read-only, with the stack token read through `secret.sh @observability`) and the
reference copies:

- **One Grafana Cloud stack exists**: Grafana 13.4, region `prod-ca-east-0` (Canada), on the **free tier**. The free tier allows
  **one stack per account**; the self-service paid plan allows three
  ([Grafana Cloud stack tiers](https://grafana.com/docs/grafana-cloud/security-and-account-management/cloud-stacks/stack-pricing-tiers/)).
  The founder calls it the non-prod one (2026-11-05: « Grafana pour la non-prod, puis la prod petit à petit »).
- **What reaches it:** only the public sites' probes (krizaka-infra#75, Synthetic Monitoring: 2 Canadian locations, every
  15 minutes, one alert rule mailing the contact point).
  - No app sends a metric, a log or a trace.
  - The Java starter `krizaka-observability` emits ECS JSON logs, the Prometheus endpoint and traces sampled at 10 %, but
    nothing receives them.
  - No TypeScript app is instrumented.
  - Grafana's Observability app (Services, Databases, Pods, Nodes) shows « No … found ».
- **Drift already:** the probes code declares 11 checks and the live stack runs 13. The two extra are retired code-name health
  checks.
- **The stack's address is typed by hand** in two places: the cockpit's company sheet and krizaka-infra
  `scripts/observability_probes.py`. The local config holds a key `observabilityStack` that no tool reads.
- **The Security lane** is a log of handoffs with no mission. `lane-dispatch.py` starts only the product lanes and the
  incubation review. A red scheduled guard stayed unseen for six days (krizaka-internal#2805).
- **Observability issues already existed**, scattered:
  - an epic per app, krizaka-internal#2702, now folded in;
  - the ops epic krizaka-restricted#272 with its slices (#297 engine telemetry, #315 uptime, #2150 TypeScript facade, #2456
    incident policy);
  - the probes, krizaka-internal#2631.

  Of the 20 open issues about security, observability or SRE, 6 carried `lane:security` and none sat under one epic.

## Decision

### 1. The lane: Security, Observability & SRE

The lane keeps its id `security` (label `lane:security`, file `tools/lanes/security.md`, `session-start security`): a rename
would break the labels, the board and the tools. Its title becomes **Security, Observability & SRE**.

**Mission.**
1. **Security.** The org's guards stay green and every alert is acted on: the scheduled guards, the actions audit,
   Scorecard, the public-issues scan, the container scan and the advisories.
2. **Observability.** Usable reading surfaces for dev and prod, as code, conformant on every push. When something is missing,
   the lane fixes it:
   - a reading surface or a dashboard;
   - a required signal: a small pull request in the app's repository;
   - a probe;
   - a convention, which it evolves or reformats. A convention change goes through this ADR or a successor.
3. **SRE.** SLOs per app and alerts that burn an error budget; a path from an alert to a human; incident notes; the
   capacity view; load tests as code; the service graph of what talks to what (§6–§8).

**Triggers.** It never runs continuously.

| Trigger | When | Model |
| :-- | :-- | :-- |
| On demand | the founder or the CTO: `lane-dispatch.py start security --reason <text>`, or a session opened by hand | as the task needs (`modelByTask`) |
| On alert | an `alert` issue of the lane open for more than 24 h that no session holds (krizaka-internal#2805): the founder is notified once a day per alert, and one session starts on the oldest. A firing Grafana alert, including an SLO burn, becomes such an issue through the watchdog (krizaka-internal#2824) | Sonnet |
| Weekly check-in | every 7 days, like the incubation review. It reads the matrix columns of the lane, the provisioning plan, the probes plan and the SLO budgets, and it runs the weekly load test | Sonnet |

**Caps:**
- at most **1 automatic session per 24 h** (alert or check-in together);
- on-demand sessions are counted but not refused;
- per session: the product lanes' caps (80 turns, 10 USD, 90 minutes);
- the crack's switch, `lane-dispatch.py auto off` and the freeze stop every automatic start;
- the numbers move to the session settings of the policy epic (krizaka-internal#2781 step 3) and are never typed twice.

**Done, for a session:**
1. The trigger is resolved. For an alert: the alert issue is closed with the green run as proof, or an issue is filed with the
   cause and linked from the alert. For a check-in: its report.
2. The lane's numbers are **not worse than at the start**. The handoff gives them before and after:
   - `observability-dashboards` x/y;
   - the open findings of the dashboards check;
   - the provisioning plan's pending changes;
   - the error budget left per app;
   - the last load-test verdict.
3. Every change went through `pr-open` and the train.
4. The handoff is appended, then `session-end`.

A session never applies to prod, never load-tests prod, and never creates an account, a token or a paid plan. Those go to the
handoff for the CTO.

### 2. One Grafana per environment, the links in one place, the cockpit block

- **One stack per environment**, shared by the products and tagged by product (ADR-022). Its walls follow ADR-023: separate
  credentials, and nothing from dev in prod.
  - **dev** = the existing Canadian stack.
  - **prod** does not exist (§ « What the founder decides »). Until it does, no prod application data goes to Grafana.
  - The public sites' probes stay on the dev stack: they measure public pages from outside and carry no customer data. They
    move to the prod stack when it exists.
- **The one place for the links: `policy.json`** (krizaka/.github), section `observability`:

  ```json
  "observability": {
    "provider": "grafana-cloud",
    "environments": { "dev": { "console": "https://<dev stack>.grafana.net" }, "prod": { "console": null } },
    "dashboards": { "enforcement": "warn" }
  }
  ```

  The readers:
  - the cockpit, from the reference copy;
  - the lane, through `tools/policy.py`;
  - the provisioning and probe scripts;
  - the dashboards check, through the hook chain's `readOrgFile`;
  - the onboarding docs, which link the policy and the cockpit instead of typing the address.

  A link is `<console>` plus Grafana's own path (`/d/<uid>`, `/a/…`, `/alerting/list`). No other file types the address.
  krizaka-internal#2819 removes the two copies and the dead local key, with a grep as proof.

- **Why the policy and not the org JSON.**
  - The org JSON is the public service discovery that **clients** resolve at start. It is published on the CDN with each
    `@krizaka/org` release, and its own test refuses an internal host. An operator console is not something a client
    resolves, and putting one there would change a contract the mobile apps read.
  - The policy is what the org's guards, crons, tools and cockpit already read. It is closed by its schema and reviewed by
    the founder (CODEOWNERS). A new stack is a money and account decision, so it should need his review.
- **The amendment to the policy.** [policy.md](../standards/policy.md) says « no addresses ». It gains one narrow exception:
  `observability.environments.<env>.console` is the `https://` origin of an operator console (no path, no query, no
  credential), pinned by an `enum` in the schema. A new stack is therefore a schema change. The test that refuses a key named
  like `url`, `token` or `key` stays.
- **The address is public**, like the whole policy. Grafana Cloud asks for a grafana.com sign-in. On 2026-11-07 an anonymous
  call answered 401 and the stack had 0 public dashboards; both stay so, and the lane's check-in reads both through the API.
  Hiding the address would be obscurity, which the org already refused for action pins.
- **The cockpit's « Observabilité » block** (krizaka-internal#2838).
  - **Links:** the Grafana home, the reading surfaces, the k6 project, Synthetic Monitoring, the alert rules, and dev and
    prod. Prod shows « à créer » while its console is `null`.
  - **Headline numbers per app, read live:** up now, availability against the SLO target, p95 latency, error budget left, open
    alerts, the last load-test verdict. Each number links to its reading surface. The cockpit never rebuilds Grafana.
  - **How it reads them:**
    - server-side only, in a cockpit route, through the stack's Prometheus query API;
    - with a **read-only** token named `OBSERVABILITY_METRICS_READ_TOKEN` (`secret.sh @observability`), separate from the
      provisioning token;
    - cached about one minute;
    - an unreachable stack shows « indisponible », never a made-up 100 %;
    - the parser is tested on recorded responses (up, down, no data, error).

### 3. Reading surfaces: the founder's register, as code

**Grafana Pages were evaluated first, and they are blocked as code.** The founder built « krizaka.com · Seen from outside »
with Grafana's new **Pages**. Its register is better than a grid of panels, but a Page cannot be kept as code today:
- **Public preview.** « breaking changes might occur prior to the feature being made generally available », and Grafana's
  life cycle says public preview is « not meant to be used in production environments »
  ([Pages docs](https://grafana.com/docs/grafana-cloud/platform/grafana-assistant/configure/pages/),
  [release life cycle](https://grafana.com/docs/release-life-cycle/),
  [announcement 2026-10-19](https://grafana.com/whats-new/2026-10-19-introducing-grafana-pages--build-anything-on-your-data--right-inside-grafana/)).
- **No content in the API.** The API (`assistant.ext.grafana.app/v0alpha1`, `pages`) is an alpha version. Its spec holds only
  the catalogue fields (`title`, `description`, `tags`, `category`, « kept in sync by the Assistant on publish »). The page
  itself is built by the Assistant and runs in a sandboxed frame. There is no documented export, import, provisioning or
  schema, so there is nothing to store in a repository, review, lint or provision.
- **Not readable by our tooling.** The stack's admin service account lists 0 pages: draft and published pages carry their
  own permissions.
- **Variables and environments:** not documented.

So the **reading surface** is a Grafana dashboard written in the founder's register. A detail dashboard (grids, many series)
exists only where a reading surface cannot answer.

The register, held by the check (§5):
- a first text panel with a serif title, one line « what a visitor (or a user) gets », and a source line naming the signal
  and the file in the repository;
- one sentence for « right now » (« All selected probes answering » or « A probe is failing: see the table »);
- **one table row per probe or service**: up now, availability against its SLO target, failed runs or errors, HTTP status,
  certificate days with its < 21 d alert, and an up/down band;
- a footnote legend that says what each column means and what to do when it turns red;
- the filters stay small (job, instance); the data source variable is hidden and selected by name, never by uid;
- the tag `reading-surface`; reading surfaces come first in the `krizaka` folder.

Proof: « krizaka.com · Seen from outside » runs on the dev stack (uid `krizaka-com-overview`, folder `krizaka`), with real
probe data and `dashboard-linter --strict` at 0 findings. The screenshot is in the pull request. If Pages reach general
availability with an export or a schema, this section is revisited, and the reading surfaces may move to them.

### 4. Which signals, from which sources: the Grafana Cloud features we use

Each app is described by the kind of its repository (`repos.json`). Its reading surface must show the signals of that kind. A
signal is present when a panel's query reads one of its metrics, so it survives an edit in Grafana. The table is data, shipped
with the check (krizaka-internal#2820), and explained in `docs/standards/observability.md` (krizaka-internal#2823).

| Signal | Metrics (any of) | site | web app | service |
| :-- | :-- | :-: | :-: | :-: |
| Availability, from outside | `probe_success` | ✓ | ✓ | ✓ |
| Latency, from outside | `probe_duration_seconds`, `probe_http_duration_seconds` | ✓ | ✓ | |
| HTTP status | `probe_http_status_code` | ✓ | ✓ | |
| Certificate | `probe_ssl_earliest_cert_expiry` | ✓ | ✓ | |
| Rate, errors, duration (RED) | `http_server_requests_seconds_*` (Micrometer), `http_server_request_duration_seconds_*` (OpenTelemetry) | | ✓ | ✓ |
| Saturation (USE) | `process_cpu_usage`, `jvm_memory_used_bytes`, `hikaricp_connections_pending`, `krizaka_outbox_*` | | | ✓ |
| Errors in logs | a logs query on `level="error"` | | ✓ | ✓ |
| Business events | a counter `<product>_<event>_total` | | ✓ | ✓ |

**Today only the « site » column has data** (the probes). A web app or a service is required to show RED, saturation, logs
and business events only once its instrumentation lands. Until then, the check reports those signals as « waiting for
instrumentation », never as green.

**The Grafana Cloud features, one row each.** The free-tier limits come from [grafana.com/pricing](https://grafana.com/pricing/)
(2026-11-07). Anything paid is the founder's decision.

| Feature | What it shows | What fills it, from which emitter | App or infra | Free tier | Priority |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Synthetic Monitoring | availability, latency, status and certificates seen from outside | probes as code (krizaka-infra) | infra | 100k API and 10k browser executions/month; we use about 75k | **now** (live) |
| Reading surfaces and dashboards | the founder's view per app | the JSON in each app's repository | both | included | **now** (krizaka.com live) |
| Alerting | rules, contact point, routing | rules as code from `slo.json` | both | included | **now** (1 rule); burn-rate rules with krizaka-internal#2839 |
| SLO | targets, error budgets, burn | `infra/observability/slo.json` | app | not listed on the pricing page | **now** as plain recording and alert rules; the SLO app only if free (to check) |
| k6 Performance | load-test runs and trends | k6 scripts in each app's repository, dev only | app | 500 virtual-user hours/month, 14-day retention | **now** (test proven locally; results need a k6 token) |
| Application Observability (Services) and the service graph | RED per service and who calls whom | OpenTelemetry: the Java starter (Sovkora services), `@krizaka/observability` (web apps), the Python SDK (workers) | app | 2,232 host-hours/month | **at the thaw** (product repos frozen; needs the ingest token) |
| Logs (Loki) | error logs next to the metrics | ECS JSON logs over OTLP, redacted first | app | 50 GB/month, 14 days | **at the thaw**, after the shared redaction |
| Traces (Tempo) | one request across services | OpenTelemetry spans with W3C context | app | 50 GB/month, 14 days | **at the thaw** |
| Frontend Observability (Faro) | real-user errors and web vitals | Faro SDK in the web apps, no personal data | app | 50k sessions/month | **at the thaw**. The app is enabled with 0 apps configured. The `frontend-observability-asserts` folder is created by it, and our service account cannot read it |
| Database Observability | query-level Postgres | Alloy with database access | infra | 2,232 host-hours (3 database hosts) | **never before prod**: it needs a host we would pay for |
| DigitalOcean Postgres metrics | connections, CPU, memory, lag of the shared cluster | DigitalOcean's scrapable metrics endpoint ([DigitalOcean](https://digitalocean.com/blog/digitalocean-scrapable-metrics-for-postgresql-mysql-redis-kafka)) through a hosted scrape | infra | counts against the 10k series | **now** to try (krizaka-internal#2845); stop if it needs a host |
| Alerting / IRM on-call | paging and escalation | the alert issue first, IRM later | infra | 3 active IRM users | **when the founder picks the channel** |
| Adaptive Telemetry | drops unused series and logs to stay free | Grafana's recommendations | infra | included | **at the thaw**, when real telemetry flows |
| Grafana Assistant and Pages | AI questions and generated pages | the founder's own use | — | 3 AI users (40M tokens each) | **the founder's** reading aid; not a source of truth (§3) |
| Kubernetes (Pods, Nodes) | cluster health | — | — | 2,232 host-hours | **never: we run no Kubernetes** (DigitalOcean App Platform, a managed Postgres cluster, one broker droplet) |

**Privacy (Loi 25):**
- Nothing personal and no secret leaves an app. The shared redaction runs before any export: Verikora's `redact.ts`
  (verikora#743) becomes the shared one, with a Logback converter on the Java side. It covers e-mails, bearer and session
  tokens, secrets, addresses and document contents.
- Business counters count, they never name. Spans carry route templates, never raw paths or user ids.
- Grafana Labs' processor agreement is signed before any app log is sent.

**Transport, when the founder gives the tokens:**
- The apps send OTLP straight to the stack's gateway, with no collector to host.
- The names are functional: `OBSERVABILITY_OTLP_ENDPOINT`, `OBSERVABILITY_INGEST_TOKEN` (one per environment, write
  only), `OBSERVABILITY_ENVIRONMENT`.
- The resource attributes are `service.name`, `deployment.environment.name` and `service.version`.

**Cardinality** stays under the free tier's 10,000 series.

### 5. Reading surfaces as code, conformant on every push

**Where.** In the app's own repository, `infra/observability/dashboards/<uid>.json`. `infra/` is an allowed root folder in
every repository kind (repo-layout).
- The signal and its panel change in the same pull request, so a renamed metric breaks the dashboard in the same CI run.
- The check runs on the push of the repository that changes, which is what « à chaque push » asks.
- The dashboards hold no secret, no address and no uid (checked), so public repositories are fine.

The SLO targets (`slo.json`) and the load tests (`load/`) sit in the same `infra/observability/` folder. Org-wide surfaces (the
Krizaka 360 view, quotas, the Postgres capacity) live in krizaka-infra under the same path. A central repository for every
dashboard was refused: it is private, it pays for its CI minutes, and an app's push would never see the drift.

**Format: Grafana's dashboard JSON, committed.** It is what Grafana exports and stores and what every tool reads, and a reviewer
reads its diff. The alternatives, measured on 2026-11-07:

| Option | Licence, maintainer | Adoption | Verdict |
| :-- | :-- | :-- | :-- |
| Grafana JSON + `dashboard-linter` | Apache-2.0, Grafana Labs (v0.5.2, 2026-11-03, release binaries with checksums) | 348★, used by the monitoring mixins | **Chosen** |
| Grafana Pages | Grafana Cloud, public preview, `v0alpha1` | new (2026-10-19) | **Blocked as code** (§3) |
| Grafonnet (Jsonnet) | Apache-2.0, Grafana Labs | 557★ | Refused: a fifth language for a handful of dashboards |
| Grafana Foundation SDK (TypeScript) | Apache-2.0, Grafana Labs | 268★ | **Later**: npm `latest` is 0.0.22, builds stop at Grafana 11.6 while the stack runs 13.4 |
| grafanactl | Apache-2.0, Grafana Labs | 0.1.10 | Watched for provisioning |
| grizzly | archived (2026-06) | — | Refused |
| OpenTofu `grafana` provider | MPL-2.0 | wide | Refused for dashboards: an apply is a human step in krizaka-infra |
| Grafana Git Sync | Grafana 12+ | — | Refused for now: one connection per repository and a GitHub credential in Grafana |

**Conventions:**
- **Folder:** one folder `krizaka` (« Krizaka ») per stack, reading surfaces first. Nested product folders come only when a
  product has more than five dashboards: on 13.4 a service account could not write into a nested folder it had just created
  (403).
- **uid:** `<repo>-<purpose>` (`krizaka-com-overview`), at most 40 characters, `^[a-z0-9]+(-[a-z0-9]+)*$`, never changed.
  The file name is the uid. Every deployed repository has exactly one `<repo>-overview`, its reading surface.
- **Title and tags:** the title is `<display name> · <what it answers>` (« krizaka.com · Seen from outside »). The tags are
  `krizaka`, `app:<repo>`, `kind:<site|web-app|service>`, and `reading-surface` where it applies.
- **Data sources:** only variables. `datasource` is the metrics one (the name the linter expects); it is hidden and picked by
  a name regex. `loki_datasource` and `tempo_datasource` are the others. No uid is ever typed, apart from Grafana's built-in
  annotations.
- **Probes:** every probe carries the labels `app=<repo>` and `env=<dev|prod>`, so a surface selects
  `probe_success{app="krizaka-com"}` instead of a list of job names (krizaka-internal#2822).
- **`editable: false`.** A change made in the screen is overwritten by the next provisioning, and the source line says so.

**Provisioning**, folded in from krizaka-internal#2702:
- **Now:** `scripts/observability_dashboards.py plan|apply --env dev|prod [--prune]` in krizaka-infra, shaped like the probes
  script (krizaka-internal#2822).
  - `plan` is read-only and is the default; `apply` is idempotent and writes with the message `<repo>@<sha>`.
  - For dev it reads `origin/main` of the reference copies. For prod it reads the deployed production ref, because only proven
    releases reach prod.
- **Next:** the app's deploy applies its observability in the same run: its reading surfaces, its alert rules and its contact
  point fragment, through one shared step of krizaka/.github with a scoped token. A rollback therefore also rolls back the
  dashboards.

**The check:**
- `krizaka-dashboards check [--fix]`, a shared bin of `@krizaka/config` (ADR-026's home for shared bins, krizaka-internal#2820).
- Each repository declares it as a `pre-push` step of the one hook chain, and CI runs the same command.
- It does not duplicate the formatting and security steps of krizaka-internal#2813: it is one more declared step after them.

It checks:

1. **parse**: valid JSON, a dashboard model;
2. **lint**: Grafana's `dashboard-linter --strict`, pinned (v0.5.2) and checksum-verified in CI. Locally, a missing binary
   gives a notice and the push goes on, because CI is the last word;
3. **no hard-coded data source or address**: every `datasource.uid` is a `${variable}`, and no `http(s)://` string (links
   are relative);
4. **required**: the repository's `<repo>-overview` exists, holds the signals of its kind (§4), follows the register (§3),
   and its target thresholds equal `slo.json`;
5. **canonical**: two-space JSON with a final newline and no volatile key (`id`, `version`, `iteration`). `--fix` rewrites
   the file.

**Enforcement:**
- The mode comes from `policy.json`: `warn` first, `block` once every deployed repository is green.
- When the policy cannot be read, the step prints a notice and lets the push through.

**The numbers:**
- They come from the matrix rule `observability-dashboards` (krizaka-internal#2823), on the active repositories with a deploy
  in `repos.json` (10 on 2026-11-07).
- Baseline today: **0/10**, measured by hand, since the rule does not exist yet. It becomes 1/10 when krizaka.com's surface
  lands.

### 6. SRE: SLOs, burn-rate alerts, on-call, incidents, capacity

- **SLOs are data, one file per app:** `infra/observability/slo.json` (krizaka-internal#2839). It holds the availability
  target and its window (28 days), the latency target (p95 and its route) and the source signal. The reading surface, the
  load-test thresholds, the alert rules and the cockpit all read that file. krizaka.com starts at 99.9 % over 28 days, the
  target the founder's page shows.
- **Alerts burn an error budget**, they never cross a raw threshold. There are two multi-window rules per SLO (the Google
  SRE workbook pattern):
  - a **page** at 14.4× the budget rate over 1 h and 5 min;
  - a **ticket** at 6× over 6 h and 30 min.
- **On-call path:**
  - **Today:** e-mail to the contact point, then one alert issue in krizaka-internal (krizaka-internal#2824), then the
    founder's notification after 24 h and one lane session (krizaka-internal#2805).
  - **Later:** mobile paging through IRM, once the founder picks the channel.
- **Incidents:** one line per incident in the company folder's incident log (created by krizaka-internal#2631), and the
  severities and post-mortems of krizaka-internal#2456.
- **Capacity:** the shared Postgres cluster's metrics (krizaka-internal#2845) and the apps' saturation signals. They are read
  at the weekly check-in next to the load-test trend.

### 7. Load tests (k6) as code

- **Where:** `infra/observability/load/<name>.js` in the app's repository, next to its reading surface (krizaka-internal#2840).
- **Dev only:**
  - The target origin comes from `K6_TARGET_ORIGIN`, and the script refuses any origin that is not `https://dev.…`.
  - Prod is never load-tested without the founder's go: our host's terms and the shared database are at stake.
  - Scenarios stay gentle (≤ 5 virtual users, ≤ 2 minutes, a pause per iteration), because the dev database is shared.
- **When:** on demand and once a week (the lane's check-in, or a scheduled workflow in a public repository). Never on every
  push.
- **Pass/fail:** the k6 thresholds are the SLO's (`http_req_failed` under the error budget, p95 under the latency target,
  checks above the availability target). A red run files one alert issue.
- **Results in Grafana:**
  - through Grafana Cloud k6: 500 virtual-user hours a month on the free tier, and our test uses about 0.15;
  - this needs a k6 API token, since the stack's service-account token is refused (« Invalid token »);
  - until the token exists, the run summary is attached to the run.
- **Proof (2026-11-07):**
  - k6 v2.3.0, checksum verified, against Sovkora dev's health route, ramping to 5 virtual users over 105 s;
  - 7,767 requests, 0 failed, p95 62 ms, every threshold green;
  - the same script pointed at the prod origin stopped before sending a request (exit 107).

  The script lands in the Sovkora repository at the thaw.

### 8. The service graph: what talks to what

- Grafana's service graph and Application Observability draw the edges from OpenTelemetry traces. The trace context (W3C
  `traceparent`) is propagated over HTTP and the broker. The emitters:
  - Sovkora's services, through the Java starter (krizaka-internal#2843, #297);
  - Verikora's web, through `@krizaka/observability` (krizaka-internal#2841, #2150);
  - the media worker, through the Python SDK (krizaka-internal#2842).
- Product repositories are frozen. These issues sit in their lanes now, so the graph arrives with the thaw.
- **Next to the architecture** (ADR-027, krizaka-internal#2844):
  - the observed edges over 7 days sit beside the C1/C2 « current » generated from code, in the cockpit's Architecture tab;
  - an edge observed but not modelled, or modelled but never observed, is drift, reported by the matrix.

### Clean-up of the stack (2026-11-07)

**Ours** (folder `krizaka`, created by the stack's service account):

| Item | uid | Action | Why |
| :-- | :-- | :-- | :-- |
| folder « Sites » | `krizaka-sites` | **deleted** | a test nested folder; the service account could not write into it (403) |
| « krizaka.com · Overview » (12 panels) | `krizaka-com-overview` | **replaced in place** by « krizaka.com · Seen from outside » | the founder prefers his Page's register; the uid and the history are kept |
| alert rule « Site public injoignable » | `krizaka-site-unreachable` | kept | the strategy names it |

**Provisioned by Grafana Cloud or an app: kept, never deleted.** The app recreates them or needs them.
- `GrafanaCloud` and its 10 dashboards: billing, usage, cardinality, logs export (`classic-file-provisioning`).
- « Alert Groups Insights » and « Incident Insights » (plugin `grafana-irm-app`).
- `knowledge-graph` (the Asserts recording and alert rules).
- « Grafana Synthetic Monitoring » (its app).
- « Default project » under k6 (created when Performance testing was opened; the load tests will use it).

They stay out of the Krizaka folder and are never starred. The stack's service account cannot set the organisation's home
(`orgs.preferences:read` refused), so the founder's one click is to make `krizaka-com-overview`, or the Krizaka 360 view once
it exists, his home.

**Unknown: asked.** `frontend-observability-asserts`. The Frontend Observability app is enabled with 0 apps configured, and
our service account cannot read the folder (`folders:read` refused).

## What the founder decides

| # | Decision | Options | Cost | CTO's recommendation |
| :-- | :-- | :-- | :-- | :-- |
| 1 | **The prod stack** | (a) the paid self-service plan: three stacks under one account, the walls of ADR-023; (b) a second free account, after checking Grafana's terms; (c) prod in the dev stack, separated by labels and folders only | (a) 19 USD a month platform fee plus usage over the included amounts ([pricing](https://grafana.com/pricing/)); (b) 0, one more account; (c) 0, weak wall | (a) when the Verikora pilot opens, not before; until then prod stays `null` |
| 2 | **Ingest token (dev)** | one write-only access policy token per environment (metrics, logs, traces), created on grafana.com | 0 | now, so Sovkora dev and krizaka.com can send at the thaw |
| 3 | **Read token for the cockpit** | `OBSERVABILITY_METRICS_READ_TOKEN`: a read-only access policy token (metrics:read, alerts:read), or a Viewer service-account token of the stack (no new address, can be minted with our tooling once allowed) | 0 | the Viewer service-account token: same read-only effect, fewer moving parts |
| 4 | **k6 token** | a k6 API token of the stack, stored as `OBSERVABILITY_LOAD_TESTING_TOKEN` | 0 within 500 virtual-user hours a month | now |
| 5 | **CI provisioning token** | a service-account token scoped to the `krizaka` folder, as a GitHub environment secret | 0 | after #1, for prod |
| 6 | **Alert channel** | e-mail (today), the Grafana IRM mobile app (free up to 3 users), other | 0 | keep e-mail plus the alert issue (krizaka-internal#2824) |
| 7 | **Processor agreement** | accept Grafana Labs' DPA and file it in the Loi 25 register | 0 | before any app log is sent |
| 8 | **Load tests on prod** | never, or a dated window he approves | — | never before the pilot's prod runs on its own resources |

## Consequences

- ✓ One answer to « où est Grafana » for dev and prod, read by every tool and by the cockpit from one reviewed file.
- ✓ The founder reads his register (serif title, one line, one row per probe), and it is code: reviewed, linted, provisioned.
- ✓ A target is written once (`slo.json`) and drives the surface, the alerts, the load tests and the cockpit.
- ✓ The lane works from triggers and numbers: no idle sessions, and no alert left alone for days.
- ✓ The service graph arrives with the thaw, and its drift against the architecture is shown.
- ! The policy now holds one kind of address: an operator console pinned by the schema. Anything else is still refused.
- ! Grafana Pages stay a personal reading aid until they can be exported or provisioned.
- ! Until the founder's decisions 1 to 4, the surfaces show the outside view only, and load-test results stay out of Grafana.
- ✕ Refused:
  - dashboards clicked by hand;
  - a page that cannot be reviewed;
  - a central repository for every dashboard;
  - a second hook mechanism;
  - a datasource uid or an address in a dashboard;
  - a raw-threshold page;
  - a load test against prod;
  - Kubernetes panels.

## Plan

Children of krizaka-internal#2816, itself a child of krizaka-restricted#272. Each is blocked by this ADR and is one repository
and one theme.

| Issue | Repository | Lane | What |
| :-- | :-- | :-- | :-- |
| krizaka-internal#2818 | krizaka-agents | security | the lane: mission, weekly check-in and on-demand start, caps; the local lane file rewritten |
| krizaka-internal#2805 | krizaka-agents | security | an alert open more than 24 h notifies the founder and starts at most one session a day |
| krizaka-internal#2824 | krizaka-agents | security | a firing Grafana alert, or an SLO burn, becomes one alert issue |
| krizaka-internal#2819 | .github, krizaka-internal, krizaka-agents, the cockpit | security | the links in `policy.json`; the two typed copies and the dead local key removed |
| krizaka-internal#2838 | the cockpit | security | the « Observabilité » block: links and live headline numbers, read-only, cached, « indisponible » on failure |
| krizaka-internal#2820 | krizaka-ts | security | `krizaka-dashboards check` in `@krizaka/config` |
| krizaka-internal#2821 | krizaka-com | security | « krizaka.com · Seen from outside » as code, checked in `warn` |
| krizaka-internal#2822 | krizaka-infra | security | provisioning from the code; the probes read the policy, carry `app` and `env`, the two stale checks go |
| krizaka-internal#2823 | .github | security | the matrix rule `observability-dashboards` and `docs/standards/observability.md` |
| krizaka-internal#2839 | .github, krizaka-com, krizaka-infra | security | SLO targets as data and burn-rate alerts |
| krizaka-internal#2840 | sovkora | security | k6 load tests as code, dev only, on demand and weekly (at the thaw) |
| krizaka-internal#2845 | krizaka-infra | security | the dev Postgres cluster's metrics and a capacity surface |
| krizaka-internal#2843 | krizaka-java | platform | the Java starter exports traces, metrics and redacted logs under functional names (at the thaw) |
| krizaka-internal#297 | sovkora | sovkora | the services' traces across the broker, for the service graph (at the thaw) |
| krizaka-internal#2841 | verikora | verikora | Verikora web's traces and RED metrics (at the thaw) |
| krizaka-internal#2842 | sovkora-worker-media | sovkora | the worker continues the job's trace (at the thaw) |
| krizaka-internal#2150 | krizaka-ts | security | `@krizaka/observability` for TypeScript, with the redaction |
| krizaka-internal#2844 | .github | platform | the runtime service graph next to the C1/C2 « current », drift shown (ADR-027) |
| krizaka-internal#315, #2023, #2456, #2624, #2631 | various | security | uptime, alerts routed to krizaka-internal, the incident policy, the watchdog digest, the probes (existing, now under this epic) |
