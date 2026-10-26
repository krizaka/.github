# ISO/IEC 27001 readiness (ISMS)

> Status: readiness work in progress (draft). Legal references **à valider par l'avocat**. Source: [.github#162](https://github.com/krizaka/.github/issues/162).

Goal: be ready for ISO/IEC 27001:2022, then decide whether to certify (a decision for management: body, cost, Stage 1 and 2 audits, timeline).

| Item | Where | State |
| :--- | :--- | :--- |
| Statement of Applicability (93 Annex A controls, as data) | [`soa.json`](soa.json) | Started: mapped controls filled, the rest `to-assess` |
| Risk register (as data) | [`risk-register.json`](risk-register.json) | Started: five initial risks |
| Security policy | [`security-policy.md`](security-policy.md) | Draft |
| Incident management | [incident procedure](../../privacy/incident-procedure.md) | Draft |
| Secure development | [`docs/standards/rules.md`](../../standards/rules.md) | Applied |
| Supply chain | [`docs/standards/supply-chain.md`](../../standards/supply-chain.md) | Applied |
| Asset inventory, access control and key rotation, supplier management, continuity and tested restore | to write | Open |
| Internal audit, management review, evidence automation | to write | Open |

`tests/isms.test.mjs` keeps the SoA complete: 37 organizational, 8 people, 14 physical and 34 technological controls, each with a status; an excluded control has a reason, an applied or partial one has evidence; risks reference known controls and have a computed score.

## Remaining acceptance (from the issue)
SoA with no `to-assess`, every applicable control with an owner and evidence, one restore test and one incident drill done (the drill: [incident register drill](../../privacy/incident-register.drill.json)).
