# Labels and project fields

Every repository of the `krizaka` organisation carries the same labels, so one search or one project view works
everywhere. The [Krizaka Roadmap](https://github.com/orgs/krizaka/projects/4) mirrors them in its fields.

## Labels

| Family | Labels | Rule |
| :--- | :--- | :--- |
| **Type** — exactly one | `type:feature` · `type:bug` · `type:chore` · `type:docs` · `type:design` · `type:marketing` · `type:ops` · `type:epic` | What kind of work it is. `type:epic` = a large initiative tracked through sub-issues. |
| **Priority** — exactly one | `priority:P0` blocking · `priority:P1` before opening widely · `priority:P2` soon after launch · `priority:P3` when there is room | P0 means nothing ships without it. |
| **Product** — exactly one | `product:krizaka` (building blocks, company) · `product:orazaka` · `product:orochia` · `product:yasakia` · `product:yororis` · `product:site` (krizaka.com, the organisation profile) | Set from the repository; cross-product work takes the product it unblocks. |
| **Area** — one or two | `area:infra` · `area:release` · `area:security` · `area:compliance` · `area:legal` · `area:accounts` · `area:payments` · `area:billing` · `area:media` · `area:mobile` · `area:notifications` · `area:ui` · `area:frontend` · `area:backend` · `area:ai` · `area:content` · `area:growth` · `area:docs` · `area:quality` · `area:dx` · `area:architecture` · `area:apps` · `area:deps` | The part of the system or business it touches. |
| **Owner** | `owner:oussama` | A manual action only Oussama can do: accounts, payments, DNS, Apple, Bunny, npm 2FA, legal, money. Everything else is done by contributors and Claude Code sessions. |
| **State** | `status:blocked` | Waiting on something outside the issue — say what in a comment, with its link. |
| **Dev preview** | `dev-preview` | A gap against [docs/standards/dev-preview.md](docs/standards/dev-preview.md); one criterion id in the title (`dev-preview: <criterion> — <product>`). Added to the project. |
| **Community** | `good first issue` · `help wanted` | Small and well scoped / help welcome. |
| **Resolution** | `duplicate` · `invalid` · `wontfix` · `question` | Why an issue was closed without a change. |
| **Automation** | `dependencies` · `javascript` · `github_actions` · `autorelease: *` | Set by Dependabot and release-please — not by hand. |

Replaced on 2026-10-11 (issues migrated): `P0`/`P1`/`P2` → `priority:*`; `bug` → `type:bug`; `enhancement` →
`type:feature`; `documentation` → `type:docs`; `backend`/`frontend`/`architecture`/`dx`/`payments`/`security`/`media-engine`
→ `area:*`; `prod-readiness` → the milestones.

## Project fields

| Field | Values | Filled from |
| :--- | :--- | :--- |
| Status | Backlog · Next · In progress · In review · Done | The weekly review (closed issues and merged PRs move to Done automatically) |
| Priority · Product · Area · Work type | as the labels | The labels |
| Owner | Claude session · Oussama | `owner:oussama` |
| Size | XS (< 1 h) · S (≤ ½ day) · M (≤ 2 days) · L (≤ 1 week) · XL (epic) | Triage |
| Milestone | the repository milestone | The issue |
| Quarter · Start date · Target date | 2026-Q4 … · dates | The milestone (an issue may override its target) |

## Milestones

Same title in every repository a milestone spans: `M0 · Société & comptes`, `M1 · Production Orochia`,
`M2 · Lancement public & marketing`, `M3 · Orazaka hors phase locale`, `Krizaka UI · W1–W5`, `Mobile · iOS TestFlight`,
`Novembre · Maven 0.2.0 (users, notifications, billing)`, `Yasakia · V1`, `Yororis — en construction` (no date, on
purpose). Dates and scope: [ROADMAP.md](ROADMAP.md).

## Opening an issue

Use the templates (feature, bug, epic, manual action). Add it to the project:

```bash
gh project item-add 4 --owner krizaka --url <issue-url>
```
