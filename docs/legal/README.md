# Legal and compliance — how Krizaka works

> Status: good-faith version, **à valider par l'avocat** (one review before each product opens to the public).

## The rule

Legal TODOs do not block work. For each legal point we write the best good-faith reading of the law, **cite the statute and the section**, mark it « à valider par l'avocat », and add its question to the single lawyer checklist ([.github#250](https://github.com/krizaka/.github/issues/250), mirrored in [`lawyer-questions.md`](lawyer-questions.md)). One review by a member of the Barreau du Québec (technology, privacy, consumer law) covers everything, before each product opens.

## What goes where

| Kind of document | Where | Why |
| :--- | :--- | :--- |
| Policies, procedures, public templates (no company data) | this repository, `docs/legal/`, `docs/privacy/`, `docs/security/` | Public, reviewable, versioned |
| Contract templates with company data, signed contracts, insurance, figures | `~/Documents/krizaka/docs/legal/` (private, never in a repository) | Company data |
| A public pointer to a private document | this repository: one line saying where it lives, nothing of its content | Findable without leaking |

## Never in this public repository

No address, no NEQ beyond what is already public, no company figures, no personal names, no secrets, no e-mail other than a `@krizaka.com` role address. `tests/legal-docs.test.mjs` fails the build on a postal code, a ten-digit number, a phone number, a foreign e-mail address or a key, and on a document of this folder that lacks the « à valider par l'avocat » marker.

## Index

- [`lawyer-questions.md`](lawyer-questions.md) — every open question, by topic, with the law cited.
- [`ip-split.md`](ip-split.md) — Background IP / Foreground IP for services mandates (.github#252).
- [`../privacy/incident-procedure.md`](../privacy/incident-procedure.md) — confidentiality incidents (.github#249).
- [`../security/isms/`](../security/isms/) and [`../privacy/pims/`](../privacy/pims/) — ISO 27001 / 27701 readiness (.github#162, #163).
