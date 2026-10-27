# UX audit — menus, items and navigation coherence (fresh pass, 2026-10-26)

- Issue: [krizaka/.github#215](https://github.com/krizaka/.github/issues/215). The first audit (#218) was closed as out of date: the bar changed with krizaka-ui#574, #577 and 3.55 / ADR-006.
- **Scope of this pass** (milestone B66): the three focus products, **Yomizaka**, **Akinaza** and **Orazaka** (public site, signed-in app, administration or console). Paused products are out. The company and tool sites (www, ui., java., ts., blog, motion lab) are not re-audited here; their rule is krizaka-com `AGENTS.md` §2.1 (NAV-SYS).
- **Method.** Read from the code at `origin/main` (yomizaka `df25bed`, akinaza `e170c4e`, orazaka-web-client `8ff8f61`), never from memory; every row names the file and the function or key. Line numbers are left out because they move; the key or symbol is what to search. No live site was opened in this session: what a page looks like at runtime is **not** claimed.
- Words are `EN / FR`, copied from the message files.

## 1. Inventory

### 1.1 Yomizaka

**Public bar** (`apps/web/components/SiteChrome.tsx`, items in `apps/web/lib/nav.ts`, flat links, no dropdown)

| Zone | Items, in order |
|---|---|
| Left | Mark + « Yomizaka » → home |
| Centre | What it does / Ce que ça fait (`/#what`) · A real run / Une vraie vérification (`/#proof`) · Docs / Docs · Pricing / Tarifs · Privacy / Confidentialité |
| Right | Source code (GitHub, `lg` and up) · theme (`md` and up) · language (`md` and up) · session action (`BarSession`: Sign in / Se connecter, « Try Yomizaka » once sign-up is open, « Open the app » + avatar menu when signed in) |
| Mobile panel | The five centre items, preferences (theme, language), session action. No GitHub link. |
| Footer (`SiteFooter.tsx`, product mode) | Column « Yomizaka »: Download / Télécharger (when listed) · Documentation · Pricing · Privacy · Terms / Conditions · Source code / Code source · Contact |
| Signed-in avatar menu in the public bar (`BarSession.tsx`) | My documents / Mes documents · Settings · Sign out (a smaller menu than the app's, no Profile or Billing) |

**Signed-in app** (`components/console/ConsoleShell.tsx`, `lib/console-nav.ts`, `@yomizaka/core` `sections.ts`)

| Part | Items |
|---|---|
| Rail (`RailNav`), `sections.<id>` | Home / Accueil (`library`, `/app`) · Applicant files / Dossiers (`files`, offered with the applicant-file flow, badge « to decide ») · Documents / Documents · Checks / Vérifications |
| Header (`AppHeader`) | Name + DEV chip · search (⌘K) · language switch · primary « Check a document / Vérifier un document » · account menu (name shown from `lg`) |
| Account menu | Profile / Profil → settings/profil · Settings / Réglages → settings/**securite** · Credits and usage / Crédits et usage → settings/facturation · Administration (admins, admin.yomizaka.com) · a theme row · Sign out / Se déconnecter |
| Settings sections (routes) | profil · apparence · securite · facturation · stockage · donnees |

**Administration** (`lib/admin-nav.ts`): People: Overview, Users, Documents · Engine: Flows, Runs · App: Config · Operations: Operations, Audit — 8 pages in 4 groups.

### 1.2 Akinaza

**Public bar** (`components/SiteChrome.tsx`, a single « Product » dropdown)

| Zone | Items, in order |
|---|---|
| Left | Mark + « Akinaza » → home |
| Centre | **Product ▾ / Produit ▾** containing Overview / Vue d'ensemble (home) · Pricing / Tarifs · Guide / Guide (the docs) |
| Right | Source code (`lg`+) · theme (`md`+) · language (`md`+) · session action (`BarSession`: Sign in / Se connecter, Try Akinaza / Essayer Akinaza, Open the app / Ouvrir l'app, avatar menu) |
| Mobile panel | Group « Product » with the same three, preferences, session action. No GitHub link. |
| Footer (`SiteFooter.tsx`) | The demo shop · Pricing · Guide · Privacy · Terms of use / Conditions d'utilisation · Source code · Contact |

**Signed-in app and administration** (`components/app/AppFrame.tsx`, `lib/app-nav.ts`, `@krizaka/ui` `AppShell`)

| Part | Items |
|---|---|
| Shop rail, by role permission | Today / Aujourd'hui · Clients · Invoices / Factures · Books / Livres · Shop / Boutique (hub). A client with no shop: My bookings / Mes réservations. Shop switcher: « Switch shop / Changer de boutique » |
| Header (`AppShell.Header`) | Title « Your shop / Votre boutique » · account menu only. Primary « New invoice / Nouvelle facture » is held by the frame on lists, by the page elsewhere (`screenPrimary`). |
| Account menu (`AkinazaAccountMenu`) | One link, « My account / Mon compte » → profile · language · theme · Sign out. Trigger label « Account / Compte ». |
| Administration rail (admin.akinaza.com, same `AppFrame admin`) | Overview, Users (People), Your shops, Tax ledger, Operations, Audit log, Tags and views, Prices (keys `overview users shops ledger operations audit organize prices`) |

### 1.3 Orazaka

**Public bar** (`features/landing/components/LandingNav.tsx`, items in `features/landing/utils/site-nav.ts`)

| Zone | Items, in order |
|---|---|
| Left | Mark + « Orazaka » → home |
| Centre | **Product ▾** containing How it works (`/#features`) · Download (`/desktop`) — then **Docs** as a flat link |
| Right | Orazaka web client on GitHub (`lg`+) · theme (`md`+) · language (`md`+) · `BarActions` (Sign in, Try Orazaka when sign-up is open, Open the app) |
| Mobile panel | Group « Product » with its two, a rule, Docs, preferences, `BarActions` |
| Footer (`LandingFooter.tsx`) | Privacy · Terms · Contact (→ `https://www.krizaka.com/contact`) · the Product column · the Docs column |

**Signed-in app** (`core/config/app-sections.ts`, `components/layout/Sidebar.tsx`, `Header.tsx`)

| Part | Items |
|---|---|
| Rail (`RailNav`; the same list is the phone's bottom bar, the ⌘K palette and the Mac app) | Studios · Chat · Jobs / Tâches · **Plan / Offre** (`packs`, `/packs`) · Usage & credits / Usage et crédits; foot: Settings / Paramètres · Admin (admins only). Home is the mark. |
| Header (`AppHeader`) | Name · theme toggle · notification bell · account menu (name shown) |
| Account menu | Profile / Profil → settings/account · **Settings** / Paramètres → settings/appearance · language (EN/FR) · Sign out / Se déconnecter |

**Operator console** (`console/components/ConsoleNav.tsx`, `console/core/copy/console.ts`): its own full-width bar with five sections (`config/sections.ts`; labels in `consoleCopy.nav`, e.g. Supervision, Operations, Models, People, Audit log, Billing & credits), a DEV badge, the theme toggle and a **sign-out icon button**; no language, no account menu, copy in English only.

## 2. Coherence matrix

✓ follows the convention · ✗ breaks it · n/a not applicable · ? not checked in this pass (no live site)

| Convention | Yomizaka | Akinaza | Orazaka |
|---|---|---|---|
| Brand left, mark + name = home | ✓ bar, ✓ app | ✓ bar, ✓ app | ✓ bar, ✓ app (rail: the mark only) |
| Product bar is flat links, short | ✓ (but 5, one is Privacy) | ✗ one dropdown of 3 | ✗ dropdown of 2 + Docs |
| « Docs » named the same | ✗ « Docs » in the bar, « Documentation » in the footer | ✗ « Guide » (bar and footer) | ✓ « Docs » (bar), footer column « Docs » |
| Language switch = `NavBar.Language` | ✓ | ✓ | ✓ |
| Theme toggle in the bar | ✓ | ✓ | ✓ |
| GitHub in the bar and the footer | bar ✓ (lg+), footer ✓, mobile panel ✗ | bar ✓, footer ✓, mobile panel ✗ | bar ✓, footer ?, mobile panel ✗ |
| Primary action is « use the app », never « Talk to us » | ✓ | ✓ (test `no-talk-to-us`) | ✓ in the bar; ✗ « Talk to us » stays as a link in two screens (see F8) |
| Contact in the footer, tracked | ✓ `contactHref("dev-yomizaka-footer")` | ✓ `contactHref("dev-akinaza-footer")` | ✗ fixed URL, untracked |
| Account menu in the header at every width | ✓ | ✓ | ✓ |
| Account menu holds the same things | ✗ | ✗ | ✗ (F1) |
| Where theme and language live (app) | language in header, theme in menu | both in menu | theme in header, language in menu (F2) |
| One signed-in frame component | `RailNav` + `AppHeader` | `AppShell` | `RailNav` + `AppHeader` (F2) |
| Family switcher | n/a (products independent) | n/a | n/a (console: none, as the rule says) |
| Search | ⌘K in the header ✓ | none in the frame's header (`AppFrame`) | ⌘K palette ✓ |
| Rail label = page title = URL | ✗ « Home » rail, « Library » title, `/app` (F5) | ✓ | ✗ « Plan » rail, `/packs` (F5) |
| EN and FR both complete | ✓ | ✓ | app ✓, **console English only** (F6) |
| 404 and language fallback | ? | ? | ? |
| Breadcrumbs | n/a in the app (URL is the state, tabs as routes) | ? | ? |

## 3. Findings, ranked by user impact

### High

**F1 — Three account menus for one family.** Who it hurts: a signed-in owner who uses two products.
Yomizaka: Profile · Settings · Credits and usage · Administration + a theme row (settings points to *security*, not a settings home); its public bar has a fourth, smaller one (My documents · Settings · Sign out).
Akinaza: a single « My account » + language + theme. Orazaka: Profile · Settings (→ appearance) + language, while the file's own comment says the menu holds only who you are and Sign out and the rail already has Settings.
Evidence: `ConsoleShell.tsx` (`AccountMenu links`), `AkinazaAccountMenu.tsx`, `Header.tsx`, `app-sections.ts` header comment.
Recommendation: one contract for `AccountMenu` content, applied by one frame (F2): identity header, **Profile**, **Settings**, **Billing** (only for a product that sells; « Credits and usage » where credits exist), **Administration** (admins), then the preferences block (**Language**, **Theme**), then **Sign out**. Settings is one entry that lands on the settings home, not a tab. krizaka-ui#589 (labelled theme row) and the `language` prop already exist.

**F2 — Three signed-in frames, composed three ways; theme and language move around.** Hurts: a signed-in owner (muscle memory), and every future product (a fourth copy).
Yomizaka and Orazaka compose `RailNav` + `AppHeader`; Akinaza uses `AppShell` (sidebar + header). Language is in the header (Yomizaka), in the menu (Akinaza, Orazaka); theme is in the header (Orazaka) or the menu (Yomizaka, Akinaza).
Recommendation: one `AppFrame` in `@krizaka/ui` taking sections, account links and the primary action as data; preferences always in the account menu (small screens have no room in the header), the header holds search, the primary action, notifications. Each product keeps only its section list. Same intent as ADR-004's update for native apps.

**F3 — Public bars are three shapes.** Hurts: a first-time visitor comparing products.
Yomizaka: five flat links, one of which is Privacy. Akinaza: one dropdown « Product » holding Overview (the home, already the mark), Pricing, Guide. Orazaka: a dropdown of two + Docs. A dropdown that holds fewer than four entries hides the items for no gain (the Orazaka file says it will go inline when a breakpoint-aware menu ships).
Recommendation: a product bar is flat links, at most four: *How it works* (anchor or page) · *Pricing* (when it exists) · *Docs* · (*Download* where an app exists). Privacy and Terms are footer only. « Overview/Home » is the mark.

### Medium

**F4 — The same thing has different names.** Hurts: a visitor, and the French reader most.
- Documentation: « Docs » (Yomizaka bar, Orazaka), « Documentation » (Yomizaka footer), « Guide » (Akinaza).
- Terms: « Terms » / « Conditions » (Yomizaka), « Terms of use » / « Conditions d'utilisation » (Akinaza).
- Settings: « Settings / Réglages » (Yomizaka), « My account / Mon compte » (Akinaza), « Settings / Paramètres » (Orazaka). The French word differs between two products that say « Settings ».
- Billing: « Credits and usage » (Yomizaka menu) · « Usage & credits » (Orazaka rail) · settings section `facturation`.
Recommendation: a shared vocabulary in `@krizaka/ui` (the labels `docs`, `terms`, `settings`, `billing` in EN and FR), read by the frames and footers; the docs/terms/settings words fixed above (**Docs / Docs**, **Terms / Conditions d'utilisation**, **Settings / Réglages**).

**F5 — Rail label, page title and URL disagree.** Hurts: a signed-in owner.
Yomizaka: rail « Home / Accueil » → `/app`, but the page title is « Library / Bibliothèque » and the code, messages and docs say `library`. Orazaka: rail « Plan / Offre » for `packs` (`/packs`), next to « Usage & credits ». Evidence: `sections.library` vs `shell.titles.library`; `appNav.packs`.
Recommendation: one word per destination in the rail, the title and the URL; if the destination is the home, call it Home everywhere, if it is the library, call it Library.

**F6 — Orazaka's operator console is a separate, unfinished chrome.** Hurts: an operator (internal, but it is the first admin surface of the engine).
Own bar with the sign-out as an icon button, no account menu, no language, English-only copy (`consoleCopy.nav` is a single English object), while the app beside it is bilingual.
Recommendation: render the console with the admin variant of the shared frame (F2): account menu, preferences, FR/EN copy. Akinaza's `AppFrame admin` and Yomizaka's `AdminShell` are the pattern.

**F7 — Icons repeat in Akinaza's rails.** Hurts: a user scanning a collapsed rail.
`ClockIcon` is Today, My bookings and Audit log; `BillingIcon` is Books, Invoices and Prices; `HomeIcon` is Shop and Overview; `ShieldIcon` is Tax ledger and Tags and views (`AppFrame.tsx` `ICONS`). In collapsed mode the icon is the only label.
Recommendation: one distinct icon per destination (krizaka-ui#637 adds document and place icons); ledger and tags and views are not shield-shaped.

### Low

**F8 — « Talk to us » survives in two Orazaka screens.** The bar is clean, but the closed-sign-in screen (`landing.closed.contact`) and the plan row in the account settings (`profile.planLink`) say « Talk to us », a vague label for a contact link (it is not the primary action there). Recommendation: « Contact us / Nous contacter », through the same tracked contact link as the footers.

**F9 — Orazaka's footer Contact is a fixed URL**, the other two use `contactHref("<campaign>")`; the origin of contact messages cannot be told apart. Recommendation: the shared `contactHref`.

**F10 — The mobile panel drops GitHub in all three** (the bar shows it from `lg`; the panel has Product/Docs, preferences and the session action). The footer has it for Yomizaka and Akinaza. Recommendation: put it in the panel's preferences block or accept footer-only as the rule, and write it down in the NAV-SYS target.

**F11 — Stale comments.** `LandingNav.tsx` still describes « Product ▾ · Platforms ▾ · Docs » (Platforms is gone); `admin-nav.ts` says « seven pages » for eight, and `operations` is both a group and a page key. Not user-visible; they mislead the next agent.

Count: 3 high, 4 medium, 4 low.

## 4. Target navigation system (proposal)

| Kind of surface | Bar / frame | Allowed items |
|---|---|---|
| Company site | `NavBar` (NAV-SYS in krizaka-com) | As krizaka-com `AGENTS.md` §2.1 |
| Tool site (ui., java., ts.) | `NavBar` | Brand · section links (≤ 4) · GitHub · theme · language · primary |
| **Product site** | `NavBar`, **flat links** | Brand (home) · How it works · Pricing (if any) · Docs · Download (if an app) · right: GitHub · theme · language · session action (Sign in / Try / Open the app) |
| **Product app** | one `AppFrame` | Rail: ≤ 5 destinations where you work, one word each. Header: search (when the app has search), the one primary action, notifications, account menu. Account menu: identity, Profile, Settings, Billing (if sold), Administration (admins), Language, Theme, Sign out |
| Administration / console | `AppFrame admin` | ≤ 5 top-level groups, the same account menu |

Rules: a place is on the rail **or** under the avatar, never both; footer carries Docs, Privacy, Terms, Source code, Contact (tracked); words come from the shared vocabulary (EN and FR); no « Talk to us ».

## 5. Fix list (issues opened, on the board as Next)

| Repo | Issue | Findings |
|---|---|---|
| krizaka-ui#739 | `AppFrame`: one signed-in frame (sections, account links, primary action as data; preferences in the account menu; admin variant) + the account menu content contract + shared vocabulary (docs, terms, settings, billing) | F1, F2, F4, F6 |
| yomizaka#429 | Adopt `AppFrame`; rename Home/Library; Settings lands on the settings home; bar to four flat links, Privacy to the footer; « Docs » in the footer | F1–F5, F11 |
| akinaza#396 | Adopt `AppFrame`; the public bar as flat links (Pricing · Docs); « Guide » → « Docs », « Terms of use » → « Terms / Conditions d'utilisation »; distinct icons | F1–F4, F7 |
| orazaka-web-client#294 | Adopt `AppFrame`; console on the admin frame, bilingual; flat bar; « Plan » → the word of its page; tracked contact; « Talk to us » → « Contact us »; stale comments | F1–F6, F8, F9, F11 |
| krizaka-com#421 | Write the target in AGENTS.md §2.1 (product site / app rows) once the frame ships | §4 |

Not checked and worth a live pass: the 404 and language-fallback pages, breadcrumbs, the Akinaza public shop pages, the phone and Mac apps' tab bars (Yomizaka's map says they share the section list).
