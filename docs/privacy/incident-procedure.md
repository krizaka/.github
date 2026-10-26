# Confidentiality-incident procedure

> One procedure and one register for the company, used by every product. Status: good-faith version, **à valider par l'avocat** (question in [.github#250](https://github.com/krizaka/.github/issues/250)).

## The law, as we read it

*Act respecting the protection of personal information in the private sector*, CQLR c. P-39.1 (Law 25):

- **art. 3.5**: when there is reason to believe an incident occurred, take reasonable measures to reduce the risk of injury and prevent new incidents. If it presents a **risk of serious injury**, notify the Commission d'accès à l'information (CAI) **and** the persons concerned promptly.
- **art. 3.6**: assess the risk of serious injury from the sensitivity of the information, the anticipated consequences of its use, and the likelihood that it is misused (the person in charge of the protection of personal information is consulted).
- **art. 3.7**: a person or body that could reduce the risk may be notified without consent of the person concerned, the notification being recorded.
- **art. 3.8**: keep a **register of every incident**, even without serious risk, and give it to the CAI on request.
- *Regulation respecting confidentiality incidents*, CQLR c. P-39.1, r. 3.1: content of the notices and of the register; the register is kept **at least five years** after the enterprise became aware of the incident.

A *confidentiality incident* is unauthorised access to, use of or communication of personal information, its loss, or any other breach of its protection.

## Roles

- **Person in charge of the protection of personal information** (title published on each site's privacy page): decides the risk assessment and the notices.
- **Engineer on call**: contains and gathers facts.
- Every team member reports a suspicion at once, to the privacy address published on the site.

## Steps

| # | Step | What | Time |
| :--- | :--- | :--- | :--- |
| 1 | Detect | Anyone suspects an incident (alert, report, mistake). Open an incident in the register with the date it became known. | At once |
| 2 | Contain | Cut access, rotate the credentials, stop the flow, keep logs. Record the measures taken. | At once |
| 3 | Assess | Fill the art. 3.6 table below. Decide: serious risk, yes or no. | Within 24 h of knowing |
| 4 | Notify | If serious risk: CAI (the Commission's form) **and** the persons concerned, promptly, with the content the regulation lists. Notify processors' clients (B2B) that we serve as service provider. | Promptly |
| 5 | Record | Complete the register row (all incidents, serious or not). Never store more personal information than the row needs. | Same day |
| 6 | Review | Root cause, fix, test that guards it, update this procedure. | Within 10 days |

### Risk assessment (art. 3.6)

| Factor | Question | Examples in our data |
| :--- | :--- | :--- |
| Sensitivity | How sensitive is the information? | Yomizaka: leases, pay stubs, applicant files (high). Akinaza: clients, appointments, invoices (medium). |
| Consequences | What harm could its use cause? | Identity theft, discrimination in housing, fraud, humiliation. |
| Likelihood | How likely is misuse? | Who obtained it, intent, whether it was encrypted, whether it was recovered. |

### Notice content (regulation r. 3.1, to be checked by the lawyer)

To the CAI: description of the information concerned (or why unknown), circumstances, date or period, date known, number of persons concerned (and in Québec), risk-of-serious-injury elements, measures taken and planned, the person to contact. To the persons: the same, plus what they can do to reduce the risk. Templates are kept with the product, in French first.

## The register

The register is **data, not a document**: an append-only store, one row per incident, kept at least five years. Its format is [`incident-register.schema.json`](incident-register.schema.json), validated by `scripts/incident-register.mjs` (used by each product's admin console and by CI). A real register is **never** published; this repository holds the schema and a fictitious drill ([`incident-register.drill.json`](incident-register.drill.json)).

## Product consoles

Each product's admin console can open an incident and writes to the shared register: Yomizaka first, then Akinaza (tracked in the product repositories). Until then an incident is recorded by a row validated with the script.

## Drill

One fictitious incident is recorded end to end on dev, then marked `drill: true`; the example file is that drill. Repeat once a year and after any change of this procedure.
