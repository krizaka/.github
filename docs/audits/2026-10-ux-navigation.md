# Audit — menus, items and navigation coherence across every Krizaka surface (2026-10)

> Issue: krizaka/.github#215 · Author: Copilot (senior product design / IA pass) · Reviewer: Claude (CTO)
> Status: findings and proposals. Nothing here is decided until Oussama or the CTO files the issues in §5.

## 0 · Scope and method

- **What was read.** The navigation code and its data on the `main` branch of each public repository, on 2026-10-23: krizaka-com, krizaka-ui, krizaka-build, krizaka-ts, krizaka-blog, krizaka-motion, orazaka-web-client, yomizaka, akinaza, orochia, yasakia, yororis, kachizaka. Read only; nothing was changed outside this repository.
- **The shared contract.** These files in `krizaka-ui/packages/ui/src`: `nav-bar/` (`nav-bar.tsx`, `meta.ts`, `product-actions.tsx`), `app-shell/`, `rail-nav/`, `app-header/`, `account-menu/`, `site-footer/`, `sites/sites.ts`, `language-switch/` and `error-page/`. Also the doc page `krizaka-ui/apps/site/content/docs/foundations/navigation.mdx`.
- **The live sites were not visited.** www.krizaka.com, www.orazaka.com and the others could not be resolved from the audit sandbox, so every statement comes from the code. Oussama's screenshot of www.orazaka.com (« Talk to us » in the bar) matches the code; see H1.
- **krizaka-com `AGENTS.md` has no §2.1 and no "NAV-SYS" heading.** The headings jump from §2 (`AGENTS.md:19`) to §2.2 (`:87`). The NAV-SYS rules live in code comments and tests: `lib/nav.ts:1-9`, `app/components/TopNavBar.tsx:3-11`, `app/components/SiteFooter.tsx:15-18`, `tests/nav.test.mjs`. They were taken from there.
- **Citation format.** `repo:path:line`. Inside one surface's section the repo prefix is dropped, and file names are short once the full path is given in that section's "Files" line.
- **Open questions.** Anything I could not prove, or that needs a product decision, is marked **TO VALIDATE (Oussama)**.

Glossary: **bar** is the top `NavBar` of a public site. **Panel** is the phone menu (`NavBar.Mobile`). **Shell** is the signed-in app frame (`AppShell`, or `RailNav` with `AppHeader`). **Primary** is the single filled button at the right of the bar.

---

## 1 · Inventory per surface

Thirteen surfaces were inventoried. Product surfaces have three parts: the site, the app and, where one exists, the console. Labels are written EN / FR.

### 1.1 Shared contract (`@krizaka/ui`) — what every surface is supposed to render

| Topic | What the contract says | Evidence |
| :--- | :--- | :--- |
| Three zones | Brand left · own sections centre · tools right (search, Repo, theme, language, one primary). | `nav-bar/meta.ts:32` |
| Item cap | At most 5 items in the bar. A menu of 3 links or fewer is inlined (`inlineUpTo` 3). | `meta.ts:24`, `:26` |
| Product site standard | Product ▾ · Platforms ▾ · Docs · Pricing. No Family, no badge. | `meta.ts:25` |
| Primary action of a product | `ProductBarActions` renders « Sign in », or « Try » when sign-up is open. Never Contact or « Talk to us »; contact is a footer link. krizaka.com keeps « Contact us ». | `meta.ts:23`; `nav-bar/product-actions.tsx:1-3`, `:20-21`, `:47-61` |
| Language | `NavBar.Language` on every surface. | `meta.ts:33`; `nav-bar.tsx:596-598` |
| GitHub | `NavBar.Repo`. | `nav-bar.tsx:627` |
| Theme | Not part of NavBar. `ThemeToggle` comes from `@krizaka/ui/theme`. | `navigation.mdx:18` |
| Family switcher | **Deprecated**: "No site carries the family switcher any more (2026-10-22)… krizaka.com is the only way back… through the footer's « A Krizaka project » line". | `nav-bar.tsx:483` |
| Family switcher (stale) | Still prescribed on every site: `meta.ts:14`, `:32`, `:35`, `:36`. | contradicts `nav-bar.tsx:483` |
| « Talk to us » (stale) | Still given as a product primary in an example and in the doc. | `meta.ts:64`; `navigation.mdx:50` |
| Footer | `SiteFooter` variants site / docs / app (`site-footer/meta.ts:108-114`). Family columns, **including the Krizaka column that carries Contact**, render only when `current === "krizaka"`. | `site-footer/meta.ts:13-14`, `:24`; `site-footer.tsx:94-99`, `:134` |
| Company links | Our story / Notre histoire, Blog / Blogue, Contact us / **Nous écrire** → `www.krizaka.com/contact`. | `sites/sites.ts:82-87`, `:139`, `:165` |
| Site names | `"Krizaka TS"` for ts.krizaka.com; motion lives at `krizaka.github.io/krizaka-motion`. | `sites.ts:57`, `:59` |
| App shell | Use AppShell above 4 destinations (`app-shell/meta.ts:10`). "Five to nine items…; put the account in the sidebar's `footer`" (`:15`). The sidebar is `hidden … md:flex` (`app-shell.tsx:25`). RailNav has "a footer for settings and the account" (`rail-nav/meta.ts:5`). | — |
| App header | Theme, notifications and the account menu go in the header. | `app-header/meta.ts:11`, `:21` |
| Account menu | Shows the name from `sm` (`account-menu.tsx:36-37`). Its panel shows avatar, name and email (`:62-73`). | — |
| Decision 2026-10-23 | "the account menu sits in the header, at every width, in every product." | krizaka-ui#551, comment by Oussama |
| Decision (open PR) | « Talk to us » becomes `ProductBarActions`; Contact moves to the footer → krizaka.com/contact. The adoption issues are already filed: orazaka-web-client#265, orochia#403, yasakia#174, yororis#128, kachizaka#109, yomizaka#243, akinaza#255. | krizaka-ui#505 |
| Language switch | Between the theme and the account. | `language-switch/meta.ts:12` |
| 404 | Offer a search and 2–3 ways back. | `error-page/meta.ts:15` |
| Doc page | Right zone = GitHub · theme · language · Sign in · one primary (`navigation.mdx:15`). `:16` is headed "Left, in order" but lists the centre items. `:17` "never a version chip in the bar" contradicts `:49`, which puts a status chip in the badge. Phone panel = groups, then preferences, then the primary (`:22`). Apps = AppShell + RailNav + AppHeader + AccountMenu, with theme and language in the account menu (`:54-56`). The `no-hand-made-nav` ast-grep ratchet (`:60-62`). | `apps/site/content/docs/foundations/navigation.mdx` |

### 1.2 www.krizaka.com — company site (`krizaka-com`)

Files: `app/components/TopNavBar.tsx` (bar), `lib/nav.ts` (items), `app/components/MobilePanel.tsx`, `app/components/SiteFooter.tsx`, `app/[locale]/not-found.tsx`, `messages/{en,fr}.json`, `tests/nav.test.mjs`. Each page renders the bar itself; the footer is rendered once by `app/[locale]/layout.tsx:184`.

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Krizaka mark + « Krizaka » (aria `site.menu.homeAria`) | `/` | `TopNavBar.tsx:45-50` |
| Centre | Open source / Open source (`NAV_BAR_LINKS`, only item) | `/open-source`, also lit on `/open-source/*` | `TopNavBar.tsx:52-59`; `nav.ts:39-50` |
| Centre (dead branch) | `DocsCrumb` + search, only under `/docs` — every `/docs*` path is now a 308, so this never renders | — | `TopNavBar.tsx:60-78`; `lib/ui-redirects.ts:47-49` |
| Right 1 | Blog / Blogue (md+) | `https://blog.krizaka.com` | `TopNavBar.tsx:80-82` |
| Right 2 | `NavBar.Repo` (lg+) | `github.com/krizaka/krizaka-com` | `TopNavBar.tsx:84` |
| Right 3 | Theme — **hand-rolled `Button`** + local `useSiteTheme`, not `ThemeToggle` (md+) | — | `TopNavBar.tsx:86-96`, `:23` |
| Right 4 | `NavBar.Language` (md+) | same page, other locale | `TopNavBar.tsx:98-100` |
| Right 5 — primary | **Contact us / Nous contacter** | `/contact?source=<page>` | `TopNavBar.tsx:102-104`; `messages/fr.json:75` |
| Panel (<md) | Open source, Blog, Contact us, theme, language. **No GitHub.** | | `MobilePanel.tsx:31-66` |
| Footer | `SiteFooter current="krizaka" variant="site"`, products filtered to the focus set (`:30-36`). Site column « On krizaka.com »: All products, Open source, Changelog (`:59-69`). Family columns: Products (Orazaka, Akinaza, Yomizaka), Open source (ui, java, ts, motion, GitHub), Krizaka (Our story, Blog, Contact → bare `www.krizaka.com/contact`, FR « Nous écrire »). Legal line: legal name, version → changelog, Privacy, Terms (`:39-57`). | | `SiteFooter.tsx`; `sites.ts:82-87`, `:165` |
| 404 | Bar (inside `<main>`, `not-found.tsx:17-18`), footer, `ErrorPage`. Ways back: Home, **Documentation → `/docs` (a 308 to /open-source)**, Contact (`:29-33`). The text says the page may have "moved into the documentation". Catch-all `app/[locale]/[...missing]/page.tsx`. | | `not-found.tsx:29-33`; `ui-redirects.ts:47-49` |
| Not linked | `/open-source/[block]` (only from the Open source page), `/changelog/feed.xml` | | inventory of `app/` |

The rules are pinned by `tests/nav.test.mjs`: the centre is only `["repos"]` (Open source); no /story in the bar; exactly one primary (Contact); no Docs; no `NavBar.Family` (`:64-80`). The file's own header `:6-7` still says "every other Krizaka site is reached from the family switcher", which is stale.

### 1.3 blog.krizaka.com — company blog (`krizaka-blog`)

Files: `app/components/TopBar.tsx`, `app/components/SiteFooter.tsx`, `app/components/SiteRoot.tsx:37-42` (chrome for both root layouts), `app/global-not-found.tsx`, `messages/{en,fr}.json`.

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Krizaka mark + « Krizaka Blog » / « Blogue Krizaka » (no aria-label) | `/` or `/fr` | `TopBar.tsx:40-45` |
| Centre | Posts / Billets · Topics / Sujets · Saved / Enregistrés | `/`, `/tags`, `/saved` | `TopBar.tsx:48-56` |
| Right 1 | `SearchField` (md+, ⌘K); icon below md | `/search?q=` | `TopBar.tsx:60-77` |
| Right 2 | GitHub — **hand-made** `GitHubMark`, not `NavBar.Repo` (lg+) | `github.com/krizaka/krizaka-blog` | `TopBar.tsx:78-82` |
| Right 3 | Theme — **hand-rolled `Button`** + local `useSiteTheme` (md+) | — | `TopBar.tsx:18`, `:83-85` |
| Right 4 | Language — **plain link** « FR » / « EN », not `NavBar.Language` | other-locale post or home | `TopBar.tsx:86-90` |
| Right 5 — primary | « krizaka.com » | `https://www.krizaka.com` | `TopBar.tsx:91-93` |
| Panel | Posts, Topics, Search, Saved, Subscribe (RSS → `/feed`), krizaka.com, GitHub → **the org** (not the repo), theme, language. `closeLabel` reuses « Menu ». | | `TopBar.tsx:95-115`, `:102` |
| Footer | `SiteFooter current="krizaka"` with no `variant`, `products` or `legal` (`:17`). It therefore renders the **whole family (all 7 products)** as if it were krizaka.com. « A Krizaka publication »: About, Source code (`:18-21`); « Feeds » / « Flux »: Newsletter, RSS, Atom (`:22-26`). No Privacy or Terms. | | `SiteFooter.tsx:17-26` |
| 404 | `global-not-found.tsx`: no bar, no footer, **forced dark** (`:20`, `:25`). Bilingual on one page; ways back: Back to the blog, Search the posts, Retour au blogue (`:41-49`). No link to krizaka.com. | | |
| Not linked | `/series` index (only from a series page's back link), `/feed.xml` | | `SeriesPage.tsx:47` |

The `TopBar.tsx:4-5` comment lists items that do not match the code. `AGENTS.md:16` still says "the family switcher arrives with `NavBar.Family`", which contradicts `nav-bar.tsx:483`.

### 1.4 ui.krizaka.com — tool site (`krizaka-ui/apps/site`)

Files: `apps/site/app/components/SiteBar.tsx`, `…/SiteFooter.tsx`, `…/SiteRoot.tsx` (Fumadocs sidebar), `apps/site/app/global-not-found.tsx`, `apps/site/messages/{en,fr}.json`, `apps/site/lib/ui-ia.ts`, `apps/site/lib/docs-source.ts`.

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Krizaka mark + « Krizaka UI » | `/` or `/fr` | `SiteBar.tsx:45-50` |
| Centre | Get started / Démarrer · Foundations / Fondations · Components / Composants · Templates / Modèles | `/installation`, `/foundations/tokens`, `/components`, `/templates` | `SiteBar.tsx:26-31`, `:52-58`; `en.json:12-15` |
| After centre | `NavBar.Badge` version (lg+) — rendered **after** the items, not beside the brand | — | `SiteBar.tsx:59` |
| Right 1 | Search « Search » / « Rechercher » + ⌘K | Fumadocs dialog | `SiteBar.tsx:62-75` |
| Right 2 | `NavBar.Repo` (lg+) | `github.com/krizaka/krizaka-ui` | `SiteBar.tsx:79` |
| Right 3 | Theme — **hand-rolled `Button`**, not `ThemeToggle` | — | `SiteBar.tsx:81-83` |
| Right 4 | `NavBar.Language` (sm+) | | `SiteBar.tsx:85` |
| Primary | none | | |
| Panel | The 4 items + `NavBar.Language`. Between sm and md the language switch shows **twice** (`:85` and `:93`). No GitHub. | | `SiteBar.tsx:87-94` |
| Sidebar | Get started, Foundations, Components, Patterns / Patrons, Templates, Tooling / Outillage, Platforms / Plateformes | | `docs-source.ts:171-179`; `ui-ia.ts:89-92` |
| Footer | `SiteFooter current="ui"`: one column « Documentation » repeating the 4 bar links (`:16-21`, `:30-36`). Legal row is only « v{version} » → changelog (`:26-28`). **No Contact, no Privacy or Terms**; the family columns are hidden because `current !== "krizaka"`. | | `apps/site/app/components/SiteFooter.tsx` |
| 404 | `global-not-found.tsx`: **English only, even on `/fr/…`** (`:10-12`, `:18`). One link « Back to Krizaka UI → » to `/` (`:27`). No chrome, no search. The FR strings exist (`fr.json:31-33`) but are unused. | | |
| Breadcrumb | JSON-LD only (`DocsPageView.tsx:55`, `:64`). Nothing visible. | | |
| Not linked from bar or footer | `/platforms`, `/mobile`, `/packages/*`, Patterns; `/changelog` only through « v{version} » | | `ui-ia.ts:91-92` |

Wording is mixed: « Search the documentation » (`en.json:17`), « Documentation » (`:27`), « Search the docs » (`:76`); FR « Rechercher dans la documentation » vs « … la doc » (`fr.json:17`, `:76`).

### 1.5 java.krizaka.com — tool site (`krizaka-build/site`)

Files: `site/app/components/TopBar.tsx`, `site/app/components/FamilyFooterView.tsx`, `site/app/global-not-found.tsx`, `site/messages/{en,fr}.json`.

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Krizaka mark + « Krizaka Java » | `/` | `TopBar.tsx:40-45` |
| After brand | `NavBar.Badge` | | `TopBar.tsx:46` |
| Centre | Get started / Démarrer · Building blocks map / Carte des briques · **Guides** (→ `/web/`, a single module page that is lit on almost every page) | | `TopBar.tsx:55-57` |
| Right 1 | Search | site search | `TopBar.tsx:61-74` |
| Right 2 | `NavBar.Repo` (lg+) | `github.com/krizaka/krizaka-build` | `TopBar.tsx:78` |
| Right 3 | Theme — **hand-rolled `Button`** + local `useSiteTheme` | | `TopBar.tsx:21`, `:80-82` |
| Right 4 | `NavBar.Language` | | `TopBar.tsx:84` |
| Primary | none | | |
| Panel | Items, theme button, language. **No GitHub.** | | `TopBar.tsx:86-97` |
| Footer | `FamilyFooterView.tsx:39`: Maven Central, Source code. **No Contact, no Privacy.** | | |
| 404 | `global-not-found.tsx`: no chrome, `lang="en"` (`:15`). « Back to the documentation » → `/`. | | |

FR uses « Démarrer » in the bar but « Commencer » elsewhere. The changelog is hard to reach. The `TopBar.tsx:7` comment is stale.

### 1.6 ts.krizaka.com — tool site (`krizaka-ts/site`)

Same structure and files as java (§1.5).

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Krizaka mark + **« Krizaka TS »** — the rule says « Krizaka TypeScript » | `/` | `site/messages/en.json:3`; `sites.ts:57` |
| Centre | Get started / Démarrer · Packages / Paquets (→ **the first package**, not an index) | | `TopBar.tsx:32`, `:50-52` |
| Badge | none | | |
| Right | Search · `NavBar.Repo` (lg+) · theme (**hand-rolled `Button`**) · `NavBar.Language` | | `TopBar.tsx:73`, `:75`, `:79` |
| Panel | Items, theme button, language. No GitHub. | | `TopBar.tsx:85-89` |
| Footer | npm, Source code. **No Contact, no Privacy.** | | |
| 404 | Same as java: no chrome, English only. | | `site/app/global-not-found.tsx` |

### 1.7 Krizaka Motion lab — tool site (`krizaka-motion`, krizaka.github.io/krizaka-motion)

Files: `src/App.tsx` (bar, panel, footer), `src/core/router.ts`, `src/lab/messages.ts`, `messages/en.json`, `scripts/generate-routes.mjs`. **English only, by decision** (`src/lab/messages.ts:1`).

| Zone | Item (EN only) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Krizaka mark + « Krizaka Motion » | lab home | `App.tsx:73-78` |
| Centre | « Guides » (**hard-coded**, same target as the brand) · « Krizaka UI + Motion » (a gallery inside the lab, not ui.krizaka.com) · « Experiments » (**hard-coded**) | | `App.tsx:61-65` |
| Right 1 | `NavBar.Repo` (md+; missing from the panel) | `github.com/krizaka/krizaka-motion` | `App.tsx:89` |
| Right 2 | Theme — **hand-rolled `Button`** | | `App.tsx:90-100` |
| Language / search / primary | none | | |
| Panel | Guides, Krizaka UI + Motion, Experiments. No GitHub. | | `App.tsx:101-107` |
| Footer | `SiteFooter current="github"` — **wrong id**; the lab's id is `motion` (`sites.ts:59`). « The lab »: Guides · Experiments · Krizaka UI + Motion · Specs · Source — a different order from the bar. No Contact. | | `App.tsx:116-123` |
| 404 | **None.** `404.html` redirects to `/?/<path>` (`generate-routes.mjs:74-99`), and `resolvePage` falls back to the home for any unknown path (`router.ts:236-242`). | | |

`App.tsx:1-2` claims a family switcher and a language switch; neither exists. « Specs » is titled « Mobile & Specs » on its own page (`router.ts:107`).

### 1.8 Orazaka — product site, app and console (`orazaka-web-client`)

Files: `src/features/landing/components/{LandingNav,LandingFooter,LandingPage,LegalPage}.tsx`, `src/features/landing/utils/site-nav.ts`, `src/core/context/{translations,translations.landing,translations.docs}.ts`, `src/components/layout/{Header,Sidebar}.tsx`, `src/core/config/app-sections.ts`, `src/console/components/{ConsoleNav,ConsoleSubnav,SiteFooter}.tsx`, `src/console/core/config/sections.ts`, `src/console/core/copy/console.ts`, `src/proxy.ts`, `src/app/layout.tsx`.

**Site (www.orazaka.com)**

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Orazaka mark + « Orazaka » (aria « Orazaka home » / « Accueil Orazaka ») | `/` | `LandingNav.tsx:42-47`; `translations.landing.ts:28`, `:129` |
| Centre 1 | **Product ▾ / Produit**: How it works / Fonctionnement → `/#features`; Download / Télécharger → `/desktop` | | `LandingNav.tsx:50-58`; `site-nav.ts:41-42`; `translations.landing.ts:14-21`, `:115-122` |
| Centre 2 | Docs / Docs | `/docs` | `LandingNav.tsx:59-61` |
| Right 1 | `NavBar.Repo` (lg+) | `github.com/krizaka/orazaka-web-client` | `LandingNav.tsx:65` |
| Right 2 | `ThemeToggle` (md+) | | `LandingNav.tsx:66` |
| Right 3 | `NavBar.Language` (md+) | | `LandingNav.tsx:67-69` |
| Right 4 | Sign in / Se connecter (ghost) | `/login` | `LandingNav.tsx:70-72` |
| Right 5 — primary | **« Talk to us » / « Nous écrire »**, hand-coded; `ProductBarActions` is not used anywhere in the repo | `krizaka.com/contact?topic=orazaka` | `LandingNav.tsx:16`, `:73-75`; `translations.landing.ts:29`, `:130` |
| Panel | Product group (How it works, Download) · divider · Docs · Preferences / Préférences (theme, language) · Sign in + **Talk to us**. **No GitHub.** | | `LandingNav.tsx:77-103` |
| Footer | `SiteFooter family={false}`. Product / Produit: How it works, Download. Docs / Docs: **Documentation** / Documentation, API reference / Référence de l'API, CLI. Legal row: Open source · Apache-2.0, Privacy / Confidentialité, Terms / Conditions, **Contact / Contact → `krizaka.com/contact?topic=orazaka`**. Publisher « A Krizaka product » / « Un produit Krizaka ». | | `LandingFooter.tsx:22-54`, `:39-41`; `translations.landing.ts:103-109`, `:204-210` |
| Search | Docs only (`DocsSearch.tsx:19-29`) | | |
| Breadcrumb | Docs pages only: Docs › section | | `DocArticle.tsx:48-52` |
| 404 | **None.** No `src/app/not-found.tsx`; visitors get Next's default English page with no bar and no way back. | | |
| Locale | No URL prefix; localStorage then account settings; **`<html lang="en">` fixed** | | `LocaleContext.tsx:52-73`; `layout.tsx:65` |
| Hand-made nav | Privacy/Terms use their own header; its brand goes to **`/login`**, not `/` | | `LegalPage.tsx:27-50`, `:29` |

Other stale or looping links: the sign-in screen links `/features/<route>`, now a 308 to `/#features` (`AuthScreen.tsx:45`; `redirects.ts:24-25`). It also links `/contact` without a topic (`AuthScreen.tsx:69`). FR « Nous parler » (`translations.landing.ts:195`) sits beside « Nous écrire » (`:130`) for the same action. `LandingNav.tsx:21` still mentions « Platforms ▾ ».

**App (signed in)**

| Part | Items (EN / FR) | Evidence |
| :--- | :--- | :--- |
| Header (`AppHeader`) | Mark + « Orazaka » → `/`; badge « Local · sovereign » / « Local · souverain » (sm+); `ThemeToggle`; hand-rolled `NotificationBell`; **`AccountMenu` at every width** | `Header.tsx:30-67` |
| Rail (`RailNav`; bottom bar on phones) | Studios · Chat · Jobs / Tâches · Plan / Offre · Usage & credits / Usage et crédits — foot: Settings / Paramètres → `/settings`, Admin (admins) → `/dashboard/admin` | `app-sections.ts:39-48`; `translations.ts:64-77`, `:987-1000` |
| Account menu | Name, email; Profile / Profil → `/settings/account`; **Settings / Paramètres → `/settings/appearance`** (also in the rail, with another target); Language submenu; Sign out / Se déconnecter | `Header.tsx:48-67`, `:58` |
| Search | ⌘K palette over the rail's sections only | `AppCommandPalette.tsx:13-27` |
| Unreachable | **`/automation`** (no section; `Sidebar.test.tsx:60`), `/interceptions/[schemaId]` | `app-sections.ts:39-48` |
| Shell wiring | Sidebar + Header copied into 5 pages instead of one layout | `chat/page.tsx:38-42`, `jobs/page.tsx:134-138`, `DashboardHome.tsx:96-99`, `dashboard/admin/page.tsx:179-183`, `settings/layout.tsx:27-30` |
| 404 | Next default. An unknown `/settings/<x>` silently shows « account » | `settingsSections.ts:21-23` |

**Console (admin.orazaka.com)**

| Part | Items (EN only) | Evidence |
| :--- | :--- | :--- |
| Bar (`NavBar`, full width) | Mark + « Orazaka Operations »; `NavBar.Badge` env; Supervision · Operations · Accounts · Catalogue · Audit log | `ConsoleNav.tsx:30-53`; `sections.ts:17-44` |
| Right | `ThemeToggle`; sign-out **icon** button. **No identity, no account menu, no language.** | `ConsoleNav.tsx:50-53` |
| Sub-nav | `Tabs.Nav`: Operations · Tasks; People · Billing & credits; Models · Studios | `ConsoleSubnav.tsx:21-27` |
| Footer | Compact `SiteFooter`: « A Krizaka product » + version | `console/components/SiteFooter.tsx:4-6` |
| 404 | Plain-text « Not found » | `proxy.ts:116-118` |
| Mixed language | Nav « Billing & credits », page « Facturation & crédits »; Studios tabs in FR | `billing/page.tsx:12-17`; `studios/page.tsx:21-29` |
| Stale link | Login « home » → `https://dev.orazaka.com` | `console/login/page.tsx:20` |

### 1.9 Yomizaka — product site and app (`yomizaka/apps/web`)

Files: `apps/web/components/{SiteChrome,BarSession,SiteFooter}.tsx`, `apps/web/lib/{nav,site,host,i18n}.ts`, `apps/web/components/console/{ConsoleShell,PlaceView}.tsx`, `apps/web/lib/console-nav.ts`, `apps/web/app/[locale]/not-found.tsx`, `apps/web/proxy.ts`, `apps/web/messages/{en,fr}.json`.

**Site (www.yomizaka.com)**

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Yomizaka mark + « Yomizaka » (aria « Yomizaka, home » / « Yomizaka, accueil ») | `/{l}` | `SiteChrome.tsx:30-35`; `en.json:8` |
| Centre | What it does / Ce que ça fait (`#what`) · **A real run / Une vraie vérification** (`#proof`) · Privacy / Confidentialité (`/privacy`) | | `SiteChrome.tsx:36-42`; `nav.ts:8-10`; `en.json:11-13`, `fr.json:11-13` |
| Right 1 | `NavBar.Repo` « Source code » / « Code source » (lg+) | repo | `SiteChrome.tsx:45` |
| Right 2 | `ThemeToggle` (md+) | | `SiteChrome.tsx:46-48` |
| Right 3 | `NavBar.Language` (md+) | | `SiteChrome.tsx:49-51` |
| Right 4 — primary | **`ProductBarActions`**: Sign in / Se connecter, or Try Yomizaka / Essayer Yomizaka. Signed in: Open the app / Ouvrir l'app + `AccountMenu` (Settings / Réglages → `/app/settings`; Sign out / Se déconnecter), visible at every width | | `BarSession.tsx:50-76`; `en.json:15`, `:30-34` |
| Panel | The 3 links · Preferences / Préférences (theme, language) · actions. **No GitHub.** Signed in: Open the app; Settings and Sign out remain accessible through the header account menu at every width, including while this non-modal panel is open. | | `SiteChrome.tsx:54-64`; `BarSession.tsx:52-65`; `krizaka-ui:packages/ui/src/nav-bar/nav-bar.tsx:340-480` |
| Footer | `SiteFooter family={false}`. Column « Yomizaka »: Download / Télécharger, Privacy (again), Terms / Conditions, Source code, **Contact / Contact → `krizaka.com/contact?topic=yomizaka&source=dev-yomizaka-footer`**. Legal row: version, Krizaka UI, dev notice. | | `SiteFooter.tsx:18-46`; `site.ts:15-16` |
| 404 | Shared `ErrorPage`, **hard-coded bilingual** « Not found · Introuvable », one link « Yomizaka » → `/` | | `not-found.tsx:8-16` |
| Locale | Prefix `/en`, `/fr`; unprefixed → cookie, else EN; unknown locale → 404 | | `proxy.ts:8-15`; `i18n.ts:14-16` |

**App (`/{l}/app`)**

| Part | Items (EN / FR) | Evidence |
| :--- | :--- | :--- |
| Header (`AppHeader`) | Page title per route (Library, Check a document, Search, Document, Account, Screening, Welcome); mark → `/{l}/app`; **`AccountMenu` at every width** (avatar, name, email; Account; language; theme; DEV · v…; Sign out) | `ConsoleShell.tsx:39-65`, `:105-114`; `console-nav.ts:28-34` |
| Rail (`RailNav`, bottom bar on phones) | Library / Bibliothèque · Check / Vérifier · Search / Recherche — foot: **Account / Compte** (again in the menu), Administration (admins → admin.yomizaka.com) | `ConsoleShell.tsx:83-102`; `en.json:150-161` |
| Breadcrumb | Hand-rolled `<nav aria-label="breadcrumb">` | `PlaceView.tsx:44-52` |
| Slugs | French slugs in both locales: `/app/bibliotheque`, `/recherche`, `/verifier`, `/bienvenue` next to `/settings`, `/documents` | `console-nav.ts:9`, `:41` |

The site menu calls `/app/settings` « Settings » (`BarSession.tsx:62`); the app calls it « Account » (`en.json:160`).

### 1.10 Akinaza — product site and app (`akinaza/apps/web`)

Files: `apps/web/components/SiteChrome.tsx`, `apps/web/components/account/{BarSession,AkinazaAccountMenu,ProfileFrame}.tsx`, `apps/web/components/SiteFooter.tsx`, `apps/web/components/app/{AppFrame,ShopSwitcher}.tsx`, `apps/web/lib/{app-nav,routes,locale-negotiation,i18n,host}.ts`, `apps/web/app/[locale]/not-found.tsx`, `apps/web/messages/{en,fr}.json`.

**Site (www.akinaza.com)**

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Akinaza mark + « Akinaza » | `/{l}` | `SiteChrome.tsx:36-41` |
| Centre | **Product ▾ / Produit**: Overview / Vue d'ensemble (→ `/{l}`, the brand's target); The demo shop / La boutique de démonstration → `/{l}/s/pattes-saint-henri` | | `SiteChrome.tsx:17-18`, `:43`; `en.json:11`, `:28-33` |
| Right | `NavBar.Repo` « Source code » (lg+) · `ThemeToggle` · `NavBar.Language` · **`ProductBarActions`** (Sign in / Se connecter or Try Akinaza / Essayer Akinaza); signed in: Open the app / Ouvrir l'app + `AkinazaAccountMenu` | | `SiteChrome.tsx:53-60`; `BarSession.tsx:36-45` |
| Panel | **Hand-rolled** group `div role="group"` (not `NavBar.MobileGroup`) · Preferences · actions. No GitHub. Signed in: Open the app; Settings and Sign out remain in the header account menu at every width. | | `SiteChrome.tsx:63-75`; `BarSession.tsx:36-41` |
| Footer | `SiteFooter family={false}`. Column « Akinaza »: The demo shop, Privacy / Confidentialité, Source code, **Contact → `krizaka.com/contact?topic=akinaza…`**. No Terms. | | `SiteFooter.tsx:36-44` |
| 404 | Shared `ErrorPage`, hard-coded bilingual, one link « Akinaza » | | `not-found.tsx:8-16` |
| Locale | Unprefixed → cookie, else **French** unless the browser asks only for English (Loi 96). `/es/s/<slug>` for shops. | | `locale-negotiation.ts:3-20` |

Four contact labels on one site: « Contact » (footer, `en.json:23`), « Talk to us about Akinaza » (hero, `:43`), « Talk to us first » / « Nous parler d'abord » (`:63`), « Talk to us » / **« Nous écrire »** on sign-in (`:125`).

**App (`/{l}/app`, admin.akinaza.com)**

| Part | Items (EN / FR) | Evidence |
| :--- | :--- | :--- |
| Header (`AppShell.Header`) | Fixed title **« Your shop » / « Votre boutique »** on every page; **`AkinazaAccountMenu` at every width** (avatar, name, email; Settings / Réglages → `/app/profile`; language; theme; Sign out / Se déconnecter) | `AppFrame.tsx:32-43`, `:73-77` |
| Sidebar (`AppShell.Sidebar`, drawer on phones) | Staff: Today / Aujourd'hui · Clients · Invoices / Factures · Your books / Vos livres · Team / Équipe · My shop page / Ma page boutique · **Profile / Profil** (same page as the menu's Settings). Client: My bookings / Mes réservations and **My shop page, both → `/{l}/app`**, Profile. | `app-nav.ts:6-19`; `routes.ts:44-50` |
| Shop switcher | `Select` « Switch shop » / « Changer de boutique », 2+ shops only | `ShopSwitcher.tsx:20` |
| Sign in | Always says sign-up is closed, even when the bar offers Try | `sign-in/page.tsx:41-48` |
| Orphan | **`/forgot-password` exists but nothing links to it** except reset-password; the key « Forgot your password? » exists | `en.json:128`; `reset-password/page.tsx:41` |

### 1.11 Orochia — product site/app in one shell, and console (`orochia/apps/web`)

Files: `apps/web/components/{ClientLayoutShell,AppBar,AppRail,LanguageSwitch,SiteFooter,GlobalSearchModal}.tsx`, `apps/web/components/me/MeShell.tsx`, `apps/web/lib/{app-nav,me-nav,creator-journey}.ts`, `apps/web/app/[locale]/not-found.tsx`, `apps/web/console/components/ConsoleShell.tsx`, `apps/web/console/lib/nav.ts`, `apps/web/messages/{en,fr}.json`.

**Public site and app (www.orochia.com) — no marketing `NavBar`; `RailNav` + `AppHeader` serve visitors and members** (`ClientLayoutShell.tsx:39-42`; `AppBar.tsx:49`).

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Header left | Orochia mark + « Orochia » | `/` | `AppBar.tsx:51-53` |
| Header right 1 | Search « Search creators, videos, tags… » / « Rechercher des créateurs, des vidéos, des mots-clics… » with a **⌘K hint that has no keyboard handler** | modal → `/explore?q=` | `AppBar.tsx:56-67`; `en.json:304-305` |
| Header right 2 | Language — local wrapper around the shared `language-switch` | | `AppBar.tsx:68`; `LanguageSwitch.tsx:3`, `:41` |
| Header right 3 | `ThemeToggle` | | `AppBar.tsx:69` |
| Header right (member) | `MessagesButton`, `NotificationBell`, **`AccountMenu` at every width** (name, `@username` in the email slot, avatar): View profile / Voir le profil, Dashboard / Tableau de bord, Earnings / Revenus, Messages (again), Wallet / Portefeuille, The app / L'appli, Settings / Paramètres, Sign out / Se déconnecter | | `AppBar.tsx:72-96`; `app-nav.ts:24-33` |
| Header right (visitor) | Upload / Téléverser (lg+) · Sign in / Se connecter → `/auth/login` (always ghost) · **Join / S'inscrire** → `/auth/register` (primary, only when sign-up is open). **No filled primary when sign-up is closed**, contrary to krizaka-ui#505 / orochia#403. | | `AppBar.tsx:101-115`; `en.json:300-303` |
| GitHub | **none** | | `lib/seo.ts:24` (SEO only) |
| Rail (bottom bar on phones) | Home / Accueil · Explore / Explorer · Auctions / Enchères · Challenges / Défis — foot: Create / Créer (same target as Upload) | | `app-nav.ts:9-14`; `AppRail.tsx:24-39` |
| Footer | `SiteFooter family={false}` inside the rail body. Column « Orochia »: Explore, How it works / Comment ça marche, The app / L'appli, **Docs (EN) / Documentation (FR)**. Legal row: version → changelog, 18+ statement, Terms, Privacy, 2257, DMCA. **No Contact.** | | `SiteFooter.tsx:33-50`; `en.json:328` vs `fr.json:328` |
| Breadcrumb | Docs articles only: Documentation › group | | `DocArticle.tsx:39-43` |
| 404 | Local `PageState` inside the shell: search, Explore Orochia, Back to home, Contact support → `krizaka.com/contact?topic=orochia…` | | `app/[locale]/not-found.tsx:27-56` |
| Locale | Unprefixed URL rewritten → cookie → Accept-Language → EN | | `proxy.ts:8-12`, `:31-46` |

**Console (admin.orochia.com, English only)**

| Part | Items | Evidence |
| :--- | :--- | :--- |
| Shell | `AppShell`, brand « Orochia Control Plane »; **15 destinations** in 5 groups. The first group is unlabelled: its Overview heading is not rendered. Destinations listed below. | `console/lib/nav.ts:34-77`; `ConsoleShell.tsx:102-115` |
| Identity | Name in the **sidebar footer** (hidden on phones), no `AccountMenu`; « Open Consumer App » → falls back to **`http://localhost:3000`** | `ConsoleShell.tsx:85-99`, `:91` |
| Header | BuildBadge, `ThemeToggle`, sign-out icon | `ConsoleShell.tsx:117-127` |
| 404 | none under `app/console` | |

Console destinations (EN only, relative to `admin.orochia.com`):

| Rendered group | Label → target | Evidence |
| :--- | :--- | :--- |
| Unlabelled | Overview → `/` · Tasks → `/tasks` | `console/lib/nav.ts:35-39`; `ConsoleShell.tsx:104` |
| People | 2257 Creator Verification → `/compliance` · Creator Registry → `/creators` · Accounts → `/users` | `console/lib/nav.ts:41-48` |
| Content | Content Reports → `/moderation` · Catalogue → `/catalogue` | `console/lib/nav.ts:50-56` |
| Money | Treasury & Payouts → `/treasury` · Auctions → `/auctions` | `console/lib/nav.ts:58-64` |
| Platform | Operations → `/operations` · Storage & Abuse → `/storage` · Explorer on Orazaka → `/explorer` · App versions → `/app-versions` · Platform & Database → `/platform` · Audit log → `/audit` | `console/lib/nav.ts:66-77` |

### 1.12 Yasakia — product site (static landing), legal pages and app (`yasakia/apps/site`, `yasakia/apps/web`)

Files: `apps/site/components/SiteChrome.tsx`, `apps/site/lib/{nav,site}.ts`, `apps/site/messages/{en,fr}.json`, `apps/web/components/SiteChrome.tsx` (legal pages), `apps/web/components/console/ConsoleShell.tsx`, `apps/web/lib/console-nav.ts`, `apps/web/app/[locale]/not-found.tsx`, `apps/web/proxy.ts`.

**Landing (www.yasakia.com)**

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Yasakia mark + « Yasakia » | `/` or `/fr/` | `apps/site/components/SiteChrome.tsx:31-36` |
| Centre | **Product ▾ / Produit**: Overview / Vue d'ensemble, How it works / Comment ça marche, Demo / Démo | | `SiteChrome.tsx:38-46`; `nav.ts:17-34` |
| Right | `NavBar.Repo` « Source code » (lg+) · `ThemeToggle` · `NavBar.Language` · « Sign in (by invitation) » / « Se connecter (sur invitation) » · **primary « Talk to us » / « Nous écrire »** | `krizaka.com/contact?topic=yasakia&source=dev-yasakia-bar` | `SiteChrome.tsx:49-62`; `apps/site/messages/en.json:20`, `:38` |
| Panel | Product group · Sign in (by invitation) · Preferences · Talk to us. No GitHub. | | `SiteChrome.tsx:64-85` |
| Footer | `SiteFooter` with **`env="dev"` hard-coded** (`:96`). Column « Yasakia »: How it works, Demo, Source code, « Talk to us » / « Nous écrire ». **No Privacy, Terms or Delete-account links.** | | `SiteChrome.tsx:96-110` |

**Legal pages (`/en|fr/privacy|terms|delete-account`)**: a **hand-rolled `<header>`** (not `NavBar`). The logo goes to www.yasakia.com but its aria-label says **« Yasakia on krizaka.com » / « Yasakia sur krizaka.com »**. Links: Privacy · Terms · Delete your account, `LanguageSwitch`, `ThemeToggle`, no phone panel (`apps/web/components/SiteChrome.tsx:20-43`; `apps/web/messages/en.json:8`). The footer says « Contact us » / « Nous écrire » (`:64-72`; `en.json:19`).

**App (`/app/<l>/…`)**

| Part | Items (EN / FR) | Evidence |
| :--- | :--- | :--- |
| Sidebar (`AppShell`) | Targets below are relative to `/app/<l>`. Your space / Ton espace: Home / Accueil → base path, Talk to your agent / Parle à ton agent → `/talk`, Photos / Photos → `/photos`, Your batch / Ton lot → `/batch`, Introductions / Présentations → `/intros`. Administration / Administration: Overview / Aperçu → `/admin`, People / Personnes → `/admin/users`, Introductions / Présentations → `/admin/intros`, Rules / Règles → `/admin/rules`, System / Système → `/admin/audit`. | `console-nav.ts:18-44`; `apps/web/messages/{en,fr}.json:229-264` (`console.shell`) |
| Secondary admin navigation | People / Personnes: People / Personnes → `/app/<l>/admin/users`, Reports / Signalements → `/app/<l>/admin/reports`. System / Système: Audit log / Journal d’audit → `/app/<l>/admin/audit`, Health / Santé → `/app/<l>/admin/health`, Analytics / Statistiques → `/app/<l>/admin/analytics`. Rendered above the page only for entries with multiple pages. | `console-nav.ts:23-44`; `ConsoleShell.tsx:124-138`; `apps/web/messages/{en,fr}.json:229-264` |
| Identity | Account / Compte → `/app/<l>/account` + **« Signed in as {email} » / « Connecté·e : {email} » in the sidebar footer** (hidden on phones); no `AccountMenu`, no avatar | `ConsoleShell.tsx:73-85`; `console-nav.ts:20` |
| Header | Page title, DEV badge (admin host), `LanguageSwitch`, `ThemeToggle`, Sign out / Se déconnecter | `ConsoleShell.tsx:101-123` |
| 404 | **none inside the app** (Next default). Public 404 (`PageState`, no chrome) links only Privacy, Terms, Delete your account, « Yasakia on krizaka.com », Contact us | `apps/web/app/[locale]/not-found.tsx:28-44` |
| Locale | Three prefix schemes on one domain: landing EN bare / FR `/fr`; legal `/en/…`, `/fr/…`; app `/app/en/…`, `/app/fr/…` | `proxy.ts:77-85`; `apps/site/lib/site.ts:13-18` |

### 1.13 Yororis — product site (static landing) and member app (`yororis/site`, `yororis/apps/web`)

Files: `site/components/{Bar,Footer,Shell,Home}.tsx`, `site/lib/site.ts`, `site/messages/{en,fr}.json`, `site/app/global-not-found.tsx`, `apps/web/components/console/ConsoleShell.tsx`, `apps/web/next.config.mjs`, `apps/web/proxy.ts`.

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Yororis mark + « Yororis » | `/` or `/fr/` | `site/components/Bar.tsx:46-51` |
| Centre | What it is / Ce que c'est (`#what`) · How we're building it / Comment on le construit (`#how`) · What it is not / Ce que ce n'est pas (`#not`) — the page order is what, not, how; **on the changelog these anchors are dead** | | `Bar.tsx:52-58`; `site.ts:13-17`; `Home.tsx:77`, `:98`, `:140` |
| Right | `NavBar.Repo` (lg+) · **hand-rolled theme button** · `NavBar.Language` · **primary « Talk to us about Yororis » / « Discuter de Yororis »**. **No Sign in**, although `/en/sign-in` exists. | `krizaka.com/contact?topic=yororis` | `Bar.tsx:25-31`, `:61-70`; `apps/web/app/[locale]/(app)/sign-in` |
| Panel | 3 anchors, Preferences, CTA. No GitHub. | | `Bar.tsx:72-87` |
| Footer | `SiteFooter`, **`env="dev"` hard-coded** (`Footer.tsx:17`). In a crisis / En cas de crise: 9-8-8, 811. Legal notices / Mentions légales: company, privacy officer, `mailto:contact@krizaka.com`. No Terms link (the page exists), no Source code. | | `Footer.tsx:12-40` |
| 404 | `site/app/global-not-found.tsx` is **excluded from the deployed rewrites** | | `apps/web/next.config.mjs:39-40` |

**Member app**: `AppShell` sidebar Your space / Ton espace: Home, A moment / Un moment, Account / Compte; Organisation: Members, Moments (`ConsoleShell.tsx:66-76`). Identity is **« Signed in as {email} » in the sidebar footer** (`:54-64`). The header has a **hand-rolled language link** that names the other language (`:84-87`), `ThemeToggle`, and Sign out (`:89-91`). Footer `variant="app"` with `env="dev"` hard-coded (`:99`). The 404 is the shared `ErrorPage` inside `(app)` only (`apps/web/app/[locale]/(app)/not-found.tsx:18-24`).

### 1.14 Kachizaka — product site, app and console (`kachizaka/apps/web`)

Files: `apps/web/components/{SiteChrome,SiteFooter}.tsx`, `apps/web/components/app/AppFrame.tsx`, `apps/web/lib/{site,host}.ts`, `apps/web/proxy.ts`, `apps/web/app/[locale]/not-found.tsx`, `apps/web/messages/{en,fr}.json`.

| Zone | Item (EN / FR) | Target | Evidence |
| :--- | :--- | :--- | :--- |
| Left | Kachizaka mark + « Kachizaka » | `/<l>` | `SiteChrome.tsx:33-38` |
| Centre | **Product ▾ / Produit**: Overview / Vue d'ensemble, How it works / Comment ça marche (`#how`) | | `SiteChrome.tsx:15-18`, `:40-46` |
| Right | `NavBar.Repo` (lg+) · `ThemeToggle` · `NavBar.Language` · Sign in / Se connecter · **primary « Talk to us » / « Nous écrire »** | `krizaka.com/contact?topic=kachizaka&source=dev-kachizaka-bar` | `SiteChrome.tsx:49-62`; `en.json:15` |
| Panel | Product group, Sign in, Preferences, Talk to us. No GitHub. | | `SiteChrome.tsx:64-83` |
| Footer | Column « Kachizaka »: Privacy / Confidentialité, Source code, **Contact / Contact**. DEV only when not indexable. | | `SiteFooter.tsx:18-43` |
| 404 | Shared `ErrorPage`, hard-coded bilingual, one link. **No `[...rest]` catch-all**, so unknown `/<l>/*` paths probably get the Next default (**TO VALIDATE** live). | | `app/[locale]/not-found.tsx:8-17` |
| Locale | Cookie, else English; **no Accept-Language** | | `proxy.ts:33` |

**App and console** (`AppFrame` = `AppShell`): member items Leagues / Ligues, Profile / Profil. **Both are marked current on `/app/profile`** (`AppFrame.tsx:35`, `:57`). Admin items: Overview, People, Leagues, Matches, Rule sets, Operations, Audit log. Identity is **« Signed in as {email} » in the sidebar footer** (`:47-53`). The header title is **always « Your leagues » / « Tes ligues »** (`:67`); it also holds `LanguageSwitch`, `ThemeToggle` and Sign out (`:71-75`). The admin brand **always shows DEV** (`:42`).

---

## 2 · Coherence matrix

Legend: **✓** follows the convention · **✗** breaks it · **n/a** the convention does not apply · **?** not provable from the code (TO VALIDATE live).

What each column checks, and against which rule:

| # | Convention | Rule it is checked against |
| :--- | :--- | :--- |
| A | Brand left: the mark and the site's full name, linking home | `nav-bar/meta.ts:32` |
| B | Order of items: three zones, ≤5 items, the standard for the site's kind | `meta.ts:24-26`, `:32` |
| C | « Docs » wording: the same word in the bar, footer and both languages | §4.3 canonical labels |
| D | Language: `NavBar.Language`, or the shared `language-switch` in an app | `meta.ts:33` |
| E | Theme: the shared `ThemeToggle` (`@krizaka/ui/theme`) | `navigation.mdx:18` |
| F | GitHub: `NavBar.Repo`, reachable at every width (bar or panel) | `nav-bar.tsx:627` |
| G | Primary action: product = use the app (`ProductBarActions`), never « Talk to us »; company = « Contact us »; tool = none | `meta.ts:23`; krizaka-ui#505 |
| H | Contact in the footer → `krizaka.com/contact` | `meta.ts:23`; krizaka-ui#505 |
| I | Account menu in the header, at every width | krizaka-ui#551 (decision 2026-10-23) |
| J | Family switcher: **none** (✓ = none, as required) | `nav-bar.tsx:483` |
| K | Search where there is content to search | `meta.ts:32` |
| L | Breadcrumbs, visible, on nested pages | `navigation.mdx` |
| M | 404 inside the chrome, localised, with 2–3 ways back; sane language fallback | `error-page/meta.ts:15` |

### 2.1 Public sites (the bar)

| Surface | A | B | C | D | E | F | G | H | I | J | K | L | M |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| www.krizaka.com | ✓ `TopNavBar:45-50` | ✓ 1 item `nav.test:64-80` | ✗ 404 « Documentation » → `/docs` (308) `not-found:31` | ✓ `:98-100` | ✗ `:86-96` | ✗ lg+ only, not in panel `MobilePanel:31-66` | ✓ Contact us `:102-104` | ✓ family col. `sites.ts:86` | n/a | ✓ `nav.test:72-80` | n/a | n/a | ✓ chrome + `ErrorPage` `not-found:17-33` |
| blog.krizaka.com | ✓ (no aria) `TopBar:40-45` | ✓ 3 items `:48-56` | n/a | ✗ plain link `:86-90` | ✗ `:83-85` | ✗ hand-made; panel → org `:78-82`, `:102` | ? « krizaka.com » `:91-93` (TO VALIDATE) | ✓ only because `current="krizaka"` `SiteFooter:17` | n/a | ✓ | ✓ `:60-77` | n/a | ✗ no chrome, forced dark `global-not-found:20,25` |
| ui.krizaka.com | ✓ `SiteBar:45-50` | ✗ badge after items `:59` | ✗ Docs/doc/documentation `en.json:17,27,76` | ✓ (twice at sm–md) `:85,93` | ✗ `:81-83` | ✗ lg+ `:79` | ✓ none | ✗ `SiteFooter.tsx` | n/a | ✓ `:4` | ✓ `:62-75` | ✗ JSON-LD only `DocsPageView:55,64` | ✗ EN only, no chrome `global-not-found:10-27` |
| java.krizaka.com | ✓ `TopBar:40-45` | ✗ « Guides » → one module `:55-57` | n/a | ✓ `:84` | ✗ `:80-82` | ✗ lg+ `:78` | ✓ none | ✗ `FamilyFooterView:39` | n/a | ✓ | ✓ `:61-74` | ? | ✗ `lang="en"`, no chrome `global-not-found:15` |
| ts.krizaka.com | ✗ « Krizaka TS » `en.json:3` | ✗ « Packages » → first package `:50-52` | n/a | ✓ `:79` | ✗ `:75` | ✗ lg+ `:73` | ✓ none | ✗ | n/a | ✓ | ✓ | ? | ✗ as java |
| Motion lab | ✓ `App:73-78` | ✗ « Guides » = brand, hard-coded `:61-65` | n/a | n/a EN only `messages.ts:1` | ✗ `:90-100` | ✗ md+ `:89` | ✓ none | ✗ wrong id `:116` | n/a | ✓ | n/a | n/a | ✗ no 404 `router.ts:236-242` |
| www.orazaka.com | ✓ `LandingNav:42-47` | ✓ Product ▾ · Docs `:50-61` | ✗ « Docs » col. / « Documentation » link `translations.landing:16,107` | ✓ `:67-69` | ✓ `:66` | ✗ lg+ `:65` | ✗ **Talk to us** `:73-75` | ✓ `LandingFooter:39-41` | n/a (no session in bar) | ✓ | ✓ docs only | ✓ docs `DocArticle:48-52` | ✗ no 404; `lang="en"` `layout:65` |
| www.yomizaka.com | ✓ `SiteChrome:30-35` | ✗ Privacy in the bar (and footer) `nav.ts:10` | n/a | ✓ `:49-51` | ✓ `:46-48` | ✗ lg+ `:45` | ✓ `BarSession:70-76` | ✓ `SiteFooter:46` | ✓ header at every width `BarSession:55-65` | ✓ `:19` | n/a | n/a | ✗ hard-coded, 1 way back `not-found:11-16` |
| www.akinaza.com | ✓ `SiteChrome:36-41` | ✗ « Overview » = brand `:17` | n/a | ✓ `:57-59` | ✓ `:54-56` | ✗ lg+ `:53` | ✓ `BarSession:45` | ✓ `SiteFooter:44` | ✓ header at every width `BarSession:39-41` | ✓ | n/a | n/a | ✗ hard-coded, 1 way back `not-found:8-16` |
| www.orochia.com (shell) | ✓ `AppBar:51-53` | ✓ rail 4 + Create `app-nav:9-14` | ✗ Docs / Documentation `en/fr.json:328` | ✓ shared switch `AppBar:68` | ✓ `:69` | ✗ none | ✗ Sign in stays ghost when sign-up is closed `:108-115`; orochia#403 / krizaka-ui#505 | ✗ `SiteFooter:33-50` | ✓ `:72-96` | ✓ | ✗ dead ⌘K `:63` | ✓ docs `DocArticle:39-43` | ✓ in shell, search + 3 ways `not-found:27-56` |
| www.yasakia.com | ✓ `SiteChrome:31-36` | ✗ « Overview » = brand `nav.ts:26` | n/a | ✓ | ✓ | ✗ lg+ | ✗ **Talk to us** `en.json:20` | ✓ but labelled « Talk to us » `:102-110` | n/a | ✓ `:23-24` | n/a | n/a | ✗ no chrome, legal links only `not-found:28-44` |
| www.yororis.com | ✓ `Bar:46-51` | ✗ dead anchors on changelog `:52-58` | n/a | ✓ `:65-67` | ✗ `:25-31` | ✗ lg+ `:61` | ✗ **Talk to us about Yororis**; no Sign in `:68-70` | ✗ mailto only `Footer:33-40` | n/a | ✓ | n/a | n/a | ✗ 404 not deployed `next.config:39-40` |
| www.kachizaka.com | ✓ `SiteChrome:33-38` | ✗ « Overview » = brand `:15-18` | n/a | ✓ | ✓ | ✗ lg+ | ✗ **Talk to us** `:60-62` | ✓ `SiteFooter:37-43` | n/a | ✓ | n/a | n/a | ✗ hard-coded, no catch-all `not-found:8-17` |

### 2.2 Apps and consoles (the shell)

| Surface | A | B | C | D | E | F | G | H | I | J | K | L | M |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Orazaka app | ✓ `Header:31-38` | ✗ Settings in rail **and** menu, two targets `Header:58` | n/a | ✓ menu submenu | ✓ `:41` | n/a | ✓ new chat on home | n/a | ✓ `Header:48-67` | ✓ | ✗ palette lists sections only `AppCommandPalette:13-27` | ✗ none | ✗ Next default |
| Orazaka console | ✓ `ConsoleNav:31-38` | ✓ 5 items `sections.ts:17-44` | n/a | ✗ none; EN/FR mixed | ✓ | n/a | n/a | n/a | ✗ **no identity** `:50-53` | ✓ | n/a | ✗ | ✗ plain text `proxy.ts:116-118` |
| Yomizaka app | ✓ `ConsoleShell:107-108` | ✗ « Account » in rail and menu `:83`, `:51` | n/a | ✓ in menu `:52` | ✓ in menu `:55-57` | n/a | ✓ Check | n/a | ✓ `:39-65` | ✓ | ✓ rail Search | ✗ hand-rolled `PlaceView:44-52` | ✗ inherited bilingual `ErrorPage`, 1 link → `/` `app/[locale]/not-found.tsx:8-16` |
| Akinaza app | ✓ `AppFrame:49-52` | ✗ Profile twice; client items both → `/app` `routes.ts:46-47` | n/a | ✓ in menu | ✓ in menu | n/a | n/a | n/a | ✓ `AppFrame:76` | ✓ | n/a | ✗ none | ✓ `notFound()` in shop layout |
| Orochia console | ✓ `ConsoleShell:77-84` | ✓ 15 destinations in 5 groups; first heading suppressed `nav.ts:34-77`, `ConsoleShell:104` | n/a | n/a EN only | ✓ | n/a | n/a | n/a | ✗ sidebar footer only `:85-99` | ✓ | n/a | ✗ | ✗ none |
| Yasakia app | ✓ | ✓ 5 items `console-nav:18` | n/a | ✓ `ConsoleShell:101-123` | ✓ | n/a | n/a | n/a | ✗ sidebar footer `:73-85` | ✓ | n/a | ✗ | ✗ Next default |
| Yororis app | ✓ | ✓ 3 + 2 `ConsoleShell:66-76` | n/a | ✗ hand-rolled `:84-87` | ✓ | n/a | n/a | n/a | ✗ sidebar footer `:54-64` | ✓ | n/a | ✗ | ✗ `(app)` only `not-found:18-24` |
| Kachizaka app/console | ✓ | ✗ two items current `AppFrame:35,57` | n/a | ✓ `:71-75` | ✓ | n/a | n/a | n/a | ✗ sidebar footer `:47-53` | ✓ | n/a | ✗ | ✗ hard-coded |

**Reading the matrix.** Three columns fail almost everywhere. **F**: GitHub disappears below the bar link's breakpoint (`lg` on most sites, `md` on Motion), because the panel lacks a repo link; the blog has a hand-made link with a different panel target. **M**: the 404. **I**: the account in five of eight shells. **G** fails on five products: four show « Talk to us »; Orochia has no filled primary when sign-up is closed. The family switcher (**J**) is already gone everywhere, as decided on 2026-10-22.

---

## 3 · Findings, ranked by user impact

The tally: **4 high, 12 medium, 10 low**. Each finding names who it hurts: **V** is a first-time visitor, **O** a signed-in owner or member, **D** a developer, whether reading the docs or coding the surface.

### High

**H1 · « Talk to us » is still the primary action on four product sites, and the shared docs still teach it.**
- *Problem.* On a product site the one filled button should start using the product. On these four, it sends visitors to a contact form on another domain instead:
  - Orazaka: « Talk to us » / « Nous écrire ».
  - Yasakia: « Talk to us ».
  - Kachizaka: « Talk to us ».
  - Yororis: « Talk to us about Yororis » / « Discuter de Yororis ».
- *Hurts.* V (and O, who reads « Sign in » as the secondary button).
- *Evidence.*
  - Orazaka: `orazaka-web-client:src/features/landing/components/LandingNav.tsx:73-75`, `:99-101`; `translations.landing.ts:29`, `:130`.
  - Yasakia: `yasakia:apps/site/messages/en.json:20`.
  - Kachizaka: `kachizaka:apps/web/components/SiteChrome.tsx:49-62`; `en.json:15`.
  - Yororis: `yororis:site/components/Bar.tsx:68-70`.
  - The contract still teaches it in two places: `krizaka-ui:packages/ui/src/nav-bar/meta.ts:64` ("Sign in and “Talk to us”") and `apps/site/content/docs/foundations/navigation.mdx:50`.
  - Oussama's capture of www.orazaka.com shows the button live.
- *Recommendation.* Replace the hand-written buttons with **`ProductBarActions`** (`nav-bar/product-actions.tsx:47-61`) in both `placement="bar"` and `placement="panel"`. Contact stays a footer link. The adoption is already filed (krizaka-ui#505 → orazaka-web-client#265, yasakia#174, kachizaka#109, yororis#128); do not file duplicates. In krizaka-ui, fix `meta.ts:64` and `navigation.mdx:50` so no new site copies the old pattern.

**H2 · Five of eight shells lack the account menu in the header on a phone.**
- *Problem.* The 2026-10-23 rule: "the account menu sits in the header, at every width, in every product" (krizaka-ui#551). Three products ignore it:
  - Yasakia, Yororis and Kachizaka put « Signed in as {email} » in the `AppShell` sidebar footer. On phones the sidebar is `hidden … md:flex` (`app-shell.tsx:25`), so the identity sits inside a closed drawer.
  - The Orochia console does the same (`ConsoleShell.tsx:85-99`).
  - The Orazaka console shows no identity at all: a sign-out icon only (`ConsoleNav.tsx:50-53`).
- The shared docs still teach the old pattern: `app-shell/meta.ts:15` ("put the account in the sidebar's `footer`") and `rail-nav/meta.ts:5`.
- *Hurts.* O. On a shared phone or a family laptop, the owner cannot tell which account they are acting as before an irreversible action. In an admin console that is a safety issue.
- *Evidence.* `yasakia:apps/web/components/console/ConsoleShell.tsx:73-85`; `yororis:apps/web/components/console/ConsoleShell.tsx:54-64`; `kachizaka:apps/web/components/app/AppFrame.tsx:47-53`; `orochia:apps/web/console/components/ConsoleShell.tsx:85-99`; `orazaka-web-client:src/console/components/ConsoleNav.tsx:50-53`.
- *Recommendation.*
  - Put **`AccountMenu`** in `AppShell.Header` / `AppHeader` actions, as Yomizaka (`ConsoleShell.tsx:39-65`) and Akinaza (`AppFrame.tsx:76`) already do. Fold theme, language and Sign out into it.
  - In `@krizaka/ui`, rewrite `app-shell/meta.ts:15` and `rail-nav/meta.ts:5` to say "account in the header", and ship the `NavBar.Session` / "who is here" contract from krizaka-ui#551.

**H3 · Dead-end 404s on nine surfaces.**
- *Problem.* A broken link should land on a page that keeps the chrome, speaks the visitor's language and offers 2–3 ways back (`error-page/meta.ts:15`). Instead:
  - **No 404 at all:**
    - Orazaka uses Next's default page, in English, with no bar.
    - Motion renders the home for any unknown path, silently.
    - Yororis's site 404 is excluded from the deploy.
  - **No chrome, or one language only:**
    - blog: no chrome, forced dark.
    - ui: English only on `/fr`.
    - java and ts: `lang="en"`, no chrome.
  - **Thin:**
    - Yomizaka, Akinaza and Kachizaka have hard-coded bilingual text and one link. Kachizaka also has no catch-all.
    - Yasakia's links are legal pages only.
    - The Orazaka console 404 is plain text.
    - The Yasakia app and the Orochia console have none.
- *Hurts.* V above all: a visitor who arrives from an old link or a search result has no way into the site.
- *Evidence.*
  - Orazaka: no `src/app/not-found.tsx`.
  - Motion: `krizaka-motion:src/core/router.ts:236-242`.
  - Yororis: `yororis:apps/web/next.config.mjs:39-40`.
  - blog: `krizaka-blog:app/global-not-found.tsx:20`, `:25`.
  - ui: `krizaka-ui:apps/site/app/global-not-found.tsx:10-27`.
  - java: `krizaka-build:site/app/global-not-found.tsx:15`.
  - Yomizaka: `yomizaka:apps/web/app/[locale]/not-found.tsx:11-16`.
  - Kachizaka: `kachizaka:apps/web/app/[locale]/not-found.tsx:8-17`.
  - Yasakia: `yasakia:apps/web/app/[locale]/not-found.tsx:28-44`.
- *Recommendation.*
  - Every surface renders **`ErrorPage`** inside its own bar and footer (krizaka-com's `not-found.tsx:17-33` is the model), with messages from the catalogue, in the visitor's language.
  - Ways back:
    - Home.
    - The site's main section.
    - Search, where the site has it.
    - Contact.
  - In `@krizaka/ui`, add localised default labels to `error-page` so a static `global-not-found` can be bilingual without hand-coding.

**H4 · Pages a user needs cannot be reached from the navigation.**
- *Problem.* Each of these cases blocks a user at a key moment:
  - **Akinaza, `/forgot-password`.** The page exists and the label « Forgot your password? » / « Mot de passe oublié ? » exists, but sign-in never links to it. A locked-out owner has no way to reset their password.
  - **Akinaza, sign-in.** The page always says sign-up is closed, even when the bar offers « Try Akinaza ».
  - **Yororis.** There is no Sign in anywhere on the site, though `/en/sign-in` exists.
  - **Orazaka, `/automation`.** It has no entry in the rail.
- *Hurts.* O, and V on Akinaza's sign-in.
- *Evidence.* `akinaza:apps/web/messages/en.json:128`; `akinaza:apps/web/app/[locale]/(app)/sign-in/page.tsx:41-48`; `akinaza:…/reset-password/page.tsx:41` (the only link); `yororis:site/components/Bar.tsx:61-70`; `orazaka-web-client:src/core/config/app-sections.ts:39-48`, `src/components/layout/__tests__/Sidebar.test.tsx:60`.
- *Recommendation.*
  - Akinaza: link « Forgot your password? » from the sign-in form, and drive the closed-sign-up copy from the same `signupOpen` value that `ProductBarActions` reads.
  - Yororis: `ProductBarActions` (H1) gives it « Sign in ».
  - Orazaka: add Automations to `APP_SECTIONS`, or remove the route — **TO VALIDATE (Oussama)**.

### Medium

**M1 · The shared contract contradicts itself, so agents copy stale rules.**
- *Evidence.*
  - `nav-bar/meta.ts:14`, `:32`, `:35`, `:36` still prescribe `NavBar.Family`, which `nav-bar.tsx:483` deprecates.
  - `meta.ts:25` still says "dev.<product>", while krizaka-com `AGENTS.md:24-26` says always www.
  - `navigation.mdx:16` is labelled "Left, in order" but lists the centre items.
  - `navigation.mdx:17` (no chip in the bar) contradicts `:49` (a status chip in the badge).
  - `navigation.mdx:18` names `ThemeToggle`, but tool sites hand-roll the button.
  - `app-shell/meta.ts:15` and `rail-nav/meta.ts:5` (see H2).
  - krizaka-com: `lib/nav.ts:1-9` says dev.<product>.com; `TopNavBar.tsx:6` says ui and java carry the switcher; `tests/nav.test.mjs:6-7` contradicts `:72-80`.
  - The NAV-SYS section §2.1 named in the brief does not exist in krizaka-com `AGENTS.md`.
- *Hurts.* D: coding agents read these first (`AGENTS.template.md` §8).
- *Recommendation.* One krizaka-ui PR that rewrites `nav-bar/meta.ts`, `app-shell/meta.ts`, `rail-nav/meta.ts` and `navigation.mdx` to the target in §4. Then one krizaka-com PR that moves the NAV-SYS comment into an `AGENTS.md` §2.1 and fixes the stale lines.

**M2 · « Krizaka TS » is used where the rule says « Krizaka TypeScript ».**
- *Evidence.* `krizaka-ui:packages/ui/src/sites/sites.ts:57`; `krizaka-ts:site/messages/en.json:3`.
- *Hurts.* V, D.
- *Recommendation.* Rename in `sites.ts:57` (this flows to every footer and to the ui home) and in krizaka-ts `messages/{en,fr}.json`.

**M3 · Contact has nine labels.**
- *Evidence.*
  - EN:
    - « Contact us » — `krizaka-com messages/en.json`; `sites.ts:139`.
    - « Contact » — product footers.
    - « Talk to us » — H1.
    - « Talk to us first » — `akinaza en.json:63`.
    - « Talk to us about Akinaza » — `:43`.
    - « Contact support » — `orochia en.json:3056-3067`.
  - FR:
    - « Nous contacter » — `krizaka-com fr.json:75`.
    - « Nous écrire » — `sites.ts:165`; `translations.landing.ts:130`.
    - « Nous parler » — `translations.landing.ts:195`.
  - Akinaza even translates « Talk to us » as « Nous écrire » (`en.json:125`).
- *Hurts.* V: the same destination wears different names.
- *Recommendation.* Two labels only (§4.3):
  - company bar: « Contact us » / « Nous contacter »;
  - product footer: « Contact » / « Contact ».
  - Align `sites.ts:165` (`familyLabels.fr`) with krizaka-com's « Nous contacter ».

**M4 · « Docs » and « Documentation » are mixed.**
- *Evidence.*
  - Orazaka: a « Docs » column whose first link is « Documentation » (`translations.landing.ts:16`, `:107`).
  - Orochia: footer « Docs » in EN but « Documentation » in FR (`en.json:328` / `fr.json:328`).
  - ui: Search the documentation / Documentation / Search the docs (`en.json:17`, `:27`, `:76`).
  - krizaka-com: the 404 says « Documentation » for a page that no longer exists (`not-found.tsx:31`).
- *Hurts.* V, D.
- *Recommendation.* « Docs » in the bar and footer, in both languages. « Documentation » only in running text and page titles.

**M5 · GitHub is not reachable at every width.**
- *Evidence.* krizaka-com `MobilePanel.tsx:31-66`; ui `SiteBar.tsx:79`; java `TopBar.tsx:78`; ts `TopBar.tsx:73`; motion `App.tsx:89`; Orazaka `LandingNav.tsx:65`; Yomizaka `SiteChrome.tsx:45`; Akinaza `:53`; Yasakia, Yororis and Kachizaka likewise. The blog's panel goes to the org instead of the repo (`TopBar.tsx:102`). Orochia has no repo link at all.
- *Hurts.* D on a phone or a narrow window.
- *Recommendation.* `NavBar.Mobile` should render `NavBar.Repo` as a row itself, or document `<NavBar.Repo placement="panel">`. Align the bar link's visibility with the panel breakpoint: the shared toggle and panel are `md:hidden` (`krizaka-ui:packages/ui/src/nav-bar/nav-bar.tsx:57-59`), so a bar repo hidden until `lg` still leaves a gap from `md` to `lg`. Show the bar repo from `md`, or keep the panel available until `lg`. Every caller must adopt the same boundary; verify phone, intermediate and desktop widths.

**M6 · Theme toggles are hand-rolled on the company and tool sites.**
- *Evidence.* krizaka-com `TopNavBar.tsx:86-96`; blog `TopBar.tsx:83-85`; ui `SiteBar.tsx:81-83`; java `TopBar.tsx:80-82`; ts `TopBar.tsx:75`; motion `App.tsx:90-100`; Yororis `Bar.tsx:25-31`. All the products except Yororis use `ThemeToggle`.
- *Hurts.* D (seven copies to keep in sync); V (different aria-labels per site).
- *Recommendation.* Use `ThemeToggle` from `@krizaka/ui/theme`. If the static sites need their own storage, add a `storageKey` / `onChange` prop rather than copying the button.

**M7 · Dead, looping or misleading links.**
- *Evidence.*
  - krizaka-com 404 « Documentation » → `/docs` → 308 to /open-source (`not-found.tsx:31`; `ui-redirects.ts:47-49`).
  - Yororis anchors are dead on `/changelog`, and the bar's order differs from the page's (`Bar.tsx:52-58`; `Home.tsx:77`, `:98`, `:140`).
  - Orazaka:
    - sign-in → `/features/<route>` (a 308, `AuthScreen.tsx:45`);
    - the legal-page brand → `/login` (`LegalPage.tsx:29`);
    - the console login « home » → `dev.orazaka.com` (`console/login/page.tsx:20`).
  - Orochia « Open Consumer App » → `localhost:3000` (`ConsoleShell.tsx:91`), and a dead ⌘K hint (`AppBar.tsx:63`).
  - Yasakia: the label « Yasakia on krizaka.com » points to www.yasakia.com (`apps/web/messages/en.json:8`).
  - java « Guides » → a single module page lit on almost every page (`TopBar.tsx:55-57`).
  - ts « Packages » → the first package (`TopBar.tsx:50-52`).
- *Hurts.* V, O.
- *Recommendation.* Fix each in its repo issue (§5).

**M8 · Duplicate or drifting entries in the app shells.**
- *Evidence.*
  - Orazaka: Settings in the rail (`/settings`) and in the menu (`/settings/appearance`) (`Header.tsx:58`); Profile → `/settings/account`.
  - Yomizaka: « Account » in the rail and the menu, but « Settings » in the site menu (`ConsoleShell.tsx:51`, `:83`; `BarSession.tsx:62`).
  - Akinaza: « Profile » item plus menu « Settings » → the same page; the client's « My bookings » and « My shop page » → `/app` (`routes.ts:46-47`).
  - Kachizaka: two items current at once (`AppFrame.tsx:35`, `:57`).
  - Orochia: Messages in the header and in the menu (`AppBar.tsx:72`; `app-nav.ts:29`).
- *Hurts.* O.
- *Recommendation.* The rule (§4.2):
  - the account menu holds the account (Profile or Settings, theme, language, Sign out);
  - the rail never repeats it;
  - one name per destination.

**M9 · Locale strategies diverge.**
- *Evidence.*
  - Unprefixed URL:
    - Yomizaka: cookie, else EN (`proxy.ts:15`).
    - Akinaza: FR-first, Loi 96 (`locale-negotiation.ts:3-20`).
    - Kachizaka: cookie, else EN, with no Accept-Language (`proxy.ts:33`).
    - Orochia: a rewrite, not a redirect (`proxy.ts:31-46`).
    - Yasakia: three prefix schemes.
    - Yororis: `/en` is the member space but `/fr` is marketing (`next.config.mjs:59-60`).
    - Orazaka: no prefix and `<html lang="en">` fixed (`layout.tsx:65`).
- *Hurts.* V (the French-speaking Québec visitor in particular), D.
- *Recommendation.* One rule, written in `@krizaka/i18n` and cited by every product:
  - prefix every page;
  - an unprefixed URL resolves cookie → Accept-Language → FR or EN — **TO VALIDATE (Oussama)**: Akinaza's FR-first default under Loi 96 versus everyone else's EN default;
  - `<html lang>` always matches the page.

**M10 · « DEV » is hard-coded in production chrome.**
- *Evidence.* Yasakia landing footer `env="dev"` (`apps/site/components/SiteChrome.tsx:96`); Yororis site and app (`Footer.tsx:17`; `ConsoleShell.tsx:99`); the Kachizaka admin brand (`AppFrame.tsx:42`).
- *Hurts.* V (trust).
- *Recommendation.* Derive `env` from the deployment, as Kachizaka's and Yomizaka's site footers already do.

**M11 · Hand-made navigation slips past the `no-hand-made-nav` ratchet.**
- *Evidence.*
  - Headers: Orazaka `LegalPage.tsx:27-50`; Yasakia legal pages `apps/web/components/SiteChrome.tsx:20-43`.
  - Language: blog `TopBar.tsx:86-90` (a plain link); Yororis app `ConsoleShell.tsx:84-87`.
  - GitHub: blog `TopBar.tsx:78-82`.
  - Mobile group: Akinaza `SiteChrome.tsx:63-70`.
  - Breadcrumb: Yomizaka `PlaceView.tsx:44-52`.
- *Hurts.* D, and V on mobile: the Yasakia legal header has no panel.
- *Recommendation.*
  - Legal pages render the site's own bar.
  - Language: `NavBar.Language` or `LanguageSwitch`.
  - Mobile group: `NavBar.MobileGroup`.
  - Breadcrumb: `@krizaka/ui` exports no breadcrumb (no `crumb` entry in `krizaka-ui:packages/ui/package.json` exports), so add one (§4.4).
  - Extend `navigation.mdx:60-62`'s ast-grep rule to these patterns.

**M12 · Footers do not carry Contact and legal links consistently.**
- *Evidence.*
  - **Contact:** absent on ui, java, ts, motion, Orochia and Yororis (mailto only). `SiteFooter` shows the Krizaka column with Contact only when `current === "krizaka"` (`site-footer.tsx:94-99`, `:134`). The blog gets it only by misdeclaring itself `current="krizaka"`, and so also lists all 7 products (`krizaka-blog:app/components/SiteFooter.tsx:17`).
  - **Privacy and Terms:**
    - absent on ui, java, ts, blog and the Yasakia landing;
    - Terms absent on Akinaza and Yororis.
- *Hurts.* V.
- *Recommendation.* Add a `contact` prop (or a default « Contact » link for non-`krizaka` sites) and a `legal` default to `SiteFooter`. First register `blog` in `SiteId`, `sites` and the EN/FR descriptions (`krizaka-ui:packages/ui/src/sites/sites.ts:9`, `:46-61`, `:120-133`, `:146-159`); `siteById` throws for an unknown id (`:67-70`). Only after that release can the blog declare `current="blog"`.

### Low

**L1 · Vague or ambiguous labels.**
- *Evidence.*
  - Yomizaka « A real run »; its FR « Une vraie vérification » is not a translation of it (`en.json:12` / `fr.json:12`).
  - Yororis « What it is / How we're building it / What it is not ».
  - Motion: « Specs » (titled « Mobile & Specs »); « Krizaka UI + Motion » is an inner gallery (`router.ts:96-110`).
  - Akinaza's possessives « Your books » / « My shop page ».
- *Recommendation.* Product ▾ children named by the user's job (« How it works », « Demo »), as in §4.

**L2 · FR typography and wording drift.**
- *Evidence.* « Démarrer » vs « Commencer » (java); straight apostrophes in Kachizaka (`fr.json:25`) vs typographic ones in Orochia; missing space before the colon in Yororis (`site fr.json:249`); « Connexion » vs « Se connecter » (Yomizaka `fr.json:127`).
- *Recommendation.* Fix with the canonical table in §4.3.

**L3 · Fixed header titles.**
- *Evidence.* Akinaza « Your shop » (`AppFrame.tsx:74`); Kachizaka « Your leagues » (`AppFrame.tsx:67`).
- *Recommendation.* The title names the page, as Yomizaka's does (`console-nav.ts:28-34`).

**L4 · Stale comments that mislead agents.**
- *Evidence.* blog `TopBar.tsx:4-5` and `AGENTS.md:16`; motion `App.tsx:1-2`; java `TopBar.tsx:7`; Orazaka `LandingNav.tsx:21` and `LocaleSwitch.tsx:10`; Akinaza `AkinazaAccountMenu.tsx:21-22`; Yomizaka `lib/admin-nav.ts:2` and `lib/host.ts:2`.
- *Recommendation.* Fix in each repo's issue.

**L5 · Blog panel details.**
- *Evidence.* `closeLabel` reuses « Menu » (`TopBar.tsx:95`); the brand has no aria-label (`:41`).

**L6 · Mixed FR/EN slugs.**
- *Evidence.* Yomizaka `/app/bibliotheque`, `/recherche` under `/en/` (`console-nav.ts:9`); Akinaza `/aujourdhui` next to `/invoices` (`routes.ts:22`).
- *Recommendation.* **TO VALIDATE (Oussama)**: English slugs for both locales, or localised slugs. Never mixed.

**L7 · Changelogs are reachable only through a tiny version link.**
- *Evidence.* ui « v{version} » (`SiteFooter.tsx:26-28`); Orochia (`SiteFooter.tsx:35`); Kachizaka; java.
- *Recommendation.* A « Changelog » link in the footer's own column.

**L8 · The motion footer declares the wrong site.**
- *Evidence.* `current="github"` (`App.tsx:116`) where the id is `motion` (`sites.ts:59`).

**L9 · The blog sits in krizaka.com's tools zone.**
- *Evidence.* `TopNavBar.tsx:80-82`, while `sites.ts:82-87` files Blog under the company links.
- *Recommendation.* **TO VALIDATE (Oussama)**: keep Blog in the bar, or move it to the footer beside « Our story ».

**L10 · Language of the consoles, and « Settings » in FR.**
- *Evidence.* The Orazaka and Orochia consoles are English only (`console.ts:1-5`; `orochia app/console/layout.tsx:22`). Orazaka's console also mixes FR pages (`billing/page.tsx:12-17`). « Settings » is « Paramètres » in Orazaka and Orochia but « Réglages » in Yomizaka and Akinaza.
- *Recommendation.* **TO VALIDATE (Oussama)**: whether consoles are exempt from « Words live in the message catalogues (FR and EN) » (`AGENTS.template.md` §8.7). And one French word for Settings.

---

## 4 · The target navigation system (one page)

The rule every surface follows. It restates what `@krizaka/ui` already decided (`nav-bar/meta.ts:23-26`, `:32-33`; `nav-bar.tsx:483`; krizaka-ui#505, #551) and closes the gaps the audit found. It does not invent new conventions. The open choices are marked TO VALIDATE.

### 4.1 Every public site — one bar, three zones, one footer

```
[ mark + name ]   [ ≤ 4 own sections ]   [ search? · Repo · theme · language · primary? ]
```

- **Left:** the site's mark and full name, which links home. No family switcher (`nav-bar.tsx:483`). A version badge sits beside the brand on tool sites only (`NavBar.Badge`).
- **Centre:** only this site's own sections, never a link to another site. At most 5 items in all (`meta.ts:24`; `dev-preview.md:38`). A menu of ≤3 links is inlined automatically (`meta.ts:26`). Never a link that repeats the brand (« Overview » → `/`).
- **Right, in this order:** search, where there is content to search · `NavBar.Repo` · `ThemeToggle` · `NavBar.Language` · the site's primary action, if it has one.
- **Phone panel:** the same groups in the same order (`NavBar.MobileGroup`), then the GitHub row, then Preferences (theme, language), then the primary or the session (`navigation.mdx:22`). Signed in: « Open the app »; `AccountMenu` stays in the header at every width. A second account menu in the panel is optional, not required by #551. Align the repo's bar/panel visibility at one breakpoint (`md` today), with no gap at intermediate widths.
- **Footer:** `SiteFooter`. The site's own column holds only what the bar does not. Then the « A Krizaka … » signature, which is the way back to krizaka.com. Always a **Contact** link → `www.krizaka.com/contact?topic=<site>`. Always Privacy and Terms when the pages exist. The version links the changelog.
- **404:** `ErrorPage` inside the bar and footer, in the visitor's language, with Home, the main section, search if there is one, and Contact.

| Kind | Surfaces | Centre (allowed items) | Primary | Footer's own column |
| :--- | :--- | :--- | :--- | :--- |
| **Company site** | www.krizaka.com (and blog.krizaka.com as its publication) | Open source (krizaka.com) — Posts · Topics · Saved (blog) | « Contact us » / « Nous contacter » (krizaka.com only, `meta.ts:23`). Blog: TO VALIDATE, « krizaka.com » or none | On krizaka.com: All products, Open source, Changelog. Family columns only on krizaka.com (`current="krizaka"`) |
| **Tool site** | ui, java, ts, Motion | Get started · up to 3 sections, each landing on an index page, never on a first child | none | Docs sections not in the bar · Changelog · Source code · registry (npm, Maven) · Contact |
| **Product site** | www.<product>.com | **Product ▾** (How it works, Demo, …) · Platforms ▾ (if multi-platform) · **Docs** (if it exists) · **Pricing** (if it exists) (`meta.ts:25`) | `ProductBarActions`: « Sign in », or « Try <Product> » + « Sign in » when sign-up is open; signed in, `NavBar.Session` = « Open the app » + `AccountMenu` | How it works · Download (if any) · Docs · Privacy · Terms · Source code · Contact |

### 4.2 Every product app or console — one shell

```
AppHeader:  [ mark ]  [ page title ]          [ search? · notifications? · AccountMenu ]
Rail / Sidebar:  3–7 destinations, no duplicates        (bottom bar or drawer on phones)
```

- **Shell:** `AppShell` above 4 destinations, `RailNav` + `AppHeader` otherwise (`app-shell/meta.ts:10`). 3–7 items; an admin group may add more. Each destination appears **once**, under **one** name.
- **Header:** the page title, which names the page and is never fixed. Search when there is content. **`AccountMenu` at every width** (#551), showing avatar, name and email. It holds Profile or Settings, language, theme and « Sign out ». The rail never repeats these.
- **Primary action:** the app's main verb as the rail's first or foot item (Yomizaka « Check », Orochia « Create »). There is no filled button in the header.
- **404:** `ErrorPage` inside the shell.
- **Console:** the same shell. It shows the operator's identity in the header, like any app. Language: TO VALIDATE (L10).

### 4.3 Canonical labels (EN / FR)

| Concept | EN | FR | Never |
| :--- | :--- | :--- | :--- |
| Sign in | Sign in | Se connecter | Log in, Connexion (as a button) |
| Sign out | Sign out | Se déconnecter | Log out, Déconnexion |
| Try | Try <Product> | Essayer <Product> | Join (TO VALIDATE for Orochia), Get started (on a product) |
| Enter the app | Open the app | Ouvrir l'app | — |
| Docs | Docs | Docs | Documentation (in nav), Doc |
| How it works | How it works | Comment ça marche | Fonctionnement (Orazaka), What it does |
| Download | Download | Télécharger | — |
| Product contact (footer) | Contact | Contact | Talk to us, Nous écrire, Nous parler |
| Company contact (bar) | Contact us | Nous contacter | Nous écrire |
| Tool start | Get started | Démarrer | Commencer |
| Changelog | Changelog | **TO VALIDATE** (the catalogues were not compared) | — |
| Settings | Settings | **TO VALIDATE**: Paramètres (Orazaka, Orochia) or Réglages (Yomizaka, Akinaza) | both |
| Site names | Krizaka UI · Krizaka Java · **Krizaka TypeScript** · Krizaka Motion | same | Krizaka TS |

### 4.4 What belongs in `@krizaka/ui`

1. **`NavBar.Session`** (krizaka-ui#551). Signed out it renders `ProductBarActions`; signed in, « Open the app » plus `AccountMenu` in the bar, and « Open the app » in the panel. Preserve the header account menu at every width; duplicating it in the panel is optional. Consolidates Yomizaka's and Akinaza's already-compliant `BarSession` implementations.
2. **`NavBar.Mobile` renders the repo row.** When `NavBar.Repo` is present, the panel shows it as a row. Align caller breakpoints: with the current `md:hidden` panel, the bar repo must be visible from `md`, not `lg`. Alternatively change the panel and toggle boundary together. Fixes M5 only after each caller adopts the aligned boundary; test below `md`, from `md` to `lg`, and at/above `lg`.
3. **`SiteFooter` contact and legal defaults, and blog registration.** A `contact` prop (topic, source) that every non-`krizaka` site renders as « Contact », plus a `legal` slot convention (Privacy, Terms). Add `blog` to `SiteId`, `sites` (URL `https://blog.krizaka.com`) and both `familyLabels` descriptions before releasing support for `current="blog"`; `siteById("blog")` must resolve. Fixes M12 and unblocks the blog migration.
4. **`AppShell.Header` account slot.** A documented `account` slot for `AccountMenu`. Rewrite `app-shell/meta.ts:15` and `rail-nav/meta.ts:5` ("account in the header, at every width"). Fixes H2.
5. **`ErrorPage` localised defaults.** EN/FR default title, body and ways-back labels, plus a `global-not-found` recipe for static exports. Fixes H3.
6. **`Breadcrumb`.** A shared component for nested app and docs pages (none is exported today). Replaces `PlaceView.tsx:44-52`.
7. **`ThemeToggle` for static sites.** A `storageKey` / `onChange` prop, so the company and tool sites drop their hand-rolled buttons (M6).
8. **Docs and data fixes.** `nav-bar/meta.ts:14`, `:25`, `:32`, `:35-36`, `:64`; `navigation.mdx:16-18`, `:50`; `sites.ts:57` (« Krizaka TypeScript »); `sites.ts:165` (FR contact = « Nous contacter »). Extend the `no-hand-made-nav` rule (`navigation.mdx:60-62`) to hand-made headers, language links and mobile groups.

### 4.5 What each surface must change (summary — details in §5)

| Surface | Must change |
| :--- | :--- |
| krizaka-com | 404 « Documentation » → « Open source »; GitHub in the panel; `ThemeToggle`; write NAV-SYS into `AGENTS.md` §2.1; stale comments and tests header |
| krizaka-blog | `NavBar.Repo`, `NavBar.Language`, `ThemeToggle`; footer `current="blog"` + legal; 404 with chrome and both themes; close label, brand aria |
| krizaka-ui (site) | 404 localised with chrome; badge beside the brand; one language switch; `ThemeToggle`; footer Contact, Privacy, Changelog; one « Docs » wording |
| krizaka-build | 404 localised with chrome; « Guides » → an index; footer Contact; `ThemeToggle`; « Démarrer » everywhere |
| krizaka-ts | « Krizaka TypeScript »; « Packages » → an index; 404; footer Contact; `ThemeToggle` |
| krizaka-motion | Real 404; « Guides » not equal to the brand; messages not hard-coded; footer `current="motion"` + Contact; repo in panel; `ThemeToggle` |
| orazaka-web-client | `ProductBarActions` (#265); a 404; `<html lang>`; `LegalPage` → site bar; app: Settings once, `/automation`; console: identity, FR/EN, login link |
| yomizaka | `NavBar.Session`; Privacy out of the bar; one name for Account/Settings; localised 404 |
| akinaza | Link `/forgot-password`; sign-up copy from `signupOpen`; `NavBar.MobileGroup`; « Overview » out; shell duplicates; page titles |
| orochia | Primary Sign in when sign-up is closed (#403); footer Contact; repo link; ⌘K handler or remove the hint; « Docs » in FR; console identity in the header + 404 + no localhost |
| yasakia | `ProductBarActions` (#174); footer legal links + `env`; legal pages on the site bar; AccountMenu in the app header; app 404 |
| yororis | `ProductBarActions` with Sign in (#128); anchors only on the home; footer Contact, Terms + `env`; `ThemeToggle`; AccountMenu; shared language switch; deployed 404 |
| kachizaka | `ProductBarActions` (#109); AccountMenu in the header; one current item; page titles; DEV badge from env; catch-all 404 |

---

## 5 · Ready-to-file issues (one per repository)

The CTO files these; this audit opens none. Each one cites this document (`krizaka/.github:docs/audits/2026-10-ux-navigation.md`). Where an adoption issue for krizaka-ui#505 already exists, the new issue **adds to it or references it**, never duplicates it. **File the krizaka-ui issue first**: items 2, 3, 4 and 5 of §4.4 unblock the others.

**Acceptance shared by all repo-link adoptions below:** the repo is reachable by keyboard below `md`, throughout `md`–`lg`, and at/above `lg`, including immediately either side of each breakpoint. With the current `md:hidden` panel, replace caller `hidden lg:inline-flex` repo visibility with `hidden md:inline-flex` (or align both panel and toggle to the chosen boundary). A panel row alone is not sufficient.

### 5.1 krizaka/krizaka-ui — navigation contract: Session, panel repo, footer contact, shell account, 404, docs

- **Scope:** `packages/ui/src/{nav-bar,site-footer,app-shell,rail-nav,error-page,sites,theme}`, `apps/site`.
- **Changes:**
  1. Ship `NavBar.Session` (#551) with `placement` bar/panel, preserving `AccountMenu` in the header at every width. A second account menu in the panel is optional.
  2. `NavBar.Mobile` renders `NavBar.Repo` as a row. Align the bar repo, panel and toggle breakpoints and document the caller migration (`lg` → `md` for bar visibility with today's panel).
  3. `SiteFooter`: a `contact` prop (« Contact » → `www.krizaka.com/contact?topic=<id>&source=<id>-footer`) rendered for every `current !== "krizaka"`, plus a `legal` convention. Register `blog` in `SiteId`, `sites` (URL `https://blog.krizaka.com`) and `familyLabels.en/fr.descriptions` before the blog adopts `current="blog"`; see `sites.ts:9`, `:46-61`, `:67-70`, `:120-159`.
  4. `AppShell.Header`: an `account` slot. Rewrite `app-shell/meta.ts:15` and `rail-nav/meta.ts:5` to "AccountMenu in the header, at every width".
  5. `ErrorPage`: EN/FR default labels and a static `global-not-found` recipe.
  6. Add a `Breadcrumb` component.
  7. `ThemeToggle`: a `storageKey` / `onChange` prop for static sites.
  8. Docs and data:
     - remove `NavBar.Family` from `nav-bar/meta.ts:14`, `:32`, `:35-36`;
     - `meta.ts:25` dev → www;
     - `meta.ts:64` and `navigation.mdx:50`: drop « Talk to us »;
     - `navigation.mdx:16` « Left » → « Centre »; reconcile `:17` with `:49`;
     - `sites.ts:57` → « Krizaka TypeScript »;
     - `sites.ts:165` FR contact → « Nous contacter ».
  9. Extend `no-hand-made-nav` to hand-made `<header>`s, language links and mobile groups.
  10. The ui site itself:
      - the 404 uses `ErrorPage` inside `SiteRoot`, in FR on `/fr`;
      - `NavBar.Badge` moves beside the brand (`SiteBar.tsx:59`);
      - the duplicate language switch at sm–md goes (`:85`, `:93`);
      - `ThemeToggle` replaces `:81-83`;
      - the footer gains Contact, Privacy and Changelog, and stops repeating the bar;
      - the wording is « Docs » (`en.json:17`, `:27`, `:76`; `fr.json:17`, `:76`).
- **Acceptance:**
  - No `NavBar.Family` or « Talk to us » left in any `meta.ts` or `.mdx`.
  - Storybook or docs examples for `NavBar.Session`, the panel repo row, the footer `contact` prop and the header account slot.
  - Session examples keep the account accessible in the header at phone and desktop widths without requiring a panel duplicate.
  - Repo-link examples and the ui site meet the shared breakpoint acceptance above, including `md`–`lg`.
  - `siteById("blog")` resolves, both locale descriptions exist, and `SiteFooter current="blog"` renders in EN/FR without the company-only family columns.
  - `/fr/does-not-exist` on ui.krizaka.com shows a French 404 with the bar and footer.
  - The changelog entry lists each change.

### 5.2 krizaka/krizaka-com — 404 link, GitHub on phones, NAV-SYS written down

- **Scope:** `app/[locale]/not-found.tsx`, `app/components/{TopNavBar,MobilePanel}.tsx`, `lib/nav.ts`, `tests/nav.test.mjs`, `AGENTS.md`, `messages/*.json`.
- **Changes:**
  1. The 404's « Documentation » action (`not-found.tsx:31`) becomes « Open source » → `/open-source`, and the 404 text stops promising "the documentation".
  2. `NavBar.Repo` in the panel (or adopt the krizaka-ui panel row).
  3. `ThemeToggle` replaces `TopNavBar.tsx:86-96`.
  4. Move the NAV-SYS rules from `lib/nav.ts:1-9` into a new `AGENTS.md` §2.1, with www (not dev). Fix `TopNavBar.tsx:6` and `tests/nav.test.mjs:6-7`.
  5. Remove the dead `/docs` branch in `TopNavBar` (`:60-78`) and the unused `nav.*` keys.
  6. Move the bar inside the layout, not inside `<main>`, on the 404 (`not-found.tsx:17-18`).
  7. **TO VALIDATE (Oussama):** keep Blog in the bar or move it to the footer (L9).
- **Acceptance:** `nav.test.mjs` asserts the 404 has no `/docs` link and that the panel contains the repo. `AGENTS.md` has §2.1 NAV-SYS. Tests green.

### 5.3 krizaka/krizaka-blog — shared parts, honest footer, a 404 with chrome

- **Scope:** `app/components/{TopBar,SiteFooter}.tsx`, `app/global-not-found.tsx` (or a new `not-found.tsx`), `AGENTS.md`, `messages/*.json`.
- **Changes:**
  1. `NavBar.Repo` replaces the hand-made GitHub link (`TopBar.tsx:78-82`). The panel links the same repo (`:102`).
  2. `NavBar.Language` replaces the plain link (`:86-90`).
  3. `ThemeToggle` replaces `:83-85`.
  4. `closeLabel` uses a « Close » key (`:95`), and the brand gets an aria-label (`:41`).
  5. After adopting the krizaka-ui release that registers `blog` (§5.1), the footer declares `current="blog"`, with Privacy, Terms and Contact, and stops listing the whole family.
  6. A 404 with TopBar and footer, following the user's theme, in the page's language.
  7. Link `/series` from the bar or footer.
  8. Fix the `TopBar.tsx:4-5` and `AGENTS.md:16` comments (no family switcher).
- **Acceptance:** an unknown URL shows the bar, the footer and three ways back in light and dark. The footer shows Contact and no product list. No `GitHubMark` import left in `TopBar.tsx`.

### 5.4 krizaka/krizaka-build — java.krizaka.com bar, footer and 404

- **Scope:** `site/app/components/{TopBar,FamilyFooterView}.tsx`, `site/app/global-not-found.tsx`, `site/messages/*.json`.
- **Changes:**
  1. « Guides » points to a guides index, lit only on guide pages (`TopBar.tsx:55-57`).
  2. `ThemeToggle` (`:80-82`).
  3. GitHub in the panel.
  4. The footer gains Contact and Changelog (`FamilyFooterView.tsx:39`).
  5. A localised 404 with the bar and footer (`global-not-found.tsx:15`).
  6. « Démarrer » everywhere (not « Commencer »).
  7. Fix the `TopBar.tsx:7` comment.
- **Acceptance:** `/fr/nope` shows a French 404 with chrome. « Guides » is not lit on the home. The footer has Contact.

### 5.5 krizaka/krizaka-ts — « Krizaka TypeScript », Packages index, footer, 404

- **Scope:** `site/messages/*.json`, `site/app/components/TopBar.tsx`, footer, `site/app/global-not-found.tsx`.
- **Changes:**
  1. The site name becomes « Krizaka TypeScript » (`en.json:3`; with krizaka-ui `sites.ts:57`).
  2. « Packages » / « Paquets » → a packages index (`TopBar.tsx:50-52`).
  3. `ThemeToggle` (`:75`).
  4. GitHub in the panel.
  5. Footer: Contact and Changelog.
  6. A localised 404 with chrome.
- **Acceptance:** no visible « Krizaka TS » string. `/fr/nope` is French with chrome. The footer has Contact.

### 5.6 krizaka/krizaka-motion — a real 404, honest bar, right footer id

- **Scope:** `src/App.tsx`, `src/core/router.ts`, `scripts/generate-routes.mjs`, `messages/en.json`.
- **Changes:**
  1. Unknown paths render a not-found page using `ErrorPage` (`router.ts:236-242`), and `404.html` keeps the 404 status.
  2. Remove the « Guides » bar item, which duplicates the brand (`App.tsx:61-65`), or give it its own index.
  3. Move « Guides » and « Experiments » into `messages/en.json`.
  4. Rename « Krizaka UI + Motion » to a label that says it is a gallery (**TO VALIDATE** the wording).
  5. Footer `current="motion"` (`:116`), plus Contact. The footer order matches the bar.
  6. `NavBar.Repo` in the panel (`:89`).
  7. `ThemeToggle` (`:90-100`).
  8. Fix the `App.tsx:1-2` comment.
- **Acceptance:** `/krizaka-motion/nope` shows « not found » with the bar. No hard-coded nav strings. The footer declares `motion`.

### 5.7 krizaka/orazaka-web-client — complements orazaka-web-client#265

- **Scope:** `src/features/landing/components/{LandingNav,LandingFooter,LegalPage}.tsx`, `src/app/layout.tsx`, `src/app/not-found.tsx` (new), `src/components/layout/{Header,Sidebar}.tsx`, `src/core/config/app-sections.ts`, `src/console/**`, `src/features/auth/components/AuthScreen.tsx`.
- **Changes:**
  1. **Site.**
     - `ProductBarActions` replaces `LandingNav.tsx:70-75` and `:95-102`. This is #265: link it, do not redo it.
     - Add `src/app/not-found.tsx` with the bar, footer and `ErrorPage`.
     - `<html lang>` follows the locale (`layout.tsx:65`).
     - `LegalPage` renders `LandingNav` and `LandingFooter`, not its own header (`:27-50`).
     - `AuthScreen.tsx:45` links `/#features`, and `:69` links the footer's contact URL.
     - The footer link « Documentation » becomes « Docs » (`translations.landing.ts:107`, `:208`).
     - « How it works » in FR is « Comment ça marche » (`:115`).
     - Remove « Nous parler » (`:195`).
  2. **App.**
     - Settings appears once: the rail or the account menu, not both (`Header.tsx:58`).
     - Give `/automation` a rail entry or remove it — **TO VALIDATE (Oussama)**.
     - One shell layout instead of 5 copies.
     - Unknown `/settings/<x>` → 404.
  3. **Console.**
     - `AccountMenu`, with the operator's name and email, in `ConsoleNav`.
     - One language per page.
     - The login « home » link → www (`console/login/page.tsx:20`).
     - A console 404 with chrome.
- **Acceptance:**
  - No « Talk to us » in the bar or the panel.
  - `/nope` shows Orazaka's bar and a 404.
  - Signed in to the console, the operator's email is visible at 375 px.
  - `/automation` is reachable, or the route is gone.

### 5.8 krizaka/yomizaka — complements yomizaka#243

- **Scope:** `apps/web/components/{SiteChrome,BarSession,SiteFooter}.tsx`, `apps/web/lib/nav.ts`, `apps/web/components/console/{ConsoleShell,PlaceView}.tsx`, `apps/web/app/[locale]/not-found.tsx`, `messages/*.json`.
- **Changes:**
  1. Adopt `NavBar.Session` to consolidate `BarSession`, preserving the account and Sign out in the header at every width (`BarSession.tsx:55-65`); no second account menu is required in the panel. Add the repo row and align bar visibility from `lg` to the panel's `md` boundary (`SiteChrome.tsx:45`).
  2. Privacy leaves the bar; it stays in the footer (`nav.ts:10`).
  3. Rename « A real run » / « Une vraie vérification » to one meaning in both languages (**TO VALIDATE** the wording).
  4. One name for `/app/settings`: the rail's « Account » is removed (the menu holds it), and the site menu says the same word.
  5. A localised 404 from the catalogue, with 2–3 ways back.
  6. The shared `Breadcrumb` replaces `PlaceView.tsx:44-52` once it ships.
- **Acceptance:** at 375 px a signed-in visitor can reach Settings and Sign out through the header account menu, including with the non-modal panel open. The repo meets the shared breakpoint acceptance. There is no Privacy in the bar. Public and app 404s are localised with 2–3 ways back; `/fr/nope` is French only.

### 5.9 krizaka/akinaza — complements akinaza#255

- **Scope:** `apps/web/components/SiteChrome.tsx`, `apps/web/components/account/{BarSession,AkinazaAccountMenu}.tsx`, `apps/web/components/app/AppFrame.tsx`, `apps/web/lib/{routes,app-nav}.ts`, `apps/web/app/[locale]/(app)/sign-in/page.tsx`, `apps/web/app/[locale]/not-found.tsx`.
- **Changes:**
  1. Link « Forgot your password? » from sign-in to `/forgot-password`.
  2. The sign-in page reads `signupOpen` (`sign-in/page.tsx:41-48`).
  3. Remove « Overview » from Product ▾ (`SiteChrome.tsx:17`).
  4. `NavBar.MobileGroup` replaces `:63-70`.
  5. Adopt `NavBar.Session`, preserving the header account menu at every width; a panel duplicate is optional. Add the repo row and align bar visibility with the panel breakpoint (`SiteChrome.tsx:53`).
  6. In the shell:
     - Profile appears once (`routes.ts:46`);
     - the client gets no « My shop page » → `/app` (`:47`);
     - the header title names the page (`AppFrame.tsx:74`).
  7. Contact labels: « Contact » in the footer; the hero and founder links read « Contact » or are removed — **TO VALIDATE** the wording.
  8. A localised 404.
  9. Fix the `AkinazaAccountMenu.tsx:21-22` comment.
- **Acceptance:** a locked-out owner reaches `/forgot-password` in one click from sign-in. No two sidebar items share a target. The FR and EN contact labels match. At 375 px the header account menu still provides Settings and Sign out, including with the panel open. The repo meets the shared breakpoint acceptance.

### 5.10 krizaka/orochia — complements orochia#403

- **Scope:** `apps/web/components/{AppBar,SiteFooter}.tsx`, `apps/web/messages/*.json`, `apps/web/console/components/ConsoleShell.tsx`, `apps/web/app/console/**`.
- **Changes:**
  1. Footer: Contact (→ `krizaka.com/contact?topic=orochia`) and Source code (`SiteFooter.tsx:45-49`).
  2. « Docs » in FR too (`fr.json:328`).
  3. Wire ⌘K to the search modal, or remove the hint (`AppBar.tsx:63`).
  4. Messages appears once: the header button or the menu.
  5. Console:
     - `AccountMenu` in the header with the operator's identity (`ConsoleShell.tsx:85-99`);
     - « Open Consumer App » uses the public URL, never `localhost` (`:91`);
     - a console 404.
  6. **TO VALIDATE (Oussama):** « Join » vs « Try Orochia ».
  7. Reference #403 for the outstanding visitor primary: when sign-up is closed, Sign in must be primary rather than ghost (`AppBar.tsx:108-115`); do not duplicate the adoption issue.
- **Acceptance:** the footer shows Contact. The FR footer says « Docs ». ⌘K opens search. The console shows the operator's email at 375 px. Signed out with sign-up closed, Sign in is the filled primary; with sign-up open, Join/Try is primary and Sign in is secondary (#403).

### 5.11 krizaka/yasakia — complements yasakia#174

- **Scope:** `apps/site/components/SiteChrome.tsx`, `apps/site/messages/*.json`, `apps/web/components/SiteChrome.tsx`, `apps/web/components/console/ConsoleShell.tsx`, `apps/web/app/[locale]/not-found.tsx`, `apps/web/app/app/[locale]/**`.
- **Changes:**
  1. `ProductBarActions` replaces « Talk to us » (#174).
  2. The landing footer: `env` derived from the deployment (`:96`); Privacy, Terms, Delete your account and « Contact ».
  3. The legal pages render the landing's `NavBar`, not a hand-made header (`apps/web/components/SiteChrome.tsx:20-43`). Fix the « Yasakia on krizaka.com » label (`apps/web/messages/en.json:8`).
  4. App: `AccountMenu` in the header (`ConsoleShell.tsx:73-85`); a 404 inside the app shell.
  5. The public 404 links How it works, Demo and Sign in, not legal pages only.
  6. **TO VALIDATE:** unify the three prefix schemes (M9).
- **Acceptance:** no DEV badge in production. The legal pages have the product bar and a phone panel. The app shows the account in the header at 375 px.

### 5.12 krizaka/yororis — complements yororis#128

- **Scope:** `site/components/{Bar,Footer,Shell}.tsx`, `site/messages/*.json`, `apps/web/next.config.mjs`, `apps/web/components/console/ConsoleShell.tsx`.
- **Changes:**
  1. `ProductBarActions` with « Sign in » (#128).
  2. The anchors render only on the home, in page order (`Bar.tsx:52-58`). On the changelog, the language switch links the other changelog (`:36-38`).
  3. `ThemeToggle` (`:25-31`).
  4. Footer: `env` from the deployment (`Footer.tsx:17`), « Contact » → krizaka.com/contact, Terms, Source code.
  5. Deploy the 404 (`next.config.mjs:39-40`).
  6. App:
     - `AccountMenu` in the header (`ConsoleShell.tsx:54-64`);
     - the shared `LanguageSwitch` replaces `:84-87`;
     - `env` from the deployment (`:99`).
  7. FR typography: `site fr.json:249`.
- **Acceptance:** the landing shows « Sign in ». There are no anchors on `/changelog`. `/nope` returns the Yororis 404. No DEV badge in production.

### 5.13 krizaka/kachizaka — complements kachizaka#109

- **Scope:** `apps/web/components/{SiteChrome,SiteFooter}.tsx`, `apps/web/components/app/AppFrame.tsx`, `apps/web/proxy.ts`, `apps/web/app/[locale]/**`.
- **Changes:**
  1. `ProductBarActions` replaces « Talk to us » (#109).
  2. Remove « Overview » from Product ▾ (`SiteChrome.tsx:15-18`).
  3. `AccountMenu` in the header (`AppFrame.tsx:47-53`).
  4. Exactly one item is current: exact match for the base `/app` (`:35`, `:57`).
  5. The header title names the page (`:67`).
  6. The admin DEV badge comes from the environment (`:42`).
  7. Add an `[...rest]` catch-all and a localised 404.
  8. Accept-Language in the locale fallback (`proxy.ts:33`) — **TO VALIDATE** together with M9.
  9. FR apostrophes.
- **Acceptance:** on `/app/profile` only Profile is current. No DEV badge in production. `/fr/nope` shows the French 404 with chrome.
