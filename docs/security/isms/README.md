# ISO/IEC 27001 readiness (ISMS)

> Status: readiness work in progress (draft). Legal references **à valider par l'avocat**. Source: [.github#162](https://github.com/krizaka/.github/issues/162).

Goal: be ready for ISO/IEC 27001:2022, then decide whether to certify (a decision for management: body, cost, Stage 1 and 2 audits, timeline).

Readiness is a gap analysis and a plan: Krizaka is **not** certified and does not say so.

| Item | Where | State |
| :--- | :--- | :--- |
| Statement of Applicability (93 Annex A controls, as data) | [`soa.json`](soa.json) | Gap analysis done (2026-10-26): 7 applied, 56 partial, 18 gap, 12 excluded; each partial or gap control has a plan |
| Risk register (as data) | [`risk-register.json`](risk-register.json) | Started: five initial risks |
| Security policy (with classification, acceptable use, remote work) | [`security-policy.md`](security-policy.md) | Draft |
| Asset inventory (classes pointing to generated sources) | [`asset-inventory.json`](asset-inventory.json) | Draft |
| Access control and credential rotation | [`access-control.md`](access-control.md) | Draft; first access review planned |
| Supplier register | [`supplier-register.json`](supplier-register.json) | Draft; terms and regions to collect (.github#285) |
| Continuity and backups | [`continuity.md`](continuity.md) | Restore test **planned** (krizaka-infra#15) |
| Incident management | [incident procedure](../../privacy/incident-procedure.md), [notices](../../privacy/incident-notices.md) | Draft; drill done on file; consoles yomizaka#418, akinaza#392 |
| Secure development | [`docs/standards/rules.md`](../../standards/rules.md) | Applied |
| Supply chain | [`docs/standards/supply-chain.md`](../../standards/supply-chain.md) | Applied |
| Internal audit, management review | [`internal-audit.md`](internal-audit.md), [`management-review.md`](management-review.md) | Templates |
| Certification decision | .github#284 | Management's, later |

`tests/isms.test.mjs` keeps the SoA complete: 37 organizational, 8 people, 14 physical and 34 technological controls, each with a status; an excluded control has a reason, an applied or partial one has evidence; risks reference known controls and have a computed score.

## What is left
Close the `gap` controls (each has its plan in the SoA), one tested restore (krizaka-infra#15), the supplier terms (.github#285), the first internal audit and management review, then the certification decision (.github#284).
