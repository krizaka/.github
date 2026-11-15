# Conformance matrix

Generated 2026-11-15T13:31:48.660Z by https://github.com/krizaka/.github/actions/runs/43719180563 from `docs/standards/rules.json` against main of every active repository of `repos.json`. Machine-readable: [matrix.json](matrix.json).

| rule | pass | fail | unknown | manual |
|---|---:|---:|---:|---:|
| security-scan | 16 | 0 | 0 | 0 |
| shared-ci | 10 | 1 | 0 | 0 |
| no-inline-sonar | 14 | 1 | 0 | 0 |
| scorecard | 12 | 0 | 0 | 0 |
| dependabot-config | 16 | 0 | 0 | 0 |
| dependabot-automerge | 14 | 2 | 0 | 0 |
| visual-regression | 2 | 0 | 0 | 0 |
| agents-anti-slop | 15 | 1 | 0 | 0 |
| edit-hook | 16 | 0 | 0 | 0 |
| release-propagation | 3 | 5 | 0 | 0 |
| caller-permissions | 16 | 0 | 0 | 0 |
| maven-family-current | 1 | 0 | 0 | 0 |
| workspace-guard | 6 | 1 | 0 | 0 |
| expo-sdk-guard | 2 | 0 | 0 | 0 |
| turnstile-server-side | 2 | 0 | 0 | 0 |
| email-verification | 2 | 0 | 0 | 0 |
| no-departed-product | 14 | 2 | 0 | 0 |
| no-departed-published | 15 | 0 | 0 | 0 |
| commercial-names | 6 | 0 | 0 | 0 |
| lab-isolation | 15 | 0 | 0 | 0 |
| code-rules-ratchet | 1 | 0 | 0 | 0 |
| code-rules-sg | 7 | 0 | 0 | 0 |
| feature-surfaces | 1 | 2 | 0 | 0 |
| formatter | 9 | 3 | 0 | 0 |
| prepush-format-security | 14 | 2 | 0 | 0 |
| agents-template | 4 | 11 | 0 | 0 |
| journeys | 0 | 3 | 0 | 0 |
| merged-result-tested | 14 | 1 | 0 | 0 |
| required-checks-profile | 12 | 3 | 0 | 0 |
| merge-resolution | 14 | 1 | 0 | 0 |
| fail-closed-sg | 6 | 1 | 0 | 0 |
| time-limits | 3 | 13 | 0 | 0 |
| required-checks-report-in-queue | 13 | 2 | 0 | 0 |
| rust-guards | 4 | 0 | 0 | 0 |
| python-guards | 1 | 0 | 0 | 0 |
| sonar-ratchet | 11 | 0 | 0 | 0 |
| no-self-issues | 16 | 0 | 0 | 0 |
| public-no-founder-name | 5 | 0 | 0 | 0 |
| public-no-amount | 4 | 1 | 0 | 0 |
| code-name-hosts-noindex | 2 | 0 | 0 | 0 |
| privacy-officer | 3 | 0 | 0 | 0 |
| product-status-word | 3 | 2 | 0 | 0 |
| one-contact-path | 5 | 0 | 0 | 0 |
| docs-map | 10 | 5 | 0 | 0 |
| adr-internal | 16 | 0 | 0 | 0 |
| rules-register | 0 | 1 | 0 | 0 |
| no-public-email | 4 | 2 | 0 | 0 |
| no-github-packages-url | 15 | 1 | 0 | 0 |
| **all** | **394** | **67** | **0** | **0** |

| repo | commit | failing rules | unknown |
|---|---|---|---|
| .github | 699f5c3 | dependabot-automerge, formatter, prepush-format-security, time-limits, no-github-packages-url | none |
| folioviv | 0dbf7f6 | feature-surfaces, agents-template, journeys, time-limits, public-no-amount, product-status-word, no-public-email | none |
| kridoc | fa01b23 | none | none |
| krizaka-agents | 8acd824 | shared-ci, dependabot-automerge, agents-anti-slop, no-departed-product, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits, rules-register | none |
| krizaka-blog | d912616 | release-propagation, agents-template, time-limits | none |
| krizaka-com | df0dd06 | release-propagation, agents-template, time-limits, product-status-word, no-public-email | none |
| krizaka-coming-soon | 7cf591d | required-checks-profile | none |
| krizaka-infra | 2c51621 | agents-template, time-limits, docs-map | none |
| krizaka-java | fe516cb | agents-template, time-limits | none |
| krizaka-lab | ba9f81e | release-propagation, agents-template, time-limits, required-checks-report-in-queue, docs-map | none |
| krizaka-rust | db84144 | no-inline-sonar, agents-template, time-limits, required-checks-report-in-queue, docs-map | none |
| krizaka-ts | b4dc205 | release-propagation, agents-template, time-limits | none |
| krizaka-ui | 2bda161 | release-propagation, formatter, prepush-format-security, agents-template, fail-closed-sg, time-limits | none |
| krizaka-ui-builder | 728b2ad | workspace-guard, formatter, required-checks-profile, time-limits, docs-map | none |
| sovkora | 48b6169 | no-departed-product, feature-surfaces, agents-template, journeys, time-limits, docs-map | none |
| verikora | 45a9adb | journeys | none |

Out of scope (paused or archived): krizaka-cla-signatures, krizaka-internal, krizaka-restricted, krizaka-template, krizaka-template-desktop, krizaka-template-web.

Same-day rollout (security rules): security-scan, scorecard, dependabot-config, turnstile-server-side, email-verification. The other rules are reported here, never fanned out.

### Family versions

| repo | family versions | behind |
|---|---|---|
| .github | @krizaka/architecture 0.2.1, @krizaka/org 1.5.0 | current |
| folioviv | @krizaka/app-client 0.3.2, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/i18n 0.2.8, @krizaka/icons 0.10.1, @krizaka/intl 0.4.1, @krizaka/query 0.3.1, @krizaka/tokens 4.7.1, @krizaka/ui 4.7.1, @krizaka/api-keys 0.3.1, @krizaka/auth 0.14.0, @krizaka/brief 0.1.1, @krizaka/charts 1.0.1, @krizaka/email 1.2.1, @krizaka/email-verification 0.1.1, @krizaka/fonts 0.5.4, @krizaka/org 1.2.0, @krizaka/organize 0.5.1, @krizaka/payments 0.7.2, @krizaka/privacy 0.2.4, @krizaka/rate-limit 0.3.1, @krizaka/realtime 0.2.1, @krizaka/settings 0.7.0, @krizaka/storage 0.11.4, @krizaka/tailwind 4.7.1, @krizaka/webhooks 0.3.4, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.1, @krizaka/db 0.3.1 | current |
| kridoc | @krizaka/audit 0.1.8, @krizaka/auth 0.14.0, @krizaka/config 0.25.0, @krizaka/db 0.3.1, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.4, @krizaka/icons 0.10.0, @krizaka/org 1.5.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.3.1, @krizaka/settings 0.7.1, @krizaka/storage 0.11.5, @krizaka/tailwind 4.7.0, @krizaka/time 0.2.0, @krizaka/tokens 4.7.0, @krizaka/ui 4.7.0 | @krizaka/i18n 0.2.4 → 0.2.8 |
| krizaka-agents | @krizaka/config 0.20.0 | @krizaka/config 0.20.0 → 0.26.2 |
| krizaka-blog | @krizaka/architecture 0.3.0, @krizaka/charts 1.0.1, @krizaka/config 0.10.0, @krizaka/email 1.2.1, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.8, @krizaka/icons 0.10.1, @krizaka/org 0.7.0, @krizaka/query 0.3.1, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 4.7.1, @krizaka/tokens 4.7.1, @krizaka/ui 4.7.1 | @krizaka/config 0.10.0 → 0.26.2, @krizaka/org 0.7.0 → 1.7.1, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-com | @krizaka/a11y-audit 0.2.0, @krizaka/charts 1.0.1, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/email-verification 0.1.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.8, @krizaka/icons 0.10.1, @krizaka/org 1.5.0, @krizaka/query 0.3.1, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 4.7.1, @krizaka/time 0.2.0, @krizaka/tokens 4.7.1, @krizaka/ui 4.7.1 | @krizaka/email-verification 0.1.0 → 0.1.1, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-coming-soon | @krizaka/config 0.25.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.7, @krizaka/org 1.7.0, @krizaka/query 0.3.0, @krizaka/tailwind 4.4.1, @krizaka/tokens 4.4.1, @krizaka/ui 4.4.1 | @krizaka/fonts 0.5.3 → 0.5.4 |
| krizaka-java | @krizaka/config 0.25.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.8, @krizaka/icons 0.10.1, @krizaka/query 0.3.1, @krizaka/tailwind 4.7.1, @krizaka/tokens 4.7.1, @krizaka/ui 4.7.1, krizaka-parent 0.19.0 | current |
| krizaka-lab | @krizaka/charts 1.0.1, @krizaka/config 0.17.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.8, @krizaka/icons 0.10.1, @krizaka/query 0.3.1, @krizaka/tailwind 4.7.1, @krizaka/tokens 4.7.1, @krizaka/ui 4.7.1 | @krizaka/config 0.17.0 → 0.26.2 |
| krizaka-ts | @krizaka/intl 0.4.1, @krizaka/ui 4.7.1, @krizaka/a11y-audit 0.2.0, @krizaka/config 0.4.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.8, @krizaka/icons 0.10.1, @krizaka/query 0.3.1, @krizaka/tailwind 4.7.1, @krizaka/tokens 4.7.1 | @krizaka/config 0.4.0 → 0.26.2 |
| krizaka-ui | @krizaka/config 0.9.1, @krizaka/org 1.1.0, @krizaka/ui-builder 0.4.0, @krizaka/architecture 0.3.0, @krizaka/organize 0.4.0, @krizaka/query 0.3.1, @krizaka/tailwind 4.7.1 | @krizaka/config 0.9.1 → 0.26.2, @krizaka/org 1.1.0 → 1.7.1, @krizaka/organize 0.4.0 → 0.5.2 |
| sovkora | @krizaka/orazaka-cli 1.1.0, @krizaka/config 0.20.0, @krizaka/i18n 0.2.7, @krizaka/icons 0.5.1, @krizaka/orazaka-design-system 3.4.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/tailwind 3.79.0, @krizaka/tokens 3.30.0, @krizaka/ui 3.79.0, @krizaka/app-config 0.2.0, @krizaka/charts 0.8.0, @krizaka/discovery 0.1.0, @krizaka/intl 0.4.1, @krizaka/orazaka-shared 1.4.0, @krizaka/a11y-audit 0.2.0, @krizaka/auth 0.13.1, @krizaka/fonts 0.5.3, @krizaka/page-audit 0.8.0, @krizaka/settings 0.5.2, @krizaka/storage 0.11.1 | @krizaka/config 0.20.0 → 0.26.2, @krizaka/icons 0.5.1 → 0.10.1, @krizaka/org 0.7.0 → 1.7.1, @krizaka/tailwind 3.79.0 → 4.7.1, @krizaka/tokens 3.30.0 → 4.7.1, @krizaka/ui 3.79.0 → 4.7.1, @krizaka/app-config 0.2.0 → 0.2.2, @krizaka/charts 0.8.0 → 1.0.1, @krizaka/discovery 0.1.0 → 0.1.4, @krizaka/orazaka-shared 1.4.0 → 1.5.0, @krizaka/auth 0.13.1 → 0.14.1, @krizaka/fonts 0.5.3 → 0.5.4, @krizaka/page-audit 0.8.0 → 0.8.3, @krizaka/settings 0.5.2 → 0.7.1, @krizaka/storage 0.11.1 → 0.11.6 |
| verikora | @krizaka/app-client 0.3.2, @krizaka/app-desktop 0.1.3, @krizaka/i18n 0.2.8, @krizaka/icons 0.10.1, @krizaka/query 0.3.1, @krizaka/tailwind 4.7.1, @krizaka/tokens 4.7.1, @krizaka/ui 4.7.1, @krizaka/app-config 0.2.2, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/api-keys 0.3.1, @krizaka/audit 0.1.7, @krizaka/auth 0.14.0, @krizaka/brief 0.1.1, @krizaka/charts 1.0.1, @krizaka/coupons 0.1.5, @krizaka/credits 0.1.5, @krizaka/db 0.3.1, @krizaka/email 1.2.1, @krizaka/fonts 0.5.4, @krizaka/intl 0.4.1, @krizaka/org 1.6.0, @krizaka/organize 0.5.1, @krizaka/payments 0.7.2, @krizaka/privacy 0.2.4, @krizaka/rate-limit 0.3.1, @krizaka/settings 0.7.0, @krizaka/sovkora-client 1.0.0, @krizaka/storage 0.11.5, @krizaka/time 0.2.0, @krizaka/webhooks 0.3.4, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.2 | current |
