# The fast local loop (every repository)

CI runs everything. Locally, run the smallest check that answers the question.

| Stack | While working (seconds) | Before the PR | Everything (CI) |
| :-- | :-- | :-- | :-- |
| Java (Maven) | `./mvnw test` (surefire = unit tests only; ITs are `*IT` in failsafe) or `-pl <module> -am` | `./mvnw verify -DskipITs` | `./mvnw verify` |
| Next.js app | `npm run dev:check` (changed files lint + tsc + unit tests) | `npm run lint && npm test` | + `npm run build` |
| krizaka-ui / turbo | `pnpm dev:check` (`turbo ... --filter=...[origin/main]`, cached) | `pnpm check` | CI |
| orazaka-cli | `npm test` (no coverage) | `npm run validate` | CI |

One-time per machine: `node scripts/devx-local.mjs` (this repository) sets `testcontainers.reuse.enable=true` in
`~/.testcontainers.properties`, so the singleton Postgres / Redis / RabbitMQ of `AbstractContainerIntegrationTest`
(`.withReuse(true)`) survive between Maven runs. CI has no such file and keeps fresh containers. `docker rm -f` the
`pgvector` container when a schema must start clean.

Measured timings and the work list: epic « DevX: fast local loop » in krizaka/.github.
