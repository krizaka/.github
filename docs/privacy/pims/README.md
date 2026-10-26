# ISO/IEC 27701 readiness (PIMS) — Law 25 / GDPR

> Status: good-faith draft, **à valider par l'avocat** (questions in [.github#250](https://github.com/krizaka/.github/issues/250)). Source: [.github#163](https://github.com/krizaka/.github/issues/163). Extends the [ISMS](../../security/isms/README.md).

## Roles per product

| Product | Role | Why |
| :--- | :--- | :--- |
| Yomizaka | **Processor** for a property firm's tenant files; **controller** for its own account and billing data | The firm decides the purposes of the files |
| Akinaza | **Controller** for its shop customers' accounts; **processor / service provider** (P-39.1 art. 18.3) for the shops' clients' information | The shop decides why its clients' data is held |
| Orazaka (open-source engine, dev site) | Controller for its dev-site accounts; engine itself holds nothing by default (`retention.none`) | Runs, uploads and accounts on the dev site |
| krizaka.com | Controller (contact messages) | Minimal data |

## Loi 25 obligations mapped to PIMS controls

| Obligation (CQLR c. P-39.1) | PIMS control area | Where |
| :--- | :--- | :--- |
| Person in charge of personal information published (art. 3.1) | Organisation, roles | Each site's privacy page |
| Privacy impact assessment (art. 3.3) | Risk and PIA | Product issues (yomizaka#365, akinaza#369) |
| Confidentiality incidents and register (arts. 3.5-3.8) | Incident management | [procedure](../incident-procedure.md) |
| Consent (arts. 4, 14) | Conditions for collection | Product copy and flows |
| Retention and destruction (art. 23) | Retention, disposal | [records of processing](records-of-processing.json) |
| Transfers outside Québec (art. 17) | Transfers | Records of processing, supplier DPAs |
| Rights: access, rectification, deletion, portability (arts. 27-30, 28.1) | Data-subject rights | [workflow](rights-requests.md) |
| Service providers (art. 18.3) | Processor obligations | [DPA template](dpa-template.md) |

## Parts

- [`records-of-processing.json`](records-of-processing.json): per product, as data (tested).
- [`rights-requests.md`](rights-requests.md): workflow with the 30-day deadline.
- [`dpa-template.md`](dpa-template.md): public data processing agreement template for B2B clients.
- Retention evidence: each product's purge tests (Orazaka `retention.none`, Yomizaka vault purge, account deletion) are linked from the records once they exist.
- Privacy by design: the feature-request issue template asks « what personal data, why, how long ».

## Left

Records filled for Akinaza and Orazaka beyond the first draft, privacy impact assessments where required (including the credit and screening option), supplier DPAs (hosting, CDN, GPU, payments, e-mail), and the lawyer's read.
