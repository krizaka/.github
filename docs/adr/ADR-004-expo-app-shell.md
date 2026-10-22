# ADR-004 — Expo apps share one package, `@krizaka/app-client`, and one template

- **Status**: Accepted
- **Date**: 2026-10-22
- **Scope**: every Krizaka Expo app (orazaka-mobile-client, orochia-mobile, yasakia-mobile, then Yomizaka and Akinaza)
- **Issue**: [krizaka/.github#178](https://github.com/krizaka/.github/issues/178), epic #179. Builds on ADR-003 and #72, #75, #139.

## Context

Three Expo apps exist and two more are starting. Measured on 2026-10-22: `scripts/check-app-links.mjs` is byte-identical in
three repositories; `config.ts` (discovery factory), `api.ts` (bearer fetch with timeout, 401 handling, app-config headers),
`session.ts`, `storage.ts`, `DiscoveryGate` and `AppGate` (force update, maintenance) have the same shape in each, differing by
the product's address, mark and message keys. The org already learned that « keep the copies identical » drifts (#139).

## Decision

1. **Logic lives in one package**, (named `app-client`, not `app-shell`, which is already the AppShell layout component of `@krizaka/ui`) `@krizaka/app-client`, in `krizaka-ui/packages` beside `@krizaka/discovery`,
   `@krizaka/app-config` and `@krizaka/push`. It is built on `@krizaka/ui/native` and has subpath exports, one concern each:
   - `/session`: the bearer token in Keychain / Keystore (web fallback), chunked storage for the signed manifest;
   - `/discovery`: `createAppDiscovery({ product, bakedAddresses, hostSuffixes })`, reading `EXPO_PUBLIC_APP_URL` and `EXPO_PUBLIC_APP_ENV`;
   - `/api`: `createApiClient({ baseUrl, locale })`: bearer, no cookie, 20 s timeout, `X-Client-*`, 401 drops the session, 426 shows the update screen;
   - `/gates`: `AppGates` (force update, maintenance) taking the product mark and messages as props;
   - `/auth`: `AuthProvider` and `useAuth` over a product-supplied sign-in function (ADR-001: native PKCE or `client: "native"`);
   - `/settings`: language, theme, notifications, about and sign-out rows.
2. **A product keeps only what is its own**: its screens, its domain client types and its messages. It passes configuration,
   never overrides internals. Adapters (storage, push) are ports with a default; a vendor is configuration.
3. **`krizaka/template-expo-app` only wires**: `app.config.js`, `eas.json` (development, preview, production), `.maestro/`,
   `app-links.json`, `.github/workflows/ci.yml` (thin over `expo-ci`), `scripts/init.mjs <slug> "<Name>"`, i18n skeleton. No logic.
   `check-app-links` is shipped as the package's `bin` (`krizaka-check-app-links`), the copies are deleted.
4. **Where an app lives**: a product's mobile app lives in its monorepo (`apps/mobile`) per #72 (Yomizaka, Akinaza). Existing
   standalone repositories migrate to the package first; moving them is a separate decision.
5. **Migration is proven, not assumed**: the first consumer (orochia-mobile or yasakia-mobile) moves to the package with its
   own tests unchanged and green before the package is declared done.
6. **The URL is the state**: every screen has an Expo Router route, with the same paths as the web where the web has them;
   `associatedDomains` and Android `autoVerify` are declared by the template.

## Alternatives considered

- *A template alone*: copies drift again; that is the problem. Rejected.
- *One Expo monorepo of all apps*: couples release cadences and store identities of independent products. Rejected.
- *Flutter or Kotlin Multiplatform*: loses the shared TypeScript domain and Krizaka UI native. Rejected (orochia-mobile, 2026-10).

## Consequences

- A fix to the session, the 426 handling or a gate lands once and reaches every app with a version bump.
- Apps stay independent: no link from one product to another; the package knows no product.
- Cost: a package to version and publish (npm, OIDC); mitigated by the existing krizaka-ui release flow.
