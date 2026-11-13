// Which package manager owns a directory, by its lockfile (krizaka-internal#3342): « Bump @krizaka packages » runs in pnpm and in npm
// repositories, at the root or in a sub-folder (`working-directory`). Prints `manager=<pnpm|npm>` (and writes it to $GITHUB_OUTPUT).
//   node scripts/detect-package-manager.mjs [directory]
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** @returns {"pnpm" | "npm"} the manager of `dir`; throws when no lockfile says. */
export function detectPackageManager(dir) {
  if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(dir, "package-lock.json"))) return "npm";
  throw new Error(`No pnpm-lock.yaml or package-lock.json in "${dir}": cannot tell the package manager (set working-directory to the folder of the package).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const manager = detectPackageManager(process.argv[2] ?? ".");
    console.log(`manager=${manager}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `manager=${manager}\n`);
  } catch (e) {
    console.error(`::error::${e.message}`);
    process.exit(1);
  }
}
