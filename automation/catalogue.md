# Automation catalogue

Generated 2026-11-22T14:07:45.422Z by https://github.com/krizaka/.github/actions/runs/45031014016 from the files of 18 active repositories at their default branch (ADR-026). Machine-readable: [catalogue.json](catalogue.json), schema `krizaka.automation/1`; fields explained in docs/standards/automation-catalogue.md.

**1349 units.**

## By kind

| Kind | Units |
| :-- | :-- |
| CI check | 440 |
| agent hook | 31 |
| cron | 64 |
| deploy | 74 |
| dev tool | 231 |
| generator | 80 |
| git hook | 19 |
| library | 400 |
| one-off | 10 |

## By type

| Type | Units |
| :-- | :-- |
| action | 22 |
| agent-hook | 26 |
| cron | 18 |
| entrypoint | 7 |
| hook-config | 5 |
| launchagent | 2 |
| npm-script | 153 |
| script | 855 |
| template | 8 |
| workflow | 253 |

## By repository

| Repository | Units | Nothing calls it | No test | Regex over 80 characters | Over 400 lines | No header | Copied |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| krizaka-agents | 235 | 52 | 4 | 15 | 34 | 6 | 0 |
| krizaka-ui | 141 | 39 | 12 | 6 | 3 | 4 | 1 |
| sovkora | 157 | 31 | 9 | 12 | 5 | 1 | 2 |
| .github | 224 | 16 | 3 | 11 | 4 | 4 | 0 |
| folioviv | 95 | 22 | 4 | 2 | 2 | 3 | 2 |
| verikora | 109 | 22 | 3 | 0 | 1 | 2 | 3 |
| krizaka-com | 88 | 15 | 1 | 2 | 2 | 1 | 3 |
| krizaka-blog | 68 | 10 | 3 | 1 | 3 | 0 | 3 |
| krizaka-ts | 60 | 5 | 3 | 1 | 1 | 1 | 3 |
| kridoc | 29 | 9 | 0 | 0 | 0 | 2 | 1 |
| krizaka-infra | 31 | 4 | 4 | 2 | 0 | 0 | 0 |
| krizaka-java | 32 | 3 | 2 | 2 | 0 | 1 | 1 |
| krizaka-lab | 19 | 0 | 4 | 0 | 0 | 3 | 0 |
| krizaka-agents-site | 14 | 2 | 2 | 1 | 0 | 0 | 1 |
| krizaka-coming-soon | 15 | 1 | 2 | 0 | 0 | 1 | 1 |
| krizaka-social | 10 | 2 | 1 | 0 | 0 | 1 | 0 |
| krizaka-ui-builder | 12 | 2 | 0 | 0 | 0 | 2 | 0 |
| krizaka-rust | 10 | 0 | 0 | 0 | 0 | 1 | 0 |

## Flags

### Nothing calls it (235)

- `.github` `.github/workflows/cla.yml` (CI check, 58 lines)
- `.github` `.github/workflows/journey-line.yml` (CI check, 40 lines)
- `.github` `.github/workflows/post-deploy-journeys.yml` (deploy, 204 lines)
- `.github` `.github/workflows/product-readme.yml` (CI check, 63 lines)
- `.github` `.github/workflows/tauri-macos-release.yml` (deploy, 193 lines)
- `.github` `actions/setup/install.sh` (dev tool, 34 lines)
- `.github` `actions/sonar-ratchet/action.yml` (CI check, 36 lines)
- `.github` `package.json#precheck` (CI check, 1 lines)
- `.github` `scripts/check-ui-drift.mjs` (CI check, 99 lines)
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
- `folioviv` `packages/db/package.json#db:generate` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#db:rebuild` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#seed` (dev tool, 1 lines)
- `folioviv` `packages/db/package.json#seed:demos` (dev tool, 1 lines)
- `folioviv` `scripts/record-hero.mjs` (dev tool, 223 lines)
- `folioviv` `scripts/record-journey.mjs` (dev tool, 305 lines)
- `folioviv` `scripts/record-krizaka-first-client.mjs` (dev tool, 307 lines)
- `folioviv` `scripts/setup-krizaka-shop.mjs` (dev tool, 161 lines)
- `kridoc` `apps/web/package.json#db:rebuild` (dev tool, 1 lines)
- `kridoc` `apps/web/package.json#storage:client` (dev tool, 1 lines)
- … and 195 more in catalogue.json

### No test (57)

- `.github` `scripts/actions-audit.sh` (CI check, 26 lines)
- `.github` `scripts/gen-release-consumers.mjs` (deploy, 24 lines)
- `.github` `scripts/hooks/zizmor-workflows.sh` (git hook, 11 lines)
- `folioviv` `apps/web/scripts/default-media/build.mjs` (generator, 89 lines)
- `folioviv` `apps/web/scripts/showcase-web.mjs` (CI check, 145 lines)
- `folioviv` `scripts/check-founder-name.mjs` (CI check, 23 lines)
- `folioviv` `scripts/check-maps.mjs` (CI check, 48 lines)
- `krizaka-agents-site` `site/scripts/check-overflow.mjs` (CI check, 98 lines)
- `krizaka-agents-site` `site/scripts/extract-pages.mjs` (deploy, 52 lines)
- `krizaka-agents` `scripts/coverage-tools.sh` (CI check, 15 lines)
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
- … and 17 more in catalogue.json

### Regex over 80 characters (55)

- `krizaka-agents-site` `site/scripts/publication-rules.mjs` (dev tool, 108 lines, longest regex 277)
- `krizaka-ui` `apps/site/scripts/scan-ui-usage.mjs` (CI check, 134 lines, longest regex 214)
- `sovkora` `scripts/lib/krizaka-versions.mjs` (library, 150 lines, longest regex 181)
- `folioviv` `scripts/check-hydration.mjs` (CI check, 335 lines, longest regex 180)
- `sovkora` `scripts/generate-docs.mjs` (generator, 2797 lines, longest regex 159)
- `krizaka-agents` `tools/ops/rotations.py` (library, 222 lines, longest regex 156)
- `krizaka-agents` `scripts/validate-skills.mjs` (dev tool, 293 lines, longest regex 150)
- `sovkora` `scripts/ci-plan.mjs` (CI check, 60 lines, longest regex 144)
- `folioviv` `scripts/lib/public-surface.mjs` (library, 17 lines, longest regex 128)
- `krizaka-agents` `tools/kz.py` (library, 1280 lines, longest regex 115)
- `sovkora` `scripts/lib/java-layout.mjs` (library, 76 lines, longest regex 115)
- `.github` `scripts/check-app-links.mjs` (library, 292 lines, longest regex 114)
- `sovkora` `apps/web/scripts/check-app-links.mjs` (CI check, 322 lines, longest regex 114)
- `.github` `scripts/conformance-checks.mjs` (library, 451 lines, longest regex 113)
- `sovkora` `scripts/check-code-names.mjs` (CI check, 164 lines, longest regex 112)
- `krizaka-agents` `tools/ownership.py` (library, 944 lines, longest regex 111)
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
- `krizaka-agents` `tools/team-session.py` (cron, 2521 lines, longest regex 95)
- `sovkora` `scripts/lib/doc-patterns.mjs` (library, 91 lines, longest regex 95)
- `krizaka-agents` `tools/train-control.py` (cron, 415 lines, longest regex 94)
- `krizaka-com` `scripts/pr-assets.mjs` (library, 261 lines, longest regex 94)
- `krizaka-ui` `tools/export-defaults.mjs` (generator, 142 lines, longest regex 94)
- `krizaka-agents` `tools/push_refusal.py` (dev tool, 40 lines, longest regex 92)
- `krizaka-java` `site/scripts/gen-building-blocks.mjs` (generator, 169 lines, longest regex 91)
- `krizaka-ts` `scripts/check-aws-sdk.mjs` (CI check, 58 lines, longest regex 91)
- `sovkora` `scripts/architecture-target.mjs` (CI check, 153 lines, longest regex 88)
- `.github` `scripts/pin-supply-chain.mjs` (CI check, 209 lines, longest regex 87)
- `krizaka-ui` `packages/tokens/scripts/build.mjs` (generator, 769 lines, longest regex 87)
- `.github` `scripts/callers-report.mjs` (CI check, 85 lines, longest regex 86)
- … and 15 more in catalogue.json

### Over 400 lines (55)

- `.github` `actions/detect/detect.mjs` (CI check, 483 lines)
- `.github` `scripts/conformance-checks.mjs` (library, 451 lines)
- `.github` `scripts/family-drift.mjs` (CI check, 453 lines)
- `.github` `scripts/profile-readme.mjs` (CI check, 544 lines)
- `folioviv` `apps/web/scripts/seed-cast.mjs` (dev tool, 408 lines)
- `folioviv` `scripts/shots-storefront.mjs` (dev tool, 413 lines)
- `krizaka-agents` `tools/board-cache.py` (library, 431 lines)
- `krizaka-agents` `tools/board-sync.py` (cron, 551 lines)
- `krizaka-agents` `tools/codegraph-first-hook.py` (library, 684 lines)
- `krizaka-agents` `tools/conflicts.py` (library, 741 lines)
- `krizaka-agents` `tools/coord/registry.py` (generator, 1127 lines)
- `krizaka-agents` `tools/crack.py` (cron, 1093 lines)
- `krizaka-agents` `tools/credential_age.py` (library, 566 lines)
- `krizaka-agents` `tools/credential_rotation/adapters.py` (library, 593 lines)
- `krizaka-agents` `tools/done_when.py` (library, 428 lines)
- `krizaka-agents` `tools/engine.py` (library, 919 lines)
- `krizaka-agents` `tools/events_db.py` (library, 645 lines)
- `krizaka-agents` `tools/fake-github.py` (library, 513 lines)
- `krizaka-agents` `tools/fmt.py` (git hook, 455 lines)
- `krizaka-agents` `tools/freshness.py` (library, 489 lines)
- `krizaka-agents` `tools/git-guard.py` (git hook, 635 lines)
- `krizaka-agents` `tools/install.py` (library, 645 lines)
- `krizaka-agents` `tools/krizaka-precheck` (git hook, 1218 lines)
- `krizaka-agents` `tools/kz.py` (library, 1280 lines)
- `krizaka-agents` `tools/kzstates.py` (library, 502 lines)
- `krizaka-agents` `tools/lane-dispatch.py` (cron, 649 lines)
- `krizaka-agents` `tools/observability-probes.py` (CI check, 430 lines)
- `krizaka-agents` `tools/ops/api.py` (dev tool, 774 lines)
- `krizaka-agents` `tools/ops/sessions.py` (library, 450 lines)
- `krizaka-agents` `tools/ops/sync.py` (library, 550 lines)
- `krizaka-agents` `tools/overlap-proof.py` (dev tool, 1183 lines)
- `krizaka-agents` `tools/ownership.py` (library, 944 lines)
- `krizaka-agents` `tools/recette.py` (cron, 591 lines)
- `krizaka-agents` `tools/secret-scan.py` (git hook, 462 lines)
- `krizaka-agents` `tools/session_env.py` (library, 1877 lines)
- `krizaka-agents` `tools/team-session.py` (cron, 2521 lines)
- `krizaka-agents` `tools/train-control.py` (cron, 415 lines)
- `krizaka-agents` `tools/train-queue.py` (library, 1015 lines)
- `krizaka-agents` `tools/watchdog.py` (cron, 1252 lines)
- `krizaka-agents` `tools/wt.py` (dev tool, 543 lines)
- … and 15 more in catalogue.json

### No header (33)

- `.github` `actions/app-videos/action.yml` (CI check, 62 lines)
- `.github` `actions/cdn-purge/action.yml` (deploy, 32 lines)
- `.github` `actions/security-tools/action.yml` (CI check, 35 lines)
- `.github` `scripts/repository-names.mjs` (CI check, 67 lines)
- `folioviv` `scripts/e2e-shoot.mjs` (library, 16 lines)
- `folioviv` `scripts/lib/e2e-pricing.mjs` (library, 22 lines)
- `folioviv` `scripts/lib/tool-path.mjs` (library, 27 lines)
- `kridoc` `.github/workflows/ci.yml` (CI check, 48 lines)
- `kridoc` `.github/workflows/drift.yml` (one-off, 22 lines)
- `krizaka-agents` `.github/workflows/ci.yml` (CI check, 82 lines)
- `krizaka-agents` `tools/board-mv.py` (library, 60 lines)
- `krizaka-agents` `tools/kz-config` (dev tool, 3 lines)
- `krizaka-agents` `tools/ports/adapters/storage.py` (dev tool, 39 lines)
- `krizaka-agents` `tools/wt-done` (dev tool, 3 lines)
- `krizaka-agents` `tools/wt-new` (dev tool, 3 lines)
- `krizaka-com` `.github/workflows/ci.yml` (CI check, 47 lines)
- `krizaka-coming-soon` `.github/workflows/ci.yml` (CI check, 42 lines)
- `krizaka-java` `site/scripts/build-info.d.mts` (generator, 1 lines)
- `krizaka-lab` `.github/workflows/ci.yml` (CI check, 43 lines)
- `krizaka-lab` `.github/workflows/deploy-pages.yml` (deploy, 59 lines)
- `krizaka-lab` `scripts/generate-routes.mjs` (generator, 113 lines)
- `krizaka-rust` `.github/workflows/ci.yml` (CI check, 87 lines)
- `krizaka-social` `.github/workflows/ci.yml` (CI check, 36 lines)
- `krizaka-ts` `.github/workflows/ci.yml` (CI check, 41 lines)
- `krizaka-ui-builder` `.github/workflows/ci.yml` (CI check, 36 lines)
- `krizaka-ui-builder` `.github/workflows/editor-task-cost.yml` (CI check, 40 lines)
- `krizaka-ui` `.github/workflows/release.yml` (deploy, 137 lines)
- `krizaka-ui` `tools/ci-filter.mjs` (CI check, 30 lines)
- `krizaka-ui` `tools/consumer-smoke/next/app/api/events/route.ts` (library, 13 lines)
- `krizaka-ui` `tools/consumer-smoke/next/lib/i18n.ts` (library, 10 lines)
- `sovkora` `scripts/lib/walk.mjs` (library, 27 lines)
- `verikora` `scripts/demo-documents/index.mjs` (library, 43 lines)
- `verikora` `scripts/demo-documents/render.mjs` (library, 82 lines)

### Copied (21)

- `folioviv` `scripts/sg-fix.mjs` (dev tool, 62 lines)
- `folioviv` `scripts/sync-brand-icons.mjs` (library, 86 lines)
- `kridoc` `scripts/promote-production.mjs` (deploy, 87 lines)
- `krizaka-agents-site` `site/scripts/proofs.mjs` (dev tool, 93 lines)
- `krizaka-blog` `scripts/check-seo-family.mjs` (library, 318 lines)
- `krizaka-blog` `scripts/proofs.mjs` (dev tool, 93 lines)
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
- `verikora` `scripts/sync-brand-icons.mjs` (library, 89 lines)

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
| 2026-11-17 | 1237 | 211 | 55 | 43 | 40 | 31 | 19 |
| 2026-11-18 | 1249 | 213 | 57 | 46 | 43 | 31 | 19 |
| 2026-11-19 | 1293 | 225 | 58 | 50 | 47 | 32 | 19 |
| 2026-11-20 | 1309 | 227 | 58 | 52 | 51 | 32 | 21 |
| 2026-11-21 | 1318 | 227 | 58 | 54 | 53 | 32 | 21 |
| 2026-11-22 | 1349 | 235 | 57 | 55 | 55 | 33 | 21 |
