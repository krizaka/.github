# Who owns what Krizaka creates — authorship, AI assistance, the human trail

> Status: good-faith version, **à valider par l'avocat** (questions in [.github#250](https://github.com/krizaka/.github/issues/250)). Builds on [ADR-012](../adr/ADR-012-licensing-libraries-open-products-fair-source.md) and [ip-split.md](ip-split.md).

## The chain of title

Krizaka can license or sell only what it owns. Each link of the chain is written:

| Who creates | How Krizaka owns it | Where |
| :--- | :--- | :--- |
| Oussama, founder | A written **assignment** of his existing and future works on Krizaka to the company, and a waiver of moral rights (*Copyright Act* ss. 13(4), 14.1). He is not an employee « under a contract of service », so s. 13(3) alone does not cover him | Private template, `~/Documents/krizaka/docs/legal/` (to sign) |
| An employee | The employer is the first owner of works made in the course of employment (s. 13(3)); the contract adds the moral-rights waiver | Employment contract (when there is one) |
| A subcontractor | A written assignment and a moral-rights waiver signed **before** any work (B64, [ip-split.md](ip-split.md) decision 4 and clause 6) | Private subcontracting template |
| An external contributor to a library | Their contribution is licensed under Apache-2.0 (s. 5), with the DCO sign-off | [CONTRIBUTING.md](../../CONTRIBUTING.md) |
| An external contributor to a product | The Krizaka CLA: a broad licence with the right to relicense | CLA PR (`needs-oussama`), [ADR-012](../adr/ADR-012-licensing-libraries-open-products-fair-source.md) §4 |
| An AI agent directed by Oussama | See below: the human author is Oussama, and his rights are assigned to Krizaka | This page |

## AI-assisted work — Krizaka's position

Most commits of the org are written by AI agents (`krizaka-agents[bot]`, with Claude as co-author), directed by Oussama.

**The law.** The *Copyright Act* (R.S.C. 1985, c. C-42, s. 5) protects *original* works. In *CCH Canadian Ltd. v. Law Society of Upper Canada*, 2004 SCC 13, the Supreme Court held that an original work is one that results from the author's **exercise of skill and judgment**, which must not be so trivial as to be a purely mechanical exercise. The Act presumes a human author (term of protection tied to the author's life, s. 6; moral rights, s. 14.1). Canada has no provision for works made by a machine alone, and no court has yet decided the question for AI-assisted code. CIPO registered a work naming an AI as co-author in 2021 (registration 1188619), but registration in Canada is not examined and proves nothing on originality.

**Our position.** A tool does not author. The agents are tools, like a compiler or an IDE; what is original in Krizaka's code is the result of Oussama's skill and judgment exercised **through** them:

1. **Direction** — he chooses the problem, the product, the architecture and the constraints (issues, ADRs, `AGENTS.md`, the design sessions). These are choices among many possible expressions, not ideas alone.
2. **Selection and arrangement** — he decides which proposals are kept, rejected or rewritten; the structure of each repository (its decomposition, names, rules, ratchets) is his.
3. **Review and correction** — he reads, comments, asks for changes, and approves or merges. Nothing reaches `main` without his decision (branch protection; agents open and push, only his login approves and merges).

Where that trail exists, the work is his, and through the assignment, Krizaka's. Where a fragment is purely mechanical (a generated lockfile, a formatter's output, a boilerplate an agent produced alone with no human choice), it may have no copyright at all — but it then belongs to no one else either, and the arrangement around it is still protected. Trade secret, contract (the CLA, the terms of use, the FSL) and trademark law protect what copyright might not.

**What this does not claim.** We do not claim that an AI is an author, nor that the agents' provider holds any right in the output (the provider's terms assign or leave the output to the user; to be confirmed for each provider, lawyer question).

## The human trail — how to keep it (every repository)

The trail is the evidence of authorship. It costs nothing if it is kept as we work:

1. **Every change starts from an issue** written or accepted by Oussama: the problem, the direction, the decision.
2. **Every structural choice is an ADR or a decision in the issue**, with what was chosen, what was refused and why.
3. **Every PR body says what was decided by whom**: « Direction: Oussama (issue #n) », and the choices the agent made inside that direction.
4. **Review comments and requested changes stay on the PR** (never resolved by deleting them); squash merges keep the PR link in the commit.
5. **Agents commit as `krizaka-agents[bot]` with a `Co-Authored-By:` trailer naming the model**; Oussama approves and merges with his own login. The two identities are never mixed.
6. **Nothing is pasted from a third party** (code, text, image) without its licence being compatible and named in the PR.
7. **Prompts that shaped a product are kept** in the repository's design notes or the private company folder, not thrown away.

## Questions for the lawyer (in #250)

- Under *CCH* (2004 SCC 13), is Oussama's direction, selection and review enough for him to be the author of agent-written code, and is the assignment to Krizaka then enough for clean title?
- If a fragment has no author, can Krizaka still enforce the FSL and the CLA on the repository as a whole (compilation, s. 2 « compilation »)?
- Do the AI providers' terms leave Krizaka every right in the output, and do they claim any licence back?
- Should the founder assignment cover works made before the company was incorporated (acts before the legal person was constituted, C.c.Q. arts. 319-320)?
