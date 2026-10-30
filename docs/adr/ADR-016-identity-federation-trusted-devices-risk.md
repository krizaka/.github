# ADR-016 — Identity: federation by standards, passkeys first, trusted devices, risk-based sign-in, an open core with private enterprise adapters

- **Status:** Accepted (CTO, delegated) as the direction. Paid items (a KMS, a commercial IdP or risk engine, contracts) wait on Oussama (*Needs Oussama*). The slices are the sub-issues of [.github#389](https://github.com/krizaka/.github/issues/389).
- **Date:** 2026-10-28
- **Builds on:** [ADR-001](ADR-001-krizaka-accounts.md) (krizaka-users is the identity of every product, passwords out of the products' Postgres, linking by verified e-mail, native PKCE, tenants), [ADR-012](ADR-012-licensing-libraries-open-products-fair-source.md) (libraries Apache-2.0), [ADR-015](ADR-015-ai-code-audit-measured-and-enforced.md) (providers as closed types and Spring strategies, `Map<Kind, Strategy>`, fail fast), krizaka-ts [ADR-005](https://github.com/krizaka/krizaka-ts/blob/main/docs/adr/ADR-005-storage-providers.md) (providers as data in the database, credentials sealed under one envelope key, test before save, audit).
- **Folds in:** [krizaka-users#21](https://github.com/krizaka/krizaka-users/issues/21) (Google, Apple, Entra, GitHub, passkeys, personal access tokens), [krizaka-users#22](https://github.com/krizaka/krizaka-users/issues/22) (ES256 + JWKS, passkeys), [krizaka-users#63](https://github.com/krizaka/krizaka-users/issues/63) (typed provider registry), [krizaka-users#31](https://github.com/krizaka/krizaka-users/issues/31) (tenants).
- **Repositories:** `krizaka-users` (open core, Apache-2.0), `krizaka-ts` (`@krizaka/auth`), a new **private** `krizaka-users-enterprise` (never filled; the empty repository was deleted 2026-10-30, krizaka-internal#752, and is recreated with its first real adapter).

## Context

Founder direction (2026-10-28): « security first — prudent et visionnaire ». The open-source version ships our own sign-in.
Business customers must be able to sign in through **their** identity provider (« Okta or other flows »). Trusted devices,
fraud detection and risk-based authentication « un peu à la Google » are coming. Business integrations live in **private
repositories**.

### What exists (read on 2026-10-28, main of `krizaka-users` and `krizaka-ts`)

| Area | Today | Gap |
|---|---|---|
| Federation | `OAuth2ProviderVerifier` strategies (Google, GitHub), one `@Bean` per provider switched on by configuration (`FederationConfig`); token exchange `POST /api/v1/auth/oauth`; provider matched as a `String` (`supports`), linear scan | No per-organization IdP, no generic OIDC, no SAML, no SCIM. Client ids and secrets come from the environment (`OAuthClientProperties`): one set per deployment, a redeploy to change, nothing audited. |
| Organizations | `organizations`, `organization_members` (roles OWNER, ADMIN, MEMBER, SERVICE; Flyway V4) | No verified domain, no connection, no « SSO enforced » policy. |
| Passwords | `BCryptPasswordEncoder` in krizaka-users; scrypt (N=2^15) in `@krizaka/auth`, still in each TypeScript product's own database | BCrypt ignores bytes past 72 (our maximum is 256 characters). No breached-password check. Minimum 12. Passwords still live in the products' Postgres (ADR-001's direction is not done). |
| Lockout | `LoginLockout`: progressive, per account+IP and per account, **in memory** (Caffeine) | Lost on restart, not shared by a second instance. |
| Session tokens | ES256 with a `kid` and retired keys published on `/jwks` (`IssuerKeys`), **HS256 still accepted** (`JwtConfig` decoder picks by header), TTL only, no refresh token | No rotation, no revocation list, no device. A stolen token lives until it expires. |
| TypeScript sessions | `@krizaka/auth` opaque cookie (`<prefix>1.` + 32 bytes), keyed hash stored, account re-read on every request | Good. No device list, no new-device notice. |
| MFA | none (no WebAuthn, TOTP, magic link) | — |
| Risk | rate limits and lockout only | No signals, no score, no audit of sign-in decisions. |

The platform under it is **Spring Boot 4 / Spring Security 7**, which already ships most of what this ADR needs as
standard building blocks: OAuth 2.0 Client (`ClientRegistration`, `ClientRegistrationRepository`), the SAML 2.0 Service
Provider (`RelyingPartyRegistration`, OpenSAML), passkeys (`spring-security-webauthn`), One-Time Token login, and Spring
Authorization Server (OIDC provider, refresh tokens, DPoP-bound tokens).

## Decision 1 — Standards, not vendors

1. **Upstream federation speaks OIDC Core 1.0 and SAML 2.0, nothing vendor-specific.** Okta, Microsoft Entra ID, Google
   Workspace, Auth0, Keycloak, JumpCloud, OneLogin, PingFederate, ADFS are all **one generic connection kind each**:
   `oidc` (discovery document, `iss`/`aud`/`exp`/`nonce`/`at_hash` checked, signature on the IdP's JWKS, PKCE, `state`)
   or `saml` (SP-initiated, signed assertions required, `InResponseTo`, audience, `NotOnOrAfter`, replay cache on the
   assertion id; IdP-initiated **refused** by default — SAML 2.0 Profiles §4.1.5 leaves it unsolicited, which makes it a
   login-CSRF vector). A vendor never gets its own Java class: at most a **preset** (data: issuer template, claim
   names, the Entra `tid` rule below), like the S3 presets of ADR-005.
2. **Social providers** (Google, Apple, GitHub, Facebook — ADR-001) become presets of the same registry: Google and Apple
   are `oidc`; GitHub and Facebook keep their OAuth 2.0 verifiers (they are not OIDC), as entries of the typed
   `Map<ConnectionKind, IdentityProvider>` registry of ADR-015 (krizaka-users#63).
3. **Our own side stays an OIDC provider.** krizaka-users issues ES256 tokens with a published JWKS; products and
   apps talk to it as relying parties (`@krizaka/auth`'s port). Anything behind it (an Okta tenant, a SAML IdP) is
   invisible to the products. This is what keeps every choice below reversible.

### Is Okta « the best tactic »? No — Okta is one IdP among others

- Business customers **already have** an IdP (Entra ID is the default in Québec institutions and SMEs on Microsoft 365;
  Google Workspace; Okta in larger firms). What they ask is « sign in with *our* IdP, provision from it, force it ». That
  is OIDC/SAML + SCIM on **our** side, whatever they run.
- Buying Okta (or Auth0) as **our** identity would put every product's users in a US vendor priced per monthly active
  user, move residency out of our hands, and still require us to build trusted devices and risk the way we want them.
- So: we **test against** Okta, Entra ID, Google Workspace and Keycloak (free developer tenants) in CI-like conformance
  runs, and may later list in vendor catalogues (Okta Integration Network, Entra app gallery) — a distribution channel,
  not a dependency.

### Our own side: krizaka-users vs Keycloak, Zitadel, Ory

| | **krizaka-users (Spring Security 7)** | Keycloak | Zitadel | Ory (Kratos + Hydra + Polis) | Okta / Auth0 (buy) |
|---|---|---|---|---|---|
| Licence | Apache-2.0 (ours) | Apache-2.0 (CNCF) | **AGPL-3.0** since v3 (2025) | Apache-2.0 core; some self-hosted features under the Ory Enterprise License | Proprietary SaaS |
| Cost at our size | $0 more: already deployed (289 MiB measured, ADR-001) | a JVM of ≈ 1 GiB+ (Keycloak sizing guide) → a larger App Platform container, ≈ $10–25/month per deployment | one Go binary, ≈ 512 MiB, ≈ $5–12/month | three services (identity, OAuth, SAML), ≈ $15/month | per MAU; enterprise connections (SAML/SCIM) on paid tiers — list prices to read on signing |
| Ops | ours, already in CI, ArchUnit, Testcontainers | upgrades, realm export/import, themes in FreeMarker, its own DB schema | upgrades, event-sourced store | three upgrade trains, glue code | none, but vendor outages and lock-in |
| Residency (Canada) | wherever we deploy (DO `tor1` today) | self-hosted: same | self-hosted: same (its cloud regions are not Canadian) | self-hosted: same (Ory Network region to confirm) | vendor cells (US/EU…); a Canadian cell to confirm with sales |
| Fit with Spring and our rules | native: same stack, ports, `@krizaka/settings`-style DB settings, our audit | external server; customisation through SPIs in its own lifecycle | external, Go | external, Go | external |
| Multi-tenant / orgs | tenants (ADR-001 §8) + organizations (V4) | realms / organizations (recent) | first-class orgs | per-project | first-class |
| Passkeys, OTT, SAML SP, SCIM | Spring Security: passkeys, OTT, SAML SP built in; **SCIM to build** | all built in (SCIM via extension) | all built in | passkeys, SAML (Polis), SCIM (Polis) | all built in |
| Risk / trusted devices | to build (Decisions 4–5) | basic (no risk engine) | basic | basic | adaptive MFA on top tiers |

**Decision: keep krizaka-users, built on Spring Security's standard components.** It is already running, costs nothing
more, keeps residency and the data model ours, and its gaps (SCIM, risk, devices) are gaps in every option except the
paid one. **Keycloak is the documented fallback**: because products only speak OIDC to us (Decision 1.3), replacing
our side with Keycloak later is a deployment change plus a user migration, not a rewrite of the products. Zitadel is
excluded by its AGPL licence for an embedded block; Ory's three services cost more ops for no gain at our size.

### Per-organization IdP routing, JIT, SCIM, enforced SSO

- **Connections are data.** Table `identity_connections` (per tenant): `id`, `organization_id`, `kind` (`oidc` | `saml`
  | social preset), `preset`, `label`, non-secret `coordinates` (issuer / metadata URL, client id, entity id, claim
  mapping), `sealed_credentials` (Decision 6), `key_id`, `status` (`draft` → `verified` → `active` → `disabled`, a test
  sign-in moves `draft` to `verified`, as ADR-005), `created_by`, `updated_at`. Spring's `ClientRegistrationRepository`
  and `RelyingPartyRegistrationRepository` are implemented **over this table** (cached, invalidated on change), never
  from `application.yml`. The environment only bootstraps the social presets once (ADR-005 §2 pattern).
- **Verified domains.** `organization_domains` (`domain`, `verification_token`, `verified_at`): proven by a DNS TXT record
  `krizaka-verification=<token>`. Only a verified domain routes, links or enforces.
- **Home-realm discovery.** The sign-in form asks the e-mail first. Its domain → a verified domain → the organization's
  active connection → redirect to that IdP. No match → the person's own methods (passkey, magic link, password).
  Discovery answers the same shape and timing whether or not an account exists (no account enumeration); it may reveal
  that a *domain* uses SSO, which is standard and accepted.
- **Identity is `iss` + `sub`, never the e-mail.** For Entra ID multi-tenant apps the subject is `tid` + `oid`, and the
  e-mail claim is never trusted for linking (the 2023 « nOAuth » class of account takeover: a mutable, unverified
  `email` claim). Linking by e-mail (ADR-001 §4) applies to an enterprise connection **only** for addresses on the
  organization's verified domains.
- **JIT provisioning.** First SSO sign-in of an unknown subject on an active connection creates the user and its
  `organization_members` row with the connection's default role (MEMBER; never OWNER or ADMIN by JIT). Group-to-role
  mapping is a connection setting.
- **SCIM 2.0** (RFC 7643 schema, RFC 7644 protocol): `/scim/v2/{Users,Groups}` per organization, a bearer token per
  organization (shown once, stored hashed, prefix `kz_scim_`), `active=false` or `DELETE` → the user is suspended in the
  organization and **every session, refresh family and device of it is revoked at once**. SCIM is the source of truth for
  membership when it is on; JIT still works for its first sign-in.
- **Enforced SSO.** Organization setting `auth.sso.enforced`: when on, members on the verified domains can no longer
  use a password or magic link in that organization; their sessions are re-checked. **Break-glass:** at least one OWNER
  keeps a passkey sign-in that bypasses the IdP, audited, with a notice to all owners on use (an IdP outage must not lock
  a customer out of its own admin).

## Decision 2 — Methods: passkeys first

Assurance levels follow **NIST SP 800-63B-4** (AAL1 single factor, AAL2 two factors, AAL3 phishing-resistant hardware);
the achieved level goes into the token's `acr` claim and the methods into `amr` (OIDC Core §2, RFC 8176 values).

| Method | Decision | Standard |
|---|---|---|
| **Passkeys** (WebAuthn Level 3) | **First-class and offered first**: enrolment proposed right after the first sign-in, sign-in with conditional UI (autofill). `userVerification: required`, discoverable credentials, `rpId` = the tenant's auth host. A passkey alone is AAL2 (multi-factor cryptographic: possession + local verification); phishing-resistant by origin binding. Attestation `none` by default; an organization may require device-bound (non-synced) authenticators for AAL3. Spring Security's WebAuthn support (WebAuthn4J). | W3C WebAuthn L3, FIDO2 |
| **Magic link** | E-mail one-time token (Spring Security OTT): 32 random bytes, stored hashed, single use, **15 minutes**, consumed only by a POST from a confirmation page (mail scanners that GET links do not burn it), bound to the browser that asked (a cookie nonce; another browser gets « open it on the device where you asked »). AAL1. | 63B-4 out-of-band / e-mail is not an AAL2 factor |
| **Password** | Kept for those who want it. **Argon2id** (OWASP parameters, Spring `Argon2PasswordEncoder`) through `DelegatingPasswordEncoder`: BCrypt and the products' scrypt hashes verify and are **rehashed on the next successful sign-in**. Length: **≥ 15 when the password is the only factor, ≥ 8 with a second factor, accept up to 256**, any Unicode (NFKC), no composition rules, no forced rotation (63B-4 §3.1.1.2). **Breached-password check** at set and change: the Have I Been Pwned *Pwned Passwords* range API (k-anonymity: only the first 5 hex of the SHA-1 leave, with `Add-Padding`), refused when found; if the API is unreachable the password is accepted and re-checked at the next sign-in (logged). Lockout moves from memory to the database (durable, shared). | NIST 800-63B-4, OWASP Password Storage |
| **TOTP** | Second factor for password accounts (RFC 6238, SHA-1, 30 s, 6 digits, ±1 step, a used code refused again), secret sealed (Decision 6), 10 recovery codes stored hashed. | RFC 6238 |
| **SMS** | **Not offered** (63B-4 classes it « restricted »; SIM-swap). | — |
| **Step-up** | A sensitive action (change e-mail, password, MFA; add a device; create a personal access token; an organization's SSO or SCIM settings; payouts and billing in the products) needs a recent authentication at a level: the API answers `401` with `WWW-Authenticate: Bearer error="insufficient_user_authentication", acr_values="…", max_age=…` (**RFC 9470**), the client re-authenticates with OIDC `acr_values` / `max_age` (OIDC Core §3.1.2.1). Levels and windows per action are DB settings with code floors. | RFC 9470, OIDC Core |

Personal access tokens (krizaka-users#21) are the existing API keys, kept: hashed, shown once, scoped, revocable, with a
scannable prefix; creating one needs step-up.

## Decision 3 — Trusted devices and sessions

- **A device is a key, not a fingerprint.** It is (a) a device-bound passkey, or (b) a **device key**: an ES256 key pair
  generated on the device and never exported — WebCrypto `extractable: false` kept in IndexedDB on the web, Secure
  Enclave / Android Keystore in the Expo and Tauri apps (ADR-004, ADR-005). Synced passkeys prove the person, not the
  device. Browser fingerprinting is **not** used (Loi 25 s. 8.1, and it is unreliable).
- **`devices` table**: `id`, `user_id`, `public_jwk_thumbprint` (RFC 7638), `label` (browser + OS family from the
  user agent, never the full string), `first_seen`, `last_seen`, `last_coarse_location` (region, country),
  `trusted_until`, `revoked_at`. The person sees the list in their account and **revokes** any device: its sessions,
  refresh family and passkey (if device-bound) die at once.
- **New-device notice**: a sign-in from a device not in the list sends an e-mail through the outbox (« new sign-in on
  Firefox / macOS, near Montréal, at 14:02 — not you? » with a one-click « revoke and secure my account » link that
  ends every session and asks for a new password or passkey).
- **Refresh tokens** (Spring Authorization Server): opaque, stored hashed, **rotated on every use**; a family id links
  the chain; **re-use of an already-rotated token revokes the whole family** and notifies the user (RFC 9700 §4.14.2).
  Absolute lifetime of a family and idle timeout are DB settings. Access tokens are short (≤ 10 minutes) ES256; **HS256
  is retired** from the decoder once the products have moved (krizaka-users#22).
- **Sender-constrained tokens with DPoP** (**RFC 9449**) wherever a client holds tokens: the mobile and desktop apps and
  any public client sign a DPoP proof with their device key; access and refresh tokens are bound to its `jkt`
  thumbprint, so a stolen token is useless without the key (RFC 9700 §4.10, §4.14). **Browsers do not hold tokens**: the
  web products keep the BFF pattern (`@krizaka/auth` opaque `HttpOnly` cookie session, keyed hash stored), which is
  already sender-constrained by the cookie; their session rows gain the `device_id`.
- Token binding (RFC 8471) is not used: browsers dropped it.

## Decision 4 — Risk-based authentication and fraud

**Build** a small, explainable rule engine in the open core; **buy** only through a private adapter if a customer
needs a commercial engine. There is no mature open-source risk engine that fits a Spring service; commercial ones (device
intelligence, consortium IP reputation) send personal information to a US vendor and need a contract — *Needs Oussama*.

- **Signals** (each computed at sign-in, kept minimised):

| Signal | Source | Kept |
|---|---|---|
| Unknown device / revoked device reused | `devices` | device id |
| Impossible travel | coarse location now vs last sign-in (distance ÷ time > 1 000 km/h) | region + country only |
| IP reputation / hosting ASN / Tor exit | a **local** IP-to-ASN/geo database (IPinfo Lite or MaxMind GeoLite2, downloaded, no call out) + the public Tor exit list | ASN, country; the IP truncated to /24 (IPv4) or /48 (IPv6) after the rate-limit window |
| Velocity | failures per account, per truncated IP, per ASN, per hour | counters |
| Credential stuffing | many accounts failing from one ASN; a password found in breaches; Turnstile failure | counters, flags |
| Method strength | the `acr` of this sign-in | level |

- **Score → action.** Each signal adds weighted points (0–100); thresholds `auth.risk.challengeAt` and
  `auth.risk.blockAt`, and the weights, are **DB settings edited by the admin** (audited, bounded by code floors so
  « block nothing » is impossible). Below the challenge threshold: **allow**. Between: **challenge** (step-up to a passkey
  or TOTP; a password-only account gets a magic link to its verified address). Above: **block** this attempt and notify.
  Every decision writes an `auth_events` row: `decision`, `score`, the **reason codes** (never raw values), connection,
  device, time.
- **Loi 25.**
  - s. 8.1 (Private Sector Act, as amended by Loi 25): the privacy notice says we use technology that locates the
    person (coarse location) at sign-in, why (account protection), and that it can be explained.
  - s. 12.1: a block is a decision based exclusively on automated processing, so the person is told, at the time, that
    it happened, the main reasons (the reason codes in plain words), and how to ask a human to review it (a support
    path that unblocks after verification).
  - s. 23: raw signals live **30 days** (truncated IP, ASN, coarse location), decisions and reason codes **1 year** for
    the security audit, then are deleted by a scheduled job; both are DB settings with a code ceiling.
  - s. 3.3: the risk engine is a new information system handling personal information: its privacy impact
    assessment (EFVP) is written before production, reviewed once by the lawyer (« legal go until lawyer »).
  - Data stays in the deployment's region; the local ASN/geo database means no IP leaves us.

## Decision 5 — The open-core boundary: ports in the open core, enterprise adapters in a private repository

- **A new module `krizaka-users-spi`** (Apache-2.0, on Maven Central with the rest) holds only interfaces and value
  types, `@NullMarked`, closed sets as types (ADR-015):

| Port | Role | Open adapters (krizaka-users) | Private adapters (krizaka-users-enterprise) |
|---|---|---|---|
| `IdentityProviderPort` | start and complete a federated sign-in for a connection kind | `oidc` (any OIDC IdP, social presets), GitHub, Facebook | `saml` (SAML 2.0 SP), vendor-specific presets that carry business terms |
| `ProvisioningPort` | create, update, suspend members from an external directory | JIT | SCIM 2.0 server, directory sync |
| `AuthenticatorPort` | a sign-in method: enrol, challenge, verify, its `amr`/AAL | passkey, password, magic link, TOTP | hardware-key policies (AAL3 attestation allow-lists) |
| `DeviceTrustPort` | bind, check, list, revoke devices | device keys + passkeys | MDM / device-posture checks (Intune, Jamf) |
| `RiskEnginePort` | assess a sign-in → score + reason codes | the rule engine of Decision 4 | commercial engines |
| `SignalSourcePort` | one risk signal | local ASN/geo, Tor list, velocity, breach | commercial IP / device intelligence |
| `SecretSealPort` | seal / open / rewrap credentials | envelope with `AUTH_VAULT_KEY` | (KMS adapters are open too: Decision 6) |
| `AuthEventSink` | export sign-in events | the `auth_events` table | SIEM export (Splunk, Sentinel) |

- **Registration, not forks.** A private adapter is a Spring Boot auto-configuration (`META-INF/spring/
  org.springframework.boot.autoconfigure.AutoConfiguration.imports`) that contributes beans of these ports. The core
  builds its `Map<Kind, Port>` registries from the beans at start-up and **fails fast** on a duplicate kind or a
  connection row whose kind has no adapter (ADR-015). The enterprise jar is added to a deployment's classpath (a Maven
  dependency of the host image), nothing else changes.
- **Guards.** An ArchUnit rule in krizaka-users refuses any reference to `com.krizaka.users.enterprise..` and any
  dependency on the private artifact; `krizaka-users-enterprise` may depend only on `krizaka-users-spi` (and `-api`),
  never on `-core` internals (its own ArchUnit rule). The SPI is versioned semantically: a breaking change is a major.
- **Where it lives.** `krizaka/krizaka-users-enterprise`, private, proprietary licence, published to the org's private
  GitHub Packages Maven registry. No enterprise code, test fixture or customer configuration in the open tree.
- Generic OIDC federation per organization stays **open**: it is what the social providers need anyway, and it is the
  honest « bring your own IdP » of the community edition. SAML and SCIM — what enterprises pay for — are private.

## Decision 6 — Secrets: never clear in Postgres, envelope first, KMS later, rotation

- Everything secret about identity is sealed: OIDC client secrets, SAML SP private keys (signing and decryption), TOTP
  secrets, SCIM tokens (hashed, not sealed — they are verified, never read back), the social providers' secrets after
  their bootstrap import.
- **Envelope encryption, the same format as ADR-005** (`v2.<key_id>.`, AES-256-GCM): each row has a random data key
  wrapped by the key-encryption key **`AUTH_VAULT_KEY`** (32 bytes base64, `AUTH_` context, krizaka/.github#46), the only
  identity secret in the environment. The Java implementation lives in a shared Krizaka Java block, with cross-language
  test vectors against `@krizaka/storage`'s vault, so one format exists in the family.
- **Never shown back**: the admin API answers `set` / `not set`, who and when; changing a secret means entering a new
  one. Opened in one place (the registration repository). Audited, diff redacted.
- **Rotation.** KEK rotation re-wraps data keys only (new `key_id`, old one kept until no row uses it). IdP client
  secrets: a connection holds a current and a next secret during the IdP-side overlap. SAML SP keys: the next key is
  published in our metadata before it signs. The issuer's ES256 key already rotates with a `kid` and retired keys on the
  JWKS (`IssuerKeys`); its private key moves from an environment PEM to the vault, then to a non-exportable KMS key.
- **KMS later** (*Needs Oussama*): `SecretSealPort` and the issuer signer get KMS adapters (open source: they are
  standard APIs — HashiCorp Vault Transit / OpenBao, AWS KMS `ca-central-1`, or the provider of our production region).
  Then the KEK never leaves the KMS and the issuer key is never in our memory.

## Threat model (STRIDE)

| Threat | Example | Mitigation (decision) |
|---|---|---|
| **S**poofing | phishing a password; a token issued to another app (ADR-001 findings 2–3); nOAuth e-mail claim; IdP-initiated SAML login CSRF; a forged SAML assertion | passkeys first (2); `aud`/`iss`/`nonce` checked, identity = `iss`+`sub`/`tid`+`oid`, e-mail links only on verified domains (1); SP-initiated only, signed assertions, replay cache (1) |
| **T**ampering | altered assertion or claim mapping; a changed connection row | signatures verified on the IdP's keys; connection changes audited, step-up required, test before activation (1, 2) |
| **R**epudiation | « I never added that IdP / device » | `auth_events` + admin audit, reason codes, notices to owners and users (3, 4) |
| **I**nformation disclosure | account enumeration via discovery; secrets in a DB dump; IPs kept forever | same-shape discovery answers (1); sealed secrets, KEK outside the DB (6); truncated IP, retention (4) |
| **D**enial of service | credential stuffing; locking a victim out; an IdP outage | velocity + risk score, per-pair lockout (2, 4); durable lockout that a passkey bypasses; break-glass owner (1) |
| **E**levation of privilege | JIT granting ADMIN; a stolen refresh token; a SCIM token used across organizations | JIT never grants OWNER/ADMIN, group mapping explicit (1); rotation + reuse detection + DPoP (3); SCIM token scoped to one organization (1) |

The security review of each slice checks its row(s) of this table and adds a test per mitigation.

## Migration from today

1. Nothing breaks for current users: BCrypt and scrypt hashes verify and are rehashed (2); HS256 stays accepted until the
   products use ES256 + JWKS (krizaka-users#22), then is removed.
2. Environment OAuth clients are imported once as sealed social connections of the tenant (`source: env`, audited); the
   environment then chooses nothing (6).
3. The TypeScript products move their password sign-in to their krizaka-users tenant (ADR-001 §8, krizaka-users#31): a
   person's next sign-in verifies against the imported scrypt hash and rehashes in krizaka-users; the product's
   `password_hash` column is dropped after a fixed window. `@krizaka/auth` keeps the opaque session cookie and adds
   `device_id`.
4. `LoginLockout` state moves to the database; the in-memory cache stays as a read-through.
5. Organizations (V4) gain domains, connections and policies; nothing is enforced until an owner turns it on.

## Consequences

- One identity stack for the family on the Spring Security standard components; the products only speak OIDC to it, so
  the « buy » and « Keycloak » options stay open at the cost of a migration, not a rewrite.
- Enterprise features ship as a jar on the classpath, with no fork and no enterprise code in the open repositories.
- We build and own SCIM, the risk engine and trusted devices: real work, but small and explainable, and tested by us.
- Losing `AUTH_VAULT_KEY` makes every IdP secret, SAML key and TOTP secret unreadable: it lives in the secret manager
  with an offline backup, and its rotation procedure ships with slice 1.

## Slices (sub-issues of .github#389, security-critical first)

1. **Vault and sealed identity secrets** — [krizaka-users#64](https://github.com/krizaka/krizaka-users/issues/64) (krizaka-users): `SecretSealPort`, envelope `v2.<key_id>.` with `AUTH_VAULT_KEY`
   and cross-language vectors, rotation, the env bootstrap import of the OAuth clients, secrets never returned.
2. **Passwords to 800-63B-4** — [krizaka-users#65](https://github.com/krizaka/krizaka-users/issues/65) (krizaka-users): Argon2id via `DelegatingPasswordEncoder` with rehash on sign-in, 15/8/256
   lengths, Pwned Passwords range check, durable lockout in the database.
3. **Sessions and devices** — [krizaka-users#66](https://github.com/krizaka/krizaka-users/issues/66) (krizaka-users, `@krizaka/auth`): refresh rotation with reuse detection, short ES256 access
   tokens and the end of HS256, `devices` table, device list and revoke, new-device notice.
4. **The SPI and the open-core guard** — [krizaka-users#67](https://github.com/krizaka/krizaka-users/issues/67) (krizaka-users, with #63): `krizaka-users-spi`, the typed registries over beans,
   fail-fast, the ArchUnit rules, the private `krizaka-users-enterprise` skeleton registering a no-op adapter in CI.
5. **Passkeys, TOTP and step-up** — [krizaka-users#22](https://github.com/krizaka/krizaka-users/issues/22) (its parent stays krizaka-build#16): WebAuthn L3 enrolment and sign-in, TOTP + recovery codes, `acr`/`amr`,
   RFC 9470 challenges, step-up on the sensitive actions.
6. **Magic link** — [krizaka-users#68](https://github.com/krizaka/krizaka-users/issues/68) (krizaka-users): OTT through the outbox, POST confirmation, browser binding.
7. **Organization SSO, open** — [krizaka-users#69](https://github.com/krizaka/krizaka-users/issues/69) (krizaka-users): verified domains, `identity_connections` over Spring's registration
   repositories, generic OIDC with presets (Entra, Google Workspace, Okta, Keycloak), home-realm discovery, JIT,
   enforced SSO with break-glass.
8. **Risk engine v1** — [krizaka-users#70](https://github.com/krizaka/krizaka-users/issues/70) (krizaka-users): signals with the local ASN/geo database, score and DB thresholds, allow /
   challenge / block, `auth_events`, retention job, the Loi 25 s. 8.1 / 12.1 texts EN/FR, the EFVP draft.
9. **DPoP for the apps** — [krizaka-users#71](https://github.com/krizaka/krizaka-users/issues/71) (krizaka-users, `@krizaka/app-client`, the Tauri kit): device keys, DPoP-bound access and refresh
   tokens (RFC 9449).
10. **SAML 2.0 and SCIM 2.0, private** — [krizaka-users#72](https://github.com/krizaka/krizaka-users/issues/72) (krizaka-users-enterprise): SAML SP adapter, SCIM server with per-organization
    tokens and instant deprovisioning, conformance runs against Okta, Entra ID and Keycloak developer tenants.
11. **Products adopt** — [krizaka-ts#240](https://github.com/krizaka/krizaka-ts/issues/240) (krizaka-ts `@krizaka/auth`, then each product): password sign-in through the tenant, scrypt
    import and rehash, `device_id` on sessions, passkeys in `SignInProviders`.

## Needs Oussama

- **A KMS / secret manager** (paid, a vendor choice and its region): until then `AUTH_VAULT_KEY` in the secret manager we
  already use, with an offline backup.
- **Private repository and registry**: creating `krizaka-users-enterprise` (private) and the GitHub Packages Maven
  registry — free on our plan, but it fixes the IP split, so he confirms.
- **Commercial adapters**: any paid risk engine, device intelligence or a paid IdP tenant needs his approval and a DPA.
- **Customer contracts**: enterprise SSO/SCIM terms (SLA, data processing) and the lawyer's one review of the EFVP and
  the Loi 25 texts before the public opening.

## Sources

- OpenID Connect Core 1.0 (incl. errata 2), OpenID Connect Discovery 1.0 — openid.net/specs.
- OASIS SAML 2.0 Core, Bindings and Profiles (§4.1.5 unsolicited responses) — docs.oasis-open.org/security/saml.
- RFC 7643 (SCIM Core Schema), RFC 7644 (SCIM Protocol).
- W3C Web Authentication Level 3 — w3.org/TR/webauthn-3.
- RFC 9700, OAuth 2.0 Security Best Current Practice (2025) — §4.10 sender-constrained tokens, §4.14 refresh tokens.
- RFC 9449, OAuth 2.0 Demonstrating Proof of Possession (DPoP); RFC 7638 (JWK thumbprint).
- RFC 9470, OAuth 2.0 Step Up Authentication Challenge Protocol; RFC 8176 (`amr` values); RFC 6238 (TOTP); RFC 8252
  (native apps).
- NIST SP 800-63B-4, Digital Identity Guidelines: Authentication and Authenticator Management (2025).
- OWASP Password Storage Cheat Sheet (Argon2id parameters); Have I Been Pwned, Pwned Passwords range API (k-anonymity).
- Loi 25 — Act respecting the protection of personal information in the private sector (CQLR c. P-39.1), ss. 3.3, 8.1,
  12.1, 23.
- Spring Security reference: OAuth 2.0 Client, SAML 2.0 Login, Passkeys, One-Time Token Login; Spring Authorization
  Server reference (refresh tokens, DPoP). Keycloak server sizing guide; Zitadel licence change to AGPL-3.0 (v3); Ory
  licensing page.
