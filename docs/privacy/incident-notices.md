# Confidentiality-incident notices — templates

> Status: good-faith templates, **à valider par l'avocat** (question in [.github#250](https://github.com/krizaka/.github/issues/250)). Used by step 4 of the [incident procedure](incident-procedure.md). French first (*Charter of the French language*, CQLR c. C-11); the English version follows on request.
> Law: *Act respecting the protection of personal information in the private sector*, CQLR c. P-39.1, arts. 3.5–3.8, and the *Regulation respecting confidentiality incidents*, CQLR c. P-39.1, r. 3.1 ([LégisQuébec](https://www.legisquebec.gouv.qc.ca/en/document/cr/P-39.1,%20r.%203.1)). We list the elements the regulation asks for in our own words; its text is not copied here.

Fields between `<…>` are filled from the register row of the incident ([schema](incident-register.schema.json)). A filled notice is never committed: it lives with the incident in the product's private store.

## 1. Notice to the Commission d'accès à l'information

Sent through the Commission's own form when it publishes one (the form wins over this template); this list is what we prepare before opening it.

| Element | From the register row |
| :--- | :--- |
| Name of the enterprise and its Québec business number | company identity (private, filled at sending) |
| Person to contact about the incident | the person in charge of the protection of personal information (title, role address) |
| The personal information concerned, or why it cannot be described | `informationConcerned` |
| The circumstances of the incident and, if known, its cause | `description` |
| The date or period of the incident (or an estimate) | `occurredOn` |
| The date the enterprise became aware of it | `knownOn` |
| The number of persons concerned, and how many reside in Québec (or an estimate) | `personsConcerned` |
| Why it presents a risk of serious injury (sensitivity, consequences, likelihood) | `riskAssessment`, `seriousInjuryRisk` |
| The measures taken, or planned, to notify the persons and to reduce the risk | `measures`, `noticesSent` |
| The measures taken, or planned, to prevent a new incident | `measures` |
| Whether a person or body outside Québec that supervises personal information was notified | `noticesSent` (`to: other`) |

An element learned after the notice is sent to the Commission as soon as it is known.

## 2. Notice to the persons concerned

Sent directly (e-mail to the account address, then post if it bounces). A public notice (site banner, press) replaces it only where direct notice would cause excessive hardship, would not reach the persons, or would harm them — decision by the person in charge, recorded in the row.

**Objet : Incident de confidentialité touchant vos renseignements personnels — <produit>**

> Bonjour,
>
> Le <date connue>, nous avons constaté un incident de confidentialité chez <produit> : <circonstances en une phrase>. Il est survenu <date ou période>.
>
> **Ce qui vous concerne :** <renseignements touchés>.
>
> **Ce que nous avons fait :** <mesures prises>. **Ce que nous allons faire :** <mesures prévues>.
>
> **Ce que vous pouvez faire pour réduire le risque :** <conseils concrets : changer le mot de passe, surveiller un relevé, se méfier des courriels qui citent le bail…>.
>
> Pour toute question : <titre du responsable de la protection des renseignements personnels>, <adresse de rôle @krizaka.com>.
>
> Vous pouvez aussi vous adresser à la Commission d'accès à l'information du Québec.

**Subject: A confidentiality incident affecting your personal information — <product>**

> The same content, in English, on request.

## 3. Notice to a business client (when we are its service provider)

When the information belongs to a client for whom we act as service provider (P-39.1 art. 18.3: Yomizaka for a property firm, Akinaza for a shop), we tell the client **without delay** with the elements of section 1; the client, as the enterprise that holds the information, decides its own notices. The [processor terms](pims/dpa-template.md) commit us to it.

## 4. What is never in a notice

No other person's information, no secret or credential, no speculation on the cause beyond what is known, no promise that the risk is zero.
