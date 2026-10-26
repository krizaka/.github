# Services mandates — Background IP and Foreground IP

> Public policy and clause skeleton. Status: good-faith version, **à valider par l'avocat** (question in [.github#250](https://github.com/krizaka/.github/issues/250)). No services mandate is signed before the review.
> The contract template itself carries company data and is **private** (`~/Documents/krizaka/docs/legal/`, never in a repository). This file is the public template and the pointer.

## Why

A services offer that promises both « built on the Krizaka standards » and « a full transfer of intellectual property » is contradictory unless the two are split. A full assignment with no split either hands the client the exclusive economic rights to Krizaka's own building blocks, or leaves their ownership ambiguous. Krizaka could lose the right to reuse its libraries, or face a dispute.

## The split

| | Background IP | Foreground IP |
| :--- | :--- | :--- |
| What | Everything that existed before the mandate or is built to be reused across clients: the open-source Krizaka libraries, templates, internal tools, know-how | What is specific to the client: custom screens, its business logic, its data schemas, its content |
| Owner | Krizaka | The client, **when the mandate is fully paid** |
| Client's right | Open-source: the library's own licence (Apache-2.0: perpetual, worldwide, royalty-free). Not open-source: a **perpetual, irrevocable, worldwide, non-exclusive, royalty-free licence** to use, modify and evolve it for the client's own business, including through another supplier | Before full payment: a licence for the work delivered so far. After: assignment of all economic rights |

## Clauses the contract must carry

1. **Definitions** of Background IP and Foreground IP, and an **annex** listing the Background IP used in each mandate.
2. **Licence** on Background IP (above). The contract names the open-source licence and assigns nothing more.
3. **Assignment** of Foreground IP in writing and signed (*Copyright Act*, R.S.C. 1985, c. C-42, s. 13(4)), effective on full payment.
4. **Moral rights**: not assignable, only waivable; an express waiver in favour of the client and its successors (s. 14.1).
5. **Nature of the contract**: contract of enterprise or for services, C.c.Q. arts. 2098 ff., with its own clauses on delivery and acceptance.
6. **Third-party code**: the list of dependencies and their licences; nothing whose licence forbids the client's intended use.
7. **Data**: the client's data is the client's. What Krizaka handles for the client is covered by a data processing annex under Law 25 (P-39.1, art. 18.3) — see the [processor terms template](../privacy/pims/dpa-template.md).
8. **Language**: the *Charter of the French language*, CQLR c. C-11 (Law 96), arts. 55 and 57, governs the language of contracts of adhesion; French version first, English on the client's request.

## Questions for the lawyer (added to #250)

- Is this split enforceable in Québec as written?
- Is the waiver of moral rights valid in this form?
- Is « assigned on full payment », with a licence until then, sound?
- Which clauses must be in French under Law 96?

## Done when

The private template holds the split, the licence clause, the Background IP annex, the moral-rights waiver and the third-party list; the single lawyer review has read it; nothing is signed before then.
