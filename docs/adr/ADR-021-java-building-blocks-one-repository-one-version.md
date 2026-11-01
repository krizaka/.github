# ADR-021 — The Java building blocks are Maven modules of one repository, with one version and one release

- **Status:** Accepted (founder go, 2026-10-31, option B). Roll-out in five slices, tracked in krizaka-internal#1878.
- **Date:** 2026-10-31
- **Builds on:** [ADR-019](ADR-019-java-building-blocks-on-github-packages.md) (the blocks are published on GitHub Packages and read through `krizaka-parent`).
- **Scope:** `krizaka-build`, `krizaka-platform-kit`, `krizaka-users`, `krizaka-notifications`, `krizaka-billing`, and the workspace of Orazaka that consumes them.


## Context: the root cause

The BOM lagged three times on 2026-10-31 (users 0.2.0, 0.2.1, 0.3.0) for one reason: **one fact lives in two places**. "Which version of krizaka-users is current" is written by the users release (its tag, its POM) and again by hand in `krizaka-build/krizaka-bom`. Two copies drift; a guard (#166, #172) detects the drift, it does not remove it.

A second cause sits behind it: the four blocks **depend on each other** (users needs kit's security; kit's notifications test needs users-api) and the BOM sits above all of them, yet each releases on its own. So every release is a hand-ordered chain across five repositories (kit -> users -> BOM -> kit -> BOM -> orazaka), with a cycle that no order resolves cleanly.

Numbers (tags today): krizaka-build 7, krizaka-platform-kit 7, krizaka-users 3, notifications 0, billing 0. Three of those tags are dead (kit 0.4.2, users 0.2.0, build 0.3.2: tag pushed, deploy refused). The BOM chain took 6+ sessions today and turned the Orazaka workspace red three times.

## Options

| | Truth | Order | Cross-repo cycle | Repos | Moving parts |
| :-- | :-- | :-- | :-- | :-- | :-- |
| A. Generate the BOM from released versions | one (the tags) | still hand-ordered | stays | 5 | generator, trigger, its own release |
| B. One repository, one version, Maven modules | one (`project.version`) | the reactor orders it | gone | 1 (from 5) | none new |
| C. Keep the split, automate bump PRs | two, synchronised | still hand-ordered | stays | 5 | dispatch, receiver, PR, guard, replays |

A and C add machinery to keep two copies equal; B removes the second copy. A cannot generate a BOM for a release that itself needs the previous release of a sibling (the cycle), and C's PR lands after the release, so Orazaka still sees a window where main is ahead of the BOM.

## Decision: B

The Java building blocks become modules of one repository, `krizaka-build`, with **one version and one release** (release-please already runs there for parent, BOM, quality, rewrite-style, test-support and payments, all at `${project.version}`). The BOM manages every module at `${project.version}`: no property to edit, nothing to drift. Releases are lockstep (like Spring Boot): a module that did not change still carries the new number.

## Costs

- History: each repository enters under a folder with `git filter-repo --to-subdirectory-filter`, merged into krizaka-build; the old repositories are archived with a pointer, their tags stay readable. The dead tags are not carried over.
- CI time: the reactor builds everything; the maven pipeline builds changed modules and dependants (`-amd`) on pull requests, the whole reactor on main and tags.
- Consumers: Orazaka (and users of the blocks) name one version (`krizaka.version`) instead of five; artifact coordinates (`com.krizaka:krizaka-users-api`) do not change. `check-krizaka-versions` compares one number.
- Independent versioning is lost on purpose; a breaking change to one block is a breaking release of the family.
- java.krizaka.com: its building-blocks map is already generated from the POMs of krizaka-build; with all modules in one reactor it reads one repository instead of five.
- Orazaka: the workspace guard drops the "main vs BOM" comparison for these blocks (same repository, same version).
- Retired: `upstreams:` in ci.yml, maven-pin-guard per block, `check-bom-released.mjs` (nothing left to compare), the dead-tag trap per repository.

## Migration slices (each one pull request, in order)

1. krizaka-build: import krizaka-platform-kit (largest, others depend on it); BOM manages its modules at `${project.version}`; release 0.x of the family; archive krizaka-platform-kit.
2. Import krizaka-users (kit's users-api test cycle becomes an in-reactor dependency); archive.
3. Import krizaka-notifications and krizaka-billing (no tags yet: nothing to migrate but history); archive.
4. Orazaka workspace: `krizaka.version` names the family version; the guard compares one number; ai-engine, job-service, packs follow.
5. java.krizaka.com reads the one reactor; README and AGENTS.md of krizaka-build list the modules; delete the retired guards.

Until slice 1 lands, the existing guard in krizaka-build (`check-bom-released.mjs`) stays the safety net. Option C is **not** built.

