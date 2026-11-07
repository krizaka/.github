# Conformance matrix

Generated 2026-11-07T12:33:44.357Z by https://github.com/krizaka/.github/actions/runs/42372842087 from `docs/standards/rules.json` against main of every active repository of `repos.json`. Machine-readable: [matrix.json](matrix.json).

| rule | pass | fail | unknown | manual |
|---|---:|---:|---:|---:|
| security-scan | 33 | 0 | 0 | 0 |
| shared-ci | 27 | 1 | 0 | 0 |
| no-inline-sonar | 32 | 0 | 0 | 0 |
| scorecard | 29 | 0 | 0 | 0 |
| dependabot-config | 33 | 0 | 0 | 0 |
| dependabot-automerge | 31 | 2 | 0 | 0 |
| visual-regression | 2 | 2 | 0 | 0 |
| agents-anti-slop | 31 | 2 | 0 | 0 |
| edit-hook | 33 | 0 | 0 | 0 |
| release-propagation | 0 | 9 | 0 | 0 |
| maven-family-current | 10 | 0 | 0 | 0 |
| workspace-guard | 7 | 1 | 0 | 0 |
| expo-sdk-guard | 2 | 0 | 0 | 0 |
| turnstile-server-side | 2 | 0 | 0 | 0 |
| email-verification | 2 | 0 | 0 | 0 |
| no-departed-product | 31 | 2 | 0 | 0 |
| no-departed-published | 22 | 0 | 0 | 0 |
| commercial-names | 5 | 2 | 0 | 0 |
| lab-isolation | 32 | 0 | 0 | 0 |
| code-rules-ratchet | 2 | 0 | 0 | 0 |
| code-rules-sg | 9 | 0 | 0 | 0 |
| feature-surfaces | 0 | 7 | 0 | 0 |
| formatter | 15 | 3 | 0 | 0 |
| agents-template | 2 | 30 | 0 | 0 |
| journeys | 0 | 3 | 0 | 0 |
| merged-result-tested | 30 | 2 | 0 | 0 |
| required-checks-profile | 29 | 3 | 0 | 0 |
| merge-resolution | 30 | 2 | 0 | 0 |
| fail-closed-sg | 3 | 6 | 0 | 0 |
| time-limits | 10 | 23 | 0 | 0 |
| required-checks-report-in-queue | 14 | 18 | 0 | 0 |
| rust-guards | 5 | 0 | 0 | 0 |
| python-guards | 2 | 0 | 0 | 0 |
| sonar-ratchet | 29 | 1 | 0 | 0 |
| no-self-issues | 33 | 0 | 0 | 0 |
| public-no-founder-name | 2 | 4 | 0 | 0 |
| public-no-amount | 1 | 5 | 0 | 0 |
| code-name-hosts-noindex | 3 | 0 | 0 | 0 |
| privacy-officer | 3 | 1 | 0 | 0 |
| product-status-word | 1 | 5 | 0 | 0 |
| one-contact-path | 3 | 3 | 0 | 0 |
| docs-map | 8 | 24 | 0 | 0 |
| rules-register | 1 | 0 | 0 | 0 |
| no-public-email | 3 | 4 | 0 | 0 |
| **all** | **602** | **165** | **0** | **0** |

| repo | commit | failing rules | unknown |
|---|---|---|---|
| .github | c8426ee | dependabot-automerge, time-limits | none |
| folioviv | e0ddcb6 | release-propagation, feature-surfaces, formatter, agents-template, journeys, fail-closed-sg, time-limits, public-no-founder-name, public-no-amount, privacy-officer, product-status-word, no-public-email | none |
| kridoc | 9765a76 | commercial-names, time-limits, public-no-founder-name, public-no-amount, product-status-word, one-contact-path, docs-map | none |
| krizaka-agents | 5d1f674 | shared-ci, dependabot-automerge, agents-anti-slop, no-departed-product, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits | none |
| krizaka-blog | 305eb55 | release-propagation, agents-template, time-limits | none |
| krizaka-com | dde27c0 | release-propagation, agents-template, fail-closed-sg, time-limits, product-status-word, no-public-email | none |
| krizaka-coming-soon | 091a7aa | agents-anti-slop, commercial-names, agents-template, required-checks-profile, time-limits, public-no-founder-name, public-no-amount, product-status-word, one-contact-path, docs-map | none |
| krizaka-composer | ac0cba7 | workspace-guard, formatter, time-limits, docs-map | none |
| krizaka-desktop | fb4645c | agents-template, time-limits, required-checks-report-in-queue, docs-map | none |
| krizaka-infra | 1cd42d6 | agents-template, time-limits, docs-map | none |
| krizaka-java | e6f6d8a | release-propagation, agents-template, time-limits | none |
| krizaka-lab | f46e32d | release-propagation, agents-template, time-limits, required-checks-report-in-queue, docs-map | none |
| krizaka-template-desktop | 29b2553 | visual-regression, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits, docs-map | none |
| krizaka-template-web | 76780b0 | agents-template, fail-closed-sg, time-limits, required-checks-report-in-queue, docs-map | none |
| krizaka-ts | 837ae6c | release-propagation, agents-template, time-limits | none |
| krizaka-ui | 6946d8a | release-propagation, formatter, agents-template, fail-closed-sg, time-limits | none |
| sovkora | b355625 | no-departed-product, feature-surfaces, agents-template, time-limits, docs-map | none |
| sovkora-automation-service | 1719db3 | agents-template, required-checks-report-in-queue, docs-map | none |
| sovkora-build | c8c38a2 | agents-template, required-checks-report-in-queue, docs-map | none |
| sovkora-cli | 2b08c0e | feature-surfaces, agents-template, time-limits, required-checks-report-in-queue, docs-map | none |
| sovkora-contracts | df366a3 | feature-surfaces, agents-template, required-checks-report-in-queue, docs-map | none |
| sovkora-conversation-service | fef91df | agents-template, required-checks-report-in-queue, docs-map | none |
| sovkora-edge-service | f5f455f | agents-template, required-checks-report-in-queue, docs-map | none |
| sovkora-engine | 0ce3e6b | agents-template, required-checks-report-in-queue, docs-map | none |
| sovkora-job-service | 3ba6253 | agents-template, required-checks-report-in-queue, docs-map | none |
| sovkora-knowledge-service | 6642f42 | agents-template, required-checks-report-in-queue, docs-map | none |
| sovkora-mobile | 47ac451 | feature-surfaces, agents-template, time-limits, required-checks-report-in-queue, docs-map | none |
| sovkora-packs | f2c22d9 | agents-template, time-limits, required-checks-report-in-queue, docs-map | none |
| sovkora-studio-service | 3025165 | agents-template, required-checks-report-in-queue, docs-map | none |
| sovkora-ui-kit | f6c14a1 | agents-template, time-limits, required-checks-report-in-queue, docs-map | none |
| sovkora-web | a2d5f94 | visual-regression, release-propagation, feature-surfaces, agents-template, journeys, fail-closed-sg, time-limits, required-checks-report-in-queue, public-no-founder-name, public-no-amount, one-contact-path, docs-map, no-public-email | none |
| sovkora-worker-media | 601847f | agents-template, required-checks-report-in-queue, docs-map | none |
| verikora | c48687b | release-propagation, feature-surfaces, agents-template, journeys, fail-closed-sg, time-limits, sonar-ratchet, public-no-amount, product-status-word, no-public-email | none |

Out of scope (paused or archived): krizaka-cla-signatures, krizaka-internal, krizaka-restricted.

Same-day rollout (security rules): security-scan, scorecard, dependabot-config, turnstile-server-side, email-verification. The other rules are reported here, never fanned out.

### Family versions

| repo | family versions | behind |
|---|---|---|
| folioviv | @krizaka/app-client 0.3.1, @krizaka/config 0.17.0, @krizaka/discovery 0.1.3, @krizaka/i18n 0.2.1, @krizaka/icons 0.9.2, @krizaka/intl 0.3.0, @krizaka/query 0.2.2, @krizaka/tokens 4.0.0, @krizaka/ui 4.0.0, @krizaka/api-keys 0.1.0, @krizaka/auth 0.12.0, @krizaka/brief 0.1.0, @krizaka/charts 1.0.0, @krizaka/email 1.0.0, @krizaka/email-verification 0.1.1, @krizaka/fonts 0.5.4, @krizaka/org 1.0.0, @krizaka/organize 0.4.0, @krizaka/payments 0.7.0, @krizaka/privacy 0.2.0, @krizaka/rate-limit 0.2.1, @krizaka/realtime 0.2.1, @krizaka/settings 0.2.0, @krizaka/storage 0.8.1, @krizaka/tailwind 4.0.0, @krizaka/webhooks 0.1.0, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.5.1, @krizaka/db 0.3.0 | @krizaka/config 0.17.0 → 0.22.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/intl 0.3.0 → 0.4.1, @krizaka/query 0.2.2 → 0.3.0, @krizaka/api-keys 0.1.0 → 0.3.1, @krizaka/auth 0.12.0 → 0.13.3, @krizaka/brief 0.1.0 → 0.1.1, @krizaka/organize 0.4.0 → 0.5.1, @krizaka/privacy 0.2.0 → 0.2.4, @krizaka/settings 0.2.0 → 0.7.0, @krizaka/storage 0.8.1 → 0.11.2, @krizaka/webhooks 0.1.0 → 0.3.4, @krizaka/page-audit 0.5.1 → 0.8.1, @krizaka/db 0.3.0 → 0.3.1 |
| kridoc | @krizaka/config 0.20.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.4, @krizaka/icons 0.9.0, @krizaka/tailwind 3.82.0, @krizaka/tokens 3.82.0, @krizaka/ui 3.82.0 | @krizaka/i18n 0.2.4 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2 |
| krizaka-agents | @krizaka/config 0.18.0 | @krizaka/config 0.18.0 → 0.22.0 |
| krizaka-blog | @krizaka/charts 0.6.1, @krizaka/config 0.10.0, @krizaka/email 0.1.1, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.5, @krizaka/icons 0.9.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 3.87.0, @krizaka/tokens 3.87.0, @krizaka/ui 3.87.0 | @krizaka/charts 0.6.1 → 1.0.0, @krizaka/config 0.10.0 → 0.22.0, @krizaka/email 0.1.1 → 1.0.0, @krizaka/fonts 0.5.1 → 0.5.4, @krizaka/i18n 0.2.5 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-com | @krizaka/a11y-audit 0.2.0, @krizaka/charts 1.0.0, @krizaka/config 0.17.0, @krizaka/discovery 0.1.0, @krizaka/email-verification 0.1.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.5, @krizaka/icons 0.9.0, @krizaka/org 1.1.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 4.0.0, @krizaka/time 0.2.0, @krizaka/tokens 4.0.0, @krizaka/ui 4.0.0 | @krizaka/config 0.17.0 → 0.22.0, @krizaka/discovery 0.1.0 → 0.1.3, @krizaka/email-verification 0.1.0 → 0.1.1, @krizaka/i18n 0.2.5 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-coming-soon | @krizaka/config 0.20.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.7, @krizaka/org 0.7.1, @krizaka/tailwind 3.85.0, @krizaka/tokens 3.85.0, @krizaka/ui 3.85.0 | current |
| krizaka-desktop | @krizaka/app-client 0.1.0, @krizaka/app-desktop 0.1.0, @krizaka/config 0.17.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/tailwind 3.46.0, @krizaka/tokens 3.46.0, @krizaka/ui 3.46.0 | @krizaka/app-client 0.1.0 → 0.3.1, @krizaka/app-desktop 0.1.0 → 0.1.3, @krizaka/config 0.17.0 → 0.22.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.2, @krizaka/tailwind 3.46.0 → 4.0.0, @krizaka/tokens 3.46.0 → 4.0.0, @krizaka/ui 3.46.0 → 4.0.0 |
| krizaka-java | @krizaka/config 0.4.0, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.0, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.60.0, krizaka-parent 0.12.0 | @krizaka/config 0.4.0 → 0.22.0, @krizaka/fonts 0.5.1 → 0.5.4, @krizaka/i18n 0.2.0 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.60.0 → 4.0.0, @krizaka/tokens 3.60.0 → 4.0.0, @krizaka/ui 3.60.0 → 4.0.0 |
| krizaka-lab | @krizaka/charts 0.6.0, @krizaka/config 0.17.0, @krizaka/fonts 0.3.0, @krizaka/i18n 0.2.3, @krizaka/icons 0.7.0, @krizaka/tailwind 3.43.0, @krizaka/tokens 3.43.0, @krizaka/ui 3.43.0 | @krizaka/charts 0.6.0 → 1.0.0, @krizaka/config 0.17.0 → 0.22.0, @krizaka/fonts 0.3.0 → 0.5.4, @krizaka/i18n 0.2.3 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.2, @krizaka/tailwind 3.43.0 → 4.0.0, @krizaka/tokens 3.43.0 → 4.0.0, @krizaka/ui 3.43.0 → 4.0.0 |
| krizaka-template-desktop | @krizaka/app-client 0.1.0, @krizaka/app-desktop 0.1.0, @krizaka/config 0.17.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/tailwind 3.46.0, @krizaka/tokens 3.46.0, @krizaka/ui 3.46.0 | @krizaka/app-client 0.1.0 → 0.3.1, @krizaka/app-desktop 0.1.0 → 0.1.3, @krizaka/config 0.17.0 → 0.22.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.2, @krizaka/tailwind 3.46.0 → 4.0.0, @krizaka/tokens 3.46.0 → 4.0.0, @krizaka/ui 3.46.0 → 4.0.0 |
| krizaka-template-web | @krizaka/config 0.17.0, @krizaka/fonts 0.4.0, @krizaka/i18n 0.2.4, @krizaka/icons 0.9.0, @krizaka/tailwind 3.54.0, @krizaka/tokens 3.54.0, @krizaka/ui 3.54.0 | @krizaka/config 0.17.0 → 0.22.0, @krizaka/fonts 0.4.0 → 0.5.4, @krizaka/i18n 0.2.4 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/tailwind 3.54.0 → 4.0.0, @krizaka/tokens 3.54.0 → 4.0.0, @krizaka/ui 3.54.0 → 4.0.0 |
| krizaka-ts | @krizaka/intl 0.4.1, @krizaka/a11y-audit 0.2.0, @krizaka/config 0.4.0, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.0, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.60.0 | @krizaka/config 0.4.0 → 0.22.0, @krizaka/fonts 0.5.1 → 0.5.4, @krizaka/i18n 0.2.0 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.60.0 → 4.0.0, @krizaka/tokens 3.60.0 → 4.0.0, @krizaka/ui 3.60.0 → 4.0.0 |
| krizaka-ui | @krizaka/config 0.9.1, @krizaka/org 1.1.0, @krizaka/organize 0.4.0, @krizaka/query 0.3.0, @krizaka/tailwind 4.0.0 | @krizaka/config 0.9.1 → 0.22.0, @krizaka/organize 0.4.0 → 0.5.1 |
| sovkora | @krizaka/i18n 0.2.1, @krizaka/icons 0.4.0, @krizaka/orazaka-design-system 3.4.0, @krizaka/org 0.7.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.44.0, @krizaka/tokens 3.44.0, @krizaka/ui 3.44.0, @krizaka/storage 0.11.1 | @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.4.0 → 0.9.2, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.44.0 → 4.0.0, @krizaka/tokens 3.44.0 → 4.0.0, @krizaka/ui 3.44.0 → 4.0.0 |
| sovkora-cli | @krizaka/orazaka-cli 1.1.0, @krizaka/config 0.18.0 | @krizaka/config 0.18.0 → 0.22.0 |
| sovkora-mobile | @krizaka/app-config 0.2.0, @krizaka/charts 0.6.0, @krizaka/config 0.18.0, @krizaka/discovery 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.5.1, @krizaka/intl 0.2.1, @krizaka/orazaka-shared 1.5.0, @krizaka/org 0.7.0, @krizaka/query 0.2.1, @krizaka/tokens 3.30.0, @krizaka/ui 3.30.0 | @krizaka/charts 0.6.0 → 1.0.0, @krizaka/config 0.18.0 → 0.22.0, @krizaka/discovery 0.1.0 → 0.1.3, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.5.1 → 0.9.2, @krizaka/intl 0.2.1 → 0.4.1, @krizaka/query 0.2.1 → 0.3.0, @krizaka/tokens 3.30.0 → 4.0.0, @krizaka/ui 3.30.0 → 4.0.0 |
| sovkora-packs | @krizaka/config 0.18.0 | @krizaka/config 0.18.0 → 0.22.0 |
| sovkora-ui-kit | @krizaka/config 0.17.0, @krizaka/icons 0.9.0, @krizaka/orazaka-shared 1.1.0, @krizaka/tailwind 3.28.0, @krizaka/tokens 3.28.0, @krizaka/ui 3.28.0 | @krizaka/config 0.17.0 → 0.22.0, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/orazaka-shared 1.1.0 → 1.5.0, @krizaka/tailwind 3.28.0 → 4.0.0, @krizaka/tokens 3.28.0 → 4.0.0, @krizaka/ui 3.28.0 → 4.0.0 |
| sovkora-web | @krizaka/a11y-audit 0.2.0, @krizaka/auth 0.10.0, @krizaka/charts 0.7.1, @krizaka/config 0.17.0, @krizaka/fonts 0.5.2, @krizaka/icons 0.9.1, @krizaka/intl 0.4.1, @krizaka/orazaka-design-system 3.4.0, @krizaka/orazaka-shared 1.4.0, @krizaka/org 0.7.2, @krizaka/page-audit 0.3.1, @krizaka/query 0.2.2, @krizaka/settings 0.5.2, @krizaka/tailwind 3.71.0, @krizaka/tokens 3.87.0, @krizaka/ui 3.87.0 | @krizaka/auth 0.10.0 → 0.13.3, @krizaka/charts 0.7.1 → 1.0.0, @krizaka/config 0.17.0 → 0.22.0, @krizaka/fonts 0.5.2 → 0.5.4, @krizaka/orazaka-shared 1.4.0 → 1.5.0, @krizaka/page-audit 0.3.1 → 0.8.1, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.71.0 → 4.0.0 |
| verikora | @krizaka/app-client 0.3.1, @krizaka/app-desktop 0.1.3, @krizaka/i18n 0.2.1, @krizaka/icons 0.9.2, @krizaka/query 0.2.2, @krizaka/tailwind 4.0.0, @krizaka/tokens 4.0.0, @krizaka/ui 4.0.0, @krizaka/app-config 0.2.1, @krizaka/config 0.12.0, @krizaka/discovery 0.1.3, @krizaka/api-keys 0.3.0, @krizaka/audit 0.1.3, @krizaka/auth 0.12.0, @krizaka/brief 0.1.0, @krizaka/charts 1.0.0, @krizaka/coupons 0.1.1, @krizaka/credits 0.1.1, @krizaka/db 0.3.0, @krizaka/email 1.0.0, @krizaka/fonts 0.3.0, @krizaka/intl 0.3.0, @krizaka/org 1.0.0, @krizaka/organize 0.1.0, @krizaka/payments 0.5.0, @krizaka/privacy 0.2.0, @krizaka/rate-limit 0.1.0, @krizaka/settings 0.7.0, @krizaka/sovkora-client 1.0.0, @krizaka/storage 0.6.0, @krizaka/time 0.1.0, @krizaka/webhooks 0.3.0, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.0 | @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/query 0.2.2 → 0.3.0, @krizaka/config 0.12.0 → 0.22.0, @krizaka/api-keys 0.3.0 → 0.3.1, @krizaka/audit 0.1.3 → 0.1.7, @krizaka/auth 0.12.0 → 0.13.3, @krizaka/brief 0.1.0 → 0.1.1, @krizaka/coupons 0.1.1 → 0.1.5, @krizaka/credits 0.1.1 → 0.1.5, @krizaka/db 0.3.0 → 0.3.1, @krizaka/fonts 0.3.0 → 0.5.4, @krizaka/intl 0.3.0 → 0.4.1, @krizaka/organize 0.1.0 → 0.5.1, @krizaka/payments 0.5.0 → 0.7.2, @krizaka/privacy 0.2.0 → 0.2.4, @krizaka/rate-limit 0.1.0 → 0.3.1, @krizaka/storage 0.6.0 → 0.11.2, @krizaka/time 0.1.0 → 0.2.0, @krizaka/webhooks 0.3.0 → 0.3.4 |
