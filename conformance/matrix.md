# Conformance matrix

Generated 2026-11-12T20:35:01.763Z by https://github.com/krizaka/.github/actions/runs/43301174936 from `docs/standards/rules.json` against main of every active repository of `repos.json`. Machine-readable: [matrix.json](matrix.json).

| rule | pass | fail | unknown | manual |
|---|---:|---:|---:|---:|
| security-scan | 16 | 0 | 0 | 0 |
| shared-ci | 10 | 1 | 0 | 0 |
| no-inline-sonar | 15 | 0 | 0 | 0 |
| scorecard | 12 | 0 | 0 | 0 |
| dependabot-config | 16 | 0 | 0 | 0 |
| dependabot-automerge | 14 | 2 | 0 | 0 |
| visual-regression | 2 | 0 | 0 | 0 |
| agents-anti-slop | 14 | 2 | 0 | 0 |
| edit-hook | 16 | 0 | 0 | 0 |
| release-propagation | 0 | 8 | 0 | 0 |
| maven-family-current | 1 | 0 | 0 | 0 |
| workspace-guard | 6 | 1 | 0 | 0 |
| expo-sdk-guard | 2 | 0 | 0 | 0 |
| turnstile-server-side | 2 | 0 | 0 | 0 |
| email-verification | 2 | 0 | 0 | 0 |
| no-departed-product | 14 | 2 | 0 | 0 |
| no-departed-published | 15 | 0 | 0 | 0 |
| commercial-names | 4 | 2 | 0 | 0 |
| lab-isolation | 15 | 0 | 0 | 0 |
| code-rules-ratchet | 1 | 0 | 0 | 0 |
| code-rules-sg | 7 | 0 | 0 | 0 |
| feature-surfaces | 0 | 3 | 0 | 0 |
| formatter | 8 | 3 | 0 | 0 |
| prepush-format-security | 14 | 2 | 0 | 0 |
| agents-template | 2 | 13 | 0 | 0 |
| journeys | 0 | 3 | 0 | 0 |
| merged-result-tested | 14 | 1 | 0 | 0 |
| required-checks-profile | 12 | 3 | 0 | 0 |
| merge-resolution | 14 | 1 | 0 | 0 |
| fail-closed-sg | 3 | 4 | 0 | 0 |
| time-limits | 0 | 16 | 0 | 0 |
| required-checks-report-in-queue | 13 | 2 | 0 | 0 |
| rust-guards | 4 | 0 | 0 | 0 |
| python-guards | 1 | 0 | 0 | 0 |
| sonar-ratchet | 10 | 1 | 0 | 0 |
| no-self-issues | 16 | 0 | 0 | 0 |
| public-no-founder-name | 2 | 3 | 0 | 0 |
| public-no-amount | 1 | 4 | 0 | 0 |
| code-name-hosts-noindex | 2 | 0 | 0 | 0 |
| privacy-officer | 3 | 0 | 0 | 0 |
| product-status-word | 0 | 5 | 0 | 0 |
| one-contact-path | 3 | 2 | 0 | 0 |
| docs-map | 8 | 7 | 0 | 0 |
| rules-register | 1 | 0 | 0 | 0 |
| no-public-email | 3 | 3 | 0 | 0 |
| no-github-packages-url | 15 | 1 | 0 | 0 |
| **all** | **333** | **95** | **0** | **0** |

| repo | commit | failing rules | unknown |
|---|---|---|---|
| .github | 691a94f | dependabot-automerge, time-limits, no-github-packages-url | none |
| folioviv | 1979074 | release-propagation, feature-surfaces, formatter, prepush-format-security, agents-template, journeys, fail-closed-sg, time-limits, public-no-founder-name, public-no-amount, product-status-word, no-public-email | none |
| kridoc | e03a124 | commercial-names, time-limits, public-no-founder-name, public-no-amount, product-status-word, one-contact-path, docs-map | none |
| krizaka-agents | 2f19709 | shared-ci, dependabot-automerge, agents-anti-slop, no-departed-product, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits | none |
| krizaka-blog | 9676d91 | release-propagation, agents-template, time-limits | none |
| krizaka-com | 1196f56 | release-propagation, agents-template, fail-closed-sg, time-limits, product-status-word, no-public-email | none |
| krizaka-coming-soon | 28e23d2 | agents-anti-slop, commercial-names, agents-template, required-checks-profile, time-limits, public-no-founder-name, public-no-amount, product-status-word, one-contact-path, docs-map | none |
| krizaka-infra | 8facb4c | agents-template, time-limits, docs-map | none |
| krizaka-java | fe6793f | release-propagation, agents-template, time-limits | none |
| krizaka-lab | 2d680a6 | release-propagation, agents-template, time-limits, required-checks-report-in-queue, docs-map | none |
| krizaka-rust | 93bea43 | agents-template, time-limits, required-checks-report-in-queue, docs-map | none |
| krizaka-ts | 42ba66d | release-propagation, agents-template, time-limits | none |
| krizaka-ui | ea4fc3e | release-propagation, formatter, prepush-format-security, agents-template, fail-closed-sg, time-limits | none |
| krizaka-ui-builder | b95061c | workspace-guard, formatter, required-checks-profile, time-limits, docs-map | none |
| sovkora | bd646e3 | no-departed-product, feature-surfaces, agents-template, journeys, time-limits, docs-map | none |
| verikora | 18c997f | release-propagation, feature-surfaces, agents-template, journeys, fail-closed-sg, time-limits, sonar-ratchet, public-no-amount, product-status-word, no-public-email | none |

Out of scope (paused or archived): krizaka-cla-signatures, krizaka-internal, krizaka-restricted, krizaka-template, krizaka-template-desktop, krizaka-template-web.

Same-day rollout (security rules): security-scan, scorecard, dependabot-config, turnstile-server-side, email-verification. The other rules are reported here, never fanned out.

### Family versions

| repo | family versions | behind |
|---|---|---|
| .github | @krizaka/architecture 0.2.0, @krizaka/org 1.1.0 | current |
| folioviv | @krizaka/app-client 0.3.1, @krizaka/config 0.17.0, @krizaka/discovery 0.1.3, @krizaka/i18n 0.2.1, @krizaka/icons 0.9.2, @krizaka/intl 0.3.0, @krizaka/query 0.2.2, @krizaka/tokens 4.0.0, @krizaka/ui 4.0.0, @krizaka/api-keys 0.1.0, @krizaka/auth 0.12.0, @krizaka/brief 0.1.0, @krizaka/charts 1.0.0, @krizaka/email 1.0.0, @krizaka/email-verification 0.1.1, @krizaka/fonts 0.5.4, @krizaka/org 1.0.0, @krizaka/organize 0.4.0, @krizaka/payments 0.7.0, @krizaka/privacy 0.2.0, @krizaka/rate-limit 0.2.1, @krizaka/realtime 0.2.1, @krizaka/settings 0.2.0, @krizaka/storage 0.8.1, @krizaka/tailwind 4.0.0, @krizaka/webhooks 0.1.0, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.5.1, @krizaka/db 0.3.0 | @krizaka/config 0.17.0 → 0.23.0, @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/intl 0.3.0 → 0.4.1, @krizaka/query 0.2.2 → 0.3.0, @krizaka/api-keys 0.1.0 → 0.3.1, @krizaka/auth 0.12.0 → 0.14.0, @krizaka/brief 0.1.0 → 0.1.1, @krizaka/organize 0.4.0 → 0.5.1, @krizaka/payments 0.7.0 → 0.7.2, @krizaka/privacy 0.2.0 → 0.2.4, @krizaka/rate-limit 0.2.1 → 0.3.1, @krizaka/settings 0.2.0 → 0.7.0, @krizaka/storage 0.8.1 → 0.11.2, @krizaka/webhooks 0.1.0 → 0.3.4, @krizaka/page-audit 0.5.1 → 0.8.1, @krizaka/db 0.3.0 → 0.3.1 |
| kridoc | @krizaka/config 0.20.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.4, @krizaka/icons 0.9.0, @krizaka/tailwind 3.82.0, @krizaka/tokens 3.82.0, @krizaka/ui 3.82.0 | @krizaka/i18n 0.2.4 → 0.2.7, @krizaka/icons 0.9.0 → 0.10.0, @krizaka/tailwind 3.82.0 → 4.3.0, @krizaka/tokens 3.82.0 → 4.3.0, @krizaka/ui 3.82.0 → 4.3.0 |
| krizaka-agents | @krizaka/config 0.20.0 | current |
| krizaka-blog | @krizaka/charts 0.6.1, @krizaka/config 0.10.0, @krizaka/email 0.1.1, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.5, @krizaka/icons 0.9.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 3.87.0, @krizaka/tokens 3.87.0, @krizaka/ui 3.87.0 | @krizaka/charts 0.6.1 → 1.0.0, @krizaka/config 0.10.0 → 0.23.0, @krizaka/email 0.1.1 → 1.2.0, @krizaka/fonts 0.5.1 → 0.5.4, @krizaka/i18n 0.2.5 → 0.2.7, @krizaka/icons 0.9.0 → 0.10.0, @krizaka/org 0.7.0 → 1.2.0, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-com | @krizaka/a11y-audit 0.2.0, @krizaka/charts 1.0.0, @krizaka/config 0.17.0, @krizaka/discovery 0.1.0, @krizaka/email-verification 0.1.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.5, @krizaka/icons 0.9.0, @krizaka/org 1.2.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 4.0.0, @krizaka/time 0.2.0, @krizaka/tokens 4.0.0, @krizaka/ui 4.0.0 | @krizaka/config 0.17.0 → 0.23.0, @krizaka/discovery 0.1.0 → 0.1.3, @krizaka/email-verification 0.1.0 → 0.1.1, @krizaka/i18n 0.2.5 → 0.2.7, @krizaka/icons 0.9.0 → 0.10.0, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-coming-soon | @krizaka/config 0.20.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.7, @krizaka/org 0.7.1, @krizaka/tailwind 3.85.0, @krizaka/tokens 3.85.0, @krizaka/ui 3.85.0 | @krizaka/org 0.7.1 → 1.2.0, @krizaka/tailwind 3.85.0 → 4.3.0, @krizaka/tokens 3.85.0 → 4.3.0, @krizaka/ui 3.85.0 → 4.3.0 |
| krizaka-java | @krizaka/config 0.4.0, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.0, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.60.0, krizaka-parent 0.14.1 | @krizaka/config 0.4.0 → 0.23.0, @krizaka/fonts 0.5.1 → 0.5.4, @krizaka/i18n 0.2.0 → 0.2.7, @krizaka/icons 0.9.0 → 0.10.0, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.60.0 → 4.3.0, @krizaka/tokens 3.60.0 → 4.3.0, @krizaka/ui 3.60.0 → 4.3.0 |
| krizaka-lab | @krizaka/charts 0.6.0, @krizaka/config 0.17.0, @krizaka/fonts 0.3.0, @krizaka/i18n 0.2.3, @krizaka/icons 0.7.0, @krizaka/tailwind 3.43.0, @krizaka/tokens 3.43.0, @krizaka/ui 3.43.0 | @krizaka/charts 0.6.0 → 1.0.0, @krizaka/config 0.17.0 → 0.23.0, @krizaka/fonts 0.3.0 → 0.5.4, @krizaka/i18n 0.2.3 → 0.2.7, @krizaka/icons 0.7.0 → 0.10.0, @krizaka/tailwind 3.43.0 → 4.3.0, @krizaka/tokens 3.43.0 → 4.3.0, @krizaka/ui 3.43.0 → 4.3.0 |
| krizaka-ts | @krizaka/intl 0.4.1, @krizaka/a11y-audit 0.2.0, @krizaka/config 0.4.0, @krizaka/fonts 0.5.1, @krizaka/i18n 0.2.0, @krizaka/icons 0.9.0, @krizaka/query 0.2.2, @krizaka/tailwind 3.60.0, @krizaka/tokens 3.60.0, @krizaka/ui 3.60.0 | @krizaka/config 0.4.0 → 0.23.0, @krizaka/fonts 0.5.1 → 0.5.4, @krizaka/i18n 0.2.0 → 0.2.7, @krizaka/icons 0.9.0 → 0.10.0, @krizaka/query 0.2.2 → 0.3.0, @krizaka/tailwind 3.60.0 → 4.3.0, @krizaka/tokens 3.60.0 → 4.3.0, @krizaka/ui 3.60.0 → 4.3.0 |
| krizaka-ui | @krizaka/config 0.9.1, @krizaka/org 1.1.0, @krizaka/ui-builder 0.3.0, @krizaka/organize 0.4.0, @krizaka/query 0.3.0, @krizaka/tailwind 4.3.0 | @krizaka/config 0.9.1 → 0.23.0, @krizaka/organize 0.4.0 → 0.5.1 |
| sovkora | @krizaka/orazaka-cli 1.1.0, @krizaka/config 0.20.0, @krizaka/i18n 0.2.7, @krizaka/icons 0.5.1, @krizaka/orazaka-design-system 3.4.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/tailwind 3.79.0, @krizaka/tokens 3.30.0, @krizaka/ui 3.30.0, @krizaka/app-config 0.2.0, @krizaka/charts 0.8.0, @krizaka/discovery 0.1.0, @krizaka/intl 0.4.1, @krizaka/orazaka-shared 1.4.0, @krizaka/a11y-audit 0.2.0, @krizaka/auth 0.13.1, @krizaka/fonts 0.5.3, @krizaka/page-audit 0.8.0, @krizaka/settings 0.5.2, @krizaka/storage 0.11.1 | @krizaka/icons 0.5.1 → 0.10.0, @krizaka/org 0.7.0 → 1.2.0, @krizaka/tailwind 3.79.0 → 4.3.0, @krizaka/tokens 3.30.0 → 4.3.0, @krizaka/ui 3.30.0 → 4.3.0, @krizaka/discovery 0.1.0 → 0.1.3, @krizaka/orazaka-shared 1.4.0 → 1.5.0, @krizaka/auth 0.13.1 → 0.14.0, @krizaka/settings 0.5.2 → 0.7.0 |
| verikora | @krizaka/app-client 0.3.1, @krizaka/app-desktop 0.1.3, @krizaka/i18n 0.2.1, @krizaka/icons 0.9.2, @krizaka/query 0.2.2, @krizaka/tailwind 4.0.0, @krizaka/tokens 4.0.0, @krizaka/ui 4.2.1, @krizaka/app-config 0.2.1, @krizaka/config 0.12.0, @krizaka/discovery 0.1.3, @krizaka/api-keys 0.3.0, @krizaka/audit 0.1.3, @krizaka/auth 0.14.0, @krizaka/brief 0.1.0, @krizaka/charts 1.0.0, @krizaka/coupons 0.1.1, @krizaka/credits 0.1.1, @krizaka/db 0.3.0, @krizaka/email 1.1.0, @krizaka/fonts 0.3.0, @krizaka/intl 0.3.0, @krizaka/org 1.0.0, @krizaka/organize 0.1.0, @krizaka/payments 0.5.0, @krizaka/privacy 0.2.0, @krizaka/rate-limit 0.1.0, @krizaka/settings 0.7.0, @krizaka/sovkora-client 1.0.0, @krizaka/storage 0.6.0, @krizaka/time 0.1.0, @krizaka/webhooks 0.3.0, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.0 | @krizaka/i18n 0.2.1 → 0.2.7, @krizaka/query 0.2.2 → 0.3.0, @krizaka/config 0.12.0 → 0.23.0, @krizaka/api-keys 0.3.0 → 0.3.1, @krizaka/audit 0.1.3 → 0.1.7, @krizaka/brief 0.1.0 → 0.1.1, @krizaka/coupons 0.1.1 → 0.1.5, @krizaka/credits 0.1.1 → 0.1.5, @krizaka/db 0.3.0 → 0.3.1, @krizaka/fonts 0.3.0 → 0.5.4, @krizaka/intl 0.3.0 → 0.4.1, @krizaka/organize 0.1.0 → 0.5.1, @krizaka/payments 0.5.0 → 0.7.2, @krizaka/privacy 0.2.0 → 0.2.4, @krizaka/rate-limit 0.1.0 → 0.3.1, @krizaka/storage 0.6.0 → 0.11.2, @krizaka/time 0.1.0 → 0.2.0, @krizaka/webhooks 0.3.0 → 0.3.4 |
