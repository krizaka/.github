# Automation catalogue

Generated 2026-11-16T14:54:49.393Z by https://github.com/krizaka/.github/actions/runs/43890525271 from the files of 16 active repositories at their default branch (ADR-026). Machine-readable: [catalogue.json](catalogue.json), schema `krizaka.automation/1`; fields explained in docs/standards/automation-catalogue.md.

**1220 units.**

## By kind

| Kind | Units |
| :-- | :-- |
| CI check | 408 |
| agent hook | 30 |
| cron | 55 |
| deploy | 67 |
| dev tool | 207 |
| generator | 77 |
| git hook | 19 |
| library | 347 |
| one-off | 10 |

## By type

| Type | Units |
| :-- | :-- |
| action | 22 |
| agent-hook | 25 |
| cron | 15 |
| entrypoint | 7 |
| hook-config | 5 |
| launchagent | 1 |
| npm-script | 149 |
| script | 755 |
| template | 8 |
| workflow | 233 |

## By repository

| Repository | Units | Nothing calls it | No test | Regex over 80 characters | Over 400 lines | No header | Copied |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| krizaka-agents | 179 | 37 | 4 | 9 | 20 | 5 | 0 |
| krizaka-ui | 141 | 39 | 12 | 6 | 2 | 4 | 1 |
| sovkora | 153 | 31 | 9 | 12 | 5 | 1 | 2 |
| folioviv | 90 | 22 | 3 | 1 | 2 | 3 | 2 |
| .github | 207 | 12 | 3 | 9 | 2 | 4 | 0 |
| verikora | 104 | 21 | 3 | 0 | 1 | 2 | 3 |
| krizaka-com | 87 | 15 | 1 | 2 | 2 | 1 | 3 |
| krizaka-blog | 65 | 9 | 3 | 1 | 2 | 0 | 2 |
| krizaka-ts | 56 | 5 | 3 | 0 | 1 | 1 | 3 |
| kridoc | 27 | 8 | 0 | 0 | 0 | 2 | 1 |
| krizaka-infra | 23 | 1 | 7 | 1 | 0 | 0 | 0 |
| krizaka-java | 32 | 3 | 2 | 2 | 0 | 1 | 1 |
| krizaka-lab | 19 | 0 | 4 | 0 | 0 | 3 | 0 |
| krizaka-coming-soon | 15 | 1 | 2 | 0 | 0 | 1 | 1 |
| krizaka-ui-builder | 12 | 2 | 0 | 0 | 0 | 2 | 0 |
| krizaka-rust | 10 | 0 | 0 | 0 | 0 | 1 | 0 |

## Flags

### Nothing calls it (206)

- `.github` `.github/workflows/cla.yml` (CI check, 58 lines)
- `.github` `.github/workflows/journey-line.yml` (CI check, 40 lines)
- `.github` `.github/workflows/post-deploy-journeys.yml` (deploy, 204 lines)
- `.github` `actions/setup/install.sh` (dev tool, 34 lines)
- `.github` `actions/sonar-ratchet/action.yml` (CI check, 36 lines)
- `.github` `scripts/check-ui-drift.mjs` (CI check, 99 lines)
- `.github` `scripts/conformance-fanout.mjs` (generator, 174 lines)
- `.github` `scripts/dev-preview-probe.mjs` (CI check, 111 lines)
- `.github` `scripts/devx-local.mjs` (dev tool, 37 lines)
- `.github` `scripts/gen-release-consumers.mjs` (deploy, 24 lines)
- `.github` `scripts/scorecard-report.mjs` (dev tool, 51 lines)
- `.github` `tools/code-health/package.json#measure` (CI check, 1 lines)
- `folioviv` `apps/desktop/package.json#tauri` (dev tool, 1 lines)
- `folioviv` `apps/web/package.json#qa-accounts` (dev tool, 1 lines)
- `folioviv` `apps/web/scripts/default-media/build.mjs` (generator, 89 lines)
- `folioviv` `apps/web/scripts/enrich-saint-henri.mjs` (one-off, 27 lines)
- `folioviv` `apps/web/scripts/explore-plan.mjs` (dev tool, 129 lines)
- `folioviv` `apps/web/scripts/qa-reset-walker.mjs` (dev tool, 35 lines)
- `folioviv` `apps/web/scripts/seed-staff-day.mjs` (dev tool, 91 lines)
- `folioviv` `package.json#db:rebuild` (dev tool, 1 lines)
- `folioviv` `package.json#payments:setup` (dev tool, 1 lines)
- `folioviv` `package.json#seo:check` (CI check, 1 lines)
- `folioviv` `package.json#sg:fix` (dev tool, 1 lines)
- `folioviv` `package.json#sg:ratchet:update` (CI check, 1 lines)
- `folioviv` `package.json#shots:docs` (dev tool, 1 lines)
- `folioviv` `package.json#shots:storefront` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#db:generate` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#db:rebuild` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#seed` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#seed:demos` (dev tool, 1 lines)
- `folioviv` `scripts/record-hero.mjs` (dev tool, 221 lines)
- `folioviv` `scripts/record-journey.mjs` (dev tool, 305 lines)
- `folioviv` `scripts/record-krizaka-first-client.mjs` (dev tool, 307 lines)
- `folioviv` `scripts/setup-krizaka-shop.mjs` (dev tool, 161 lines)
- `kridoc` `apps/web/package.json#db:rebuild` (dev tool, 1 lines)
- `kridoc` `apps/web/package.json#storage:client` (dev tool, 1 lines)
- `kridoc` `apps/web/package.json#storage:sweep` (dev tool, 1 lines)
- `kridoc` `package.json#db:rebuild` (dev tool, 1 lines)
- `kridoc` `package.json#drift` (CI check, 1 lines)
- `kridoc` `package.json#seo:check` (CI check, 1 lines)
- … and 166 more in catalogue.json

### No test (56)

- `.github` `scripts/actions-audit.sh` (CI check, 26 lines)
- `.github` `scripts/gen-release-consumers.mjs` (deploy, 24 lines)
- `.github` `scripts/hooks/zizmor-workflows.sh` (git hook, 11 lines)
- `folioviv` `apps/web/scripts/default-media/build.mjs` (generator, 89 lines)
- `folioviv` `apps/web/scripts/showcase-web.mjs` (CI check, 145 lines)
- `folioviv` `scripts/check-maps.mjs` (CI check, 48 lines)
- `krizaka-agents` `scripts/coverage-tools.sh` (CI check, 14 lines)
- `krizaka-agents` `tools/codegraph-index.sh` (cron, 16 lines)
- `krizaka-agents` `tools/db-drift-cron.sh` (cron, 6 lines)
- `krizaka-agents` `tools/update-behind-cron.sh` (cron, 9 lines)
- `krizaka-blog` `scripts/gen-architecture-cover.mjs` (generator, 148 lines)
- `krizaka-blog` `scripts/gen-issue-curve.mjs` (generator, 91 lines)
- `krizaka-blog` `scripts/newsletter-probe.mjs` (CI check, 21 lines)
- `krizaka-com` `scripts/check-page-templates.mjs` (CI check, 22 lines)
- `krizaka-coming-soon` `scripts/build-all.mjs` (generator, 24 lines)
- `krizaka-coming-soon` `scripts/ci-after-build.sh` (CI check, 18 lines)
- `krizaka-infra` `scripts/check.sh` (CI check, 23 lines)
- `krizaka-infra` `scripts/coverage-python.sh` (CI check, 9 lines)
- `krizaka-infra` `scripts/dev-stack.sh` (CI check, 135 lines)
- `krizaka-infra` `scripts/dns-plan.sh` (CI check, 61 lines)
- `krizaka-infra` `scripts/env-values-from-live.py` (CI check, 31 lines)
- `krizaka-infra` `scripts/tofu-encryption.sh` (CI check, 11 lines)
- `krizaka-infra` `scripts/tofu-stack.sh` (CI check, 99 lines)
- `krizaka-java` `site/scripts/build-info.d.mts` (generator, 1 lines)
- `krizaka-java` `site/scripts/check-hero.mjs` (CI check, 51 lines)
- `krizaka-lab` `scripts/check-demos.mjs` (CI check, 111 lines)
- `krizaka-lab` `scripts/check-maps.mjs` (CI check, 58 lines)
- `krizaka-lab` `scripts/check-motion.mjs` (CI check, 86 lines)
- `krizaka-lab` `scripts/ci-after-build.sh` (CI check, 31 lines)
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
- … and 16 more in catalogue.json

### Regex over 80 characters (43)

- `krizaka-ui` `apps/site/scripts/scan-ui-usage.mjs` (CI check, 134 lines, longest regex 214)
- `sovkora` `scripts/lib/krizaka-versions.mjs` (library, 131 lines, longest regex 181)
- `folioviv` `scripts/check-hydration.mjs` (CI check, 320 lines, longest regex 180)
- `krizaka-agents` `scripts/validate-skills.mjs` (dev tool, 293 lines, longest regex 150)
- `sovkora` `scripts/generate-docs.mjs` (generator, 2797 lines, longest regex 150)
- `sovkora` `scripts/ci-plan.mjs` (CI check, 60 lines, longest regex 144)
- `krizaka-agents` `tools/kz.py` (library, 1280 lines, longest regex 115)
- `sovkora` `scripts/lib/java-layout.mjs` (library, 76 lines, longest regex 115)
- `.github` `scripts/check-app-links.mjs` (library, 292 lines, longest regex 114)
- `sovkora` `apps/web/scripts/check-app-links.mjs` (CI check, 322 lines, longest regex 114)
- `sovkora` `scripts/check-code-names.mjs` (CI check, 164 lines, longest regex 112)
- `.github` `scripts/audit-guards.mjs` (CI check, 259 lines, longest regex 107)
- `krizaka-com` `scripts/gen-registry-versions.mjs` (generator, 156 lines, longest regex 107)
- `krizaka-ui` `apps/site/scripts/builder-check.mjs` (generator, 239 lines, longest regex 106)
- `.github` `scripts/repository-names.mjs` (CI check, 64 lines, longest regex 105)
- `krizaka-agents` `tools/done_when.py` (library, 332 lines, longest regex 104)
- `krizaka-blog` `scripts/capture-cockpit.mjs` (dev tool, 621 lines, longest regex 104)
- `krizaka-infra` `scripts/check-commercial-dns.sh` (library, 66 lines, longest regex 101)
- `krizaka-ui` `packages/charts/scripts/dist-check.mjs` (CI check, 50 lines, longest regex 100)
- `sovkora` `scripts/lib/bakeoff/verify.mjs` (library, 136 lines, longest regex 100)
- `.github` `scripts/conformance-checks.mjs` (library, 365 lines, longest regex 99)
- `krizaka-agents` `scripts/check-no-private.mjs` (CI check, 57 lines, longest regex 97)
- `sovkora` `scripts/lib/doc-patterns.mjs` (library, 91 lines, longest regex 95)
- `krizaka-agents` `tools/team-session.py` (library, 1879 lines, longest regex 94)
- `krizaka-agents` `tools/train-control.py` (cron, 374 lines, longest regex 94)
- `krizaka-com` `scripts/pr-assets.mjs` (library, 261 lines, longest regex 94)
- `krizaka-ui` `tools/export-defaults.mjs` (generator, 141 lines, longest regex 94)
- `krizaka-java` `site/scripts/gen-building-blocks.mjs` (generator, 169 lines, longest regex 91)
- `sovkora` `scripts/architecture-target.mjs` (CI check, 153 lines, longest regex 88)
- `.github` `scripts/pin-supply-chain.mjs` (CI check, 209 lines, longest regex 87)
- `krizaka-ui` `packages/tokens/scripts/build.mjs` (generator, 750 lines, longest regex 87)
- `.github` `scripts/callers-report.mjs` (CI check, 85 lines, longest regex 86)
- `.github` `scripts/check-public-issues-ours.mjs` (CI check, 99 lines, longest regex 86)
- `krizaka-java` `site/scripts/gen-proof.mjs` (generator, 120 lines, longest regex 86)
- `krizaka-agents` `tools/precheck-sonar-eslint.mjs` (library, 86 lines, longest regex 85)
- `krizaka-ui` `apps/site/scripts/crawl-check.mjs` (CI check, 144 lines, longest regex 85)
- `sovkora` `apps/mobile/scripts/check-app-links.mjs` (CI check, 384 lines, longest regex 85)
- `.github` `scripts/conformance-versions.mjs` (library, 137 lines, longest regex 84)
- `.github` `scripts/profile-readme.mjs` (CI check, 536 lines, longest regex 84)
- `krizaka-agents` `tools/board-sync.py` (cron, 481 lines, longest regex 84)
- … and 3 more in catalogue.json

### Over 400 lines (37)

- `.github` `actions/detect/detect.mjs` (CI check, 483 lines)
- `.github` `scripts/profile-readme.mjs` (CI check, 536 lines)
- `folioviv` `apps/web/scripts/seed-cast.mjs` (dev tool, 408 lines)
- `folioviv` `scripts/shots-storefront.mjs` (dev tool, 411 lines)
- `krizaka-agents` `tools/board-cache.py` (library, 431 lines)
- `krizaka-agents` `tools/board-sync.py` (cron, 481 lines)
- `krizaka-agents` `tools/codegraph-first-hook.py` (library, 484 lines)
- `krizaka-agents` `tools/coord/registry.py` (generator, 1127 lines)
- `krizaka-agents` `tools/crack.py` (cron, 1063 lines)
- `krizaka-agents` `tools/events_db.py` (library, 569 lines)
- `krizaka-agents` `tools/fmt.py` (git hook, 455 lines)
- `krizaka-agents` `tools/git-guard.py` (git hook, 621 lines)
- `krizaka-agents` `tools/install.py` (library, 630 lines)
- `krizaka-agents` `tools/krizaka-precheck` (git hook, 1028 lines)
- `krizaka-agents` `tools/kz.py` (library, 1280 lines)
- `krizaka-agents` `tools/observability-probes.py` (CI check, 430 lines)
- `krizaka-agents` `tools/ops/api.py` (dev tool, 654 lines)
- `krizaka-agents` `tools/ops/sync.py` (library, 425 lines)
- `krizaka-agents` `tools/recette.py` (cron, 599 lines)
- `krizaka-agents` `tools/secret-scan.py` (git hook, 462 lines)
- `krizaka-agents` `tools/session_env.py` (library, 1630 lines)
- `krizaka-agents` `tools/team-session.py` (library, 1879 lines)
- `krizaka-agents` `tools/train-queue.py` (library, 869 lines)
- `krizaka-agents` `tools/watchdog.py` (cron, 950 lines)
- `krizaka-blog` `scripts/capture-cockpit.mjs` (dev tool, 621 lines)
- `krizaka-blog` `scripts/gen-downloads.mjs` (generator, 541 lines)
- `krizaka-com` `scripts/cdn-assets.mjs` (CI check, 758 lines)
- `krizaka-com` `scripts/home-showcase.mjs` (dev tool, 402 lines)
- `krizaka-ts` `packages/config/bin/krizaka-seo-family.mjs` (CI check, 407 lines)
- `krizaka-ui` `packages/tokens/scripts/build.mjs` (generator, 750 lines)
- `krizaka-ui` `tools/usage-inventory.mjs` (CI check, 922 lines)
- `sovkora` `apps/web/scripts/record-tour.mjs` (dev tool, 549 lines)
- `sovkora` `apps/web/scripts/videos-preflight.mjs` (CI check, 455 lines)
- `sovkora` `scripts/dev-deploy.mjs` (deploy, 832 lines)
- `sovkora` `scripts/generate-docs.mjs` (generator, 2797 lines)
- `sovkora` `scripts/gpu-dev.sh` (CI check, 428 lines)
- `verikora` `scripts/demo-documents/catalogue.mjs` (library, 451 lines)

### No header (31)

- `.github` `actions/app-videos/action.yml` (CI check, 62 lines)
- `.github` `actions/cdn-purge/action.yml` (deploy, 32 lines)
- `.github` `actions/security-tools/action.yml` (CI check, 35 lines)
- `.github` `scripts/repository-names.mjs` (CI check, 64 lines)
- `folioviv` `scripts/e2e-shoot.mjs` (library, 16 lines)
- `folioviv` `scripts/lib/e2e-pricing.mjs` (library, 22 lines)
- `folioviv` `scripts/lib/tool-path.mjs` (library, 27 lines)
- `kridoc` `.github/workflows/ci.yml` (CI check, 48 lines)
- `kridoc` `.github/workflows/drift.yml` (one-off, 22 lines)
- `krizaka-agents` `.github/workflows/ci.yml` (CI check, 81 lines)
- `krizaka-agents` `tools/board-mv.py` (library, 60 lines)
- `krizaka-agents` `tools/kz-config` (dev tool, 3 lines)
- `krizaka-agents` `tools/wt-done` (dev tool, 3 lines)
- `krizaka-agents` `tools/wt-new` (dev tool, 3 lines)
- `krizaka-com` `.github/workflows/ci.yml` (CI check, 47 lines)
- `krizaka-coming-soon` `.github/workflows/ci.yml` (CI check, 42 lines)
- `krizaka-java` `site/scripts/build-info.d.mts` (generator, 1 lines)
- `krizaka-lab` `.github/workflows/ci.yml` (CI check, 43 lines)
- `krizaka-lab` `.github/workflows/deploy-pages.yml` (deploy, 59 lines)
- `krizaka-lab` `scripts/generate-routes.mjs` (generator, 113 lines)
- `krizaka-rust` `.github/workflows/ci.yml` (CI check, 87 lines)
- `krizaka-ts` `.github/workflows/ci.yml` (CI check, 39 lines)
- `krizaka-ui-builder` `.github/workflows/ci.yml` (CI check, 36 lines)
- `krizaka-ui-builder` `.github/workflows/editor-task-cost.yml` (CI check, 40 lines)
- `krizaka-ui` `.github/workflows/release.yml` (deploy, 136 lines)
- `krizaka-ui` `tools/ci-filter.mjs` (CI check, 29 lines)
- `krizaka-ui` `tools/consumer-smoke/next/app/api/events/route.ts` (library, 13 lines)
- `krizaka-ui` `tools/consumer-smoke/next/lib/i18n.ts` (library, 10 lines)
- `sovkora` `scripts/lib/walk.mjs` (library, 27 lines)
- `verikora` `scripts/demo-documents/index.mjs` (library, 43 lines)
- `verikora` `scripts/demo-documents/render.mjs` (library, 82 lines)

### Copied (19)

- `folioviv` `scripts/sg-fix.mjs` (dev tool, 64 lines)
- `folioviv` `scripts/sync-brand-icons.mjs` (library, 86 lines)
- `kridoc` `scripts/promote-production.mjs` (deploy, 87 lines)
- `krizaka-blog` `scripts/check-seo-family.mjs` (library, 318 lines)
- `krizaka-blog` `scripts/sync-brand-icons.mjs` (library, 40 lines)
- `krizaka-com` `scripts/promote-production.mjs` (deploy, 87 lines)
- `krizaka-com` `scripts/sg-fix.mjs` (dev tool, 61 lines)
- `krizaka-com` `scripts/sync-brand-icons.mjs` (generator, 40 lines)
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
- `verikora` `scripts/sync-brand-icons.mjs` (library, 87 lines)

## Over time

| Day | Units | Nothing calls it | No test | Regex over 80 characters | Over 400 lines | No header | Copied |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 2026-11-07 | 1164 | 194 | 51 | 37 | 22 | 33 | 35 |
| 2026-11-11 | 1063 | 190 | 50 | 37 | 26 | 29 | 31 |
| 2026-11-12 | 1082 | 188 | 51 | 35 | 26 | 29 | 31 |
| 2026-11-13 | 1094 | 192 | 50 | 35 | 28 | 29 | 31 |
| 2026-11-14 | 1131 | 197 | 53 | 39 | 31 | 31 | 30 |
| 2026-11-15 | 1178 | 203 | 57 | 41 | 33 | 31 | 19 |
| 2026-11-16 | 1220 | 206 | 56 | 43 | 37 | 31 | 19 |
