# ADR-003 — Mobile apps discover their backend addresses from a signed manifest on krizaka.com

- **Status**: Accepted
- **Date**: 2026-10-21
- **Scope**: every Krizaka mobile app (orochia-mobile, orazaka-mobile-client, yasakia-mobile, then the next ones) and krizaka.com
- **Issue**: [krizaka/.github#120](https://github.com/krizaka/.github/issues/120), part of epic #119

## Context

The mobile apps hard-code their backend (`https://dev.orochia.com`, `https://dev.orazaka.com/edge`, `https://dev.yasakia.com`),
inlined at build time through `EXPO_PUBLIC_*`. The products just moved from `dev.<product>.com` to `www.<product>.com` (#119):
every such move would force a new build and a store review, and the old build would break in the meantime. An address
is operations data; it must change without a release.

## Decision

1. **A public manifest**, `https://www.krizaka.com/.well-known/krizaka/services.json`: per product and environment
   (`dev`, `prod`) the `apiBase`, `webBase`, optional `authBase` (defaults to `apiBase`) and `mediaBase`,
   `minAppVersion`, `latestAppVersion`, `status` (`ok` | `maintenance`) and an optional `message` `{ en, fr }`.
   `schemaVersion` is 1; `issuedAt` is an ISO instant that only grows.
2. **Hosted by krizaka.com** (the most stable domain), static, generated at build from `lib/services.ts` (one entry per
   product and environment, the single list; a URL change is an edit there plus a deploy). `Cache-Control: public,
   max-age=300`, `Access-Control-Allow-Origin: *` for GET. A **fallback copy** on Bunny (`krizaka-assets`,
   `discovery/services.json`) is published by the same script, so the manifest survives the www app being down.
3. **Signed.** The document carries `keyId` and `signature`: Ed25519 over the UTF-8 bytes of the **canonical JSON** of the
   document without `signature` (keys sorted, no whitespace, integers only: a subset of RFC 8785). Public keys are baked
   in each app (`k1` and a standby `k2`); private keys live in the company vault (`APP_DISCOVERY_SIGNING_KEY_K1`, `_K2`,
   read with `secret.sh`, never printed). Signing is an explicit step, `npm run services:sign` in krizaka-com, run
   where the vault is; the **signature is committed** with the data, and the build and the tests fail if the
   data and the signature disagree. The hosting platform and CI never hold a private key.
4. **A shared client**, the package **`@krizaka/discovery`** (see below). At start-up it fetches (primary, then
   Bunny) with a 3 s timeout, validates the schema, the signature and every URL, then caches the signed document
   in the device's secure storage. It resolves in this order: **verified live** → **cached** (re-verified on load) →
   **baked default** → **hard-coded legacy dev host**. `getService("orochia").apiBase` reads the result. A background
   refresh runs on foreground and on an interval. `minAppVersion` above the running version shows « please update »;
   `status: "maintenance"` shows the message; both only from a verified document (live or cached), never from a default.
5. **Every app accepts only allow-listed hosts**, baked in: `https` only, no credentials or non-default port in the URL,
   and a host equal to or under one of the app's suffixes (`krizaka.com` and the product's own domain, e.g. `orochia.com`).
   Shared multi-tenant suffixes (`b-cdn.net`, `ondigitalocean.app`) are never allowed: a media host is a name on a domain we own.

## Threat model

| Attack | Outcome |
|---|---|
| DNS or CDN hijack of www.krizaka.com (or of the Bunny fallback), a rogue Wi-Fi, a malicious proxy with a trusted certificate | The attacker can serve any JSON but cannot sign it: bad signature, ignored; the app keeps its cache or default. |
| Replay of an old, genuinely signed manifest | `issuedAt` older than the cached one is refused. On a fresh install the worst case is an address Krizaka once published, still under the allow-list. |
| Attacker blocks the manifest (DoS) | Cache, then baked default, then legacy host: the app works as of its last good state. A cached `minAppVersion` keeps applying offline. |
| Our signing key leaks | The attacker still cannot point an app outside the baked suffixes, so cannot reach a host that is not ours. Recovery: sign with the standby `k2`, ship an app release that drops `k1`. |
| The www server, its build or CI is compromised | No private key there; the served file is the committed signed one. They can only withhold or replay (above). |
| Tampered device storage | The cached document is re-verified on load (signature and allow-list) like a fetched one. |

Not covered: a compromised device, a malicious app build, and the apps' **universal links / associated domains**
(`applinks:`, Android `intent-filter` hosts in `app.json`), which are native configuration verified by the OS against the
domain's own `apple-app-site-association`: changing the host there still needs a build. TLS is not pinned: pinning would
force the republish this ADR removes. The request carries no identifier (no cookie, no account, no device id).

## Where the client lives

A new small package `@krizaka/discovery` in krizaka-ui (`packages/discovery`), not in `@krizaka/ui`: it must be tiny,
dependency-light (`@noble/curves`, audited, pure JS, works in Hermes where WebCrypto Ed25519 does not) and free of any UI,
because it runs before the first screen and in tooling (the signer in krizaka-com uses the same canonicalisation and
verifier, so a format drift cannot happen). It follows `@krizaka/i18n`, `push`, `realtime`: one family package, one
version for every app, published by the KUI publisher. A React entry (`/react`) gives the provider and hooks; the
screens (update, maintenance) are the apps' own, built from their kit.

## Refused

- **A hosted remote-config product** (Firebase, LaunchDarkly): a vendor and a cost in the trust path of every app.
- **Unsigned JSON over HTTPS**: the trust then equals the DNS and the CDN, which is exactly the hijack case.
- **EAS Update / OTA**: it still builds a bundle per change, is tied to Expo, and is not available to a bare URL fix when the
  app cannot start.
- **A JWS/JWT**: heavier to parse on device, opaque to `curl | jq`; a detached signature over canonical JSON is the same
  guarantee, readable.
- **The private key in the hosting platform's build env**: it would put the signing authority on the host the signature
  is meant to distrust.

## Consequences

- A URL change is a `lib/services.ts` edit, `npm run services:sign`, a krizaka-com PR and its deploy: minutes, no store.
- Each app gets one config module reading `getService(...)`, with `EXPO_PUBLIC_*` kept only as a local-development override.
- Cost: one extra request per app start (cached 5 min at the edge), ~3 KB, and a signing step to remember on every edit
  (the tests make forgetting it impossible).
