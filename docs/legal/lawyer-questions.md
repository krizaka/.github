# Questions for the single lawyer review

> Mirror of [.github#250](https://github.com/krizaka/.github/issues/250), the source of truth for the checklist. Status of every answer: **à valider par l'avocat**. A new legal question is added to the issue first, then here.

How to add one: a row in the right table with the topic, the law cited (statute, section), the good-faith version we run, the question, and the issue that holds the facts.

## Company (cross-cutting)

| Topic | Law cited | Good-faith version we run | Question | Issue |
| :--- | :--- | :--- | :--- | :--- |
| Confidentiality incidents | *Act respecting the protection of personal information in the private sector*, CQLR c. P-39.1, arts. 3.5-3.8; Regulation, CQLR c. P-39.1, r. 3.1 | [Incident procedure and register](../privacy/incident-procedure.md) | Does our reading of « risk of serious injury » match the Commission's practice for our data? Are the notice templates complete? | .github#249 |
| Services IP | *Copyright Act*, R.S.C. 1985, c. C-42, ss. 13(3), 13(4), 14.1; C.c.Q. arts. 2098 ff. | [Background / Foreground split](ip-split.md) | Enforceable in Québec as written? Is the moral-rights waiver valid in this form? Is « assigned on full payment » sound? Which clauses must be in French? Does the subcontractor chain give clean title? Do improvements to an open-source block made during a paid mandate stay Background IP? | .github#252 |
| Services liability cap | C.c.Q. arts. 1474, 2100 | A cap in the private services template | Is the cap enforceable for a contract of enterprise between businesses? | .github#252 |
| Conditions of krizaka.com | C.c.Q. art. 3149; Code of Civil Procedure art. 33; Charter of the French language art. 55; CPA (notice of changes) | Rewritten conditions page | Courts and forum, the language clause, notice of changes for paid consumer contracts | krizaka-com#405 |
| Liability | C.c.Q. arts. 1435-1437, 1474 | Limitation clause in each product's terms | Enforceable in a contract of adhesion? Governing-law and venue clause valid against a consumer? | .github#250 |
| Commercial e-mails | *CASL*, S.C. 2010, c. 23, ss. 6, 10(9)(b) | Write only to published business addresses, about the business role, with identity and unsubscribe | Is implied consent enough? | krizaka-com#329 |
| Privacy officer and policy | P-39.1 arts. 3.1-3.2, 8 | Officer's title published; policy on each site | Is the published content complete? | krizaka-com#16 |
| Language | *Charter of the French language*, CQLR c. C-11 (as amended by Law 96), arts. 52, 55, 57 | French first, English on choice | Which contract clauses must be in French; does the online flow satisfy art. 55? | .github#252 |
| ISO 27001 / 27701 | P-39.1 (Law 25); GDPR where it applies | [ISMS](../security/isms/README.md) and [PIMS](../privacy/pims/README.md) readiness | Controller / processor roles per product; processor terms template | .github#162, #163 |
| Processor terms | P-39.1 art. 18.3 | [DPA public template](../privacy/pims/dpa-template.md) | Is the template sufficient for B2B clients? | .github#163 |
| Product licence | *Copyright Act* ss. 3, 13(4), 27; C.c.Q. arts. 1378 ff. | [ADR-012](../adr/ADR-012-licensing-libraries-open-products-fair-source.md): FSL-1.1-ALv2 from a NOTICE commit, earlier commits Apache-2.0 | Is FSL enforceable in Québec, is « Competing Use » clear enough, does a NOTICE at a commit separate the two licences, does free internal self-hosting imply any warranty (C.c.Q. arts. 1726 ff.)? | .github#250 |
| Contributor licence (CLA) | *Copyright Act* s. 13(4) | A licence to Krizaka with the right to relicense, the contributor keeps the copyright; DCO for the libraries | Is a licence (not an assignment) enough to sell a commercial or white-label licence of a product with external contributions? Is the click-to-sign valid (C.c.Q. art. 1385; *Act to establish a legal framework for information technology*, CQLR c. C-1.1)? | .github#250 |
| Founder assignment | *Copyright Act* ss. 13(3), 13(4), 14.1; C.c.Q. arts. 319-320 | A signed assignment of existing and future works, moral-rights waiver (private template) | Does it cover works made before incorporation and future works validly; is the waiver valid in this form? | .github#250 |
| AI-assisted authorship | *Copyright Act* s. 5; *CCH Canadian Ltd. v. Law Society of Upper Canada*, 2004 SCC 13 | [ai-authorship.md](ai-authorship.md): Oussama's direction, selection and review make him the author; the trail is kept | Is that enough for authorship of agent-written code; can Krizaka enforce the licence on the whole repository if fragments have no author; do the AI providers' terms leave every right to Krizaka? | .github#250 |
| Trademarks | *Trademarks Act*, R.S.C. 1985, c. T-13, ss. 7, 16, 30 | [TRADEMARKS.md](../../TRADEMARKS.md); filings listed in the private folder | Clearance of each name, the classes and the goods and services wording, ownership of marks used before incorporation | .github#250 |
| Model weights | Licences of the weights (CreativeML OpenRAIL-M, CC-BY-NC-4.0) | [Licence audit](licence-audit-2026-10.md) finding 1: non-commercial weights refused in production | Must the OpenRAIL-M use restrictions be repeated in our terms of use? | .github#250 |
| Terms of use: IP and acceptable use | *Copyright Act* s. 27; C.c.Q. arts. 1435-1437, 1474 | Yomizaka and Akinaza terms to gain an « intellectual property and acceptable use » section | Wording of the reservation of rights, no resale or white-label, no automated extraction, no circumvention of quotas, consistent with source-available code | yomizaka#439, akinaza#409 |

## Products

The product tables (Yomizaka, Akinaza, Orazaka) live in the issue; they are not copied here to avoid two sources of truth. The Akinaza terms of use (akinaza#379) carry eight questions of their own, listed in a comment on the issue: consumer or business, the citations, price changes on a renewed subscription, refunds, the liability cap, holding no funds, the founder price, click-through acceptance.

## Done when

Every line is answered, the answer is applied in its issue through a PR, and each product's legal pages carry « reviewed on <date> ».
