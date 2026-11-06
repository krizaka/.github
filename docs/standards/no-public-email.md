# No Krizaka e-mail address on a public page

<!-- summary: No site or app shows an address at our domains; Support and Contact lead to the contact form of krizaka.com; two written exceptions. -->

> Oussama, 2026-11-06: no Krizaka e-mail address on any public page of any site or app. Rule `no-public-email`
> ([krizaka-internal#2764](https://github.com/krizaka/krizaka-internal/issues/2764)), checked by the [conformance matrix](conformance.md).

**The rule:** a public page never prints or links an address at `krizaka.com`, `verikora.com`, `folioviv.com`, `sovkora.com` or `kridoc.com`
(a `mailto:` of such an address included). "Support" and "Contact" lead to the contact form of krizaka.com, whose link carries the **kind**
(support, business, other) and the **product**, so every message received says what it is (see `one-contact-path`).

## The two written exceptions

1. **The privacy officer.** The Quebec Act respecting the protection of personal information in the private sector, s. 3.1 (as amended by
   Law 25), requires the title and the contact details of the person in charge to be published on the website. The address stays on the
   privacy pages (a path under `privacy` or `confidentialit…`) and on a message line whose key names privacy.
2. **Data a customer publishes about itself.** A Folioviv shop's own e-mail on its public page and invoices (`publicEmail`) is the customer's,
   not ours. It is built from a variable, never from a literal address of ours.

## What is checked

- The public sources of a site or an app: files under `app/`, `pages/`, `components/`, `src/`, `messages/`, `content/`, `public/`, `lib/`, `locales/`,
  and `llms.txt` / `llms-full.txt`.
- Not checked, because they do not render on a public page: tests, `SECURITY.md`, READMEs and docs, seeds, scripts, API and e-mail
  sender code, env examples, `node_modules`, build output.
- The lists (domains, folders, skipped paths, exceptions) are data in the `check` of the rule in [`rules.json`](rules.json), judged by
  [`scripts/public-email.mjs`](../../scripts/public-email.mjs). A new exception is a change of that data, reviewed.
- Proof: `tests/public-email.test.mjs` with the `pass` and `fail` fixture trees in `tests/fixtures/public-email/`.

## Fix

Replace the address by the contact link. If the address is a sender (`from:`), move it out of the public folders (server code) or read it from the
environment. A repository that cannot follow the rule is declared in `exempt` with its reason, never left red in silence.
