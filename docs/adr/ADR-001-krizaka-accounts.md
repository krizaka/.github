# ADR-001 — Krizaka accounts, and the sign-in standard of every Krizaka product

- **Status**: Accepted (the runtime waits on Oussama's cost approval, see *Cost*)
- **Date**: 2026-10-16
- **Scope**: the sign-in standard of the family ([krizaka/.github#76](https://github.com/krizaka/.github/issues/76)):
  every product but Orochia (Orazaka web/mobile/Mac, Yomizaka, Yasakia, Yororis, Kachizaka, Akinaza and their admin
  consoles) and Krizaka's own accounts for the krizaka.com properties, whose first consumer is blog.krizaka.com.
  Amended 2026-10-16 (wider scope, account linking by verified e-mail, native PKCE, `SignInProviders`).
- **Repositories**: `krizaka-users` (the reusable block), `krizaka-accounts` (the Krizaka host, new), `krizaka-blog`
  (the first client), `krizaka-com` (privacy page)

## Context

blog.krizaka.com is Krizaka's own voice, not a product. Readers should be able to share a post, save it, comment and
get replies, so the people who come once come back. Signing in with GitHub, Google, Apple or Facebook creates a
**Krizaka account**: one per person for the krizaka.com properties, separate from every product's users (Orazaka,
Orochia… keep theirs; House of Brands, addendum 2026-10-15). Oussama asked for a dedicated, reusable module ("like
Passport, with a thin Krizaka layer"), on the existing PostgreSQL cluster `krizaka-dev-pg`, with its own database.

What exists:

- **`krizaka/krizaka-users`** (Krizaka Java, Apache-2.0, on Maven Central): registration, e-mail verification, password,
  Google/GitHub token exchange, profiles, API keys, RBAC, HS256 session JWT, Loi 25 export and erasure (admin), auth
  rate limiting and lockout. Orazaka dev runs it (one JVM of its `core` container, database `krizaka_users_db`).
- **The blog** is a static export on App Platform's free tier, plus two DigitalOcean Functions for the editors' GitHub
  sign-in (Decap CMS). It has no server and no database.
- **krizaka-com** already verifies Cloudflare Turnstile (`ABUSE_CAPTCHA_*`) and sends mail through `MAIL_*` (Mailgun).
- **Newsletter**: a separate session is building the blog's subscription (double opt-in, `MAIL_*`, no account). This ADR
  does not build a second list; it links an account to that subscription (below).

### What reading krizaka-users found (it must be fixed before anything relies on it)

| # | Finding | Effect |
|---|---|---|
| 1 | A federated user is stored with `provider = 'local'`, `provider_id = NULL` (`UserMapper.toDto`) | The **second** sign-in of the same Google/GitHub identity finds nobody, tries to create the user again and fails (unique `username`) → 500. Federated sign-in works once. |
| 2 | The Google ID token's `aud` is never compared with our client id | A Google ID token issued to **any** application is accepted (token substitution). |
| 3 | A GitHub access token is used without checking it was issued to our OAuth app | Same substitution, for GitHub. |
| 4 | `username` is the provider's display name, and it is unique | Two people called "Alex Martin" cannot both sign in. |
| 5 | Only token exchange from a front end (`POST /api/v1/auth/oauth`); no browser sign-in flow | A static site cannot sign anyone in with it. |
| 6 | No Apple, no Facebook, no passkeys, no magic link (issue `krizaka-users#21`) | Apple is mandatory for the products' iOS apps anyway. |

Findings 1–4 also affect Orazaka (its sign-up is closed today, which is why nobody has hit them).

## Options

### (A) Deploy krizaka-users as Krizaka's identity service — **chosen**

`accounts.krizaka.com` = a small Spring Boot host, **`krizaka-accounts`**, that embeds `krizaka-users-core` and
`-persistence` (the README's "embed it to host users inside your own application") plus the thin Krizaka layer: the
`community` module (comments, saved posts, reports, moderation queue, reply notifications) and the allowed origins.
One JVM, one database `krizaka_accounts`, one PgBouncer pool. The browser flow (finding 5) and the providers
(finding 6) go into **krizaka-users** itself, because every product needs them: the block becomes the Passport of the
family, and the blog is its showcase.

### (B) Better Auth inside a Node server

Better Auth is the turnkey TypeScript standard (it absorbed Auth.js): GitHub, Google, Apple, Facebook, passkeys, magic
links and a Postgres adapter. The blog has no server, so it would live in krizaka-com's Next.js server: **$0 more**.
But it is a second identity stack the JVM products cannot use, krizaka-users keeps its defects (Orazaka still depends
on it), and the family's module never becomes reusable.

### (C) giscus (GitHub Discussions) for comments only

Free and zero-ops, but GitHub accounts only, the data lives on GitHub, there is no Krizaka account, no saved-posts sync
and no Google sign-in. It does not meet the goal (keep the readers as Krizaka's), so it is not adopted, not even as an
interim step: a comment history created there could not be migrated to the accounts.

## Decision

(A). Option (B) is the fallback if the runtime cost below is refused: the blog talks to the accounts through one thin
client (`lib/accounts.ts`, later `@krizaka/accounts-client`) whose contract (session, sign-in URL, comments, saved)
does not depend on the server, so swapping the server does not touch the blog's UI.

### Identity (krizaka-users, reusable)

1. **Hardening first** (each fix starts with a failing test): persist `provider` / `provider_id` and find the user by
   them; check Google's `aud` (and `iss`, `exp`, `email_verified`); bind a GitHub token to our app
   (`POST /applications/{client_id}/token`); derive a unique `username` from the display name.
2. **Browser sign-in** (`/api/v1/auth/web/{provider}/start` → provider → `/callback`): authorization code with PKCE and
   `state` (a signed, short-lived, host-only cookie), the code exchanged server-side, the identity reconciled, a
   session cookie set — `HttpOnly`, `Secure`, `SameSite=Lax`, host-only on accounts.krizaka.com — and a redirect to a
   `return_to` on the allow-list only. `GET /api/v1/auth/session` (who am I, CORS with credentials for the exact allowed
   origins) and `POST /api/v1/auth/logout`. Every state-changing request checks `Origin` against the allow-list.
3. **Providers**: GitHub, Google (OIDC), Apple (OIDC, `form_post` callback, `client_secret` signed from the `.p8` key,
   ID token verified on Apple's JWKS), Facebook (code exchange, `debug_token` bound to our app id). Each one is on
   exactly when its credentials are set. **Passkeys and e-mail magic links are not in this step**: passkeys need a
   WebAuthn library and a second factor UI, magic links need the notifications relay; both stay in `krizaka-users#21`.
4. **Environment** (bounded context `AUTH_`, the vendor is part of the OAuth client's name as the blog already does):
   `AUTH_GITHUB_CLIENT_ID/SECRET`, `AUTH_GOOGLE_CLIENT_ID/SECRET`, `AUTH_APPLE_CLIENT_ID`, `AUTH_APPLE_TEAM_ID`,
   `AUTH_APPLE_KEY_ID`, `AUTH_APPLE_PRIVATE_KEY`, `AUTH_FACEBOOK_CLIENT_ID/SECRET`, `AUTH_ALLOWED_ORIGINS`,
   `AUTH_PUBLIC_URL`. krizaka-users' `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` are renamed (no compatibility layer; Orazaka
   does not set them).

### The family standard (krizaka/.github#76)

One implementation, many deployments. **The code is shared, the identities are not** (House of Brands): each
product runs krizaka-users (embedded or as its service) with **its own database and its own OAuth apps**; a person
who uses Orazaka and the blog has two unrelated accounts. Orochia keeps its own flow (age gating).

1. **Providers, in this order everywhere**: Apple, Google, GitHub, Facebook — then e-mail (magic link or password)
   and passkeys where cheap. On a developer-facing surface (the blog, Krizaka UI/Java sites, Orazaka's console)
   GitHub may come first. Each product turns on the providers whose credentials it has; the code for all four
   ships once in krizaka-users.
2. **Buttons**: `@krizaka/ui` `SignInProviders` (web and native), drawn to each provider's official guidelines
   (Apple's Human Interface Guidelines for Sign in with Apple, Google's branding guidelines, GitHub's mark, Meta's
   Facebook Login button) — the provider's mark and words, never restyled into the product's palette. Same order,
   same consent line under them, on every product.
3. **App Store 4.8**: an iOS app that offers Google, GitHub or Facebook offers Sign in with Apple too. No product
   ships social sign-in on iOS before Apple is on.
4. **Account linking by verified e-mail** (industry practice): a new provider identity joins an existing account
   **only** when the provider asserts the address is verified (Google `email_verified`, Apple `email_verified`,
   GitHub's verified primary address) **and** the existing account's address is verified too. Facebook gives no
   verification signal: it never links automatically. Otherwise a separate account is created; a signed-in person can
   link a provider from their account page. One account holds several identities (`user_identities`).
5. **PKCE on mobile and desktop** (RFC 8252): the app opens the system browser on the same `/api/v1/auth/web/{p}/start`
   with its own PKCE challenge and an allowed app redirect (`orazaka://auth`, a claimed https link on iOS); the
   service redirects back with a one-time code, which the app exchanges with its verifier at
   `POST /api/v1/auth/web/token` for a session token. No embedded web view, no provider secret in an app.
6. **Loi 25**: the same consent text under the buttons (what is kept, why, link to the product's privacy page),
   self-service export and deletion in every product (krizaka-users' endpoints), minimal data.
7. **Credentials**: per product and per domain, `AUTH_<PROVIDER>_CLIENT_ID` / `_SECRET` (`AUTH_APPLE_TEAM_ID`,
   `_KEY_ID`, `_PRIVATE_KEY`) in the product's env file and its App Platform secrets. Callback:
   `https://<product's auth host>/api/v1/auth/web/<provider>/callback`. The click-by-click steps for each product's
   OAuth apps are in its wiring issue (label `dev-preview`, org project 4).
8. **Where it runs for the TypeScript products.** Orazaka already runs krizaka-users (a JVM of its `core`). Yomizaka,
   Yasakia, Kachizaka and Akinaza have hand-built Node auth on their own databases. Options measured against the
   cost gate: a JVM per product (≈ 290 MiB each, $5/month × 4 = $20/month — refused without Oussama); a TypeScript port
   (two implementations of the same rules — refused); **one multi-tenant krizaka-users** (chosen): the
   accounts.krizaka.com service gains *tenants* — per tenant its own database (the product's existing database and
   PgBouncer pool, schema `identity`, so no new connection), its own OAuth apps, allowed origins and cookie, its own
   custom domain on the same App Platform service (`auth.dev.<product>.com`, so the product never shows Krizaka).
   $0 more than the accounts service. The products' BFFs replace their sign-in with a call to their tenant
   (`krizaka-users#` tenants issue). Until that lands, each product keeps its current e-mail sign-in, and its wiring
   issue lists what waits.

### Provider order for a developer audience

1. **GitHub and Google** — free, no review, what developers use. Enabled first.
2. **Apple** — needs the Apple Developer account ($99/yr, not bought yet). Code ready, off until the keys exist.
3. **Facebook** — Meta app review and business verification, little value for developers. Code ready, last.

### Community (krizaka-accounts, Krizaka only)

- **Comments**: one level of replies; markdown-lite (bold, italic, inline code, links `rel="nofollow ugc noopener"`;
  everything else escaped, no HTML, no images); edit and delete one's own (a deleted comment with replies keeps a
  tombstone so the thread still reads).
- **Moderation**: an account's **first comment is held** until an administrator (`ROLE_ADMIN`, krizaka-users' RBAC)
  approves it; later comments publish at once. Anyone signed in can **report** a comment (once per comment); a comment
  reported by enough accounts is hidden pending review. Thresholds, rate limits (comments per account per hour) and the
  held-first-comment rule are **settings in the database** (the parameters rule of 2026-10-15), with safe bounds in code.
- **Spam**: Turnstile on every comment (the token is verified server-side with `ABUSE_CAPTCHA_SECRET_KEY`, the public
  site key is the blog's), the per-account rate limit, and the per-IP limits krizaka-users already has.
- **Saved posts**: the browser list (Phase 1, `lib/saved.ts`) is merged into the account at sign-in (`mergeSaved`) and
  kept in sync after.
- **Reply e-mails**: off by default, turned on by the reader (per account, and per thread); sent through the existing
  `MAIL_*` provider; every mail has a signed one-click unsubscribe link (`List-Unsubscribe` and
  `List-Unsubscribe-Post`). No digest, no marketing.
- **Newsletter**: not here. A signed-in account whose verified e-mail has a confirmed subscription shows it on the
  account page and can end it; nothing is subscribed by signing in.

### Privacy (Loi 25)

- **Minimal data**: provider and its stable id, the e-mail the provider verified, display name, avatar URL, the
  account's comments, saved posts and notification choices. No password for these accounts, no IP address stored past
  the rate-limit window, no analytics, no third-party script.
- **Export** (`GET /api/v1/me/export`, JSON of everything above) and **deletion** (`DELETE /api/v1/me`: the account, its
  saved posts and settings are deleted; its comments are deleted, or become tombstones when they have replies) are
  self-service, in the same database and one transaction.
- The **privacy page** of krizaka.com gets a "Krizaka accounts" section (what, why, how long, who is responsible, how
  to export and delete) before the sign-in is switched on; the blog links to it next to the sign-in.

### Database

`krizaka_accounts` on `krizaka-dev-pg`, its own role `krizaka_accounts` (password only in
`~/Documents/krizaka/krizaka-accounts.env`), and its pool **`pool-accounts`: 2 connections, transaction mode** —
the pools now total **22 of the cluster's 22 usable connections**. The service uses `prepareThreshold=0` (PgBouncer
transaction mode) and a Hikari maximum of 2. Created 2026-10-16, identity schema applied. A further consumer of the
cluster needs a smaller pool elsewhere or the next cluster size.

### Messaging

krizaka-users publishes its domain events through an outbox to RabbitMQ (verification and reset e-mails, which
OAuth-only accounts never need). The host joins the **existing** dev broker on its own virtual host; no new broker. The
service starts without a broker (measured), but its health would report DOWN, so the deployment points it at the broker.

## Cost

**Measured** on 2026-10-16: `krizaka-users-service` (the same JVM flags as Orazaka dev: serial GC, C1, `-Xmx160m`)
against `krizaka_accounts` through `pool-accounts`: started in 8 s, **289 MiB resident** after 300 sign-in attempts and
300 health checks. The community module adds a few entities and controllers to the same JVM.

| Where | Monthly | Verdict |
|---|---|---|
| A new App Platform service, `apps-s-1vcpu-0.5gb` (512 MiB) | **$5** | Fits (≈ 220 MiB headroom). The recommended runtime. |
| A sixth JVM in Orazaka dev's `core` container | $0 | Rejected: ties Krizaka's identity to Orazaka's deploys (one JVM down restarts all five), eats the memory budget of five JVMs and the pack workers, and breaks House of Brands. |
| A second component of the `krizaka-com` app | $5 | Same price as its own app (App Platform bills per container), more coupling. |
| Option (B) inside krizaka-com's Node server | $0 | The fallback. |

The cloud is already above the $100/month cap (INFRA-COST, 2026-10-16: ≈ $106). Even though $5 is at the threshold,
**the app is not created without Oussama's written approval**; everything else is built and tested. On approval:
create the app from `krizaka-accounts/.do/app.yaml` (project `krizaka`), add it to the cluster's trusted sources, set
the secrets, point `accounts.krizaka.com` (Porkbun CNAME) at it, then set `APP_ACCOUNTS_URL` on the blog.

## Consequences

- The blog's comments, sync and sign-in stay hidden until `APP_ACCOUNTS_URL` is set at build; share and save work today.
- krizaka-users gains what every product needs (fixed federation, browser flow, Apple, Facebook); Orazaka and the
  products' mobile apps benefit when they upgrade.
- Maven Central releases are paused until November: `krizaka-accounts` builds `krizaka-users` from source in CI
  (`upstreams`) and in its Docker image, as Orazaka does.
- Asymmetric session tokens (ES256 with a JWKS, `krizaka-users#22`) would let www and other hosts verify the session
  without sharing the HS256 secret; not needed while only accounts.krizaka.com reads the cookie.
- Waiting on Oussama: the $5/month approval, the GitHub and Google OAuth apps (steps in the orchestration file), later
  the Apple Developer account and the Meta app.
