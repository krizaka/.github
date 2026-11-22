# Conformance matrix

Generated 2026-11-22T14:11:53.353Z by https://github.com/krizaka/.github/actions/runs/45031014016 from `docs/standards/rules.json` against main of every active repository of `repos.json`. Machine-readable: [matrix.json](matrix.json).

| rule | pass | fail | unknown | manual |
|---|---:|---:|---:|---:|
| security-scan | 18 | 0 | 0 | 0 |
| shared-ci | 12 | 1 | 0 | 0 |
| no-inline-sonar | 16 | 1 | 0 | 0 |
| scorecard | 14 | 0 | 0 | 0 |
| dependabot-config | 18 | 0 | 0 | 0 |
| dependabot-automerge | 15 | 3 | 0 | 0 |
| visual-regression | 2 | 0 | 0 | 0 |
| agents-anti-slop | 9 | 9 | 0 | 0 |
| edit-hook | 17 | 1 | 0 | 0 |
| release-propagation | 0 | 9 | 0 | 0 |
| caller-permissions | 18 | 0 | 0 | 0 |
| maven-family-current | 1 | 0 | 0 | 0 |
| workspace-guard | 6 | 1 | 0 | 0 |
| expo-sdk-guard | 2 | 0 | 0 | 0 |
| turnstile-server-side | 2 | 0 | 0 | 0 |
| email-verification | 2 | 0 | 0 | 0 |
| no-departed-product | 16 | 2 | 0 | 0 |
| no-departed-published | 18 | 0 | 0 | 0 |
| commercial-names | 6 | 0 | 0 | 0 |
| lab-isolation | 17 | 0 | 0 | 0 |
| code-rules-ratchet | 1 | 0 | 0 | 0 |
| code-rules-sg | 7 | 0 | 0 | 0 |
| feature-surfaces | 1 | 2 | 0 | 0 |
| formatter | 9 | 4 | 0 | 0 |
| prepush-format-security | 15 | 3 | 0 | 0 |
| agents-template | 16 | 1 | 0 | 0 |
| journeys | 0 | 3 | 0 | 0 |
| merged-result-tested | 16 | 1 | 0 | 0 |
| main-protected | 22 | 0 | 0 | 0 |
| org-secret-scoped | 22 | 0 | 0 | 0 |
| required-checks-profile | 15 | 2 | 0 | 0 |
| merge-resolution | 14 | 3 | 0 | 0 |
| fail-closed-sg | 6 | 1 | 0 | 0 |
| time-limits | 3 | 15 | 0 | 0 |
| required-checks-report-in-queue | 12 | 5 | 0 | 0 |
| rust-guards | 4 | 0 | 0 | 0 |
| python-guards | 1 | 0 | 0 | 0 |
| sonar-ratchet | 11 | 0 | 0 | 0 |
| no-self-issues | 17 | 1 | 0 | 0 |
| public-no-founder-name | 5 | 0 | 0 | 0 |
| public-no-amount | 4 | 1 | 0 | 0 |
| code-name-hosts-noindex | 2 | 0 | 0 | 0 |
| privacy-officer | 3 | 0 | 0 | 0 |
| product-status-word | 3 | 2 | 0 | 0 |
| one-contact-path | 5 | 0 | 0 | 0 |
| docs-map | 10 | 7 | 0 | 0 |
| adr-internal | 18 | 0 | 0 | 0 |
| rules-register | 0 | 1 | 0 | 0 |
| no-public-email | 4 | 2 | 0 | 0 |
| no-github-packages-url | 17 | 1 | 0 | 0 |
| site-kit-current | 0 | 7 | 0 | 0 |
| site-no-raw-colour | 4 | 3 | 0 | 0 |
| site-bird-from-org | 6 | 1 | 0 | 0 |
| pages-site-shared-workflow | 1 | 4 | 0 | 0 |
| playwright-locked | 16 | 2 | 0 | 0 |
| no-scheduled-url-probe | 17 | 0 | 0 | 0 |
| token-permissions | 18 | 0 | 0 | 0 |
| **all** | **534** | **99** | **0** | **0** |

| repo | commit | failing rules | unknown |
|---|---|---|---|
| .github | c290c27 | dependabot-automerge, formatter, prepush-format-security, required-checks-profile, merge-resolution, time-limits, required-checks-report-in-queue, docs-map, no-github-packages-url, playwright-locked | none |
| folioviv | 2f8047a | agents-anti-slop, release-propagation, feature-surfaces, journeys, time-limits, public-no-amount, product-status-word, no-public-email | none |
| kridoc | 1888e0d | agents-anti-slop | none |
| krizaka-agents | e674bfa | shared-ci, dependabot-automerge, agents-anti-slop, no-departed-product, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits, rules-register | none |
| krizaka-agents-site | a2b022d | time-limits, playwright-locked | none |
| krizaka-blog | 9bfbd40 | release-propagation, time-limits, site-kit-current, site-no-raw-colour | none |
| krizaka-cla-signatures | 80e8eb8 | none | none |
| krizaka-com | 017b84f | agents-anti-slop, release-propagation, time-limits, product-status-word, no-public-email, site-kit-current, site-no-raw-colour, site-bird-from-org | none |
| krizaka-coming-soon | 07589d9 | agents-anti-slop, release-propagation, required-checks-report-in-queue, site-kit-current | none |
| krizaka-infra | edd0f97 | time-limits, no-self-issues, docs-map | none |
| krizaka-internal | b233afa | none | none |
| krizaka-java | 4fb8788 | release-propagation, time-limits, site-kit-current, pages-site-shared-workflow | none |
| krizaka-lab | 0c85ff8 | release-propagation, time-limits, required-checks-report-in-queue, docs-map, site-kit-current, pages-site-shared-workflow | none |
| krizaka-restricted | 916f1a0 | none | none |
| krizaka-rust | d0544b2 | no-inline-sonar, time-limits, required-checks-report-in-queue, docs-map, pages-site-shared-workflow | none |
| krizaka-social | 90e1ff7 | dependabot-automerge, agents-anti-slop, edit-hook, formatter, prepush-format-security, merge-resolution, time-limits, required-checks-report-in-queue, docs-map | none |
| krizaka-template | cd8424f | none | none |
| krizaka-ts | 0f6529f | agents-anti-slop, release-propagation, time-limits, site-kit-current | none |
| krizaka-ui | 6339be1 | agents-anti-slop, release-propagation, formatter, prepush-format-security, fail-closed-sg, time-limits, site-kit-current, site-no-raw-colour, pages-site-shared-workflow | none |
| krizaka-ui-builder | 30cbf0a | agents-anti-slop, workspace-guard, formatter, time-limits, docs-map | none |
| sovkora | 9a800a9 | no-departed-product, feature-surfaces, journeys, time-limits, docs-map | none |
| verikora | 231380c | release-propagation, journeys | none |

Out of scope (paused or archived): krizaka-cla-signatures, krizaka-internal, krizaka-restricted, krizaka-template, krizaka-template-desktop, krizaka-template-web.

Same-day rollout (security rules): security-scan, scorecard, dependabot-config, turnstile-server-side, email-verification, main-protected, org-secret-scoped, token-permissions. The other rules are reported here, never fanned out.

### Family versions

| repo | family versions | behind |
|---|---|---|
| .github | @krizaka/org 1.5.0, @krizaka/architecture 0.2.1 | @krizaka/org 1.5.0 → 1.14.1, @krizaka/architecture 0.2.1 → 0.4.0 |
| folioviv | @krizaka/app-client 0.3.2, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/intl 0.4.1, @krizaka/query 0.3.1, @krizaka/tokens 5.1.2, @krizaka/ui 5.1.2, @krizaka/api-keys 0.3.1, @krizaka/auth 0.14.0, @krizaka/brief 0.1.1, @krizaka/charts 1.0.3, @krizaka/email 1.2.3, @krizaka/email-verification 0.1.1, @krizaka/fonts 0.5.4, @krizaka/org 1.2.0, @krizaka/organize 0.5.1, @krizaka/payments 0.7.2, @krizaka/privacy 0.2.4, @krizaka/rate-limit 0.3.1, @krizaka/realtime 0.2.2, @krizaka/settings 0.7.0, @krizaka/storage 0.11.4, @krizaka/tailwind 5.1.2, @krizaka/webhooks 0.3.4, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.1, @krizaka/db 0.3.1 | @krizaka/config 0.25.0 → 0.29.1, @krizaka/api-keys 0.3.1 → 0.3.2, @krizaka/auth 0.14.0 → 0.14.1, @krizaka/brief 0.1.1 → 0.1.2, @krizaka/org 1.2.0 → 1.14.1, @krizaka/organize 0.5.1 → 0.6.0, @krizaka/payments 0.7.2 → 0.7.3, @krizaka/privacy 0.2.4 → 0.2.5, @krizaka/settings 0.7.0 → 0.7.1, @krizaka/storage 0.11.4 → 0.14.0, @krizaka/webhooks 0.3.4 → 0.3.5, @krizaka/page-audit 0.8.1 → 0.8.3 |
| kridoc | @krizaka/api-keys 0.3.2, @krizaka/audit 0.1.8, @krizaka/auth 0.14.0, @krizaka/config 0.25.0, @krizaka/db 0.3.1, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.4, @krizaka/icons 0.11.0, @krizaka/org 1.12.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.3.1, @krizaka/settings 0.7.1, @krizaka/storage 0.13.0, @krizaka/tailwind 4.16.0, @krizaka/time 0.2.0, @krizaka/tokens 4.16.0, @krizaka/ui 4.16.0 | @krizaka/auth 0.14.0 → 0.14.1, @krizaka/config 0.25.0 → 0.29.1, @krizaka/i18n 0.2.4 → 0.2.9, @krizaka/query 0.3.0 → 0.3.1 |
| krizaka-agents | @krizaka/config 0.20.0 | @krizaka/config 0.20.0 → 0.29.1 |
| krizaka-agents-site | @krizaka/fonts 0.5.4, @krizaka/icons 0.10.1, @krizaka/org 1.12.0, @krizaka/tailwind 5.1.0, @krizaka/tokens 5.1.0, @krizaka/ui 5.1.0 | current |
| krizaka-blog | @krizaka/architecture 0.3.0, @krizaka/charts 1.0.3, @krizaka/config 0.10.0, @krizaka/email 1.2.3, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/org 1.13.0, @krizaka/query 0.3.1, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 5.1.2, @krizaka/tokens 5.1.2, @krizaka/ui 5.1.2 | @krizaka/architecture 0.3.0 → 0.4.0, @krizaka/config 0.10.0 → 0.29.1, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-com | @krizaka/a11y-audit 0.2.0, @krizaka/charts 1.0.3, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/email-verification 0.1.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/org 1.12.0, @krizaka/query 0.3.1, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 5.1.2, @krizaka/time 0.2.0, @krizaka/tokens 5.1.2, @krizaka/ui 5.1.2, @krizaka/visits 0.1.0 | @krizaka/config 0.25.0 → 0.29.1, @krizaka/email-verification 0.1.0 → 0.1.1, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-coming-soon | @krizaka/config 0.25.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.7, @krizaka/org 1.7.0, @krizaka/query 0.3.0, @krizaka/tailwind 4.4.1, @krizaka/tokens 4.4.1, @krizaka/ui 4.4.1 | @krizaka/config 0.25.0 → 0.29.1, @krizaka/fonts 0.5.3 → 0.5.4, @krizaka/i18n 0.2.7 → 0.2.9, @krizaka/org 1.7.0 → 1.14.1, @krizaka/query 0.3.0 → 0.3.1, @krizaka/tailwind 4.4.1 → 5.1.2, @krizaka/tokens 4.4.1 → 5.1.2, @krizaka/ui 4.4.1 → 5.1.2 |
| krizaka-infra | @krizaka/db 0.3.1, @krizaka/visits 0.2.0 | current |
| krizaka-java | @krizaka/config 0.25.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/org 1.14.0, @krizaka/query 0.3.1, @krizaka/tailwind 5.1.2, @krizaka/tokens 5.1.2, @krizaka/ui 5.1.2, krizaka-parent 0.19.6 | @krizaka/config 0.25.0 → 0.29.1 |
| krizaka-lab | @krizaka/charts 1.0.3, @krizaka/config 0.17.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/query 0.3.1, @krizaka/tailwind 5.1.2, @krizaka/tokens 5.1.2, @krizaka/ui 5.1.2 | @krizaka/config 0.17.0 → 0.29.1 |
| krizaka-social | @krizaka/org 1.13.0 | current |
| krizaka-ts | @krizaka/intl 0.4.1, @krizaka/ui 5.1.2, @krizaka/a11y-audit 0.2.0, @krizaka/config 0.4.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/org 1.14.0, @krizaka/query 0.3.1, @krizaka/tailwind 5.1.2, @krizaka/tokens 5.1.2 | @krizaka/config 0.4.0 → 0.29.1 |
| krizaka-ui | @krizaka/config 0.9.1, @krizaka/org 1.1.0, @krizaka/ui-builder 0.4.0, @krizaka/architecture 0.3.0, @krizaka/organize 0.4.0, @krizaka/query 0.3.1, @krizaka/tailwind 5.1.2 | @krizaka/config 0.9.1 → 0.29.1, @krizaka/org 1.1.0 → 1.14.1, @krizaka/architecture 0.3.0 → 0.4.0, @krizaka/organize 0.4.0 → 0.6.0 |
| sovkora | @krizaka/config 0.20.0, @krizaka/i18n 0.2.7, @krizaka/icons 0.5.1, @krizaka/orazaka-design-system 3.4.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/tailwind 4.14.0, @krizaka/tokens 3.30.0, @krizaka/ui 4.0.0, @krizaka/app-config 0.2.2, @krizaka/charts 0.8.0, @krizaka/discovery 0.1.0, @krizaka/intl 0.4.1, @krizaka/orazaka-shared 1.4.0, @krizaka/a11y-audit 0.2.0, @krizaka/auth 0.13.1, @krizaka/fonts 0.5.3, @krizaka/page-audit 0.8.0, @krizaka/settings 0.5.2, @krizaka/storage 0.11.1 | @krizaka/config 0.20.0 → 0.29.1, @krizaka/i18n 0.2.7 → 0.2.9, @krizaka/icons 0.5.1 → 0.11.0, @krizaka/org 0.7.0 → 1.14.1, @krizaka/query 0.3.0 → 0.3.1, @krizaka/tokens 3.30.0 → 5.1.2, @krizaka/ui 4.0.0 → 5.1.2, @krizaka/charts 0.8.0 → 1.0.3, @krizaka/discovery 0.1.0 → 0.1.4, @krizaka/orazaka-shared 1.4.0 → 1.5.0, @krizaka/auth 0.13.1 → 0.14.1, @krizaka/fonts 0.5.3 → 0.5.4, @krizaka/page-audit 0.8.0 → 0.8.3, @krizaka/settings 0.5.2 → 0.7.1, @krizaka/storage 0.11.1 → 0.14.0 |
| verikora | @krizaka/app-client 0.3.2, @krizaka/app-desktop 0.1.3, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/query 0.3.1, @krizaka/tailwind 5.1.2, @krizaka/tokens 5.1.2, @krizaka/ui 5.1.2, @krizaka/app-config 0.2.3, @krizaka/config 0.29.0, @krizaka/discovery 0.1.4, @krizaka/api-keys 0.3.1, @krizaka/audit 0.1.7, @krizaka/auth 0.14.0, @krizaka/brief 0.1.1, @krizaka/charts 1.0.3, @krizaka/contract 0.1.0, @krizaka/coupons 0.1.5, @krizaka/credits 0.1.5, @krizaka/db 0.3.1, @krizaka/email 1.2.3, @krizaka/fonts 0.5.4, @krizaka/intl 0.4.1, @krizaka/org 1.6.0, @krizaka/organize 0.6.0, @krizaka/payments 0.7.2, @krizaka/privacy 0.2.4, @krizaka/rate-limit 0.3.1, @krizaka/settings 0.7.0, @krizaka/sovkora-client 1.0.0, @krizaka/storage 0.12.0, @krizaka/time 0.2.0, @krizaka/webhooks 0.3.4, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.2 | @krizaka/api-keys 0.3.1 → 0.3.2, @krizaka/audit 0.1.7 → 0.1.8, @krizaka/auth 0.14.0 → 0.14.1, @krizaka/brief 0.1.1 → 0.1.2, @krizaka/coupons 0.1.5 → 0.1.6, @krizaka/credits 0.1.5 → 0.1.6, @krizaka/org 1.6.0 → 1.14.1, @krizaka/payments 0.7.2 → 0.7.3, @krizaka/privacy 0.2.4 → 0.2.5, @krizaka/settings 0.7.0 → 0.7.1, @krizaka/sovkora-client 1.0.0 → 1.2.0, @krizaka/webhooks 0.3.4 → 0.3.5, @krizaka/page-audit 0.8.2 → 0.8.3 |
| krizaka-template | @krizaka/config 0.17.0, @krizaka/app-client 0.1.0, @krizaka/app-desktop 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.5.1, @krizaka/tailwind 3.46.0, @krizaka/tokens 3.30.0, @krizaka/ui 3.30.0, @krizaka/intl 0.2.1, @krizaka/pacer 0.2.0, @krizaka/fonts 0.4.0 | @krizaka/config 0.17.0 → 0.29.1, @krizaka/app-client 0.1.0 → 0.3.2, @krizaka/app-desktop 0.1.0 → 0.1.3, @krizaka/i18n 0.2.1 → 0.2.9, @krizaka/icons 0.5.1 → 0.11.0, @krizaka/tailwind 3.46.0 → 5.1.2, @krizaka/tokens 3.30.0 → 5.1.2, @krizaka/ui 3.30.0 → 5.1.2, @krizaka/intl 0.2.1 → 0.4.1, @krizaka/fonts 0.4.0 → 0.5.4 |
