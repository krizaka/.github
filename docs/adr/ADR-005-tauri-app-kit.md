# ADR-005 — Tauri apps share one Rust crate, `krizaka-tauri-kit`, and one template

- **Status**: Accepted
- **Date**: 2026-10-22
- **Scope**: every Krizaka macOS app (Orazaka Desktop, then Yomizaka and Akinaza for Mac)
- **Issue**: [krizaka/.github#178](https://github.com/krizaka/.github/issues/178), epic #179

## Context

Orazaka Desktop (Tauri 2, a `.dmg` on the orazaka releases) holds generic desktop work inside the product: canonical-path
folder grants (`scope.rs`), listing and previewing inside a grant (`files.rs`), settings persistence, the menu-bar item, the
navigation guard, and the build / sign / notarise workflow. Yomizaka (local-folder libraries, drag and drop from Finder) and
Akinaza (a back office in a native window) need the same, with the same security posture. Only the CLI sidecar and the
`automation/` runner are Orazaka's.

## Decision

1. **Rust logic in one crate**, `krizaka-tauri-kit` (its own repository, git dependency then crates.io), with modules:
   `scope` (grants stored as canonical paths, `..` and symlinks that leave a grant refused, home, `/`, `/Users`, `/Volumes`,
   system folders and `~/.ssh`, `~/.aws`, `~/Library` never grantable), `files` (list, preview), `settings`, `menu_bar`,
   `nav_guard` (the window stays on the configured origin, other links open in the browser), `deep_link`, `update`
   (channel `stable` / `beta`, read from configuration).
2. **TypeScript bindings**, `@krizaka/app-desktop`: typed `invoke` wrappers and hooks over the commands, so the web layer
   never calls an untyped command. Capabilities stay minimal: `core:default` only, no `fs`, no `shell`, no `opener` in the web layer.
3. **The hosted web app is the UI** where one exists (sign in on the product's own page, the app never sees a password);
   the native window adds what a browser cannot: folders, drag and drop, menu bar, notifications.
4. **A product keeps only its own**: its commands (a `DocumentStore` adapter for a local folder, the sidecar), its messages
   and its brand. A document leaves the Mac only for the one check that needs it, and is purged server side.
5. **`krizaka/template-tauri-app` only wires**: `tauri.conf.json`, `capabilities/main.json`, `entitlements.plist`
   (hardened runtime, opts out of nothing), `desktop.yml` (build, sign, notarise when the secrets exist, attach the `.dmg`).
6. **Signing is configuration**: the Developer ID and notarisation credentials are repository secrets; the code never changes.
7. **Orazaka Desktop adopts the kit** in a separate PR of the Orazaka lane, after the kit is proven by the first new app.

## Consequences

- The folder-scope rules, the most security-sensitive code, exist once and are tested once (traversal, symlinks, canonicalisation).
- The kit is macOS-first (Apple Silicon, macOS 14+); Windows and Linux are not promised.
- Cost: a crate and a package to release; the templates must be tried in CI (a trial app from each is green).
