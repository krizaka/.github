# App videos on the download pages

The download page of a product (Yomizaka, Akinaza, Orazaka) shows short videos of its apps, **recorded by the e2e tests**,
so they follow the product (krizaka/.github#315).

1. **Record** in the e2e job, on demo personas and demo data only (no personal data, no secret on screen, the dev banner visible):
   - Maestro: `startRecording: android-documents` ... `stopRecording` in a flow (the file lands in the test output, so in the `maestro-e2e` artifact of `mobile-e2e.yml`);
   - Playwright: `recordVideo` on a showcase journey, saved as `web-<flow>.webm` and uploaded as an artifact.
   Names are `<platform>-<flow>` (`web`, `android`, `ios`, `mac`...).
2. **Publish** on `main` only, after the e2e jobs are green: call `.github/workflows/app-videos.yml` (see its header). It transcodes
   (webm + mp4 + jpg poster, at most 30 s, no audio, at most 720 px wide), uploads to Bunny under
   `site/products/<product>/download/<platform>-<flow>.<hash>.<ext>` (hashed, immutable), merges the product's manifest and opens one PR.
3. **Prune** is a preview: old objects are listed in the log (`would delete ...`), never deleted by the workflow.
4. **Page**: reads the manifest; one video per platform, poster first, the player loaded on demand (fixed box, no CLS), EN/FR text.
   **Guard**: a unit test fails when the page names a video missing from the manifest, or one older than 14 days.

Credentials are the org secrets `MEDIA_STORAGE_API_KEY`, `MEDIA_STORAGE_ZONE`, `MEDIA_STORAGE_ENDPOINT`, `MEDIA_CDN_HOSTNAME`; never printed.
