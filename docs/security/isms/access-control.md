# Access control and credential rotation

> ISO/IEC 27001:2022 Annex A 5.15–5.18, 8.2, 8.5, 8.24. Status: draft, **à valider par l'avocat** for the legal references. No secret, account id or value is ever written here: this file names classes and rules.

## Identities

| Identity | Used for | Rule |
| :--- | :--- | :--- |
| The founder's GitHub login | Approve, merge, administer | Multi-factor authentication; never used by an agent |
| GitHub Apps (`krizaka-agents`, `orazaka`) | Agents push, comment, open pull requests | Installation tokens, short-lived, scoped per repository |
| Supplier consoles (hosting, CDN, GPU, payments, e-mail) | Operate the services | One named account each, multi-factor authentication (to verify and record, A 8.5) |
| Service tokens between apps | An admin console calling its product | One token per pair, stored as a secret of the app, rotated on the calendar below |

## Credential classes and rotation

| Class | Stored in | Rotated | And at once when |
| :--- | :--- | :--- | :--- |
| Database credentials | The host's secret settings | Yearly (planned) | Any suspicion of exposure — the first real incident was a database credential exposed and rotated |
| Registry tokens (npm, Maven Central) | Trusted publishing where available; else CI secrets | Yearly, or replaced by trusted publishing | A maintainer leaves, a token is printed |
| Payment keys | The host's secret settings | Yearly (planned) | Any exposure |
| GitHub App private keys | The founder's private vault | Yearly (planned) | Any exposure |
| Media storage and CDN keys | CI and host secrets | Yearly (planned) | Any exposure |

A rotation is recorded (date and class, never the value) in the private evidence folder; a rotation caused by an exposure is also an incident ([procedure](../../privacy/incident-procedure.md)).

## Rules

1. Access by role, least privilege; removed when no longer needed ([offboarding](security-policy.md#acceptable-use-and-remote-work)).
2. Secrets never in code: the secret guard blocks commits; `tests/legal-docs.test.mjs` blocks them in `docs/`.
3. A quarterly access review lists every account per supplier and removes the unused ones (planned; the first review is the evidence for A 5.18).
4. Encryption: TLS on every public endpoint; encryption at rest per data store to confirm per supplier ([supplier register](supplier-register.json)).
