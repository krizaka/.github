# Conformance matrix

Generated 2026-11-18T15:16:19.842Z by https://github.com/krizaka/.github/actions/runs/44332508772 from `docs/standards/rules.json` against main of every active repository of `repos.json`. Machine-readable: [matrix.json](matrix.json).

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
| release-propagation | 0 | 9 | 0 | 0 |
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
| no-self-issues | 15 | 1 | 0 | 0 |
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
| site-kit-current | 0 | 7 | 0 | 0 |
| site-no-raw-colour | 5 | 2 | 0 | 0 |
| site-bird-from-org | 6 | 1 | 0 | 0 |
| pages-site-shared-workflow | 1 | 4 | 0 | 0 |
| playwright-locked | 15 | 1 | 0 | 0 |
| no-scheduled-url-probe | 15 | 0 | 0 | 0 |
| token-permissions | 2 | 14 | 0 | 0 |
| **all** | **434** | **101** | **0** | **0** |

| repo | commit | failing rules | unknown |
|---|---|---|---|
| .github | 8644369 | dependabot-automerge, formatter, prepush-format-security, time-limits, no-github-packages-url, playwright-locked | none |
| folioviv | 72fbb11 | release-propagation, feature-surfaces, agents-template, journeys, time-limits, public-no-amount, product-status-word, no-public-email, token-permissions | none |
| kridoc | 606096c | token-permissions | none |
| krizaka-agents | 92743c2 | shared-ci, dependabot-automerge, agents-anti-slop, no-departed-product, agents-template, merged-result-tested, required-checks-profile, merge-resolution, time-limits, rules-register | none |
| krizaka-blog | f11e900 | release-propagation, agents-template, time-limits, site-kit-current, token-permissions | none |
| krizaka-com | 4547752 | release-propagation, agents-template, time-limits, product-status-word, no-public-email, site-kit-current, site-no-raw-colour, site-bird-from-org, token-permissions | none |
| krizaka-coming-soon | e9a8e60 | release-propagation, required-checks-profile, site-kit-current, token-permissions | none |
| krizaka-infra | 3432df6 | agents-template, time-limits, no-self-issues, docs-map, token-permissions | none |
| krizaka-java | 975f52f | release-propagation, agents-template, time-limits, site-kit-current, pages-site-shared-workflow, token-permissions | none |
| krizaka-lab | 9f21150 | release-propagation, agents-template, time-limits, required-checks-report-in-queue, docs-map, site-kit-current, pages-site-shared-workflow, token-permissions | none |
| krizaka-rust | af4c188 | no-inline-sonar, agents-template, time-limits, required-checks-report-in-queue, docs-map, pages-site-shared-workflow, token-permissions | none |
| krizaka-ts | 65a5870 | release-propagation, agents-template, time-limits, site-kit-current, token-permissions | none |
| krizaka-ui | f30d6d2 | release-propagation, formatter, prepush-format-security, agents-template, fail-closed-sg, time-limits, site-kit-current, site-no-raw-colour, pages-site-shared-workflow, token-permissions | none |
| krizaka-ui-builder | 4f26622 | workspace-guard, formatter, required-checks-profile, time-limits, docs-map, token-permissions | none |
| sovkora | 5e82898 | no-departed-product, feature-surfaces, agents-template, journeys, time-limits, docs-map, token-permissions | none |
| verikora | 8141605 | release-propagation, journeys, token-permissions | none |

Out of scope (paused or archived): krizaka-cla-signatures, krizaka-internal, krizaka-restricted, krizaka-template, krizaka-template-desktop, krizaka-template-web.

Same-day rollout (security rules): security-scan, scorecard, dependabot-config, turnstile-server-side, email-verification, token-permissions. The other rules are reported here, never fanned out.

### Family versions

| repo | family versions | behind |
|---|---|---|
| .github | @krizaka/architecture 0.2.1, @krizaka/org 1.5.0 | current |
| folioviv | @krizaka/app-client 0.3.2, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/intl 0.4.1, @krizaka/query 0.3.1, @krizaka/tokens 4.15.0, @krizaka/ui 4.15.0, @krizaka/api-keys 0.3.1, @krizaka/auth 0.14.0, @krizaka/brief 0.1.1, @krizaka/charts 1.0.2, @krizaka/email 1.2.2, @krizaka/email-verification 0.1.1, @krizaka/fonts 0.5.4, @krizaka/org 1.2.0, @krizaka/organize 0.5.1, @krizaka/payments 0.7.2, @krizaka/privacy 0.2.4, @krizaka/rate-limit 0.3.1, @krizaka/realtime 0.2.2, @krizaka/settings 0.7.0, @krizaka/storage 0.11.4, @krizaka/tailwind 4.15.0, @krizaka/webhooks 0.3.4, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.1, @krizaka/db 0.3.1 | current |
| kridoc | @krizaka/audit 0.1.8, @krizaka/auth 0.14.0, @krizaka/config 0.25.0, @krizaka/db 0.3.1, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.4, @krizaka/icons 0.11.0, @krizaka/org 1.12.0, @krizaka/query 0.3.0, @krizaka/rate-limit 0.3.1, @krizaka/settings 0.7.1, @krizaka/storage 0.13.0, @krizaka/tailwind 4.16.0, @krizaka/time 0.2.0, @krizaka/tokens 4.16.0, @krizaka/ui 4.16.0 | @krizaka/i18n 0.2.4 → 0.2.9 |
| krizaka-agents | @krizaka/config 0.20.0 | @krizaka/config 0.20.0 → 0.28.3 |
| krizaka-blog | @krizaka/architecture 0.3.0, @krizaka/charts 1.0.2, @krizaka/config 0.10.0, @krizaka/email 1.2.2, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/org 1.11.0, @krizaka/query 0.3.1, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 4.16.0, @krizaka/tokens 4.16.0, @krizaka/ui 4.16.0 | @krizaka/config 0.10.0 → 0.28.3, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-com | @krizaka/a11y-audit 0.2.0, @krizaka/charts 1.0.2, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/email-verification 0.1.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/org 1.12.0, @krizaka/query 0.3.1, @krizaka/rate-limit 0.2.0, @krizaka/tailwind 4.16.0, @krizaka/time 0.2.0, @krizaka/tokens 4.16.0, @krizaka/ui 4.16.0 | @krizaka/email-verification 0.1.0 → 0.1.1, @krizaka/rate-limit 0.2.0 → 0.3.1 |
| krizaka-coming-soon | @krizaka/config 0.25.0, @krizaka/fonts 0.5.3, @krizaka/i18n 0.2.7, @krizaka/org 1.7.0, @krizaka/query 0.3.0, @krizaka/tailwind 4.4.1, @krizaka/tokens 4.4.1, @krizaka/ui 4.4.1 | @krizaka/fonts 0.5.3 → 0.5.4 |
| krizaka-java | @krizaka/config 0.25.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.10.1, @krizaka/query 0.3.1, @krizaka/tailwind 4.16.0, @krizaka/tokens 4.16.0, @krizaka/ui 4.16.0, krizaka-parent 0.19.1 | current |
| krizaka-lab | @krizaka/charts 1.0.2, @krizaka/config 0.17.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/query 0.3.1, @krizaka/tailwind 4.16.0, @krizaka/tokens 4.16.0, @krizaka/ui 4.16.0 | @krizaka/config 0.17.0 → 0.28.3 |
| krizaka-ts | @krizaka/intl 0.4.1, @krizaka/ui 4.16.0, @krizaka/a11y-audit 0.2.0, @krizaka/config 0.4.0, @krizaka/fonts 0.5.4, @krizaka/i18n 0.2.9, @krizaka/icons 0.10.1, @krizaka/query 0.3.1, @krizaka/tailwind 4.16.0, @krizaka/tokens 4.16.0 | @krizaka/config 0.4.0 → 0.28.3 |
| krizaka-ui | @krizaka/config 0.9.1, @krizaka/org 1.1.0, @krizaka/ui-builder 0.4.0, @krizaka/architecture 0.3.0, @krizaka/organize 0.4.0, @krizaka/query 0.3.1, @krizaka/tailwind 4.16.0 | @krizaka/config 0.9.1 → 0.28.3, @krizaka/org 1.1.0 → 1.13.0, @krizaka/organize 0.4.0 → 0.6.0 |
| sovkora | @krizaka/config 0.20.0, @krizaka/i18n 0.2.7, @krizaka/icons 0.5.1, @krizaka/orazaka-design-system 3.4.0, @krizaka/org 0.7.0, @krizaka/query 0.3.0, @krizaka/tailwind 4.14.0, @krizaka/tokens 3.30.0, @krizaka/ui 4.0.0, @krizaka/app-config 0.2.2, @krizaka/charts 0.8.0, @krizaka/discovery 0.1.0, @krizaka/intl 0.4.1, @krizaka/orazaka-shared 1.4.0, @krizaka/a11y-audit 0.2.0, @krizaka/auth 0.13.1, @krizaka/fonts 0.5.3, @krizaka/page-audit 0.8.0, @krizaka/settings 0.5.2, @krizaka/storage 0.11.1 | @krizaka/config 0.20.0 → 0.28.3, @krizaka/icons 0.5.1 → 0.11.0, @krizaka/org 0.7.0 → 1.13.0, @krizaka/tokens 3.30.0 → 4.16.0, @krizaka/ui 4.0.0 → 4.16.0, @krizaka/charts 0.8.0 → 1.0.2, @krizaka/discovery 0.1.0 → 0.1.4, @krizaka/orazaka-shared 1.4.0 → 1.5.0, @krizaka/auth 0.13.1 → 0.14.1, @krizaka/fonts 0.5.3 → 0.5.4, @krizaka/page-audit 0.8.0 → 0.8.3, @krizaka/settings 0.5.2 → 0.7.1, @krizaka/storage 0.11.1 → 0.14.0 |
| verikora | @krizaka/app-client 0.3.2, @krizaka/app-desktop 0.1.3, @krizaka/i18n 0.2.9, @krizaka/icons 0.11.0, @krizaka/query 0.3.1, @krizaka/tailwind 4.16.0, @krizaka/tokens 4.16.0, @krizaka/ui 4.16.0, @krizaka/app-config 0.2.2, @krizaka/config 0.25.0, @krizaka/discovery 0.1.4, @krizaka/api-keys 0.3.1, @krizaka/audit 0.1.7, @krizaka/auth 0.14.0, @krizaka/brief 0.1.1, @krizaka/charts 1.0.2, @krizaka/coupons 0.1.5, @krizaka/credits 0.1.5, @krizaka/db 0.3.1, @krizaka/email 1.2.2, @krizaka/fonts 0.5.4, @krizaka/intl 0.4.1, @krizaka/org 1.6.0, @krizaka/organize 0.6.0, @krizaka/payments 0.7.2, @krizaka/privacy 0.2.4, @krizaka/rate-limit 0.3.1, @krizaka/settings 0.7.0, @krizaka/sovkora-client 1.0.0, @krizaka/storage 0.12.0, @krizaka/time 0.2.0, @krizaka/webhooks 0.3.4, @krizaka/a11y-audit 0.2.0, @krizaka/page-audit 0.8.2 | current |
