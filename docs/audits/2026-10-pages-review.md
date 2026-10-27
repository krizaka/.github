# Pages review: Yomizaka, Akinaza, Orazaka (2026-10-27)

Review of the dev environments exposed on www. (www.yomizaka.com, www.akinaza.com, www.orazaka.com), as queued in
`2026-10-26-plan-blocs-livraison.md` (« review and simplify the pages of the 3 products »). UI and UX first. Nothing is
implemented here: each product gets one issue grouping the fixes that ship together.

**Method.** Headless Playwright, phone 390 and desktop 1440, dark and light (`kz-theme`), full-page captures of every public
page and of the main signed-in pages of the demo personas. 293 captures, on Bunny:
`https://krizaka-assets.b-cdn.net/pr-assets/krizaka-com/pages-review-2026-10-27/<product>/<page>-<phone|desk>-<dark|light>.png`
(`p-` = public, `s-` = signed in; the path is slugged: `p-en-pricing`, `s-en-app-profile`). Accessibility figures come from a
DOM scan (unnamed controls, unlabelled inputs, headings), not from an audit tool.

**Not covered.** Akinaza's owner pages (`/app/shop`, `/clients`, `/invoices` answer 404 for the demo client persona; no owner
persona exists in the secrets) and both admin consoles (the sign-in form did not match the script). Both are listed as gaps in the issues.

Severity: **High** = broken, or a claim the code does not prove; **Medium** = breaks the page language or consistency;
**Low** = polish.

## Yomizaka (P0)

Issue: [krizaka/yomizaka#457](https://github.com/krizaka/yomizaka/issues/457)

| Page | Issue | Severity | Fix |
| :--- | :--- | :---: | :--- |
| `/app/dossiers` (« Applicant files », in the sidebar) | Page never renders: « This page could not be shown », React error #441 in the console, no h1. A main nav entry is dead. | High | Fix the error; until then hide the entry. Add a test that every sidebar route renders its h1. |
| `/app/verifications` (Checks) | The « Run » column is squeezed: the run UUID wraps one character per line, each row is about 150 px high, the page is 4 200 px long. | High | Fixed width or truncation with copy for the run id; rows one line. |
| `/app` (Library) | The binder card overflows its frame (empty block of about 300 px under « My documents », the card hangs out of its container); a box inside a box. At 390 the tabs are cut (« My docume »). | Medium | One binder card sized to its content; tabs scroll or wrap. |
| `/app` | Too many entry points: two header actions, four tiles (Ask, My documents, Checks, Search) that repeat the sidebar, Activity (4 figures + 4 sparklines), a chart, Credits. Not readable in 5 seconds; « Credits and usage » appears as heading and link. | Medium | Keep: the binder, latest checks, one primary action. Fold Activity and the week chart behind one link; drop the tiles that duplicate the sidebar. |
| `/app/documents` | Demo data repeats the same 9 files three times; « no text layer » on every row; date and size wrap on two lines. | Low | Seed distinct demo files; show « no text layer » only as a badge when it matters; widen the date and size columns. |
| `/app/check` | The « Included / Plan » panel and « Open → Credits and usage » say nothing useful before the drop; two primary buttons (« Check a document » in the bar and « Choose files »). | Low | Move the plan panel under the list; label the link « See your credits ». |
| `/app/settings/…` | The h2 under the heading repeats the e-mail twice (name and address); two empty h2 in the page outline; three subscription buttons side by side, test-mode notice above them. | Low | Name or « No name yet » once; remove empty headings; one primary subscribe, the others as a link. |
| `/sign-in` | « By signing in you accept the privacy notice »: missing space before the link at 390 (« acceptthe »). | Low | Fix the message markup (EN and FR). |
| `/` (home) | One action (« Sign in ») repeated three times (bar, hero, closing panel); the closing panel adds « Read the privacy notice » as a second action. « One real check »: the owl quote repeats the card text just above it, the figures line sits glued to the run id. « For whom » carries the privacy paragraph. | Medium | Hero: one primary action. Remove the quote or the card duplicate. Move the data paragraph to its own quiet line near the footer. |
| `/docs` | One 5 100 px page, no card or divider, plain text. Every route repeats the same 401/403/429 sentences (six times). | Medium | One « Errors common to every route » block; routes as a compact table; keep the first screen to « how a check works » and the API entry. |
| `/privacy` | One paragraph (about 8 lines) for a product that reads leases and pay stubs: no processors, retention, rights or officer, unlike Akinaza's. | High (legal, with the lawyer review) | Align with Akinaza's structure (who processes, retention, rights, contact). |
| Whole site | Duplicate routes: `/download` renders the home, `/verify` goes to sign-in. | Low | 308 to their target or remove. |
| Copy | Demo content is French in the English UI (« Immeuble Laurier (démo) », file names), acceptable as demo; the hero must keep « documents and screening », never identity verification (it does). | Low | Mark the demo collection as sample data. |
| Accessibility | `/app/check`: one unnamed control and one unlabelled input; muted text on the tiles and the « Activity » captions is under 4.5:1 in dark. | Medium | Label the file input; raise the muted token in the app. |

## Akinaza (P1)

Issue: [krizaka/akinaza#440](https://github.com/krizaka/akinaza/issues/440)

| Page | Issue | Severity | Fix |
| :--- | :--- | :---: | :--- |
| All pages | No « Development version » banner on the public site or in the app (Yomizaka has it). Only a footer line and a small DEV chip in the app bar. | High | Same banner as Yomizaka, from the shared component. |
| `/pricing` | Both plans list « (soon) » items with the same check mark as live ones (client payments, signed order contract, B2B orders and transfers). Two prices ($45, $99) while sign-up is closed; the price notes of 2026-10-21 say a 39 $ founder offer, to be confirmed with Oussama. « Scale B2B » is jargon. | High | Show only what runs with a check; the rest under « Planned » without check marks. Confirm the prices with the plan. Rename the plan in plain words. |
| `/pricing` | Both buttons are secondary, no primary action; the identical bullet lists make the plans hard to tell apart. | Medium | One primary button; list only what differs on the second plan (« Everything in Starter, plus… »). |
| `/` (home) | Hero mock is labelled `dev.akinaza.com` on www. The three cards show cropped app screens (empty band in « Pick a time »). « Posted in your neighbourhood » ends with an orphan fourth card; it has no action of its own. | Medium | Use the real host in the mock; crop the cards on their content; three flyers or a 2×2 grid; one link to the demo shop. |
| `/` | The scope line (« Not for restaurants, cafés, bars… », « return filed by you ») is a 12 px muted footnote below the fold. | Medium | Move it under the hero, readable size: it protects the product's claims. |
| `/docs` | The five guides appear twice (chips in the card and the list below). | Low | Keep the list only. |
| `/app` (client persona) | Empty state is honest (« No booking yet »). The bar has « Your account » as text with no visible menu; the sidebar is one icon without a label. Different shell from Yomizaka (avatar menu, labelled sidebar). | Medium | Same AppFrame as Yomizaka: avatar menu, labelled navigation. |
| `/app/profile` | Six unlabelled controls (name field, six avatar choices); « as your team sees them » and « Role: Member » do not apply to a client. | Medium | Label the field and the picture group; client-specific copy. |
| `/app/shop`, `/clients`, `/invoices` | 404 for the client persona (expected), so the owner pages could not be reviewed. | Gap | Create an owner demo persona (`AKINAZA_OWNER_*`) and run the review of the shop, the bookings, the invoices and the books. |
| 404 page | Clear and in the site language. | OK | None. |
| Copy | « Taxes prepared, return filed by you » is correct and consistent with `/docs/books` (« You file, Akinaza never does »); keep it. | OK | None. |

## Orazaka (top of P2)

Issue: [krizaka/orazaka#443](https://github.com/krizaka/orazaka/issues/443)

| Page | Issue | Severity | Fix |
| :--- | :--- | :---: | :--- |
| Site structure | 19 docs pages plus Download, Privacy, Terms; no pricing and editions page, no open-source page, no contact page (a footer « Contact » link only). The target lean structure (home, what it does, docs, pricing and editions, open source, contact) is not there. | High | Build the lean structure; fold the reference pages under one « Reference »; 308 the rest. |
| Unknown URL | `/nope-404` answers 200 and shows the login page. No 404 for the public site, bad for search engines and for readers. | High | Real 404 page on public paths; keep the redirect to `/login` only for signed-in routes. |
| `/` (home) | The captions of the screenshots are burned onto them (« Orazaka routes the request. », « The Studios catalogue. ») and cover the UI; the Studios card has about 150 px of empty space; « Read the documentation » is the primary action in the hero and again in the closing panel. | Medium | Captions below the images; crop on content; hero: « Read the documentation », closing panel: « Download ». |
| `/docs/*` | Every docs page carries the sidebar twice in the DOM (headings Start / Guides / Packs ×2, 9 unnamed controls) and 19 entries. | Medium | One navigation instance; names on the controls; group the reference pages. |
| `/privacy`, `/terms` | Internal jargon in titles (« Local Data Storage Invariant », « Commercial Cloud Bridges », « Local Execution Invariant »), numbered legalese, English only. | Medium | Plain titles; EN and FR; same structure as the other products. |
| `/login` | The page title « Orazaka » repeats the brand logo above it; password has no placeholder; no development indication. | Low | Title « Sign in to your workspace »; development banner. |
| `/` (signed in) | « No credits yet » next to « 500 credits granted each period »; « Export » floats alone under the credits card; three conversations named « New Memory Block »; the first creation is letterboxed with a black band; « 17 jobs · same as the period before » when the previous period is empty. | Medium | Reword the credits state; move Export into the card header; title conversations from the first message; crop images; verify the comparison text against the data. |
| `/studios` | 43 Studios in a flat list on phone (about 2 700 px), descriptions cut, « Run », « Get pack » and « See plans » mixed with the paid price in the label. | Medium | Group by trade and fold the groups; one action per row; price on its own line. |
| `/studios` | « Identity document check » (« Zone, dates and printed fields checked ») sits next to Yomizaka's « document verification, never ID verification ». | Medium | Rename to what it does (« Document fields check ») and keep the same wording across the family. |
| `/chat`, `/jobs`, `/packs`, `/usage` | Rail icons without a visible label; one unlabelled input in chat; titles Title Case (« Start a New Chat », « Plan & packs »). | Low | Labels or tooltips on the rail; sentence case. |
| `/desktop` | One unnamed link; the three first-launch steps are clear. | Low | Name the link. |
