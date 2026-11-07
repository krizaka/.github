# Automation catalogue

Generated 2026-11-07T12:33:07.409Z by https://github.com/krizaka/.github/actions/runs/42372842087 from the files of 33 active repositories at their default branch (ADR-026). Machine-readable: [catalogue.json](catalogue.json), schema `krizaka.automation/1`; fields explained in docs/standards/automation-catalogue.md.

**1164 units.**

## By kind

| Kind | Units |
| :-- | :-- |
| CI check | 467 |
| agent hook | 43 |
| cron | 51 |
| deploy | 72 |
| dev tool | 196 |
| generator | 67 |
| git hook | 21 |
| library | 239 |
| one-off | 8 |

## By type

| Type | Units |
| :-- | :-- |
| action | 23 |
| agent-hook | 40 |
| cron | 15 |
| entrypoint | 8 |
| hook-config | 7 |
| npm-script | 146 |
| script | 604 |
| template | 8 |
| workflow | 313 |

## By repository

| Repository | Units | Nothing calls it | No test | Regex over 80 characters | Over 400 lines | No header | Copied |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| krizaka-ui | 127 | 37 | 12 | 7 | 3 | 4 | 4 |
| krizaka-agents | 111 | 22 | 5 | 6 | 8 | 5 | 1 |
| .github | 181 | 12 | 3 | 10 | 3 | 4 | 0 |
| folioviv | 82 | 23 | 3 | 1 | 0 | 2 | 3 |
| verikora | 87 | 18 | 2 | 0 | 1 | 2 | 3 |
| sovkora | 90 | 10 | 3 | 6 | 3 | 2 | 1 |
| krizaka-com | 77 | 14 | 1 | 2 | 2 | 1 | 4 |
| sovkora-web | 37 | 11 | 2 | 1 | 1 | 0 | 2 |
| sovkora-cli | 22 | 12 | 2 | 0 | 0 | 0 | 0 |
| krizaka-blog | 54 | 7 | 2 | 0 | 1 | 0 | 2 |
| krizaka-ts | 45 | 4 | 3 | 0 | 0 | 1 | 4 |
| kridoc | 18 | 4 | 1 | 0 | 0 | 2 | 4 |
| krizaka-template-web | 18 | 5 | 1 | 0 | 0 | 2 | 3 |
| krizaka-java | 31 | 3 | 2 | 2 | 0 | 1 | 2 |
| krizaka-lab | 19 | 0 | 4 | 0 | 0 | 3 | 0 |
| krizaka-coming-soon | 15 | 1 | 2 | 0 | 0 | 1 | 2 |
| krizaka-infra | 11 | 2 | 2 | 1 | 0 | 0 | 0 |
| sovkora-mobile | 15 | 3 | 0 | 1 | 0 | 0 | 0 |
| krizaka-desktop | 11 | 2 | 0 | 0 | 0 | 1 | 0 |
| krizaka-template-desktop | 9 | 2 | 0 | 0 | 0 | 1 | 0 |
| krizaka-composer | 9 | 1 | 0 | 0 | 0 | 1 | 0 |
| sovkora-ui-kit | 14 | 1 | 1 | 0 | 0 | 0 | 0 |
| sovkora-automation-service | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| sovkora-build | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| sovkora-contracts | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| sovkora-conversation-service | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| sovkora-edge-service | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| sovkora-engine | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| sovkora-job-service | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| sovkora-knowledge-service | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| sovkora-packs | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| sovkora-studio-service | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| sovkora-worker-media | 9 | 0 | 0 | 0 | 0 | 0 | 0 |

## Flags

### Nothing calls it (194)

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
- `folioviv` `apps/web/scripts/default-media/build.mjs` (generator, 75 lines)
- `folioviv` `apps/web/scripts/enrich-saint-henri.mjs` (one-off, 27 lines)
- `folioviv` `apps/web/scripts/explore-plan.mjs` (dev tool, 106 lines)
- `folioviv` `apps/web/scripts/qa-reset-walker.mjs` (dev tool, 30 lines)
- `folioviv` `apps/web/scripts/seed-staff-day.mjs` (dev tool, 63 lines)
- `folioviv` `apps/web/scripts/seed-staff.mjs` (dev tool, 57 lines)
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
- `folioviv` `scripts/record-hero.mjs` (dev tool, 183 lines)
- `folioviv` `scripts/record-journey.mjs` (dev tool, 226 lines)
- `folioviv` `scripts/record-krizaka-first-client.mjs` (dev tool, 250 lines)
- `folioviv` `scripts/setup-krizaka-shop.mjs` (dev tool, 140 lines)
- `kridoc` `package.json#drift` (CI check, 1 lines)
- `kridoc` `package.json#seo:check` (CI check, 1 lines)
- `kridoc` `package.json#sg:fix` (dev tool, 1 lines)
- `kridoc` `package.json#sg:ratchet:update` (CI check, 1 lines)
- `krizaka-agents` `package.json#gen:install-docs` (generator, 1 lines)
- … and 154 more in catalogue.json

### No test (51)

- `.github` `scripts/actions-audit.sh` (CI check, 26 lines)
- `.github` `scripts/gen-release-consumers.mjs` (deploy, 24 lines)
- `.github` `scripts/hooks/zizmor-workflows.sh` (git hook, 11 lines)
- `folioviv` `.githooks/pre-push` (git hook, 26 lines)
- `folioviv` `apps/web/scripts/default-media/build.mjs` (generator, 75 lines)
- `folioviv` `apps/web/scripts/showcase-web.mjs` (CI check, 121 lines)
- `kridoc` `scripts/ci-after-build.sh` (CI check, 11 lines)
- `krizaka-agents` `scripts/test-tools.sh` (CI check, 60 lines)
- `krizaka-agents` `tools/codegraph-index.sh` (cron, 16 lines)
- `krizaka-agents` `tools/db-drift-cron.sh` (cron, 6 lines)
- `krizaka-agents` `tools/runpod/guard-run.sh` (CI check, 8 lines)
- `krizaka-agents` `tools/update-behind-cron.sh` (cron, 9 lines)
- `krizaka-blog` `scripts/gen-issue-curve.mjs` (generator, 91 lines)
- `krizaka-blog` `scripts/newsletter-probe.mjs` (CI check, 21 lines)
- `krizaka-com` `scripts/check-page-templates.mjs` (CI check, 22 lines)
- `krizaka-coming-soon` `scripts/build-all.mjs` (generator, 24 lines)
- `krizaka-coming-soon` `scripts/ci-after-build.sh` (CI check, 18 lines)
- `krizaka-infra` `scripts/check.sh` (CI check, 20 lines)
- `krizaka-infra` `scripts/dns-plan.sh` (CI check, 53 lines)
- `krizaka-java` `site/scripts/build-info.d.mts` (generator, 1 lines)
- `krizaka-java` `site/scripts/gen-registry-versions.mjs` (generator, 62 lines)
- `krizaka-lab` `scripts/check-demos.mjs` (CI check, 111 lines)
- `krizaka-lab` `scripts/check-maps.mjs` (CI check, 58 lines)
- `krizaka-lab` `scripts/check-motion.mjs` (CI check, 86 lines)
- `krizaka-lab` `scripts/ci-after-build.sh` (CI check, 31 lines)
- `krizaka-template-web` `scripts/ci-after-build.sh` (CI check, 11 lines)
- `krizaka-ts` `.githooks/pre-push` (git hook, 26 lines)
- `krizaka-ts` `packages/org/scripts/emit.mjs` (generator, 14 lines)
- `krizaka-ts` `site/scripts/gen-packages.mjs` (generator, 114 lines)
- `krizaka-ui` `apps/site/scripts/crawl-check.mjs` (CI check, 144 lines)
- `krizaka-ui` `apps/site/scripts/gen-ui-docs.mjs` (generator, 162 lines)
- `krizaka-ui` `apps/site/scripts/motion-check.mjs` (CI check, 57 lines)
- `krizaka-ui` `apps/site/scripts/scan-ui-usage.mjs` (CI check, 134 lines)
- `krizaka-ui` `apps/storybook/scripts/test-linux.mjs` (CI check, 35 lines)
- `krizaka-ui` `apps/storybook/scripts/test.mjs` (CI check, 43 lines)
- `krizaka-ui` `packages/charts/scripts/build-registry.mjs` (generator, 70 lines)
- `krizaka-ui` `packages/charts/scripts/dist-check.mjs` (CI check, 50 lines)
- `krizaka-ui` `packages/email/scripts/gen-themes.mjs` (generator, 64 lines)
- `krizaka-ui` `packages/fonts/scripts/subset.py` (generator, 265 lines)
- `krizaka-ui` `packages/ui/scripts/build-registry.mjs` (generator, 70 lines)
- … and 11 more in catalogue.json

### Regex over 80 characters (37)

- `krizaka-ui` `apps/site/scripts/scan-ui-usage.mjs` (CI check, 134 lines, longest regex 214)
- `sovkora` `scripts/lib/krizaka-versions.mjs` (library, 128 lines, longest regex 181)
- `folioviv` `scripts/check-hydration.mjs` (CI check, 213 lines, longest regex 180)
- `sovkora` `scripts/generate-docs.mjs` (generator, 2803 lines, longest regex 160)
- `krizaka-agents` `scripts/validate-skills.mjs` (dev tool, 216 lines, longest regex 150)
- `krizaka-ui` `tools/inventory.mjs` (dev tool, 455 lines, longest regex 139)
- `sovkora` `scripts/ci-plan.mjs` (CI check, 58 lines, longest regex 132)
- `krizaka-ui` `tools/export-brand.mjs` (generator, 306 lines, longest regex 127)
- `sovkora` `scripts/lib/bakeoff/verify.mjs` (library, 126 lines, longest regex 120)
- `krizaka-agents` `tools/kz.py` (library, 830 lines, longest regex 115)
- `.github` `scripts/check-app-links.mjs` (library, 292 lines, longest regex 114)
- `sovkora-web` `scripts/check-app-links.mjs` (CI check, 322 lines, longest regex 114)
- `.github` `scripts/audit-guards.mjs` (CI check, 101 lines, longest regex 107)
- `krizaka-com` `scripts/gen-registry-versions.mjs` (generator, 156 lines, longest regex 107)
- `.github` `actions/detect/detect.mjs` (CI check, 483 lines, longest regex 106)
- `.github` `scripts/repository-names.mjs` (CI check, 64 lines, longest regex 105)
- `krizaka-agents` `tools/done_when.py` (library, 332 lines, longest regex 104)
- `krizaka-infra` `scripts/check-commercial-dns.sh` (library, 66 lines, longest regex 101)
- `krizaka-ui` `packages/charts/scripts/dist-check.mjs` (CI check, 50 lines, longest regex 100)
- `krizaka-agents` `scripts/check-no-private.mjs` (CI check, 57 lines, longest regex 97)
- `krizaka-com` `scripts/pr-assets.mjs` (library, 256 lines, longest regex 95)
- `krizaka-agents` `tools/train-control.py` (cron, 283 lines, longest regex 94)
- `krizaka-ui` `tools/export-defaults.mjs` (generator, 141 lines, longest regex 94)
- `.github` `scripts/profile-readme.mjs` (CI check, 536 lines, longest regex 92)
- `krizaka-java` `site/scripts/gen-building-blocks.mjs` (generator, 169 lines, longest regex 91)
- `sovkora` `scripts/lib/model-registry.mjs` (library, 296 lines, longest regex 88)
- `.github` `scripts/conformance.mjs` (CI check, 687 lines, longest regex 87)
- `.github` `scripts/pin-supply-chain.mjs` (CI check, 209 lines, longest regex 87)
- `krizaka-ui` `packages/tokens/scripts/build.mjs` (generator, 693 lines, longest regex 87)
- `.github` `scripts/callers-report.mjs` (CI check, 85 lines, longest regex 86)
- `.github` `scripts/check-public-issues-ours.mjs` (CI check, 99 lines, longest regex 86)
- `krizaka-java` `site/scripts/gen-proof.mjs` (generator, 115 lines, longest regex 86)
- `krizaka-ui` `apps/site/scripts/crawl-check.mjs` (CI check, 144 lines, longest regex 85)
- `sovkora-mobile` `scripts/check-app-links.mjs` (CI check, 384 lines, longest regex 85)
- `.github` `scripts/conformance-versions.mjs` (library, 137 lines, longest regex 84)
- `krizaka-agents` `tools/board-sync.py` (cron, 358 lines, longest regex 84)
- `sovkora` `scripts/lib/migration-probes.mjs` (library, 160 lines, longest regex 84)

### Over 400 lines (22)

- `.github` `actions/detect/detect.mjs` (CI check, 483 lines)
- `.github` `scripts/conformance.mjs` (CI check, 687 lines)
- `.github` `scripts/profile-readme.mjs` (CI check, 536 lines)
- `krizaka-agents` `tools/crack.py` (cron, 913 lines)
- `krizaka-agents` `tools/git-guard.py` (git hook, 440 lines)
- `krizaka-agents` `tools/install.py` (library, 440 lines)
- `krizaka-agents` `tools/kz.py` (library, 830 lines)
- `krizaka-agents` `tools/recette.py` (cron, 605 lines)
- `krizaka-agents` `tools/secret-scan.py` (git hook, 458 lines)
- `krizaka-agents` `tools/train-queue.py` (library, 532 lines)
- `krizaka-agents` `tools/watchdog.py` (cron, 696 lines)
- `krizaka-blog` `scripts/gen-downloads.mjs` (generator, 541 lines)
- `krizaka-com` `scripts/cdn-assets.mjs` (CI check, 703 lines)
- `krizaka-com` `scripts/home-showcase.mjs` (dev tool, 402 lines)
- `krizaka-ui` `packages/tokens/scripts/build.mjs` (generator, 693 lines)
- `krizaka-ui` `tools/inventory.mjs` (dev tool, 455 lines)
- `krizaka-ui` `tools/usage-inventory.mjs` (CI check, 915 lines)
- `sovkora-web` `scripts/record-tour.mjs` (dev tool, 547 lines)
- `sovkora` `scripts/dev-deploy.mjs` (deploy, 755 lines)
- `sovkora` `scripts/generate-docs.mjs` (generator, 2803 lines)
- `sovkora` `scripts/gpu-dev.sh` (CI check, 417 lines)
- `verikora` `scripts/demo-documents/catalogue.mjs` (library, 444 lines)

### No header (33)

- `.github` `actions/app-videos/action.yml` (CI check, 62 lines)
- `.github` `actions/cdn-purge/action.yml` (deploy, 32 lines)
- `.github` `actions/security-tools/action.yml` (CI check, 19 lines)
- `.github` `scripts/repository-names.mjs` (CI check, 64 lines)
- `folioviv` `scripts/e2e-shoot.mjs` (library, 16 lines)
- `folioviv` `scripts/lib/e2e-pricing.mjs` (library, 18 lines)
- `kridoc` `.github/workflows/ci.yml` (CI check, 41 lines)
- `kridoc` `.github/workflows/drift.yml` (one-off, 22 lines)
- `krizaka-agents` `.github/workflows/ci.yml` (CI check, 51 lines)
- `krizaka-agents` `tools/board-mv.py` (library, 60 lines)
- `krizaka-agents` `tools/kz-config` (dev tool, 3 lines)
- `krizaka-agents` `tools/wt-done` (dev tool, 3 lines)
- `krizaka-agents` `tools/wt-new` (dev tool, 3 lines)
- `krizaka-com` `.github/workflows/ci.yml` (CI check, 45 lines)
- `krizaka-coming-soon` `.github/workflows/ci.yml` (CI check, 44 lines)
- `krizaka-composer` `.github/workflows/ci.yml` (CI check, 36 lines)
- `krizaka-desktop` `.github/workflows/ci.yml` (CI check, 48 lines)
- `krizaka-java` `site/scripts/build-info.d.mts` (generator, 1 lines)
- `krizaka-lab` `.github/workflows/ci.yml` (CI check, 43 lines)
- `krizaka-lab` `.github/workflows/deploy-pages.yml` (deploy, 59 lines)
- `krizaka-lab` `scripts/generate-routes.mjs` (generator, 113 lines)
- `krizaka-template-desktop` `.github/workflows/ci.yml` (CI check, 27 lines)
- `krizaka-template-web` `.github/workflows/ci.yml` (CI check, 40 lines)
- `krizaka-template-web` `.github/workflows/drift.yml` (cron, 24 lines)
- `krizaka-ts` `.github/workflows/ci.yml` (CI check, 39 lines)
- `krizaka-ui` `.github/workflows/release.yml` (deploy, 129 lines)
- `krizaka-ui` `tools/ci-filter.mjs` (CI check, 29 lines)
- `krizaka-ui` `tools/consumer-smoke/next/app/api/events/route.ts` (library, 13 lines)
- `krizaka-ui` `tools/consumer-smoke/next/lib/i18n.ts` (library, 10 lines)
- `sovkora` `scripts/lib/walk.mjs` (library, 27 lines)
- `sovkora` `scripts/lib/workspace-cloned.mjs` (library, 27 lines)
- `verikora` `scripts/demo-documents/index.mjs` (library, 43 lines)
- `verikora` `scripts/demo-documents/render.mjs` (library, 82 lines)

### Copied (35)

- `folioviv` `.githooks/pre-push` (git hook, 26 lines)
- `folioviv` `scripts/sg-fix.mjs` (dev tool, 60 lines)
- `folioviv` `scripts/sync-brand-icons.mjs` (library, 84 lines)
- `kridoc` `scripts/check-seo-family.mjs` (CI check, 318 lines)
- `kridoc` `scripts/check-template-drift.mjs` (CI check, 37 lines)
- `kridoc` `scripts/promote-production.mjs` (deploy, 87 lines)
- `kridoc` `scripts/sg-fix.mjs` (dev tool, 64 lines)
- `krizaka-agents` `tools/runpod/runpod-guard.py` (library, 258 lines)
- `krizaka-blog` `scripts/check-seo-family.mjs` (library, 318 lines)
- `krizaka-blog` `scripts/sync-brand-icons.mjs` (library, 40 lines)
- `krizaka-com` `scripts/check-seo-family.mjs` (library, 318 lines)
- `krizaka-com` `scripts/promote-production.mjs` (deploy, 87 lines)
- `krizaka-com` `scripts/sg-fix.mjs` (dev tool, 63 lines)
- `krizaka-com` `scripts/sync-brand-icons.mjs` (generator, 40 lines)
- `krizaka-coming-soon` `scripts/check-seo-family.mjs` (CI check, 318 lines)
- `krizaka-coming-soon` `scripts/promote-production.mjs` (deploy, 87 lines)
- `krizaka-java` `site/scripts/check-seo-family.mjs` (CI check, 255 lines)
- `krizaka-java` `site/scripts/sync-brand-icons.mjs` (generator, 40 lines)
- `krizaka-template-web` `scripts/check-seo-family.mjs` (CI check, 318 lines)
- `krizaka-template-web` `scripts/check-template-drift.mjs` (CI check, 37 lines)
- `krizaka-template-web` `scripts/sg-fix.mjs` (dev tool, 64 lines)
- `krizaka-ts` `.githooks/pre-push` (git hook, 26 lines)
- `krizaka-ts` `scripts/publish-packages.sh` (deploy, 32 lines)
- `krizaka-ts` `scripts/sg-fix.mjs` (dev tool, 62 lines)
- `krizaka-ts` `site/scripts/sync-brand-icons.mjs` (generator, 40 lines)
- `krizaka-ui` `apps/site/scripts/check-seo-family.mjs` (CI check, 255 lines)
- `krizaka-ui` `apps/site/scripts/sync-brand-icons.mjs` (library, 40 lines)
- `krizaka-ui` `scripts/sg-fix.mjs` (dev tool, 63 lines)
- `krizaka-ui` `tools/publish-packages.sh` (deploy, 31 lines)
- `sovkora-web` `scripts/check-seo-family.mjs` (CI check, 283 lines)
- `sovkora-web` `scripts/sg-fix.mjs` (dev tool, 64 lines)
- `sovkora` `scripts/runpod-guard.py` (library, 265 lines)
- `verikora` `.githooks/pre-push` (git hook, 26 lines)
- `verikora` `scripts/sg-fix.mjs` (dev tool, 62 lines)
- `verikora` `scripts/sync-brand-icons.mjs` (library, 87 lines)

## Over time

| Day | Units | Nothing calls it | No test | Regex over 80 characters | Over 400 lines | No header | Copied |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 2026-11-07 | 1164 | 194 | 51 | 37 | 22 | 33 | 35 |
