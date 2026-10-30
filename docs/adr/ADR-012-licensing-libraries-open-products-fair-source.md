# ADR-012 — Libraries stay Apache-2.0, products move to the Functional Source License

- **Status:** Accepted for the libraries (nothing changes). **Proposed** for the products: one licence PR per product repository, labelled `needs-oussama`, merged only by Oussama. Good-faith version, **à valider par l'avocat** ([.github#250](https://github.com/krizaka/.github/issues/250)).
- **Date:** 2026-10-26
- **Builds on:** [`docs/legal/ip-split.md`](../legal/ip-split.md) (Background / Foreground IP, B64, .github#252), Orazaka's ADR-049 (open-core split: commercial packs live in a private repository).

## Context

Every repository of the `krizaka` org is public and Apache-2.0, the products included. Krizaka earns its money by **operating** those products (Yomizaka, Akinaza, Orazaka as a service) and by services mandates. Apache-2.0 lets anyone take the product code and run a competing hosted service, with no obligation back. Three facts frame what we can do:

1. **A grant already given cannot be taken back.** Apache-2.0 s. 2 is perpetual and irrevocable: every commit published so far stays Apache-2.0 for whoever received it. A new licence applies only to the commits that follow the change.
2. **Apache-2.0 grants no trademark rights** (s. 6). Our names and birds are protected by trademark law, not by the code licence ([TRADEMARKS.md](../../TRADEMARKS.md)).
3. **The services contract relies on the libraries being Apache-2.0** ([ip-split.md](../legal/ip-split.md), decision 2): the client's licence on Background IP *is* the Apache-2.0 grant. Changing a library's licence would break every services contract.

## Decision

### 1. The libraries stay Apache-2.0

| Repository | Why it stays open |
| :--- | :--- |
| `krizaka-ui`, `krizaka-ts`, `krizaka-build`, `krizaka-platform-kit`, `krizaka-tauri-kit`, `krizaka-lab` (formerly krizaka-motion) | Adoption; Background IP of every services mandate |
| `krizaka-billing`, `krizaka-users`, `krizaka-notifications`, `krizaka-accounts` | Building blocks named in the services contract (ip-split.md) or shared by every product |
| `orazaka-packs`, `orazaka-contracts`, `orazaka-cli`, `orazaka-ui-kit`, `orazaka-build`, `orazaka-edge` | The pack format, the API contracts, the CLI and the parent: what an integrator or a client needs to call Orazaka; `orazaka-packs` is Background IP |
| `template-*`, `krizaka-com`, `krizaka-blog`, `krizaka-infra`, `.github` | Templates, sites and governance; their content is covered by the trademark policy |

Contributions to the libraries: the [Developer Certificate of Origin](https://developercertificate.org) (`Signed-off-by:`), no CLA (Apache-2.0 s. 5 already licenses the contribution inbound = outbound).

### 2. The products move to FSL-1.1-ALv2, from the commit that changes the licence

| Repository | Product |
| :--- | :--- |
| `yomizaka`, `akinaza` | The products and their sites (dev.yomizaka.com, Akinaza's shop pages) |
| `orazaka` (workspace), `orazaka-ai-engine`, `orazaka-studio`, `orazaka-job-service`, `orazaka-knowledge-service`, `orazaka-conversation-service`, `orazaka-automation-service`, `orazaka-worker-media`, `orazaka-web-client`, `orazaka-mobile-client` | The Orazaka engine operated as a service, and its clients |

The **Functional Source License 1.1, Apache-2.0 future licence** ([fsl.software](https://fsl.software), SPDX `FSL-1.1-ALv2`) lets anyone read, run, modify and redistribute the code for any purpose **except a Competing Use** (offering it to others as a commercial product or service that substitutes for ours), and **each version turns into Apache-2.0 two years after it is published**.

#### Why FSL, and not BUSL or ELv2

| | FSL-1.1-ALv2 | BUSL-1.1 | ELv2 |
| :--- | :--- | :--- | :--- |
| Forbids a competing hosted service | Yes (Competing Use, defined in the text) | Only through an « Additional Use Grant » we would write ourselves | Yes (« provide as a managed service ») |
| Parameters we must draft | None: one standard text | Additional Use Grant, Change Date, Change License: custom legal drafting, the part most likely to be wrong | None |
| Becomes open source | Every version, after 2 years, to Apache-2.0 | After up to 4 years, to the Change License | Never |
| Internal use and self-hosting by a customer | Allowed | Depends on our grant | Allowed |
| Licence-key clause | No | No | Yes (forbids circumventing licence keys; we have none) |
| Fit with « we do open source » | Strong: the delay is short and the target is our own Apache-2.0 | Medium | Weak |

**FSL is chosen** because it protects the one thing we need protected (the hosted business) with a standard, unedited text, and because it keeps the open-source promise: the code still reaches Apache-2.0, two years late. BUSL would ask us to draft the clause that matters most; ELv2 never opens and carries a clause we do not need.

#### What FSL does **not** protect, and how we cover it

- **A customer may self-host a product for its own internal use, for free** (FSL Permitted Purpose 1). Our revenue is the hosted service, its operation, support and the services mandates — not a self-hosting fee. If a self-hosting licence is ever sold, it is a separate commercial licence (and a lawyer question).
- **An operator who resells the engine under its own brand** (the white-label lab, .github#255) is a Competing Use: it needs a commercial licence from Krizaka. That licence is the white-label contract, with the IP split of ip-split.md.
- **Versions older than two years are Apache-2.0** for everyone. The protection is the lead time of current versions, not the old code.
- **The names and marks** are never licensed ([TRADEMARKS.md](../../TRADEMARKS.md)).

### 3. Some product parts should not be public at all (Oussama's decision)

A source-available licence still shows the code. What is a business asset by its *content*, not its code, belongs in a private repository. Changing a repository's visibility is **Oussama's call**; this ADR lists, it does not do:

| Candidate | What it holds | Proposal |
| :--- | :--- | :--- |
| Yomizaka's and Akinaza's rule sets and domain packs (`orazaka-packs/tenant-screening-qc`, `realestate-studio`, `privacy-law25`, `document-validation`, `identity-document-check`, and the encoded Québec rules) | The prompts, rule tables and fixtures that are the product's judgement | Future versions move to the private `orazaka-packs-cloud` that Orazaka's ADR-049 already foresees; `orazaka-packs` keeps the format, `echo-toolkit` and generic packs. The published commits stay Apache-2.0 |
| `krizaka-infra` | Infrastructure as code of the running services | Private: the topology of production is a security asset (ISO/IEC 27001 A 8.9), not a library |
| Customer data, prices, contracts | Never in a repository | Already the rule ([docs/legal/README.md](../legal/README.md)) |

### 4. Contributions to a product: a CLA

Krizaka must be able to relicense a product (commercial licence, white-label, a future change of licence), which DCO alone does not allow. External contributions to an FSL repository need the **Krizaka Individual / Entity Contributor Licence Agreement** — a broad, perpetual, irrevocable licence to Krizaka with the right to sublicense and relicense, the contributor keeping their copyright. The CLA text and its check are their own PR (`needs-oussama`); until it is merged, product repositories accept no external code contribution. Internal work (Oussama, agents he directs, subcontractors) is covered by the founder assignment, employment (*Copyright Act* s. 13(3)) and the subcontractor assignment of ip-split.md (decision 4).

### 5. What each licence PR carries

`LICENSE.md` (the FSL text, `Copyright 2026 Technologies Krizaka Inc.`), the Apache-2.0 text kept as `LICENSE-APACHE` for the earlier commits, a `NOTICE` that says the change starts at the commit that introduces it and names the last Apache-2.0 commit, the README badge and « License » section, the licence field of every manifest (`package.json`, `Cargo.toml`, `pom.xml`, `pyproject.toml`), and a link to TRADEMARKS.md. No repository uses SPDX file headers today; none are added.

### 6. Third-party licences

Every product SBOM is checked against the policy of [`actions/licence-check`](../../actions/licence-check/policy.json): strong and network copyleft (GPL, AGPL, SSPL, EUPL), non-commercial and anti-competition licences fail; permissive and weak copyleft pass; anything unknown is reported. The audit of 2026-10-26 is [`docs/legal/licence-audit-2026-10.md`](../legal/licence-audit-2026-10.md).

## Consequences

- Sites and READMEs stop calling the products « open source »: they are « source-available, Apache-2.0 after two years » (Fair Source). The libraries remain open source. krizaka.com's open-source page lists the libraries only.
- The Scorecard « License » check still passes (a licence file is detected); its row in [supply-chain.md](../standards/supply-chain.md) now says « Apache-2.0 or FSL-1.1-ALv2 per ADR-012 ».
- A product that depends on a library: fine (Apache-2.0 into FSL). A library may **never** depend on a product (FSL into Apache would contaminate the library's users). `orazaka-edge` stays a library for that reason.
- Reversible: a product can go back to Apache-2.0 at any time (a wider grant). The reverse never applies to what is already published.

## Questions for the lawyer (in #250)

- Is FSL-1.1-ALv2 enforceable in Québec as a licence of a work (*Copyright Act* ss. 3, 13(4) and 27; C.c.Q. arts. 1378 ff.), and is « Competing Use » clear enough to be relied on against a competitor?
- Is the change of licence by a NOTICE at a given commit enough to separate Apache-2.0 versions from FSL versions?
- Is the CLA (licence with the right to relicense, not an assignment) enough for Krizaka to sell a commercial licence of a product that contains external contributions?
- Does a customer's free internal self-hosting under FSL create any implied warranty or support obligation (C.c.Q. arts. 1726 ff.)?
