# Conformance matrix

Generated 2026-11-01T03:16:43.104Z by https://github.com/krizaka/.github/actions/runs/41268304318 from `docs/standards/rules.json` against main of every active repository of `repos.json`. Machine-readable: [matrix.json](matrix.json).

| rule | green | red |
|---|---:|---:|
| security-scan | 36 | 0 |
| shared-ci | 29 | 1 |
| no-inline-sonar | 35 | 0 |
| scorecard | 35 | 1 |
| dependabot-config | 35 | 1 |
| dependabot-automerge | 34 | 2 |
| visual-regression | 2 | 2 |
| agents-anti-slop | 35 | 1 |
| edit-hook | 36 | 0 |
| release-propagation | 0 | 9 |
| maven-family-current | 14 | 0 |
| workspace-guard | 6 | 1 |
| expo-sdk-guard | 2 | 0 |
| turnstile-server-side | 2 | 0 |
| email-verification | 2 | 0 |
| no-departed-product | 36 | 0 |
| no-departed-published | 20 | 0 |
| commercial-names | 0 | 0 |
| lab-isolation | 35 | 0 |
| code-rules-ratchet | 2 | 0 |
| code-rules-sg | 7 | 0 |
| feature-surfaces | 0 | 7 |
| formatter | 13 | 3 |
| agents-template | 1 | 33 |
| journeys | 0 | 3 |
| merged-result-tested | 31 | 3 |
| required-checks-profile | 31 | 3 |
| merge-resolution | 28 | 6 |
| fail-closed-sg | 1 | 6 |
| time-limits | 10 | 26 |
| **all** | **518** | **108** |

| repo | red rules |
|---|---|
| .github | dependabot-automerge, time-limits |
| akinaza | release-propagation, feature-surfaces, formatter, agents-template, journeys, fail-closed-sg, time-limits |
| krizaka-accounts | time-limits |
| krizaka-agents | shared-ci, scorecard, dependabot-config, dependabot-automerge, agents-anti-slop, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits |
| krizaka-billing | agents-template, time-limits |
| krizaka-blog | release-propagation, agents-template, time-limits |
| krizaka-build | release-propagation, agents-template, time-limits |
| krizaka-com | release-propagation, agents-template, fail-closed-sg, time-limits |
| krizaka-composer | workspace-guard, formatter, merge-resolution, time-limits |
| krizaka-infra | agents-template, time-limits |
| krizaka-lab | release-propagation, agents-template, time-limits |
| krizaka-notifications | agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits |
| krizaka-platform-kit | agents-template, time-limits |
| krizaka-tauri-kit | agents-template, time-limits |
| krizaka-ts | release-propagation, agents-template, time-limits |
| krizaka-ui | release-propagation, formatter, agents-template, fail-closed-sg, time-limits |
| krizaka-users | agents-template, time-limits |
| orazaka | feature-surfaces, agents-template, time-limits |
| orazaka-ai-engine | agents-template |
| orazaka-automation-service | agents-template |
| orazaka-build | agents-template |
| orazaka-cli | feature-surfaces, agents-template, time-limits |
| orazaka-contracts | feature-surfaces, agents-template |
| orazaka-conversation-service | agents-template |
| orazaka-edge | agents-template |
| orazaka-job-service | agents-template |
| orazaka-knowledge-service | agents-template, merge-resolution |
| orazaka-mobile-client | feature-surfaces, agents-template, time-limits |
| orazaka-packs | agents-template, time-limits |
| orazaka-studio | agents-template |
| orazaka-ui-kit | agents-template, time-limits |
| orazaka-web-client | visual-regression, release-propagation, feature-surfaces, agents-template, journeys, fail-closed-sg, time-limits |
| orazaka-worker-media | agents-template |
| template-next-app | agents-template, fail-closed-sg, time-limits |
| template-tauri-app | visual-regression, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits |
| yomizaka | release-propagation, feature-surfaces, agents-template, journeys, merge-resolution, fail-closed-sg, time-limits |

Out of scope (paused or archived): cla-signatures, krizaka-internal, krizaka-skills, orazaka-web-admin.

### Family versions

| repo | family versions | behind |
|---|---|---|
| akinaza | @krizaka/app-client 0.1.0, @krizaka/config 0.17.0, @krizaka/discovery 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/intl 0.3.0, @krizaka/query 0.2.2, @krizaka/tokens 3.76.1, @krizaka/ui 3.76.1, @krizaka/api-keys 0.1.0, @krizaka/auth 0.12.0, @krizaka/brief 0.1.0, @krizaka/charts 0.6.1, @krizaka/email 0.5.0, @krizaka/email-verification 0.1.1, @krizaka/fonts 0.5.0, @krizaka/org 0.3.1, @krizaka/organize 0.4.0, @krizaka/payments 0.7.0, @krizaka/privacy 0.2.0, @krizaka/rate-limit 0.2.1, @krizaka/realtime 0.2.1, @krizaka/settings 0.2.0, @krizaka/storage 0.8.1, @krizaka/tailwind 3.76.1, @krizaka/webhooks 0.1.0, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.5.1, @krizaka/db 0.3.0 | @krizaka/app-client 0.1.0 → 0.3.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.1, @krizaka/webhooks 0.1.0 → 0.3.4 |
| krizaka-agents | @krizaka/config 0.18.0 | current |
| krizaka-billing | krizaka-parent 0.3.4 | current |
| krizaka-blog | @krizaka/charts 0.6.1, @krizaka/config 0.10.0, @krizaka/email 0.1.1, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.3, @krizaka/icons 0.9.0, @krizaka/org 0.6.0, @krizaka/query 0.2.2, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.73.0 | @krizaka/i18n 0.2.3 → 0.2.7 |
| krizaka-build | @krizaka/config 0.4.0, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.0, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.60.0, krizaka-parent 0.6.0 | @krizaka/config 0.4.0 → 0.20.0, @krizaka/i18n 0.2.0 → 0.2.7 |
| krizaka-com | @krizaka/a11y-audit 0.2.0, @krizaka/charts 0.8.0, @krizaka/config 0.17.0, @krizaka/discovery 0.1.0, @krizaka/email-verification 0.1.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.3, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 3.74.0, @krizaka/tokens 3.74.0, @krizaka/ui 3.74.0 | @krizaka/i18n 0.2.3 → 0.2.7 |
| krizaka-lab | @krizaka/charts 0.6.0, @krizaka/config 0.17.0, @krizaka/fonts 0.3.0, @krizaka/i18n 0.2.3, @krizaka/icons 0.7.0, @krizaka/tailwind 3.43.0, @krizaka/tokens 3.43.0, @krizaka/ui 3.43.0 | @krizaka/charts 0.6.0 → 0.8.0, @krizaka/fonts 0.3.0 → 0.5.3, @krizaka/i18n 0.2.3 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.1, @krizaka/tailwind 3.43.0 → 3.79.0, @krizaka/tokens 3.43.0 → 3.79.0, @krizaka/ui 3.43.0 → 3.79.0 |
| krizaka-notifications | krizaka-bom 0.3.5, krizaka-parent 0.3.4 | current |
| krizaka-platform-kit | krizaka-bom 0.3.5, krizaka-parent 0.3.5 | current |
| krizaka-tauri-kit | @krizaka/app-client 0.1.0, @krizaka/app-desktop 0.1.0, @krizaka/config 0.17.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/tailwind 3.46.0, @krizaka/tokens 3.46.0, @krizaka/ui 3.46.0 | @krizaka/app-client 0.1.0 → 0.3.0, @krizaka/app-desktop 0.1.0 → 0.1.2, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.1, @krizaka/tailwind 3.46.0 → 3.79.0, @krizaka/tokens 3.46.0 → 3.79.0, @krizaka/ui 3.46.0 → 3.79.0 |
| krizaka-ts | @krizaka/intl 0.4.1, @krizaka/a11y-audit 0.2.0, @krizaka/config 0.4.0, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.0, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.60.0 | @krizaka/config 0.4.0 → 0.20.0, @krizaka/i18n 0.2.0 → 0.2.7 |
| krizaka-ui | @krizaka/config 0.9.1, @krizaka/org 0.1.0, @krizaka/organize 0.4.0, @krizaka/query 0.3.0, @krizaka/tailwind 3.79.0 | current |
| krizaka-users | krizaka-bom 0.3.3, krizaka-parent 0.3.3 | current |
| orazaka | @krizaka/i18n 0.2.1, @krizaka/icons 0.4.0, @krizaka/orazaka-design-system 3.4.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.44.0, @krizaka/tokens 3.44.0, @krizaka/ui 3.44.0 | @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.4.0 → 0.9.1, @krizaka/tailwind 3.44.0 → 3.79.0, @krizaka/tokens 3.44.0 → 3.79.0, @krizaka/ui 3.44.0 → 3.79.0 |
| orazaka-cli | @krizaka/orazaka-cli 1.1.0, @krizaka/config 0.18.0 | current |
| orazaka-mobile-client | @krizaka/charts 0.6.0, @krizaka/config 0.18.0, @krizaka/discovery 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.5.1, @krizaka/intl 0.2.1, @krizaka/orazaka-shared 1.5.0, @krizaka/query 0.2.1, @krizaka/tokens 3.30.0, @krizaka/ui 3.30.0 | @krizaka/charts 0.6.0 → 0.8.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.5.1 → 0.9.1, @krizaka/intl 0.2.1 → 0.4.1, @krizaka/tokens 3.30.0 → 3.79.0, @krizaka/ui 3.30.0 → 3.79.0 |
| orazaka-packs | @krizaka/config 0.18.0 | current |
| orazaka-ui-kit | @krizaka/config 0.17.0, @krizaka/icons 0.7.0, @krizaka/orazaka-shared 1.1.0, @krizaka/tailwind 3.28.0, @krizaka/tokens 3.28.0, @krizaka/ui 3.28.0 | @krizaka/icons 0.7.0 → 0.9.1, @krizaka/orazaka-shared 1.1.0 → 1.5.0, @krizaka/tailwind 3.28.0 → 3.79.0, @krizaka/tokens 3.28.0 → 3.79.0, @krizaka/ui 3.28.0 → 3.79.0 |
| orazaka-web-client | @krizaka/a11y-audit 0.2.0, @krizaka/auth 0.10.0, @krizaka/charts 0.6.0, @krizaka/config 0.17.0, @krizaka/fonts 0.5.0, @krizaka/icons 0.9.0, @krizaka/intl 0.4.0, @krizaka/orazaka-design-system 3.4.0, @krizaka/orazaka-shared 1.4.0, @krizaka/page-audit 0.3.1, @krizaka/query 0.2.2, @krizaka/settings 0.5.2, @krizaka/tailwind 3.71.0, @krizaka/tokens 3.71.0, @krizaka/ui 3.71.0 | @krizaka/charts 0.6.0 → 0.8.0, @krizaka/orazaka-shared 1.4.0 → 1.5.0 |
| template-next-app | @krizaka/config 0.7.0, @krizaka/fonts 0.4.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.9.0, @krizaka/tailwind 3.48.0, @krizaka/tokens 3.48.0, @krizaka/ui 3.48.0 | @krizaka/config 0.7.0 → 0.20.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/tailwind 3.48.0 → 3.79.0, @krizaka/tokens 3.48.0 → 3.79.0, @krizaka/ui 3.48.0 → 3.79.0 |
| template-tauri-app | @krizaka/app-client 0.1.0, @krizaka/app-desktop 0.1.0, @krizaka/config 0.17.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/tailwind 3.46.0, @krizaka/tokens 3.46.0, @krizaka/ui 3.46.0 | @krizaka/app-client 0.1.0 → 0.3.0, @krizaka/app-desktop 0.1.0 → 0.1.2, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.1, @krizaka/tailwind 3.46.0 → 3.79.0, @krizaka/tokens 3.46.0 → 3.79.0, @krizaka/ui 3.46.0 → 3.79.0 |
| yomizaka | @krizaka/app-client 0.2.0, @krizaka/app-desktop 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.63.0, @krizaka/tokens 3.63.0, @krizaka/ui 3.64.0, @krizaka/app-config 0.2.0, @krizaka/config 0.12.0, @krizaka/discovery 0.1.0, @krizaka/api-keys 0.3.0, @krizaka/audit 0.1.3, @krizaka/auth 0.12.0, @krizaka/brief 0.1.0, @krizaka/charts 0.6.2, @krizaka/coupons 0.1.1, @krizaka/credits 0.1.1, @krizaka/db 0.3.0, @krizaka/email 0.3.0, @krizaka/fonts 0.3.0, @krizaka/intl 0.3.0, @krizaka/orazaka-client 0.2.0, @krizaka/org 0.3.1, @krizaka/organize 0.1.0, @krizaka/payments 0.5.0, @krizaka/privacy 0.2.0, @krizaka/rate-limit 0.1.0, @krizaka/settings 0.5.0, @krizaka/storage 0.6.0, @krizaka/time 0.1.0, @krizaka/webhooks 0.3.0, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.6.0 | @krizaka/app-desktop 0.1.0 → 0.1.2, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.1, @krizaka/fonts 0.3.0 → 0.5.3, @krizaka/organize 0.1.0 → 0.5.1 |
