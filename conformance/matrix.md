# Conformance matrix

Generated 2026-11-06T13:50:16.417Z by https://github.com/krizaka/.github/actions/runs/42228350613 from `docs/standards/rules.json` against main of every active repository of `repos.json`. Machine-readable: [matrix.json](matrix.json).

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
| rules-register | 1 | 0 | 0 | 0 |
| **all** | **591** | **137** | **0** | **0** |

| repo | commit | failing rules | unknown |
|---|---|---|---|
| .github | ab61003 | dependabot-automerge, time-limits | none |
| folioviv | 606c47b | release-propagation, feature-surfaces, formatter, agents-template, journeys, fail-closed-sg, time-limits, public-no-founder-name, public-no-amount, privacy-officer, product-status-word | none |
| kridoc | c37a0cf | commercial-names, time-limits, public-no-founder-name, public-no-amount, product-status-word, one-contact-path | none |
| krizaka-agents | 6da7efb | shared-ci, dependabot-automerge, agents-anti-slop, no-departed-product, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits | none |
| krizaka-blog | 6dd37a4 | release-propagation, agents-template, time-limits | none |
| krizaka-com | 73b5dee | release-propagation, agents-template, fail-closed-sg, time-limits, product-status-word | none |
| krizaka-coming-soon | 548ca24 | agents-anti-slop, commercial-names, agents-template, required-checks-profile, time-limits, public-no-founder-name, public-no-amount, product-status-word, one-contact-path | none |
| krizaka-composer | a429158 | workspace-guard, formatter, time-limits | none |
| krizaka-desktop | 4ee517f | agents-template, time-limits, required-checks-report-in-queue | none |
| krizaka-infra | 0ab9d04 | agents-template, time-limits | none |
| krizaka-java | 1277f30 | release-propagation, agents-template, time-limits | none |
| krizaka-lab | dec57f7 | release-propagation, agents-template, time-limits, required-checks-report-in-queue | none |
| krizaka-template-desktop | 29b2553 | visual-regression, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits | none |
| krizaka-template-web | 5256b06 | agents-template, fail-closed-sg, time-limits, required-checks-report-in-queue | none |
| krizaka-ts | 4a28a1c | release-propagation, agents-template, time-limits | none |
| krizaka-ui | 187913f | release-propagation, formatter, agents-template, fail-closed-sg, time-limits | none |
| sovkora | b8281e3 | no-departed-product, feature-surfaces, agents-template, time-limits | none |
| sovkora-automation-service | f1787b1 | agents-template, required-checks-report-in-queue | none |
| sovkora-build | f1b886b | agents-template, required-checks-report-in-queue | none |
| sovkora-cli | 7baa410 | feature-surfaces, agents-template, time-limits, required-checks-report-in-queue | none |
| sovkora-contracts | 3418979 | feature-surfaces, agents-template, required-checks-report-in-queue | none |
| sovkora-conversation-service | 67bf799 | agents-template, required-checks-report-in-queue | none |
| sovkora-edge-service | b653980 | agents-template, required-checks-report-in-queue | none |
| sovkora-engine | a3c9ab3 | agents-template, required-checks-report-in-queue | none |
| sovkora-job-service | 54a3708 | agents-template, required-checks-report-in-queue | none |
| sovkora-knowledge-service | 9375195 | agents-template, required-checks-report-in-queue | none |
| sovkora-mobile | 83d72b8 | feature-surfaces, agents-template, time-limits, required-checks-report-in-queue | none |
| sovkora-packs | a9814b1 | agents-template, time-limits, required-checks-report-in-queue | none |
| sovkora-studio-service | 7f955dc | agents-template, required-checks-report-in-queue | none |
| sovkora-ui-kit | f374f33 | agents-template, time-limits, required-checks-report-in-queue | none |
| sovkora-web | cb4e3c8 | visual-regression, release-propagation, feature-surfaces, agents-template, journeys, fail-closed-sg, time-limits, required-checks-report-in-queue, public-no-founder-name, public-no-amount, one-contact-path | none |
| sovkora-worker-media | 322a1fd | agents-template, required-checks-report-in-queue | none |
| verikora | 0787651 | release-propagation, feature-surfaces, agents-template, journeys, fail-closed-sg, time-limits, sonar-ratchet, public-no-amount, product-status-word | none |

Out of scope (paused or archived): krizaka-cla-signatures, krizaka-internal, krizaka-restricted.

Same-day rollout (security rules): security-scan, scorecard, dependabot-config, turnstile-server-side, email-verification. The other rules are reported here, never fanned out.

### Family versions

| repo | family versions | behind |
|---|---|---|
| folioviv | @krizaka/app-client 0.1.0, @krizaka/config 0.17.0, @krizaka/discovery 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/intl 0.3.0, @krizaka/query 0.2.2, @krizaka/tokens 3.76.1, @krizaka/ui 3.76.1, @krizaka/api-keys 0.1.0, @krizaka/auth 0.12.0, @krizaka/brief 0.1.0, @krizaka/charts 0.6.1, @krizaka/email 0.5.0, @krizaka/email-verification 0.1.1, @krizaka/fonts 0.5.0, @krizaka/org 0.3.1, @krizaka/organize 0.4.0, @krizaka/payments 0.7.0, @krizaka/privacy 0.2.0, @krizaka/rate-limit 0.2.1, @krizaka/realtime 0.2.1, @krizaka/settings 0.2.0, @krizaka/storage 0.8.1, @krizaka/tailwind 3.76.1, @krizaka/webhooks 0.1.0, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.5.1, @krizaka/db 0.3.0 | @krizaka/app-client 0.1.0 → 0.3.1, @krizaka/config 0.17.0 → 0.21.0, @krizaka/discovery 0.1.0 → 0.1.3, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.2, @krizaka/intl 0.3.0 → 0.4.1, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tokens 3.76.1 → 4.0.0, @krizaka/ui 3.76.1 → 4.0.0, @krizaka/api-keys 0.1.0 → 0.3.1, @krizaka/auth 0.12.0 → 0.13.3, @krizaka/brief 0.1.0 → 0.1.1, @krizaka/charts 0.6.1 → 1.0.0, @krizaka/fonts 0.5.0 → 0.5.4, @krizaka/org 0.3.1 → 1.0.0, @krizaka/organize 0.4.0 → 0.5.1, @krizaka/privacy 0.2.0 → 0.2.4, @krizaka/settings 0.2.0 → 0.7.0, @krizaka/tailwind 3.76.1 → 4.0.0, @krizaka/webhooks 0.1.0 → 0.3.4, @krizaka/page-audit 0.5.1 → 0.8.1, @krizaka/db 0.3.0 → 0.3.1 |
| kridoc | @krizaka/config 0.20.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.4, @krizaka/icons 0.9.0, @krizaka/tailwind 3.82.0, @krizaka/tokens 3.82.0, @krizaka/ui 3.82.0 | @krizaka/i18n 0.2.4 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2 |
| krizaka-agents | @krizaka/config 0.18.0 | current |
| krizaka-blog | @krizaka/charts 0.6.1, @krizaka/config 0.10.0, @krizaka/email 0.1.1, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.5, @krizaka/icons 0.9.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 3.87.0, @krizaka/tokens 3.87.0, @krizaka/ui 3.87.0 | @krizaka/charts 0.6.1 → 1.0.0, @krizaka/config 0.10.0 → 0.21.0, @krizaka/email 0.1.1 → 1.0.0, @krizaka/fonts 0.5.1 → 0.5.4, @krizaka/i18n 0.2.5 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-com | @krizaka/a11y-audit 0.2.0, @krizaka/charts 0.8.0, @krizaka/config 0.17.0, @krizaka/discovery 0.1.0, @krizaka/email-verification 0.1.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.5, @krizaka/icons 0.9.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 3.86.0, @krizaka/tokens 3.86.0, @krizaka/ui 3.86.0 | @krizaka/config 0.17.0 → 0.21.0, @krizaka/discovery 0.1.0 → 0.1.3, @krizaka/email-verification 0.1.0 → 0.1.1, @krizaka/i18n 0.2.5 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-coming-soon | @krizaka/config 0.20.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.7, @krizaka/org 0.7.1, @krizaka/tailwind 3.85.0, @krizaka/tokens 3.85.0, @krizaka/ui 3.85.0 | current |
| krizaka-desktop | @krizaka/app-client 0.1.0, @krizaka/app-desktop 0.1.0, @krizaka/config 0.17.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/tailwind 3.46.0, @krizaka/tokens 3.46.0, @krizaka/ui 3.46.0 | @krizaka/app-client 0.1.0 → 0.3.1, @krizaka/app-desktop 0.1.0 → 0.1.3, @krizaka/config 0.17.0 → 0.21.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.2, @krizaka/tailwind 3.46.0 → 4.0.0, @krizaka/tokens 3.46.0 → 4.0.0, @krizaka/ui 3.46.0 → 4.0.0 |
| krizaka-java | @krizaka/config 0.4.0, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.0, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.60.0, krizaka-parent 0.12.0 | @krizaka/config 0.4.0 → 0.21.0, @krizaka/fonts 0.5.1 → 0.5.4, @krizaka/i18n 0.2.0 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.60.0 → 4.0.0, @krizaka/tokens 3.60.0 → 4.0.0, @krizaka/ui 3.60.0 → 4.0.0 |
| krizaka-lab | @krizaka/charts 0.6.0, @krizaka/config 0.17.0, @krizaka/fonts 0.3.0, @krizaka/i18n 0.2.3, @krizaka/icons 0.7.0, @krizaka/tailwind 3.43.0, @krizaka/tokens 3.43.0, @krizaka/ui 3.43.0 | @krizaka/charts 0.6.0 → 1.0.0, @krizaka/config 0.17.0 → 0.21.0, @krizaka/fonts 0.3.0 → 0.5.4, @krizaka/i18n 0.2.3 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.2, @krizaka/tailwind 3.43.0 → 4.0.0, @krizaka/tokens 3.43.0 → 4.0.0, @krizaka/ui 3.43.0 → 4.0.0 |
| krizaka-template-desktop | @krizaka/app-client 0.1.0, @krizaka/app-desktop 0.1.0, @krizaka/config 0.17.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/tailwind 3.46.0, @krizaka/tokens 3.46.0, @krizaka/ui 3.46.0 | @krizaka/app-client 0.1.0 → 0.3.1, @krizaka/app-desktop 0.1.0 → 0.1.3, @krizaka/config 0.17.0 → 0.21.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.2, @krizaka/tailwind 3.46.0 → 4.0.0, @krizaka/tokens 3.46.0 → 4.0.0, @krizaka/ui 3.46.0 → 4.0.0 |
| krizaka-template-web | @krizaka/config 0.17.0, @krizaka/fonts 0.4.0, @krizaka/i18n 0.2.4, @krizaka/icons 0.9.0, @krizaka/tailwind 3.54.0, @krizaka/tokens 3.54.0, @krizaka/ui 3.54.0 | @krizaka/config 0.17.0 → 0.21.0, @krizaka/fonts 0.4.0 → 0.5.4, @krizaka/i18n 0.2.4 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/tailwind 3.54.0 → 4.0.0, @krizaka/tokens 3.54.0 → 4.0.0, @krizaka/ui 3.54.0 → 4.0.0 |
| krizaka-ts | @krizaka/intl 0.4.1, @krizaka/a11y-audit 0.2.0, @krizaka/config 0.4.0, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.0, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.60.0 | @krizaka/config 0.4.0 → 0.21.0, @krizaka/fonts 0.5.1 → 0.5.4, @krizaka/i18n 0.2.0 → 0.2.7, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.60.0 → 4.0.0, @krizaka/tokens 3.60.0 → 4.0.0, @krizaka/ui 3.60.0 → 4.0.0 |
| krizaka-ui | @krizaka/config 0.9.1, @krizaka/org 1.0.0, @krizaka/organize 0.4.0, @krizaka/query 0.3.0, @krizaka/tailwind 4.0.0 | @krizaka/config 0.9.1 → 0.21.0, @krizaka/organize 0.4.0 → 0.5.1 |
| sovkora | @krizaka/i18n 0.2.1, @krizaka/icons 0.4.0, @krizaka/orazaka-design-system 3.4.0, @krizaka/org 0.7.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.44.0, @krizaka/tokens 3.44.0, @krizaka/ui 3.44.0, @krizaka/storage 0.11.1 | @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.4.0 → 0.9.2, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.44.0 → 4.0.0, @krizaka/tokens 3.44.0 → 4.0.0, @krizaka/ui 3.44.0 → 4.0.0 |
| sovkora-cli | @krizaka/orazaka-cli 1.1.0, @krizaka/config 0.18.0 | current |
| sovkora-mobile | @krizaka/app-config 0.2.0, @krizaka/charts 0.6.0, @krizaka/config 0.18.0, @krizaka/discovery 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.5.1, @krizaka/intl 0.2.1, @krizaka/orazaka-shared 1.5.0, @krizaka/org 0.7.0, @krizaka/query 0.2.1, @krizaka/tokens 3.30.0, @krizaka/ui 3.30.0 | @krizaka/charts 0.6.0 → 1.0.0, @krizaka/discovery 0.1.0 → 0.1.3, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.5.1 → 0.9.2, @krizaka/intl 0.2.1 → 0.4.1, @krizaka/query 0.2.1 → 0.3.0, @krizaka/tokens 3.30.0 → 4.0.0, @krizaka/ui 3.30.0 → 4.0.0 |
| sovkora-packs | @krizaka/config 0.18.0 | current |
| sovkora-ui-kit | @krizaka/config 0.17.0, @krizaka/icons 0.9.0, @krizaka/orazaka-shared 1.1.0, @krizaka/tailwind 3.28.0, @krizaka/tokens 3.28.0, @krizaka/ui 3.28.0 | @krizaka/config 0.17.0 → 0.21.0, @krizaka/icons 0.9.0 → 0.9.2, @krizaka/orazaka-shared 1.1.0 → 1.5.0, @krizaka/tailwind 3.28.0 → 4.0.0, @krizaka/tokens 3.28.0 → 4.0.0, @krizaka/ui 3.28.0 → 4.0.0 |
| sovkora-web | @krizaka/a11y-audit 0.2.0, @krizaka/auth 0.10.0, @krizaka/charts 0.7.1, @krizaka/config 0.17.0, @krizaka/fonts 0.5.2, @krizaka/icons 0.9.1, @krizaka/intl 0.4.1, @krizaka/orazaka-design-system 3.4.0, @krizaka/orazaka-shared 1.4.0, @krizaka/org 0.7.2, @krizaka/page-audit 0.3.1, @krizaka/query 0.2.2, @krizaka/settings 0.5.2, @krizaka/tailwind 3.71.0, @krizaka/tokens 3.87.0, @krizaka/ui 3.87.0 | @krizaka/auth 0.10.0 → 0.13.3, @krizaka/charts 0.7.1 → 1.0.0, @krizaka/config 0.17.0 → 0.21.0, @krizaka/fonts 0.5.2 → 0.5.4, @krizaka/orazaka-shared 1.4.0 → 1.5.0, @krizaka/page-audit 0.3.1 → 0.8.1, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.71.0 → 4.0.0 |
| verikora | @krizaka/app-client 0.2.0, @krizaka/app-desktop 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.7.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.63.0, @krizaka/tokens 3.63.0, @krizaka/ui 3.64.0, @krizaka/app-config 0.2.0, @krizaka/config 0.12.0, @krizaka/discovery 0.1.0, @krizaka/api-keys 0.3.0, @krizaka/audit 0.1.3, @krizaka/auth 0.12.0, @krizaka/brief 0.1.0, @krizaka/charts 0.6.2, @krizaka/coupons 0.1.1, @krizaka/credits 0.1.1, @krizaka/db 0.3.0, @krizaka/email 0.3.0, @krizaka/fonts 0.3.0, @krizaka/intl 0.3.0, @krizaka/orazaka-client 0.2.0, @krizaka/org 0.7.2, @krizaka/organize 0.1.0, @krizaka/payments 0.5.0, @krizaka/privacy 0.2.0, @krizaka/rate-limit 0.1.0, @krizaka/settings 0.6.0, @krizaka/storage 0.6.0, @krizaka/time 0.1.0, @krizaka/webhooks 0.3.0, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.0 | @krizaka/app-client 0.2.0 → 0.3.1, @krizaka/app-desktop 0.1.0 → 0.1.3, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/icons 0.7.0 → 0.9.2, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.63.0 → 4.0.0, @krizaka/tokens 3.63.0 → 4.0.0, @krizaka/ui 3.64.0 → 4.0.0, @krizaka/config 0.12.0 → 0.21.0, @krizaka/discovery 0.1.0 → 0.1.3, @krizaka/api-keys 0.3.0 → 0.3.1, @krizaka/audit 0.1.3 → 0.1.7, @krizaka/auth 0.12.0 → 0.13.3, @krizaka/brief 0.1.0 → 0.1.1, @krizaka/charts 0.6.2 → 1.0.0, @krizaka/coupons 0.1.1 → 0.1.5, @krizaka/credits 0.1.1 → 0.1.5, @krizaka/db 0.3.0 → 0.3.1, @krizaka/email 0.3.0 → 1.0.0, @krizaka/fonts 0.3.0 → 0.5.4, @krizaka/intl 0.3.0 → 0.4.1, @krizaka/orazaka-client 0.2.0 → 0.2.1, @krizaka/organize 0.1.0 → 0.5.1, @krizaka/payments 0.5.0 → 0.7.2, @krizaka/privacy 0.2.0 → 0.2.4, @krizaka/rate-limit 0.1.0 → 0.3.1, @krizaka/storage 0.6.0 → 0.11.2, @krizaka/time 0.1.0 → 0.2.0, @krizaka/webhooks 0.3.0 → 0.3.4 |
