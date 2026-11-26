# Automation catalogue

Generated 2026-11-26T16:29:09.355Z by https://github.com/krizaka/.github/actions/runs/45858973652 from the files of 18 active repositories at their default branch (ADR-026). Machine-readable: [catalogue.json](catalogue.json), schema `krizaka.automation/1`; fields explained in docs/standards/automation-catalogue.md.

**1470 units.**

## By kind

| Kind | Units |
| :-- | :-- |
| CI check | 466 |
| agent hook | 35 |
| cron | 66 |
| deploy | 78 |
| dev tool | 250 |
| generator | 87 |
| git hook | 19 |
| library | 458 |
| one-off | 11 |

## By type

| Type | Units |
| :-- | :-- |
| action | 22 |
| agent-hook | 28 |
| cron | 19 |
| entrypoint | 8 |
| hook-config | 5 |
| launchagent | 2 |
| npm-script | 160 |
| script | 957 |
| template | 8 |
| workflow | 261 |

## By repository

| Repository | Units | Nothing calls it | No test | Regex over 80 characters | Over 400 lines | No header | Copied |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| krizaka-agents | 331 | 78 | 3 | 17 | 46 | 6 | 0 |
| krizaka-ui | 142 | 39 | 12 | 6 | 3 | 4 | 1 |
| sovkora | 161 | 31 | 10 | 12 | 5 | 2 | 2 |
| .github | 227 | 16 | 3 | 11 | 4 | 4 | 0 |
| folioviv | 99 | 23 | 4 | 2 | 2 | 3 | 2 |
| verikora | 111 | 22 | 3 | 0 | 1 | 2 | 3 |
| krizaka-com | 92 | 16 | 1 | 2 | 2 | 1 | 2 |
| krizaka-blog | 68 | 10 | 3 | 1 | 3 | 0 | 3 |
| krizaka-ts | 60 | 5 | 3 | 1 | 1 | 1 | 3 |
| kridoc | 29 | 9 | 0 | 0 | 0 | 2 | 1 |
| krizaka-infra | 33 | 4 | 4 | 2 | 1 | 0 | 0 |
| krizaka-java | 32 | 3 | 2 | 2 | 0 | 1 | 1 |
| krizaka-lab | 19 | 0 | 4 | 0 | 0 | 3 | 0 |
| krizaka-social | 13 | 3 | 2 | 0 | 0 | 1 | 0 |
| krizaka-agents-site | 16 | 2 | 1 | 1 | 0 | 0 | 1 |
| krizaka-coming-soon | 15 | 1 | 2 | 0 | 0 | 1 | 1 |
| krizaka-ui-builder | 12 | 2 | 0 | 0 | 0 | 2 | 0 |
| krizaka-rust | 10 | 0 | 0 | 0 | 0 | 1 | 0 |

## Flags

### Nothing calls it (264)

- `.github` `.github/workflows/cla.yml` (CI check, 58 lines)
- `.github` `.github/workflows/journey-line.yml` (CI check, 40 lines)
- `.github` `.github/workflows/post-deploy-journeys.yml` (deploy, 204 lines)
- `.github` `.github/workflows/tauri-macos-release.yml` (deploy, 193 lines)
- `.github` `actions/setup/install.sh` (dev tool, 34 lines)
- `.github` `actions/sonar-ratchet/action.yml` (CI check, 36 lines)
- `.github` `package.json#precheck` (CI check, 1 lines)
- `.github` `scripts/check-ui-drift.mjs` (CI check, 99 lines)
- `.github` `scripts/code-names/lib.mjs` (dev tool, 179 lines)
- `.github` `scripts/conformance-fanout.mjs` (generator, 180 lines)
- `.github` `scripts/dev-preview-probe.mjs` (CI check, 111 lines)
- `.github` `scripts/devx-local.mjs` (dev tool, 37 lines)
- `.github` `scripts/gen-release-consumers.mjs` (deploy, 24 lines)
- `.github` `scripts/org-secrets-apply.mjs` (dev tool, 82 lines)
- `.github` `scripts/scorecard-report.mjs` (dev tool, 51 lines)
- `.github` `tools/code-health/package.json#measure` (CI check, 1 lines)
- `folioviv` `apps/desktop/package.json#tauri` (dev tool, 1 lines)
- `folioviv` `apps/web/package.json#qa-accounts` (dev tool, 1 lines)
- `folioviv` `apps/web/scripts/default-media/build.mjs` (generator, 89 lines)
- `folioviv` `apps/web/scripts/enrich-saint-henri.mjs` (one-off, 27 lines)
- `folioviv` `apps/web/scripts/explore-plan.mjs` (dev tool, 129 lines)
- `folioviv` `apps/web/scripts/qa-reset-walker.mjs` (dev tool, 35 lines)
- `folioviv` `apps/web/scripts/seed-staff-day.mjs` (dev tool, 87 lines)
- `folioviv` `package.json#db:rebuild` (dev tool, 1 lines)
- `folioviv` `package.json#payments:setup` (dev tool, 1 lines)
- `folioviv` `package.json#seo:check` (CI check, 1 lines)
- `folioviv` `package.json#sg:fix` (dev tool, 1 lines)
- `folioviv` `package.json#sg:ratchet:update` (CI check, 1 lines)
- `folioviv` `package.json#shots:docs` (dev tool, 1 lines)
- `folioviv` `package.json#shots:storefront` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#db:drift` (CI check, 1 lines)
- `folioviv` `packages/db/package.json#db:generate` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#db:rebuild` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#seed` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#seed:demos` (dev tool, 1 lines)
- `folioviv` `scripts/record-hero.mjs` (dev tool, 223 lines)
- `folioviv` `scripts/record-journey.mjs` (dev tool, 305 lines)
- `folioviv` `scripts/record-krizaka-first-client.mjs` (dev tool, 307 lines)
- `folioviv` `scripts/setup-krizaka-shop.mjs` (dev tool, 161 lines)
- `kridoc` `apps/web/package.json#db:rebuild` (dev tool, 1 lines)
- … and 224 more in catalogue.json

### No test (57)

- `.github` `scripts/actions-audit.sh` (CI check, 26 lines)
- `.github` `scripts/gen-release-consumers.mjs` (deploy, 24 lines)
- `.github` `scripts/hooks/zizmor-workflows.sh` (git hook, 11 lines)
- `folioviv` `apps/web/scripts/default-media/build.mjs` (generator, 89 lines)
- `folioviv` `apps/web/scripts/showcase-web.mjs` (CI check, 145 lines)
- `folioviv` `scripts/check-founder-name.mjs` (CI check, 23 lines)
- `folioviv` `scripts/check-maps.mjs` (CI check, 48 lines)
- `krizaka-agents-site` `site/scripts/extract-pages.mjs` (deploy, 52 lines)
- `krizaka-agents` `tools/codegraph-index.sh` (cron, 16 lines)
- `krizaka-agents` `tools/db-drift-cron.sh` (cron, 6 lines)
- `krizaka-agents` `tools/update-behind-cron.sh` (cron, 9 lines)
- `krizaka-blog` `scripts/gen-architecture-cover.mjs` (generator, 148 lines)
- `krizaka-blog` `scripts/gen-issue-curve.mjs` (generator, 91 lines)
- `krizaka-blog` `scripts/newsletter-probe.mjs` (CI check, 21 lines)
- `krizaka-com` `scripts/check-page-templates.mjs` (CI check, 22 lines)
- `krizaka-coming-soon` `scripts/build-all.mjs` (generator, 24 lines)
- `krizaka-coming-soon` `scripts/ci-after-build.sh` (CI check, 18 lines)
- `krizaka-infra` `scripts/coverage-python.sh` (CI check, 9 lines)
- `krizaka-infra` `scripts/dev-stack.sh` (CI check, 144 lines)
- `krizaka-infra` `scripts/dns-plan.sh` (CI check, 61 lines)
- `krizaka-infra` `scripts/env-values-from-live.py` (CI check, 31 lines)
- `krizaka-java` `site/scripts/build-info.d.mts` (generator, 1 lines)
- `krizaka-java` `site/scripts/check-hero.mjs` (CI check, 51 lines)
- `krizaka-lab` `scripts/check-demos.mjs` (CI check, 111 lines)
- `krizaka-lab` `scripts/check-maps.mjs` (CI check, 58 lines)
- `krizaka-lab` `scripts/check-motion.mjs` (CI check, 86 lines)
- `krizaka-lab` `scripts/ci-after-build.sh` (CI check, 31 lines)
- `krizaka-social` `scripts/lint.mjs` (CI check, 8 lines)
- `krizaka-social` `scripts/upload-films.mjs` (CI check, 9 lines)
- `krizaka-ts` `.githooks/pre-push` (git hook, 26 lines)
- `krizaka-ts` `packages/org/scripts/emit.mjs` (generator, 14 lines)
- `krizaka-ts` `site/scripts/gen-packages.mjs` (generator, 114 lines)
- `krizaka-ui` `apps/site/scripts/crawl-check.mjs` (CI check, 144 lines)
- `krizaka-ui` `apps/site/scripts/motion-check.mjs` (CI check, 57 lines)
- `krizaka-ui` `apps/site/scripts/scan-ui-usage.mjs` (CI check, 134 lines)
- `krizaka-ui` `apps/storybook/scripts/test-linux.mjs` (CI check, 35 lines)
- `krizaka-ui` `apps/storybook/scripts/test.mjs` (CI check, 43 lines)
- `krizaka-ui` `packages/charts/scripts/build-registry.mjs` (generator, 70 lines)
- `krizaka-ui` `packages/charts/scripts/dist-check.mjs` (CI check, 50 lines)
- `krizaka-ui` `packages/email/scripts/gen-themes.mjs` (generator, 64 lines)
- … and 17 more in catalogue.json

### Regex over 80 characters (57)

- `krizaka-agents-site` `site/scripts/publication-rules.mjs` (library, 108 lines, longest regex 277)
- `krizaka-ui` `apps/site/scripts/scan-ui-usage.mjs` (CI check, 134 lines, longest regex 214)
- `sovkora` `scripts/lib/krizaka-versions.mjs` (library, 150 lines, longest regex 181)
- `folioviv` `scripts/check-hydration.mjs` (CI check, 335 lines, longest regex 180)
- `krizaka-agents` `tools/krizaka_agents/console/privacy.py` (dev tool, 62 lines, longest regex 163)
- `sovkora` `scripts/generate-docs.mjs` (generator, 2797 lines, longest regex 159)
- `krizaka-agents` `tools/ops/rotations.py` (library, 222 lines, longest regex 156)
- `krizaka-agents` `scripts/validate-skills.mjs` (dev tool, 300 lines, longest regex 150)
- `sovkora` `scripts/ci-plan.mjs` (CI check, 60 lines, longest regex 144)
- `krizaka-agents` `scripts/check-skip-ratchet.mjs` (CI check, 67 lines, longest regex 130)
- `folioviv` `scripts/lib/public-surface.mjs` (library, 17 lines, longest regex 128)
- `krizaka-agents` `tools/kz.py` (library, 1301 lines, longest regex 115)
- `sovkora` `scripts/lib/java-layout.mjs` (library, 76 lines, longest regex 115)
- `.github` `scripts/check-app-links.mjs` (library, 292 lines, longest regex 114)
- `sovkora` `apps/web/scripts/check-app-links.mjs` (CI check, 322 lines, longest regex 114)
- `.github` `scripts/conformance-checks.mjs` (library, 516 lines, longest regex 113)
- `sovkora` `scripts/check-code-names.mjs` (CI check, 164 lines, longest regex 112)
- `krizaka-agents` `tools/ownership.py` (library, 946 lines, longest regex 111)
- `.github` `scripts/audit-guards.mjs` (CI check, 259 lines, longest regex 107)
- `krizaka-com` `scripts/gen-registry-versions.mjs` (generator, 175 lines, longest regex 107)
- `krizaka-ui` `apps/site/scripts/builder-check.mjs` (generator, 260 lines, longest regex 106)
- `.github` `scripts/repository-names.mjs` (CI check, 67 lines, longest regex 105)
- `krizaka-agents` `tools/done_when.py` (library, 428 lines, longest regex 104)
- `krizaka-blog` `scripts/capture-cockpit.mjs` (dev tool, 621 lines, longest regex 104)
- `krizaka-infra` `scripts/check-commercial-dns.sh` (library, 66 lines, longest regex 101)
- `krizaka-ui` `packages/charts/scripts/dist-check.mjs` (CI check, 50 lines, longest regex 100)
- `sovkora` `scripts/lib/bakeoff/verify.mjs` (library, 136 lines, longest regex 100)
- `.github` `scripts/scheduled-probe.mjs` (library, 60 lines, longest regex 98)
- `krizaka-agents` `scripts/check-no-private.mjs` (CI check, 57 lines, longest regex 97)
- `krizaka-agents` `tools/post_missed.py` (library, 187 lines, longest regex 96)
- `krizaka-agents` `tools/team-session.py` (cron, 2897 lines, longest regex 95)
- `sovkora` `scripts/lib/doc-patterns.mjs` (library, 91 lines, longest regex 95)
- `krizaka-agents` `tools/train-control.py` (cron, 593 lines, longest regex 94)
- `krizaka-com` `scripts/pr-assets.mjs` (library, 300 lines, longest regex 94)
- `krizaka-ui` `tools/export-defaults.mjs` (generator, 142 lines, longest regex 94)
- `krizaka-agents` `tools/push_refusal.py` (dev tool, 40 lines, longest regex 92)
- `krizaka-java` `site/scripts/gen-building-blocks.mjs` (generator, 169 lines, longest regex 91)
- `krizaka-ts` `scripts/check-aws-sdk.mjs` (CI check, 58 lines, longest regex 91)
- `sovkora` `scripts/architecture-target.mjs` (CI check, 153 lines, longest regex 88)
- `.github` `scripts/pin-supply-chain.mjs` (CI check, 209 lines, longest regex 87)
- … and 17 more in catalogue.json

### Over 400 lines (68)

- `.github` `actions/detect/detect.mjs` (CI check, 483 lines)
- `.github` `scripts/conformance-checks.mjs` (library, 516 lines)
- `.github` `scripts/family-drift.mjs` (CI check, 453 lines)
- `.github` `scripts/profile-readme.mjs` (CI check, 544 lines)
- `folioviv` `apps/web/scripts/seed-cast.mjs` (dev tool, 408 lines)
- `folioviv` `scripts/shots-storefront.mjs` (dev tool, 413 lines)
- `krizaka-agents` `tools/agents_registry.py` (library, 476 lines)
- `krizaka-agents` `tools/alerts_db.py` (library, 535 lines)
- `krizaka-agents` `tools/board-cache.py` (library, 431 lines)
- `krizaka-agents` `tools/board-sync.py` (cron, 636 lines)
- `krizaka-agents` `tools/codegraph-first-hook.py` (library, 830 lines)
- `krizaka-agents` `tools/conflicts.py` (library, 742 lines)
- `krizaka-agents` `tools/coord/registry.py` (generator, 1127 lines)
- `krizaka-agents` `tools/crack.py` (cron, 1124 lines)
- `krizaka-agents` `tools/credential_age.py` (library, 566 lines)
- `krizaka-agents` `tools/credential_rotation/adapters.py` (library, 619 lines)
- `krizaka-agents` `tools/debt-meter.py` (cron, 413 lines)
- `krizaka-agents` `tools/done_when.py` (library, 428 lines)
- `krizaka-agents` `tools/engine.py` (library, 933 lines)
- `krizaka-agents` `tools/events_db.py` (library, 671 lines)
- `krizaka-agents` `tools/fake-github.py` (library, 833 lines)
- `krizaka-agents` `tools/fmt.py` (git hook, 457 lines)
- `krizaka-agents` `tools/freshness.py` (library, 487 lines)
- `krizaka-agents` `tools/git-guard.py` (git hook, 654 lines)
- `krizaka-agents` `tools/how_docs.py` (library, 418 lines)
- `krizaka-agents` `tools/install.py` (library, 718 lines)
- `krizaka-agents` `tools/krizaka-precheck` (git hook, 1304 lines)
- `krizaka-agents` `tools/krizaka_agents/console/fakes.py` (library, 476 lines)
- `krizaka-agents` `tools/krizaka_agents/console/ui/views/overview.py` (dev tool, 444 lines)
- `krizaka-agents` `tools/kz.py` (library, 1301 lines)
- `krizaka-agents` `tools/kzconfig.py` (dev tool, 579 lines)
- `krizaka-agents` `tools/kzstates.py` (library, 564 lines)
- `krizaka-agents` `tools/lane-dispatch.py` (cron, 673 lines)
- `krizaka-agents` `tools/observability-probes.py` (CI check, 408 lines)
- `krizaka-agents` `tools/ops-db.py` (cron, 476 lines)
- `krizaka-agents` `tools/ops/api.py` (dev tool, 736 lines)
- `krizaka-agents` `tools/ops/sessions.py` (library, 462 lines)
- `krizaka-agents` `tools/ops/sync.py` (library, 551 lines)
- `krizaka-agents` `tools/org_contract.py` (library, 683 lines)
- `krizaka-agents` `tools/overlap-proof.py` (dev tool, 1184 lines)
- … and 28 more in catalogue.json

### No header (34)

- `.github` `actions/app-videos/action.yml` (CI check, 62 lines)
- `.github` `actions/cdn-purge/action.yml` (deploy, 32 lines)
- `.github` `actions/security-tools/action.yml` (CI check, 35 lines)
- `.github` `scripts/repository-names.mjs` (CI check, 67 lines)
- `folioviv` `scripts/e2e-shoot.mjs` (library, 16 lines)
- `folioviv` `scripts/lib/e2e-pricing.mjs` (library, 22 lines)
- `folioviv` `scripts/lib/tool-path.mjs` (library, 27 lines)
- `kridoc` `.github/workflows/ci.yml` (CI check, 49 lines)
- `kridoc` `.github/workflows/drift.yml` (one-off, 22 lines)
- `krizaka-agents` `.github/workflows/ci.yml` (CI check, 82 lines)
- `krizaka-agents` `tools/krizaka_agents/console/ui/views/events.py` (library, 128 lines)
- `krizaka-agents` `tools/ports/adapters/storage.py` (dev tool, 65 lines)
- `krizaka-agents` `tools/top` (library, 23 lines)
- `krizaka-agents` `tools/wt-done` (dev tool, 3 lines)
- `krizaka-agents` `tools/wt-new` (dev tool, 3 lines)
- `krizaka-com` `.github/workflows/ci.yml` (CI check, 48 lines)
- `krizaka-coming-soon` `.github/workflows/ci.yml` (CI check, 43 lines)
- `krizaka-java` `site/scripts/build-info.d.mts` (generator, 1 lines)
- `krizaka-lab` `.github/workflows/ci.yml` (CI check, 44 lines)
- `krizaka-lab` `.github/workflows/deploy-pages.yml` (deploy, 59 lines)
- `krizaka-lab` `scripts/generate-routes.mjs` (generator, 113 lines)
- `krizaka-rust` `.github/workflows/ci.yml` (CI check, 87 lines)
- `krizaka-social` `.github/workflows/ci.yml` (CI check, 37 lines)
- `krizaka-ts` `.github/workflows/ci.yml` (CI check, 42 lines)
- `krizaka-ui-builder` `.github/workflows/ci.yml` (CI check, 36 lines)
- `krizaka-ui-builder` `.github/workflows/editor-task-cost.yml` (CI check, 40 lines)
- `krizaka-ui` `.github/workflows/release.yml` (deploy, 137 lines)
- `krizaka-ui` `tools/ci-filter.mjs` (CI check, 30 lines)
- `krizaka-ui` `tools/consumer-smoke/next/app/api/events/route.ts` (library, 13 lines)
- `krizaka-ui` `tools/consumer-smoke/next/lib/i18n.ts` (library, 10 lines)
- `sovkora` `apps/web/scripts/public-routes.mjs` (library, 48 lines)
- `sovkora` `scripts/lib/walk.mjs` (library, 27 lines)
- `verikora` `scripts/demo-documents/index.mjs` (library, 43 lines)
- `verikora` `scripts/demo-documents/render.mjs` (library, 82 lines)

### Copied (20)

- `folioviv` `scripts/sg-fix.mjs` (dev tool, 62 lines)
- `folioviv` `scripts/sync-brand-icons.mjs` (library, 86 lines)
- `kridoc` `scripts/promote-production.mjs` (deploy, 87 lines)
- `krizaka-agents-site` `site/scripts/proofs.mjs` (dev tool, 93 lines)
- `krizaka-blog` `scripts/check-seo-family.mjs` (library, 318 lines)
- `krizaka-blog` `scripts/proofs.mjs` (dev tool, 93 lines)
- `krizaka-blog` `scripts/sync-brand-icons.mjs` (library, 40 lines)
- `krizaka-com` `scripts/promote-production.mjs` (deploy, 87 lines)
- `krizaka-com` `scripts/sg-fix.mjs` (dev tool, 61 lines)
- `krizaka-coming-soon` `scripts/promote-production.mjs` (deploy, 87 lines)
- `krizaka-java` `site/scripts/sync-brand-icons.mjs` (generator, 40 lines)
- `krizaka-ts` `.githooks/pre-push` (git hook, 26 lines)
- `krizaka-ts` `scripts/sg-fix.mjs` (dev tool, 62 lines)
- `krizaka-ts` `site/scripts/sync-brand-icons.mjs` (generator, 40 lines)
- `krizaka-ui` `apps/site/scripts/sync-brand-icons.mjs` (library, 41 lines)
- `sovkora` `apps/web/scripts/check-seo-family.mjs` (CI check, 283 lines)
- `sovkora` `apps/web/scripts/sg-fix.mjs` (dev tool, 64 lines)
- `verikora` `.githooks/pre-push` (git hook, 26 lines)
- `verikora` `scripts/sg-fix.mjs` (dev tool, 62 lines)
- `verikora` `scripts/sync-brand-icons.mjs` (library, 89 lines)

## Over time

| Day | Units | Nothing calls it | No test | Regex over 80 characters | Over 400 lines | No header | Copied |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 2026-11-12 | 1082 | 188 | 51 | 35 | 26 | 29 | 31 |
| 2026-11-13 | 1094 | 192 | 50 | 35 | 28 | 29 | 31 |
| 2026-11-14 | 1131 | 197 | 53 | 39 | 31 | 31 | 30 |
| 2026-11-15 | 1178 | 203 | 57 | 41 | 33 | 31 | 19 |
| 2026-11-16 | 1220 | 206 | 56 | 43 | 37 | 31 | 19 |
| 2026-11-17 | 1237 | 211 | 55 | 43 | 40 | 31 | 19 |
| 2026-11-18 | 1249 | 213 | 57 | 46 | 43 | 31 | 19 |
| 2026-11-19 | 1293 | 225 | 58 | 50 | 47 | 32 | 19 |
| 2026-11-20 | 1309 | 227 | 58 | 52 | 51 | 32 | 21 |
| 2026-11-21 | 1318 | 227 | 58 | 54 | 53 | 32 | 21 |
| 2026-11-22 | 1349 | 235 | 57 | 55 | 55 | 33 | 21 |
| 2026-11-23 | 1362 | 236 | 57 | 55 | 57 | 33 | 21 |
| 2026-11-25 | 1455 | 263 | 57 | 57 | 62 | 34 | 20 |
| 2026-11-26 | 1470 | 264 | 57 | 57 | 68 | 34 | 20 |
