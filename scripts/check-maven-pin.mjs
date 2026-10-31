#!/usr/bin/env node
// Refuses a release when the repository's pin of the org maven.yml predates the permissions fix (be08be83): its
// top-level `permissions: contents: read` capped release-github, so every first deploy died with a 403 AFTER the tag
// (a protected, dead tag). Run BEFORE release-please can tag (actions/maven-pin-guard, first step of release-please.yml).
//
//   node scripts/check-maven-pin.mjs <repo> [--ref main]     reads .github/workflows/*.yml of <repo> through `gh api`
import { execFileSync } from "node:child_process";

/** The first org commit whose maven.yml has no workflow-level `permissions:` (release-github takes the caller's grant). */
export const MIN_MAVEN_PIN = "be08be836bcce567d84a679d3f40aefab79ca4cc";
const PIN = /krizaka\/\.github\/\.github\/workflows\/maven\.yml@([0-9a-f]{40})/g;

/** The shas of maven.yml that a workflow text pins. */
export const mavenPins = (text) => [...text.matchAll(PIN)].map((m) => m[1]);

/** Whether `status` (GitHub's compare of MIN...pin) says the pin is the minimum or after it. */
export const pinIsCurrent = (pin, status) => pin === MIN_MAVEN_PIN || status === "ahead" || status === "identical";

/** The problems of one workflow: a pin that is behind the minimum. `statusOf(pin)` returns the compare status. */
export function problems(file, text, statusOf) {
  return mavenPins(text)
    .filter((pin) => !pinIsCurrent(pin, statusOf(pin)))
    .map((pin) => `${file}: maven.yml@${pin.slice(0, 8)} predates ${MIN_MAVEN_PIN.slice(0, 8)} (no write permission for the release deploy): move the pin to the current krizaka/.github main before releasing`);
}

const gh = (path) => execFileSync("gh", ["api", path], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

export function main(argv) {
  const [repo] = argv;
  const ref = argv.includes("--ref") ? argv[argv.indexOf("--ref") + 1] : "main";
  if (!repo) {
    console.error("usage: check-maven-pin.mjs <repo> [--ref main]");
    return 2;
  }
  const files = JSON.parse(gh(`repos/krizaka/${repo}/contents/.github/workflows?ref=${ref}`)).filter((f) => /\.ya?ml$/.test(f.name));
  const found = [];
  for (const f of files) {
    const text = Buffer.from(JSON.parse(gh(`repos/krizaka/${repo}/contents/${f.path}?ref=${ref}`)).content, "base64").toString("utf8");
    const statusOf = (pin) => {
      try {
        return JSON.parse(gh(`repos/krizaka/.github/compare/${MIN_MAVEN_PIN}...${pin}`)).status;
      } catch {
        return "unknown";
      }
    };
    found.push(...problems(f.path, text, statusOf));
  }
  for (const line of found) console.error(`::error::${line}`);
  return found.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
