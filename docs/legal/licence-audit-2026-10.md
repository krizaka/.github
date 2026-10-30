# Third-party licence audit — 2026-10-26

> Status: good-faith reading of the SBOMs, **à valider par l'avocat** (.github#250). Policy: [ADR-012](../adr/ADR-012-licensing-libraries-open-products-fair-source.md) §6, enforced by [`actions/licence-check`](../../actions/licence-check/) (`policy.json`).

## Method

- **Sources**: the CycloneDX SBOM that `node-ci.yml` keeps for every container build (Trivy, artifact `sbom-cyclonedx`), for Yomizaka and Akinaza; GitHub's dependency-graph SBOM (SPDX, `GET /repos/krizaka/<repo>/dependency-graph/sbom`) for every product and library repository.
- **Tool**: `node actions/licence-check/licence-gate.mjs --sbom <file>` — an allowlist: permissive and weak copyleft pass; GPL, AGPL, SSPL, EUPL, BUSL, Elastic, non-commercial fail; anything else is « unknown » and is read by hand. System packages of a base image (deb, apk) and first-party packages are not judged.
- **Why AGPL matters most**: we *operate* the products. A hosted service does not « distribute » the code, so GPL obligations do not arise from hosting; AGPL-3.0 s. 13 does (users interacting over a network must be offered the source). GPL matters for what we **distribute**: the mobile and desktop apps, the npm and Maven libraries, any public image.

## Result

**No dependency under AGPL, SSPL, BUSL, Elastic or a non-commercial licence, and no GPL-only dependency, in any product or library.**

| Repository | Allowed | Forbidden | Unknown | Notes |
| :--- | ---: | ---: | ---: | :--- |
| yomizaka (container SBOM) | 55 | 0 | 0 | The Next.js standalone image; the Alpine base's GPL packages (busybox…) are system packages, not linked |
| akinaza (container SBOM) | 34 | 0 | 0 | Same |
| yomizaka (dependency graph) | 1 988 | 0 | 48 | Unknown: direct manifest entries without a resolved licence (react, next, zod, vitest…; all MIT or Apache-2.0 upstream) and Actions |
| akinaza (dependency graph) | 2 008 | 0 | 46 | Same |
| orazaka (workspace) | 1 921 | 0 | 39 | Same; Maven direct entries (Spring, PostgreSQL JDBC BSD-2, RabbitMQ client MPL-2.0/Apache-2.0) |
| orazaka-ai-engine, -studio, -job-service, -knowledge-service, -conversation-service, -automation-service, -edge | ≤ 5 each | 0 | 18–54 | GitHub resolves Maven direct dependencies only, without licences: every one is Spring, Spring AI, Jackson, Micrometer, Caffeine, Logback (EPL-1.0 / LGPL-2.1), JUnit, Mockito, ArchUnit — Apache-2.0, EPL or MIT upstream |
| orazaka-worker-media | 17 | 0 | 29 | Python: torch, torchvision (BSD-3), transformers, diffusers, accelerate, safetensors (Apache-2.0), mlx, mflux (MIT), pika, psutil (BSD-3), pyyaml (MIT), cryptography (Apache-2.0 / BSD), pillow (MIT-CMU) |
| orazaka-web-client / -mobile-client | 1 045 / 1 076 | 0 | 9 / 12 | |
| krizaka-users | 493 | 9* | 24 | * false positive, below |
| krizaka-platform-kit | 2 135 | 4* | 40 | * false positive, below |
| krizaka-billing, -notifications, -ui, -ts, -build, orazaka-packs, -contracts, -cli, -ui-kit, -build | all | 0 | ≤ 96 | |

## Findings to act on

| # | Finding | Risk | Action |
| :--- | :--- | :--- | :--- |
| 1 | **MMAudio (video-to-audio) weights are CC-BY-NC-4.0** — in `orazaka-worker-media/models.yaml`, `commercial: false`, never a default, but a job can still ask for it by name | **High** if a paying customer's job uses it: commercial use of non-commercial weights | Refuse non-commercial weights in a production deployment (setting in the DB, default off), test it — krizaka/orazaka-worker-media#80 |
| 2 | **ffmpeg from Ubuntu** in the worker's CUDA image (built with GPL components) | Low: called as a separate program, the image is built in CI and never published (`load: true`) | If the image is ever pushed to a public registry, ship the GPL notice and the source offer, or build ffmpeg LGPL-only |
| 3 | **sharp's libvips binaries (LGPL-3.0-or-later)** in the Yomizaka and Akinaza images | Low: dynamically linked, allowed by policy | If an image is distributed: keep the LGPL notice and the library replaceable (it is, as a separate .so) |
| 4 | **Java product repositories have no CI SBOM** (Trivy runs only in `node-ci.yml`'s container job), and GitHub's graph does not resolve transitive Maven licences | Medium: the Java audit above reads direct dependencies only | Add `cyclonedx-maven-plugin` to `orazaka-parent` / `krizaka-parent` and the licence gate to `java-ci.yml` — .github#292 |
| 5 | **False positives of GitHub's scanner**: `org.glassfish.jaxb:*` 4.0.9 read as « … AND GPL-1.0-or-later » (it is EDL-1.0, a BSD-3 licence) and `jakarta.servlet-api` read as « EPL-2.0 AND GPL-2.0-only » (it is EPL-2.0 OR GPL-2.0 with the Classpath exception) | None | Listed here; if the gate ever reads them from a CI SBOM, a `.licence-exceptions.json` entry with this reason |
| 6 | Dual-licensed packages that offer GPL as one choice (`node-forge` BSD-3 OR GPL-2.0, `react-native`'s docs CC-BY-NC-SA as one alternative, `jakarta.*` EPL OR GPL+CPE) | None | We use them under the permissive alternative; the gate reads OR as « the best choice » |

## Model weights are licences too

`orazaka-worker-media/models.yaml` already records each weight's licence and a `commercial` flag (Wan 2.x and most defaults Apache-2.0; LTX-Video under its Open Weights licence; one CreativeML OpenRAIL-M, whose use restrictions must flow down to our terms; MMAudio non-commercial). The SBOM does not see weights: this file is their inventory, and finding 1 is the one gap.

## Next audit

Every PR, once the gate is wired into `node-ci.yml` (and `java-ci.yml` after finding 4). This page is refreshed at each lawyer review.
