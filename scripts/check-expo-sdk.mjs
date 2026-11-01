// Fails when an Expo app cannot be built for the App Store: its Expo SDK is below the minimum that builds with the
// required Xcode, or an iOS build profile of eas.json does not pin an image of that Xcode (never `latest`, `auto`
// or nothing). The minimum is docs/standards/expo-sdk.json, the only list (ITMS-90725, 2026-10-28).
//   node scripts/check-expo-sdk.mjs [--root <app directory>]
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const POLICY = JSON.parse(readFileSync(join(here, "..", "docs", "standards", "expo-sdk.json"), "utf8"));

/** The major of the `expo` dependency range ("~53.0.0" -> 53), or null when it cannot be read. */
export function sdkOf(range) {
  const m = /(\d{1,9})\./.exec(String(range ?? ""));
  return m ? Number(m[1]) : null;
}

/** Whether an EAS iOS image names Xcode `minimumXcode` or later: `macos-...-xcode-26.6`, or the alias `sdk-57`. */
export function imageIsXcode(image, policy = POLICY) {
  if (typeof image !== "string") return false;
  const xcode = /-xcode-(\d+)/.exec(image);
  if (xcode) return Number(xcode[1]) >= policy.minimumXcode;
  const alias = /^sdk-(\d+)$/.exec(image);
  return alias ? Number(alias[1]) >= policy.minimumSdk : false;
}

/** The problems of an app: its package.json and its eas.json (either may be absent). */
export function problems(pkg, eas, policy = POLICY) {
  const found = [];
  const sdk = sdkOf(pkg?.dependencies?.expo ?? pkg?.devDependencies?.expo);
  if (sdk === null) found.push("package.json has no readable `expo` dependency");
  else if (sdk < policy.minimumSdk) {
    found.push(`Expo SDK ${sdk} is below ${policy.minimumSdk}, the minimum that builds with Xcode ${policy.minimumXcode}`);
  }
  for (const [name, profile] of Object.entries(eas?.build ?? {})) {
    if (profile.extends) continue; // inherits the image of the profile it extends
    const image = profile.ios?.image;
    if (!imageIsXcode(image, policy)) {
      found.push(`eas.json build.${name}.ios.image must pin an Xcode ${policy.minimumXcode}+ image (got ${JSON.stringify(image ?? null)}; never latest or auto)`);
    }
  }
  return found;
}

function main() {
  const at = process.argv.indexOf("--root");
  const root = resolve(at > 0 ? process.argv[at + 1] : ".");
  const read = (f) => (existsSync(join(root, f)) ? JSON.parse(readFileSync(join(root, f), "utf8")) : null);
  const found = problems(read("package.json"), read("eas.json"));
  for (const p of found) console.error(`::error::${p}`);
  if (found.length) process.exit(1);
  console.log(`expo-sdk: ok (${root})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
