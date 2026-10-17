# ADR-002 — « Dev preview » is a checkable bar, and a product's status is data

- **Status**: Accepted
- **Date**: 2026-10-16
- **Scope**: every product (Orazaka, Orochia, Yomizaka, Yasakia, Yororis, Kachizaka, Akinaza) and krizaka.com
- **Standard**: [docs/standards/dev-preview.md](../standards/dev-preview.md)

## Context

krizaka.com showed « Dev preview » for any product with no `status`, i.e. by omission, and « In development » / « In
construction » by assertion. Nothing tied the words to what runs. Oussama's goal: every product reaches Dev preview.

## Decision

1. « Dev preview » is defined by a list of criteria, each verifiable by a script or a link
   (`docs/standards/dev-preview.md`): web, admin console, and mobile assets; UX/IA review included.
2. Each product repository carries `dev-preview.json`: criterion → evidence URL, `null` with a gap and its issue, or a
   justified `na`.
3. `lib/products.ts` has an explicit `devPreview` status; the build of krizaka.com refuses it unless the product's
   checklist is complete, fresh (≤ 60 days) and its evidence URLs answer.
4. Gaps are GitHub issues labelled `dev-preview` (project 4), sized XS–L with a model hint; `scripts/dev-preview-probe.mjs`
   re-checks what can be checked from outside.

## Consequences

- A product loses the badge the day its evidence goes stale or a check fails: honest by construction.
- Orochia (the reference) and Orazaka showed the badge before this ADR: a **time-boxed waiver** (until 2026-11-01, in
  `lib/dev-preview.ts`) lets them keep it while their gaps close; the test fails when it expires.
- Cost: one JSON file per repository and a few HTTP calls at build.

## Refused

- A manual flag (`status: "devPreview"` alone): that is today's problem.
- Generating the status from a score: a threshold hides the gap that matters; the list is all-or-nothing.
