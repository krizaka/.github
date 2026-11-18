# The family-drift guard

The family says the same thing everywhere: the footer, the promise, the member links. `@krizaka/org` is the source; this guard reads what is
**rendered** (krizaka-internal#3920, closing the class of bug of #4008: the sources were right, the sites were not).

The registry is [`family-surfaces.json`](family-surfaces.json): one line per site (`id`, `kind`, `repo`), the org profile README it reads, the
home slots required per kind, the pinned `@krizaka/org` version it compares to. A site or a site repository without a line is itself a drift.

| Reader | Reads | Rules |
| :--- | :--- | :--- |
| `html` (`readFooter`) | the **last** `<footer>` of each live home: links, icon names, text | rows A–E of `footerFor(id)`: family links, the four socials, source / licence / version / release notes, legal links, the line; `footer-absent`, `footer-unexpected-link` (a family address the org does not list for this site) |
| `html` (`readHome`) | the h1, the `data-slot` attributes, the `data-primary` buttons | `home-promise` (h1 = `words.line`), `home-slot` (the slots of its kind), `home-primary` (exactly one) |
| `github-profile` | `profile/README.md` of the org | `profile-unexpected-link` (a link to a member that is not public and live), `profile-promise` (a member named in bold without its `words.line`) |
| `siteLive` | the member's home, both ways | `site-silent` (true and silent), `site-answering` (false and answering) |
| links | every family link of a footer and of the profile | `link-dead` (404 or nothing) |
| registry | `family-surfaces.json` against the org and `repos.json` | `registry-site-missing`, `registry-member-unknown`, `registry-repo-missing`, `registry-repo-unknown` |

`agents` stays out of every public list until agents.krizaka.com answers and its member is public: its line has `"public": false`, it is not read,
and any link to it is a `*-unexpected-link`.

The render contract the homes meet (target spec of #4211, § 4): a slot is an element with `data-slot="<bar|hero|what|proof|start|family|footer>"`,
the one primary button carries `data-primary`.

It runs daily (`.github/workflows/family-drift.yml`) and opens or comments **one internal issue per drift**, titled
`.github · fix(family): <rule>: <subject>`. It never blocks a site's CI. Locally: `node scripts/family-drift.mjs --org-dir <dir with @krizaka/org installed>`.
