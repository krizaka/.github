# Information security policy (draft)

> ISO/IEC 27001:2022 clause 5.2 / Annex A 5.1. Status: draft, **à valider par l'avocat** for the legal references; the policy is approved by management at the first management review.

## Purpose and scope
Protect the confidentiality, integrity and availability of the information of Krizaka and of its users, across the products in production, their infrastructure, the code organization and the company processes.

## Principles
1. **Least privilege.** Access is given by role, reviewed, and removed when no longer needed; machine access uses short-lived, narrowly scoped tokens.
2. **Secrets never in code.** Credentials live in a secret store, are rotated, and are blocked from commits by a guard.
3. **Secure by default in development.** Clean architecture, tests first, review, required checks on every change (`docs/standards/`).
4. **Personal information is minimised and purged** under Law 25 (CQLR c. P-39.1); incidents follow [the incident procedure](../../privacy/incident-procedure.md).
5. **Suppliers are chosen and reviewed** for their security and for where data is processed.
6. **Backups are tested.** A restore is proven, not assumed.
7. **Continual improvement.** Internal audit and management review at least yearly; findings become issues.

## Classification
Four classes: **public** (the repositories, the sites), **internal** (configuration, plans), **confidential** (contracts, figures, credentials), **personal information** (Law 25). Confidential and personal information never go into a repository: every repository is public.

## Acceptable use and remote work
Company accounts are used for company work; AI agents act only through their GitHub App identities and pull requests. Work is remote: disks encrypted, screens locked when away, updates automatic, a password manager, no removable media with personal information, no public network without a VPN. Equipment is repaired only after its disk is wiped or removed. When someone leaves: accounts, tokens and devices are returned or revoked the same day.

## Roles
Management approves this policy and the risk treatment. The security lead owns the ISMS and the evidence. Everyone reports a suspected incident at once.

## Review
Yearly, and after any significant incident or change.
