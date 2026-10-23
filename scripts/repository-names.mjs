#!/usr/bin/env node
import { pathToFileURL } from "node:url";

const PRODUCT_OWNERS = ["akinaza", "kachizaka", "orazaka", "orochia", "yasakia", "yomizaka", "yororis"];
const SHARED_REPOSITORIES = new Set([
  "krizaka-ui",
  "krizaka-ts",
  "krizaka-build",
  "krizaka-com",
  "krizaka-blog",
  "krizaka-infra",
  "krizaka-motion",
  "krizaka-accounts",
  "krizaka-billing",
  "krizaka-notifications",
  "krizaka-users",
]);
const FORBIDDEN = /(?:^|-)(?:client|design-system|kit)(?:-|$)/;
const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const PRODUCT_ROLE = new RegExp(`^(?:mobile|desktop|admin|services|packs|cli|contracts|build|${SLUG}-service|worker-${SLUG})$`);

/** Whether a repository name follows the approved owner and role vocabulary. */
export function isValidRepositoryName(name) {
  if (typeof name !== "string" || !new RegExp(`^${SLUG}$`).test(name) || FORBIDDEN.test(name)) return false;
  if (PRODUCT_OWNERS.includes(name) || SHARED_REPOSITORIES.has(name)) return true;
  if (new RegExp(`^template-${SLUG}-app$`).test(name)) return true;
  return PRODUCT_OWNERS.some((owner) => name.startsWith(`${owner}-`) && PRODUCT_ROLE.test(name.slice(owner.length + 1)));
}

/** Return sorted names outside the standard; the org's special `.github` repository is not a product repository. */
export function violationsIn(names) {
  return names.filter((name) => name !== ".github" && !isValidRepositoryName(name)).sort();
}

async function main() {
  const violations = [];
  for (let page = 1; ; page++) {
    const response = await fetch(`https://api.github.com/orgs/krizaka/repos?type=public&per_page=100&page=${page}`, {
      headers: { accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`GitHub repository list: ${response.status}`);
    const repositories = await response.json();
    violations.push(...violationsIn(repositories.map((repository) => repository.name)));
    if (repositories.length < 100) break;
  }

  console.log("## Repository names outside the standard\n");
  if (violations.length) {
    for (const name of violations) console.log(`- \`${name}\``);
  } else {
    console.log("No violations.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
