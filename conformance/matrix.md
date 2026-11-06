# Conformance matrix

Generated 2026-11-06T01:37:25.571Z by https://github.com/krizaka/.github/actions/runs/42144763916 from `docs/standards/rules.json` against main of every active repository of `repos.json`. Machine-readable: [matrix.json](matrix.json).

| rule | pass | fail | unknown | manual |
|---|---:|---:|---:|---:|
| security-scan | 37 | 0 | 0 | 0 |
| shared-ci | 30 | 1 | 0 | 0 |
| no-inline-sonar | 36 | 0 | 0 | 0 |
| scorecard | 33 | 2 | 0 | 0 |
| dependabot-config | 36 | 1 | 0 | 0 |
| dependabot-automerge | 35 | 2 | 0 | 0 |
| visual-regression | 2 | 2 | 0 | 0 |
| agents-anti-slop | 35 | 2 | 0 | 0 |
| edit-hook | 37 | 0 | 0 | 0 |
| release-propagation | 0 | 9 | 0 | 0 |
| maven-family-current | 10 | 3 | 0 | 0 |
| workspace-guard | 7 | 1 | 0 | 0 |
| expo-sdk-guard | 2 | 0 | 0 | 0 |
| turnstile-server-side | 2 | 0 | 0 | 0 |
| email-verification | 2 | 0 | 0 | 0 |
| no-departed-product | 35 | 2 | 0 | 0 |
| no-departed-published | 22 | 0 | 0 | 0 |
| commercial-names | 5 | 2 | 0 | 0 |
| lab-isolation | 36 | 0 | 0 | 0 |
| code-rules-ratchet | 2 | 0 | 0 | 0 |
| code-rules-sg | 9 | 0 | 0 | 0 |
| feature-surfaces | 0 | 7 | 0 | 0 |
| formatter | 15 | 3 | 0 | 0 |
| agents-template | 2 | 33 | 0 | 0 |
| journeys | 0 | 3 | 0 | 0 |
| merged-result-tested | 32 | 3 | 0 | 0 |
| required-checks-profile | 31 | 4 | 0 | 0 |
| merge-resolution | 32 | 3 | 0 | 0 |
| fail-closed-sg | 3 | 6 | 0 | 0 |
| time-limits | 10 | 27 | 0 | 0 |
| required-checks-report-in-queue | 16 | 19 | 0 | 0 |
| rust-guards | 5 | 0 | 0 | 0 |
| python-guards | 2 | 0 | 0 | 0 |
| sonar-ratchet | 32 | 1 | 0 | 0 |
| no-self-issues | 37 | 0 | 0 | 0 |
| public-no-founder-name | 2 | 4 | 0 | 0 |
| public-no-amount | 1 | 5 | 0 | 0 |
| code-name-hosts-noindex | 3 | 0 | 0 | 0 |
| privacy-officer | 3 | 1 | 0 | 0 |
| product-status-word | 1 | 5 | 0 | 0 |
| one-contact-path | 3 | 3 | 0 | 0 |
| rules-register | 0 | 1 | 0 | 0 |
| **all** | **643** | **155** | **0** | **0** |

| repo | commit | failing rules | unknown |
|---|---|---|---|
| .github | 432072d | dependabot-automerge, time-limits | none |
| akinaza | 95d0fc7 | release-propagation, feature-surfaces, formatter, agents-template, journeys, fail-closed-sg, time-limits, public-no-founder-name, public-no-amount, privacy-officer, product-status-word | none |
| kachizaka | de20951 | commercial-names, time-limits, public-no-founder-name, public-no-amount, product-status-word, one-contact-path | none |
| krizaka-accounts | 86f3249 | time-limits | none |
| krizaka-agents | 01ce003 | shared-ci, scorecard, dependabot-config, dependabot-automerge, agents-anti-slop, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits, rules-register | none |
| krizaka-blog | 4e0229b | release-propagation, agents-template, time-limits | none |
| krizaka-build | adbdfcb | release-propagation, no-departed-product, agents-template, time-limits | none |
| krizaka-com | 438cec2 | release-propagation, agents-template, fail-closed-sg, time-limits, product-status-word | none |
| krizaka-coming-soon | 548ca24 | scorecard, agents-anti-slop, commercial-names, agents-template, required-checks-profile, time-limits, public-no-founder-name, public-no-amount, product-status-word, one-contact-path | none |
| krizaka-composer | 6a30380 | workspace-guard, formatter, time-limits | none |
| krizaka-infra | 545b6eb | agents-template, time-limits | none |
| krizaka-lab | 78a929a | release-propagation, agents-template, time-limits, required-checks-report-in-queue | none |
| krizaka-notifications | fe64e42 | maven-family-current, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits, required-checks-report-in-queue | none |
| krizaka-platform-kit | 569f3ed | maven-family-current, agents-template, time-limits | none |
| krizaka-tauri-kit | 58a71c5 | agents-template, time-limits, required-checks-report-in-queue | none |
| krizaka-ts | 05614e1 | release-propagation, agents-template, time-limits | none |
| krizaka-ui | cc67f65 | release-propagation, formatter, agents-template, fail-closed-sg, time-limits | none |
| krizaka-users | 94fac94 | maven-family-current, agents-template, time-limits | none |
| orazaka | b8c1010 | no-departed-product, feature-surfaces, agents-template, time-limits | none |
| orazaka-ai-engine | 08ea0a5 | agents-template, required-checks-report-in-queue | none |
| orazaka-automation-service | 65a9886 | agents-template, required-checks-report-in-queue | none |
| orazaka-build | a510575 | agents-template, required-checks-report-in-queue | none |
| orazaka-cli | 7baa410 | feature-surfaces, agents-template, time-limits, required-checks-report-in-queue | none |
| orazaka-contracts | af35f08 | feature-surfaces, agents-template, required-checks-report-in-queue | none |
| orazaka-conversation-service | 52b2705 | agents-template, required-checks-report-in-queue | none |
| orazaka-edge | 04f5668 | agents-template, required-checks-report-in-queue | none |
| orazaka-job-service | c263ef0 | agents-template, required-checks-report-in-queue | none |
| orazaka-knowledge-service | 6081b18 | agents-template, required-checks-report-in-queue | none |
| orazaka-mobile-client | 83d72b8 | feature-surfaces, agents-template, time-limits, required-checks-report-in-queue | none |
| orazaka-packs | a9814b1 | agents-template, time-limits, required-checks-report-in-queue | none |
| orazaka-studio | 3e03952 | agents-template, required-checks-report-in-queue | none |
| orazaka-ui-kit | f374f33 | agents-template, time-limits, required-checks-report-in-queue | none |
| orazaka-web-client | cb4e3c8 | visual-regression, release-propagation, feature-surfaces, agents-template, journeys, fail-closed-sg, time-limits, required-checks-report-in-queue, public-no-founder-name, public-no-amount, one-contact-path | none |
| orazaka-worker-media | 322a1fd | agents-template, required-checks-report-in-queue | none |
| template-next-app | 966e99d | agents-template, fail-closed-sg, time-limits, required-checks-report-in-queue | none |
| template-tauri-app | 4ecac58 | visual-regression, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits | none |
| yomizaka | c5ba8c4 | release-propagation, feature-surfaces, agents-template, journeys, fail-closed-sg, time-limits, sonar-ratchet, public-no-amount, product-status-word | none |

Out of scope (paused or archived): cla-signatures, krizaka-billing, krizaka-internal, krizaka-skills, orazaka-web-admin.

Same-day rollout (security rules): security-scan, scorecard, dependabot-config, turnstile-server-side, email-verification. The other rules are reported here, never fanned out.

### Family versions

| repo | family versions | behind |
|---|---|---|
| akinaza | @krizaka/app-client 0.1.0, @krizaka/config 0.17.0, @krizaka/discovery 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/intl 0.3.0, @krizaka/query 0.2.2, @krizaka/tokens 3.76.1, @krizaka/ui 3.76.1, @krizaka/api-keys 0.1.0, @krizaka/auth 0.12.0, @krizaka/brief 0.1.0, @krizaka/charts 0.6.1, @krizaka/email 0.5.0, @krizaka/email-verification 0.1.1, @krizaka/fonts 0.5.0, @krizaka/org 0.3.1, @krizaka/organize 0.4.0, @krizaka/payments 0.7.0, @krizaka/privacy 0.2.0, @krizaka/rate-limit 0.2.1, @krizaka/realtime 0.2.1, @krizaka/settings 0.2.0, @krizaka/storage 0.8.1, @krizaka/tailwind 3.76.1, @krizaka/webhooks 0.1.0, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.5.1, @krizaka/db 0.3.0 | @krizaka/app-client 0.1.0 → 0.3.0, @krizaka/config 0.17.0 → 0.20.0, @krizaka/discovery 0.1.0 → 0.1.2, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.1, @krizaka/intl 0.3.0 → 0.4.1, @krizaka/query 0.2.2 → 0.3.0, @krizaka/api-keys 0.1.0 → 0.3.1, @krizaka/auth 0.12.0 → 0.13.2, @krizaka/brief 0.1.0 → 0.1.1, @krizaka/charts 0.6.1 → 0.8.0, @krizaka/fonts 0.5.0 → 0.5.3, @krizaka/org 0.3.1 → 0.7.2, @krizaka/organize 0.4.0 → 0.5.1, @krizaka/privacy 0.2.0 → 0.2.3, @krizaka/settings 0.2.0 → 0.6.0, @krizaka/webhooks 0.1.0 → 0.3.4, @krizaka/db 0.3.0 → 0.3.1 |
| kachizaka | @krizaka/config 0.20.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.4, @krizaka/icons 0.9.0, @krizaka/tailwind 3.82.0, @krizaka/tokens 3.82.0, @krizaka/ui 3.82.0 | @krizaka/i18n 0.2.4 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.1 |
| krizaka-agents | @krizaka/config 0.18.0 | current |
| krizaka-blog | @krizaka/charts 0.6.1, @krizaka/config 0.10.0, @krizaka/email 0.1.1, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.5, @krizaka/icons 0.9.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 3.87.0, @krizaka/tokens 3.87.0, @krizaka/ui 3.87.0 | @krizaka/charts 0.6.1 → 0.8.0, @krizaka/config 0.10.0 → 0.20.0, @krizaka/email 0.1.1 → 0.5.0, @krizaka/fonts 0.5.1 → 0.5.3, @krizaka/i18n 0.2.5 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.1, @krizaka/rate-limit 0.2.0 → 0.3.0 |
| krizaka-build | @krizaka/config 0.4.0, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.0, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.60.0, krizaka-parent 0.11.1 | @krizaka/config 0.4.0 → 0.20.0, @krizaka/fonts 0.5.1 → 0.5.3, @krizaka/i18n 0.2.0 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.1, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.60.0 → 3.87.0, @krizaka/tokens 3.60.0 → 3.87.0, @krizaka/ui 3.60.0 → 3.87.0 |
| krizaka-com | @krizaka/a11y-audit 0.2.0, @krizaka/charts 0.8.0, @krizaka/config 0.17.0, @krizaka/discovery 0.1.0, @krizaka/email-verification 0.1.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.5, @krizaka/icons 0.9.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 3.86.0, @krizaka/tokens 3.86.0, @krizaka/ui 3.86.0 | @krizaka/config 0.17.0 → 0.20.0, @krizaka/discovery 0.1.0 → 0.1.2, @krizaka/email-verification 0.1.0 → 0.1.1, @krizaka/i18n 0.2.5 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.1, @krizaka/rate-limit 0.2.0 → 0.3.0 |
| krizaka-coming-soon | @krizaka/config 0.20.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.7, @krizaka/org 0.7.1, @krizaka/tailwind 3.85.0, @krizaka/tokens 3.85.0, @krizaka/ui 3.85.0 | current |
| krizaka-lab | @krizaka/charts 0.6.0, @krizaka/config 0.17.0, @krizaka/fonts 0.3.0, @krizaka/i18n 0.2.3, @krizaka/icons 0.7.0, @krizaka/tailwind 3.43.0, @krizaka/tokens 3.43.0, @krizaka/ui 3.43.0 | @krizaka/charts 0.6.0 → 0.8.0, @krizaka/config 0.17.0 → 0.20.0, @krizaka/fonts 0.3.0 → 0.5.3, @krizaka/i18n 0.2.3 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.1, @krizaka/tailwind 3.43.0 → 3.87.0, @krizaka/tokens 3.43.0 → 3.87.0, @krizaka/ui 3.43.0 → 3.87.0 |
| krizaka-notifications | krizaka-bom 0.3.5, krizaka-parent 0.3.4 | current |
| krizaka-platform-kit | krizaka-bom 0.3.5, krizaka-parent 0.3.5 | current |
| krizaka-tauri-kit | @krizaka/app-client 0.1.0, @krizaka/app-desktop 0.1.0, @krizaka/config 0.17.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/tailwind 3.46.0, @krizaka/tokens 3.46.0, @krizaka/ui 3.46.0 | @krizaka/app-client 0.1.0 → 0.3.0, @krizaka/app-desktop 0.1.0 → 0.1.2, @krizaka/config 0.17.0 → 0.20.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.1, @krizaka/tailwind 3.46.0 → 3.87.0, @krizaka/tokens 3.46.0 → 3.87.0, @krizaka/ui 3.46.0 → 3.87.0 |
| krizaka-ts | @krizaka/intl 0.4.1, @krizaka/a11y-audit 0.2.0, @krizaka/config 0.4.0, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.0, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.60.0 | @krizaka/config 0.4.0 → 0.20.0, @krizaka/fonts 0.5.1 → 0.5.3, @krizaka/i18n 0.2.0 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.1, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.60.0 → 3.87.0, @krizaka/tokens 3.60.0 → 3.87.0, @krizaka/ui 3.60.0 → 3.87.0 |
| krizaka-ui | @krizaka/config 0.9.1, @krizaka/org 0.1.0, @krizaka/organize 0.4.0, @krizaka/query 0.3.0, @krizaka/tailwind 3.87.0 | @krizaka/config 0.9.1 → 0.20.0, @krizaka/org 0.1.0 → 0.7.2, @krizaka/organize 0.4.0 → 0.5.1 |
| krizaka-users | krizaka-bom 0.3.3, krizaka-parent 0.3.3 | current |
| orazaka | @krizaka/i18n 0.2.1, @krizaka/icons 0.4.0, @krizaka/orazaka-design-system 3.4.0, @krizaka/org 0.7.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.44.0, @krizaka/tokens 3.44.0, @krizaka/ui 3.44.0, @krizaka/storage 0.11.1 | @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.4.0 → 0.9.1, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.44.0 → 3.87.0, @krizaka/tokens 3.44.0 → 3.87.0, @krizaka/ui 3.44.0 → 3.87.0 |
| orazaka-cli | @krizaka/orazaka-cli 1.1.0, @krizaka/config 0.18.0 | current |
| orazaka-mobile-client | @krizaka/app-config 0.2.0, @krizaka/charts 0.6.0, @krizaka/config 0.18.0, @krizaka/discovery 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.5.1, @krizaka/intl 0.2.1, @krizaka/orazaka-shared 1.5.0, @krizaka/org 0.7.0, @krizaka/query 0.2.1, @krizaka/tokens 3.30.0, @krizaka/ui 3.30.0 | @krizaka/charts 0.6.0 → 0.8.0, @krizaka/discovery 0.1.0 → 0.1.2, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.5.1 → 0.9.1, @krizaka/intl 0.2.1 → 0.4.1, @krizaka/query 0.2.1 → 0.3.0, @krizaka/tokens 3.30.0 → 3.87.0, @krizaka/ui 3.30.0 → 3.87.0 |
| orazaka-packs | @krizaka/config 0.18.0 | current |
| orazaka-ui-kit | @krizaka/config 0.17.0, @krizaka/icons 0.9.0, @krizaka/orazaka-shared 1.1.0, @krizaka/tailwind 3.28.0, @krizaka/tokens 3.28.0, @krizaka/ui 3.28.0 | @krizaka/config 0.17.0 → 0.20.0, @krizaka/icons 0.9.0 → 0.9.1, @krizaka/orazaka-shared 1.1.0 → 1.5.0, @krizaka/tailwind 3.28.0 → 3.87.0, @krizaka/tokens 3.28.0 → 3.87.0, @krizaka/ui 3.28.0 → 3.87.0 |
| orazaka-web-client | @krizaka/a11y-audit 0.2.0, @krizaka/auth 0.10.0, @krizaka/charts 0.7.1, @krizaka/config 0.17.0, @krizaka/fonts 0.5.2, @krizaka/icons 0.9.1, @krizaka/intl 0.4.1, @krizaka/orazaka-design-system 3.4.0, @krizaka/orazaka-shared 1.4.0, @krizaka/org 0.7.2, @krizaka/page-audit 0.3.1, @krizaka/query 0.2.2, @krizaka/settings 0.5.2, @krizaka/tailwind 3.71.0, @krizaka/tokens 3.87.0, @krizaka/ui 3.87.0 | @krizaka/auth 0.10.0 → 0.13.2, @krizaka/charts 0.7.1 → 0.8.0, @krizaka/config 0.17.0 → 0.20.0, @krizaka/fonts 0.5.2 → 0.5.3, @krizaka/orazaka-shared 1.4.0 → 1.5.0, @krizaka/page-audit 0.3.1 → 0.8.0, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.71.0 → 3.87.0 |
| template-next-app | @krizaka/config 0.17.0, @krizaka/fonts 0.4.0, @krizaka/i18n 0.2.4, @krizaka/icons 0.9.0, @krizaka/tailwind 3.54.0, @krizaka/tokens 3.54.0, @krizaka/ui 3.54.0 | @krizaka/config 0.17.0 → 0.20.0, @krizaka/fonts 0.4.0 → 0.5.3, @krizaka/i18n 0.2.4 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.1, @krizaka/tailwind 3.54.0 → 3.87.0, @krizaka/tokens 3.54.0 → 3.87.0, @krizaka/ui 3.54.0 → 3.87.0 |
| template-tauri-app | @krizaka/app-client 0.1.0, @krizaka/app-desktop 0.1.0, @krizaka/config 0.17.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/tailwind 3.46.0, @krizaka/tokens 3.46.0, @krizaka/ui 3.46.0 | @krizaka/app-client 0.1.0 → 0.3.0, @krizaka/app-desktop 0.1.0 → 0.1.2, @krizaka/config 0.17.0 → 0.20.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.1, @krizaka/tailwind 3.46.0 → 3.87.0, @krizaka/tokens 3.46.0 → 3.87.0, @krizaka/ui 3.46.0 → 3.87.0 |
| yomizaka | @krizaka/app-client 0.2.0, @krizaka/app-desktop 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.63.0, @krizaka/tokens 3.63.0, @krizaka/ui 3.64.0, @krizaka/app-config 0.2.0, @krizaka/config 0.12.0, @krizaka/discovery 0.1.0, @krizaka/api-keys 0.3.0, @krizaka/audit 0.1.3, @krizaka/auth 0.12.0, @krizaka/brief 0.1.0, @krizaka/charts 0.6.2, @krizaka/coupons 0.1.1, @krizaka/credits 0.1.1, @krizaka/db 0.3.0, @krizaka/email 0.3.0, @krizaka/fonts 0.3.0, @krizaka/intl 0.3.0, @krizaka/orazaka-client 0.2.0, @krizaka/org 0.7.2, @krizaka/organize 0.1.0, @krizaka/payments 0.5.0, @krizaka/privacy 0.2.0, @krizaka/rate-limit 0.1.0, @krizaka/settings 0.6.0, @krizaka/storage 0.6.0, @krizaka/time 0.1.0, @krizaka/webhooks 0.3.0, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.0 | @krizaka/app-client 0.2.0 → 0.3.0, @krizaka/app-desktop 0.1.0 → 0.1.2, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.1, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.63.0 → 3.87.0, @krizaka/tokens 3.63.0 → 3.87.0, @krizaka/ui 3.64.0 → 3.87.0, @krizaka/config 0.12.0 → 0.20.0, @krizaka/discovery 0.1.0 → 0.1.2, @krizaka/api-keys 0.3.0 → 0.3.1, @krizaka/audit 0.1.3 → 0.1.6, @krizaka/auth 0.12.0 → 0.13.2, @krizaka/brief 0.1.0 → 0.1.1, @krizaka/charts 0.6.2 → 0.8.0, @krizaka/coupons 0.1.1 → 0.1.4, @krizaka/credits 0.1.1 → 0.1.4, @krizaka/db 0.3.0 → 0.3.1, @krizaka/email 0.3.0 → 0.5.0, @krizaka/fonts 0.3.0 → 0.5.3, @krizaka/intl 0.3.0 → 0.4.1, @krizaka/orazaka-client 0.2.0 → 0.2.1, @krizaka/organize 0.1.0 → 0.5.1, @krizaka/privacy 0.2.0 → 0.2.3, @krizaka/rate-limit 0.1.0 → 0.3.0, @krizaka/storage 0.6.0 → 0.11.1, @krizaka/time 0.1.0 → 0.2.0, @krizaka/webhooks 0.3.0 → 0.3.4 |
