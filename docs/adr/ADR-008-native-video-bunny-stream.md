# ADR-008: Native video — server-signed Bunny Stream behind `@krizaka/ui/native`, the Bunny React Native SDK only after a trial

- **Status:** proposed (2026-10-23), design only. The trial waits: Orochia, its first user, is paused (coordinator, 2026-10-23).
- **Issue:** krizaka/orochia-mobile#88. Epic krizaka/.github#179 (native apps).
- **Deciders:** Oussama (suggested `@bunny.net/stream-react-native`), then the CTO.
- **Numbering:** ADR-006 is #197 (open), ADR-007 is #217; this one takes ADR-008.

## Context

Orochia's phone app plays and uploads creators' videos; Akinaza's shop walls will play reels (akinaza#234). Both are
Expo apps (ADR-004). `@krizaka/ui/native` already ships a player: `native/video-player` and `native/vertical-video`, on
`expo-video` (an optional peer), which plays MP4 and HLS from a URL with optional headers. The web keeps its own player.

Oussama asked to consider Bunny's official React Native SDK. What can be checked today (npm and GitHub, 2026-10-23):

| Fact | Value | Source |
| :-- | :-- | :-- |
| Package | `@bunny.net/stream-react-native` | npm |
| Licence | MIT | npm, GitHub |
| Versions | 0.1.0 and 0.1.1 (2026-09-24), **1.0.0 (2026-10-16)** | npm `time` |
| Peers | `expo >= 52`, `react-native >= 0.71`, `react >= 18` | npm |
| JS package, unpacked | 1.38 MB (the native iOS and Android SDKs come on top, not measured) | npm `dist.unpackedSize` |
| Repository | BunnyWay/bunny-stream-react-native: 5 stars, 1 open issue, pushed 2026-10-23, not archived | GitHub API |

What Bunny's documentation states (issue #88, not verified by us yet): adaptive playback with captions, PiP, AirPlay,
Chromecast, FairPlay and Widevine DRM, resumable TUS uploads, camera recording, typed management APIs; Expo through a
config plugin and a development build (no Expo Go, no web); the **New Architecture required**; Android API 26+ (compileSdk
36, JDK 17, Kotlin 2.2.20+), iOS 15+; an API key only for management, upload and recording, public playback without one;
private playback with an **embed view token signed by the server** (client-side signing not supported).

## Decision

1. **One contract, two engines.** The apps talk to `@krizaka/ui/native` only: `VideoPlayer` / `VerticalVideo` for playback,
   and a new `VideoUploader` port for uploads (`start(file, signature) → progress, pause, resume, cancel`). The engine is the
   package's concern: `expo-video` (today) or the Bunny SDK (after the trial). A product never imports `@bunny.net/*`.
2. **Playback stays on `expo-video` by default.** Bunny serves HLS that `expo-video` already plays; a private video plays
   from an address (or headers) the **server** signs after it checked the session and the right to watch (owner, buyer,
   invited viewer, auction winner). The player's source gains `{ videoId, token, expires }` so the same contract carries
   Bunny's embed view token if the SDK becomes the engine; tokens are short-lived (an admin setting with bounds, 1–5 min)
   and refreshed before they expire. The web uses the same backend route: one rule everywhere.
3. **Uploads are signed by the server, never by the app.** The backend returns a short-lived TUS presigned signature
   (Bunny's procedure, verified against its documented vector in a test); the app holds **no library key** — a test fails
   the build when one appears in the bundle. The uploader resumes after a lost connection.
   What the SDK offers today (read in its source at v1.0.0, 2026-10-23): `initialize(libraryApiKey, libraryId)` is the
   only way to upload, record or call the management API — `StartUploadOptions` and `ContinueUploadOptions` take a
   `libraryId` and **no presigned credential** (`src/upload/types.ts`), and a blank key gives a playback-only mode (its
   README, « Initialize »). An upload through v1.0.0 therefore needs the library key in the app, which this decision
   refuses: **v1.0.0 cannot be the upload engine** — recorded here as an adoption blocker for uploads, lifted only by a
   release that starts and resumes an upload from server-presigned credentials. Until then, uploads go through our own
   TUS client (JavaScript) behind the same `VideoUploader` port, with the server's signature; the SDK may still be tried
   for playback alone.
4. **The Bunny SDK is adopted only if the trial passes**, as the engine of points 1–3 behind the same contract, for what
   `expo-video` cannot do (DRM, Chromecast, recording, a native TUS client). The trial checks, and writes into this ADR:
   - it builds and runs with **our** Expo SDK (58) and the New Architecture, in a development build, iOS and Android;
   - the added binary size of each app (IPA and AAB, before / after);
   - its maintenance at that date (releases since 1.0.0, issues answered), given that 1.0.0 is a week old today;
   - playback with a server-signed token, an upload resumed after airplane mode, on a physical device (captures on Bunny);
   - for uploads, the precondition of point 3: the release under trial starts **and** resumes an upload from
     server-presigned credentials, with no library key in the app (v1.0.0 fails this point before any device is touched;
     the upload part of the trial waits for a release that passes it, the playback part may run alone).
   A failed point keeps `expo-video` and a JS TUS client behind the same port; nothing else changes.
5. **Libraries per product and environment.** Orochia uses its own Stream library (`orochia-dev`, krizaka-com AGENTS §5.2);
   Akinaza gets its own when its reels ship. Which library is configuration read by the backend, per environment, that the
   admin sees. The library **id** is not a secret, and the native adapter cannot do without it (`initialize`, a player's
   `source.libraryId`, the upload options all take it): the backend returns it with what it signs — `{ libraryId, videoId,
   token, expires }` for a playback, `{ libraryId, videoId, signature, expires }` for an upload — and the app holds the id
   it was handed for that call, never the library **key**.

## Consequences

- No product depends on a one-month-old SDK until it has proved itself on our stack; adopting it later is an engine swap
  inside `@krizaka/ui/native`, with the products unchanged.
- The rights to watch and to upload are decided once, on the server, for the web and the apps alike.
- Cost: a `VideoUploader` port and the token fields in `@krizaka/ui/native` (krizaka-ui), the signing routes in each
  product's backend, and the trial itself (a development build per platform, a physical device for recording).

## Tests (when built)

- The adapter contract of `VideoPlayer` / `VideoUploader`, run against each engine.
- The upload signature and the view token against Bunny's documented vectors; an expired token refused; no token for a
  viewer without the right.
- No library key in the app bundle.
- An upload resumed after the connection drops.
