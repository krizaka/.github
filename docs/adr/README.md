# Organisation ADRs

Decisions that span several Krizaka repositories. A decision that belongs to one repository lives in that repository
(`krizaka-ui/docs/adr`, `orazaka/docs/adr`…).

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-krizaka-accounts.md) | The sign-in standard of every Krizaka product (krizaka-users, `SignInProviders`, linking by verified e-mail, native PKCE) and Krizaka accounts for the krizaka.com properties (a thin `krizaka-accounts` host with comments) | Accepted (runtime waits on cost approval) |
| [ADR-002](ADR-002-dev-preview-status-is-data.md) | « Dev preview » is a checkable bar (docs/standards/dev-preview.md); a product's status is data (`dev-preview.json`), gated at krizaka.com's build | Accepted |
| [ADR-003](ADR-003-mobile-service-discovery.md) | Mobile apps discover their backend addresses from a signed manifest on krizaka.com (`@krizaka/discovery`, Ed25519, host allow-list), so a URL change never forces a store republish | Accepted |
| [ADR-004](ADR-004-expo-app-shell.md) | Expo apps share one package, `@krizaka/app-client` (session, discovery, API client, gates, auth, settings) and a wiring-only `template-expo-app` |  Accepted |
| [ADR-005](ADR-005-tauri-app-kit.md) | Tauri apps share one Rust crate, `krizaka-tauri-kit` (folder scope, files, menu bar, deep links, update), its TypeScript bindings and a wiring-only `template-tauri-app` | Accepted |
| [ADR-006](ADR-006-krizaka-ts-organize.md) | Krizaka TS (`krizaka/krizaka-ts`, backend packages under `@krizaka/`) and `@krizaka/organize`: name, avatar, description, tags, collections and an undeletable default collection for every entity, a table-per-kind generator with the invariants in the database | Accepted |
| [ADR-008](ADR-008-native-video-bunny-stream.md) | Native video behind `@krizaka/ui/native`: playback stays on `expo-video` with server-signed Bunny addresses or tokens, uploads signed by the server (no key in the app), Bunny's React Native SDK adopted only after a trial on our Expo SDK and the New Architecture | Proposed (design; trial waits, Orochia paused) |
