# Conformance matrix

Generated 2026-11-19T15:24:46.799Z by https://github.com/krizaka/.github/actions/runs/44553359768 from `docs/standards/rules.json` against main of every active repository of `repos.json`. Machine-readable: [matrix.json](matrix.json).

| rule | pass | fail | unknown | manual |
|---|---:|---:|---:|---:|
| security-scan | 18 | 0 | 0 | 0 |
| shared-ci | 12 | 1 | 0 | 0 |
| no-inline-sonar | 16 | 1 | 0 | 0 |
| scorecard | 13 | 1 | 0 | 0 |
| dependabot-config | 18 | 0 | 0 | 0 |
| dependabot-automerge | 15 | 3 | 0 | 0 |
| visual-regression | 2 | 0 | 0 | 0 |
| agents-anti-slop | 16 | 2 | 0 | 0 |
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
| agents-template | 4 | 13 | 0 | 0 |
| journeys | 0 | 3 | 0 | 0 |
| merged-result-tested | 16 | 1 | 0 | 0 |
| main-protected | 16 | 6 | 0 | 0 |
| org-secret-scoped | 0 | 22 | 0 | 0 |
| required-checks-profile | 13 | 4 | 0 | 0 |
| merge-resolution | 14 | 3 | 0 | 0 |
| fail-closed-sg | 6 | 1 | 0 | 0 |
| time-limits | 3 | 15 | 0 | 0 |
| required-checks-report-in-queue | 13 | 4 | 0 | 0 |
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
| site-no-raw-colour | 5 | 2 | 0 | 0 |
| site-bird-from-org | 6 | 1 | 0 | 0 |
| pages-site-shared-workflow | 1 | 4 | 0 | 0 |
| playwright-locked | 16 | 2 | 0 | 0 |
| no-scheduled-url-probe | 17 | 0 | 0 | 0 |
| token-permissions | 3 | 15 | 0 | 0 |
| **all** | **485** | **148** | **0** | **0** |

| repo | commit | failing rules | unknown |
|---|---|---|---|
| .github | d8dcfe3 | dependabot-automerge, formatter, prepush-format-security, agents-template, org-secret-scoped, required-checks-profile, merge-resolution, time-limits, required-checks-report-in-queue, docs-map, no-github-packages-url, playwright-locked | none |
| folioviv | a675ad8 | release-propagation, feature-surfaces, agents-template, journeys, org-secret-scoped, time-limits, public-no-amount, product-status-word, no-public-email, token-permissions | none |
| kridoc | fcacab2 | org-secret-scoped, token-permissions | none |
| krizaka-agents | 08e3553 | shared-ci, dependabot-automerge, agents-anti-slop, no-departed-product, agents-template, merged-result-tested, org-secret-scoped, required-checks-profile, merge-resolution, time-limits, rules-register | none |
| krizaka-agents-site | 3f244a4 | main-protected, org-secret-scoped, time-limits, playwright-locked, token-permissions | none |
| krizaka-blog | f7e53f7 | release-propagation, agents-template, org-secret-scoped, time-limits, site-kit-current, token-permissions | none |
| krizaka-cla-signatures | 01bde1d | main-protected, org-secret-scoped | none |
| krizaka-com | c94302f | release-propagation, agents-template, org-secret-scoped, time-limits, product-status-word, no-public-email, site-kit-current, site-no-raw-colour, site-bird-from-org, token-permissions | none |
| krizaka-coming-soon | f13a932 | release-propagation, org-secret-scoped, required-checks-profile, site-kit-current, token-permissions | none |
| krizaka-infra | 59823c6 | agents-template, main-protected, org-secret-scoped, time-limits, no-self-issues, docs-map, token-permissions | none |
| krizaka-internal | 92f3a3b | org-secret-scoped | none |
| krizaka-java | 5bfe2d4 | release-propagation, agents-template, org-secret-scoped, time-limits, site-kit-current, pages-site-shared-workflow, token-permissions | none |
| krizaka-lab | 1df3ba6 | release-propagation, agents-template, org-secret-scoped, time-limits, required-checks-report-in-queue, docs-map, site-kit-current, pages-site-shared-workflow, token-permissions | none |
| krizaka-restricted | b9e70d5 | main-protected, org-secret-scoped | none |
| krizaka-rust | ec28fcd | no-inline-sonar, agents-template, main-protected, org-secret-scoped, time-limits, required-checks-report-in-queue, docs-map, pages-site-shared-workflow, token-permissions | none |
| krizaka-social | 28d791e | scorecard, dependabot-automerge, agents-anti-slop, edit-hook, formatter, prepush-format-security, agents-template, main-protected, org-secret-scoped, merge-resolution, time-limits, required-checks-report-in-queue, docs-map | none |
| krizaka-template | 5862094 | org-secret-scoped | none |
| krizaka-ts | 3bdc872 | release-propagation, agents-template, org-secret-scoped, time-limits, site-kit-current, token-permissions | none |
| krizaka-ui | 8aaf075 | release-propagation, formatter, prepush-format-security, agents-template, org-secret-scoped, fail-closed-sg, time-limits, site-kit-current, site-no-raw-colour, pages-site-shared-workflow, token-permissions | none |
| krizaka-ui-builder | 28e0634 | workspace-guard, formatter, org-secret-scoped, required-checks-profile, time-limits, docs-map, token-permissions | none |
| sovkora | 26635db | no-departed-product, feature-surfaces, agents-template, journeys, org-secret-scoped, time-limits, docs-map, token-permissions | none |
| verikora | a4c57f1 | release-propagation, journeys, org-secret-scoped, token-permissions | none |

Out of scope (paused or archived): krizaka-cla-signatures, krizaka-internal, krizaka-restricted, krizaka-template, krizaka-template-desktop, krizaka-template-web.

Same-day rollout (security rules): security-scan, scorecard, dependabot-config, turnstile-server-side, email-verification, main-protected, org-secret-scoped, token-permissions. The other rules are reported here, never fanned out.

### Family versions

| repo | family versions | behind |
|---|---|---|
| .github | @krizaka/org 1.5.0, @krizaka/architecture 0.2.1 | current |
| folioviv | @krizaka/app-client 0.3.2, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/intl 0.4.1, @krizaka/query 0.3.1, @krizaka/tokens 4.17.1, @krizaka/ui 4.17.1, @krizaka/api-keys 0.3.1, @krizaka/auth 0.14.0, @krizaka/brief 0.1.1, @krizaka/charts 1.0.3, @krizaka/email 1.2.3, @krizaka/email-verification 0.1.1, @krizaka/fonts 0.5.4, @krizaka/org 1.2.0, @krizaka/organize 0.5.1, @krizaka/payments 0.7.2, @krizaka/privacy 0.2.4, @krizaka/rate-limit 0.3.1, @krizaka/realtime 0.2.2, @krizaka/settings 0.7.0, @krizaka/storage 0.11.4, @krizaka/tailwind 4.17.1, @krizaka/webhooks 0.3.4, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.1, @krizaka/db 0.3.1 | current |
| kridoc | @krizaka/audit 0.1.8, @krizaka/auth 0.14.0, @krizaka/config 0.25.0, @krizaka/db 0.3.1, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.4, @krizaka/icons 0.11.0, @krizaka/org 1.12.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.3.1, @krizaka/settings 0.7.1, @krizaka/storage 0.13.0, @krizaka/tailwind 4.16.0, @krizaka/time 0.2.0, @krizaka/tokens 4.16.0, @krizaka/ui 4.16.0 | @krizaka/i18n 0.2.4 → 0.2.9 |
| krizaka-agents | @krizaka/config 0.20.0 | @krizaka/config 0.20.0 → 0.29.0 |
| krizaka-agents-site | @krizaka/fonts 0.5.4, @krizaka/icons 0.10.1, @krizaka/org 1.12.0, @krizaka/tailwind 4.15.0, @krizaka/tokens 4.15.0, @krizaka/ui 4.15.0 | current |
| krizaka-blog | @krizaka/architecture 0.3.0, @krizaka/charts 1.0.3, @krizaka/config 0.10.0, @krizaka/email 1.2.3, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/org 1.13.0, @krizaka/query 0.3.1, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 5.1.0, @krizaka/tokens 5.1.0, @krizaka/ui 5.1.0 | @krizaka/config 0.10.0 → 0.29.0, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-com | @krizaka/a11y-audit 0.2.0, @krizaka/charts 1.0.3, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/email-verification 0.1.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/org 1.12.0, @krizaka/query 0.3.1, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 5.1.0, @krizaka/time 0.2.0, @krizaka/tokens 5.1.0, @krizaka/ui 5.1.0, @krizaka/visits 0.1.0 | @krizaka/email-verification 0.1.0 → 0.1.1, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-coming-soon | @krizaka/config 0.25.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.7, @krizaka/org 1.7.0, @krizaka/query 0.3.0, @krizaka/tailwind 4.4.1, @krizaka/tokens 4.4.1, @krizaka/ui 4.4.1 | @krizaka/fonts 0.5.3 → 0.5.4 |
| krizaka-infra | @krizaka/db 0.3.1, @krizaka/visits 0.2.0 | current |
| krizaka-java | @krizaka/config 0.25.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/org 1.14.0, @krizaka/query 0.3.1, @krizaka/tailwind 5.1.0, @krizaka/tokens 5.1.0, @krizaka/ui 5.1.0, krizaka-parent 0.19.2 | current |
| krizaka-lab | @krizaka/charts 1.0.3, @krizaka/config 0.17.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/query 0.3.1, @krizaka/tailwind 5.1.0, @krizaka/tokens 5.1.0, @krizaka/ui 5.1.0 | @krizaka/config 0.17.0 → 0.29.0 |
| krizaka-social | @krizaka/org 1.13.0 | current |
| krizaka-ts | @krizaka/intl 0.4.1, @krizaka/ui 5.1.0, @krizaka/a11y-audit 0.2.0, @krizaka/config 0.4.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/org 1.14.0, @krizaka/query 0.3.1, @krizaka/tailwind 5.1.0, @krizaka/tokens 5.1.0 | @krizaka/config 0.4.0 → 0.29.0 |
| krizaka-ui | @krizaka/config 0.9.1, @krizaka/org 1.1.0, @krizaka/ui-builder 0.4.0, @krizaka/architecture 0.3.0, @krizaka/organize 0.4.0, @krizaka/query 0.3.1, @krizaka/tailwind 5.1.0 | @krizaka/config 0.9.1 → 0.29.0, @krizaka/org 1.1.0 → 1.14.0, @krizaka/organize 0.4.0 → 0.6.0 |
| sovkora | @krizaka/config 0.20.0, @krizaka/i18n 0.2.7, @krizaka/icons 0.5.1, @krizaka/orazaka-design-system 3.4.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/tailwind 4.14.0, @krizaka/tokens 3.30.0, @krizaka/ui 4.0.0, @krizaka/app-config 0.2.2, @krizaka/charts 0.8.0, @krizaka/discovery 0.1.0, @krizaka/intl 0.4.1, @krizaka/orazaka-shared 1.4.0, @krizaka/a11y-audit 0.2.0, @krizaka/auth 0.13.1, @krizaka/fonts 0.5.3, @krizaka/page-audit 0.8.0, @krizaka/settings 0.5.2, @krizaka/storage 0.11.1 | @krizaka/config 0.20.0 → 0.29.0, @krizaka/icons 0.5.1 → 0.11.0, @krizaka/org 0.7.0 → 1.14.0, @krizaka/tokens 3.30.0 → 5.1.0, @krizaka/ui 4.0.0 → 5.1.0, @krizaka/charts 0.8.0 → 1.0.3, @krizaka/discovery 0.1.0 → 0.1.4, @krizaka/orazaka-shared 1.4.0 → 1.5.0, @krizaka/auth 0.13.1 → 0.14.1, @krizaka/fonts 0.5.3 → 0.5.4, @krizaka/page-audit 0.8.0 → 0.8.3, @krizaka/settings 0.5.2 → 0.7.1, @krizaka/storage 0.11.1 → 0.14.0 |
| verikora | @krizaka/app-client 0.3.2, @krizaka/app-desktop 0.1.3, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/query 0.3.1, @krizaka/tailwind 5.1.0, @krizaka/tokens 5.1.0, @krizaka/ui 5.1.0, @krizaka/app-config 0.2.3, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/api-keys 0.3.1, @krizaka/audit 0.1.7, @krizaka/auth 0.14.0, @krizaka/brief 0.1.1, @krizaka/charts 1.0.3, @krizaka/coupons 0.1.5, @krizaka/credits 0.1.5, @krizaka/db 0.3.1, @krizaka/email 1.2.3, @krizaka/fonts 0.5.4, @krizaka/intl 0.4.1, @krizaka/org 1.6.0, @krizaka/organize 0.6.0, @krizaka/payments 0.7.2, @krizaka/privacy 0.2.4, @krizaka/rate-limit 0.3.1, @krizaka/settings 0.7.0, @krizaka/sovkora-client 1.0.0, @krizaka/storage 0.12.0, @krizaka/time 0.2.0, @krizaka/webhooks 0.3.4, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.2 | current |
| krizaka-template | @krizaka/config 0.17.0, @krizaka/app-client 0.1.0, @krizaka/app-desktop 0.1.0, @krizaka/i18n 0.2.1, @krizaka/icons 0.5.1, @krizaka/tailwind 3.46.0, @krizaka/tokens 3.30.0, @krizaka/ui 3.30.0, @krizaka/intl 0.2.1, @krizaka/pacer 0.2.0, @krizaka/fonts 0.4.0 | @krizaka/config 0.17.0 → 0.29.0, @krizaka/app-client 0.1.0 → 0.3.2, @krizaka/app-desktop 0.1.0 → 0.1.3, @krizaka/i18n 0.2.1 → 0.2.9, @krizaka/icons 0.5.1 → 0.11.0, @krizaka/tailwind 3.46.0 → 5.1.0, @krizaka/tokens 3.30.0 → 5.1.0, @krizaka/ui 3.30.0 → 5.1.0, @krizaka/intl 0.2.1 → 0.4.1, @krizaka/fonts 0.4.0 → 0.5.4 |
