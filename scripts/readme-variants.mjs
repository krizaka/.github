/**
 * Closed set of README variants by repository kind (krizaka-internal#4672).
 *
 * Adding a new repository kind is one edit to KIND_VARIANTS below; adding a
 * new variant is one entry in README_VARIANTS. Both scripts/product-readme.mjs
 * and scripts/conformance-checks.mjs read from here.
 */

export const FSL_LINE = "FSL-1.1-ALv2: source-available, each release becomes Apache-2.0 two years later";

export const README_VARIANTS = Object.freeze({
  product: Object.freeze({
    id: "product",
    label: "Product",
    schema: "required",
    mark: "product",
    defaultLicence: "fsl",
    familyText: "Part of the Krizaka family of products",
  }),
  library: Object.freeze({
    id: "library",
    label: "Library",
    schema: "none",
    mark: "krizaka",
    defaultLicence: "apache",
    familyText: "Part of the Krizaka open stack",
  }),
  site: Object.freeze({
    id: "site",
    label: "Site",
    schema: "none",
    mark: "krizaka",
    defaultLicence: "apache",
    familyText: "Part of the Krizaka organisation",
  }),
  infra: Object.freeze({
    id: "infra",
    label: "Infrastructure",
    schema: "none",
    mark: "krizaka",
    defaultLicence: "apache",
    familyText: "Part of the Krizaka organisation",
  }),
  internal: Object.freeze({
    id: "internal",
    label: "Internal",
    schema: "none",
    mark: "krizaka",
    defaultLicence: "private",
    familyText: null,
  }),
  empty: Object.freeze({
    id: "empty",
    label: "Repository",
    schema: "none",
    mark: "krizaka",
    defaultLicence: "private",
    familyText: "Part of the Krizaka organisation",
  }),
});

/** Closed mapping from repos.json `kind` to its default variant id. */
export const KIND_VARIANTS = Object.freeze({
  app: "product",
  maven: "library",
  npm: "library",
  rust: "library",
  python: "library",
  site: "site",
  iac: "infra",
  none: "empty",
});

/** Closed set of licences rendered in badges and footers. */
export const LICENCE_SPECS = Object.freeze({
  fsl: Object.freeze({ id: "fsl", badgeLabel: "FSL-1.1-ALv2", badgeSlug: "FSL--1.1--ALv2", colour: "blue", line: FSL_LINE }),
  apache: Object.freeze({ id: "apache", badgeLabel: "Apache-2.0", badgeSlug: "Apache--2.0", colour: "blue", line: "Apache-2.0" }),
  mit: Object.freeze({ id: "mit", badgeLabel: "MIT", badgeSlug: "MIT", colour: "blue", line: "MIT" }),
  private: Object.freeze({
    id: "private",
    badgeLabel: "private",
    badgeSlug: "private",
    colour: "lightgrey",
    line: "Private repository of Technologies Krizaka Inc. — all rights reserved.",
  }),
});

/** Non-archived entries of repos.json, the single source of the repository set. */
export function activeRepositories(reposData) {
  return (reposData?.repositories ?? []).filter((entry) => entry.archived === false);
}

/** Finds a non-archived repository entry in repos.json, or throws. */
export function findRepository(reposData, name) {
  const entry = activeRepositories(reposData).find((r) => r.name === name);
  if (!entry) {
    throw new Error(`Unknown or archived repository "${name}" in repos.json`);
  }
  return entry;
}

/** Resolves the README variant for a repos.json entry; refuses unknown kinds. */
export function resolveVariant(entry, productsData) {
  if (!Object.hasOwn(KIND_VARIANTS, entry.kind)) {
    throw new Error(`Unknown repository kind "${entry.kind}" for "${entry.name}"`);
  }
  if (productsData?.products && Object.hasOwn(productsData.products, entry.name)) {
    return README_VARIANTS.product;
  }
  if (entry.kind === "iac") return README_VARIANTS.infra;
  if (entry.kind === "none") return README_VARIANTS.empty;
  if (entry.visibility === "private") return README_VARIANTS.internal;
  return README_VARIANTS[KIND_VARIANTS[entry.kind]];
}

/** Detects the licence id from licence file text. */
export function licenceIdFromText(text, fallback) {
  if (/Functional Source License|FSL-1\.1-ALv2/i.test(text)) return "fsl";
  if (/MIT License/i.test(text)) return "mit";
  if (/Apache License/i.test(text)) return "apache";
  return fallback;
}

/** Detects CI, security workflow, and licence metadata from repository paths and reader. */
export function detectRepoInfo(hasFile, readText, defaultLicence) {
  const hasCi = hasFile(".github/workflows/ci.yml");
  const hasSecurity = hasFile(".github/workflows/security.yml");
  const licenceFile = ["LICENSE.md", "LICENSE"].find((f) => hasFile(f)) ?? null;
  if (!licenceFile) {
    return { hasCi, hasSecurity, licence: { id: "private", file: null, hasApachePrior: false } };
  }
  const text = readText(licenceFile) ?? "";
  const id = licenceIdFromText(text, defaultLicence);
  return { hasCi, hasSecurity, licence: { id, file: licenceFile, hasApachePrior: hasFile("LICENSE-APACHE") } };
}
