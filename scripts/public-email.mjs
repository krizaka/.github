// One job: judge whether a public source file shows a Krizaka e-mail address (krizaka-internal#2764, founder 2026-11-06).
// Support and Contact lead to the contact form of krizaka.com; an address of ours is never printed on a public page. Two written
// exceptions: the privacy officer on privacy text (Quebec Law 25, s. 3.1 of the Act respecting the protection of personal information
// in the private sector, requires the title and contact details of the person in charge to be published) and data a customer
// publishes about itself (a Folioviv shop's own `publicEmail`). Everything that varies is data in the rule's check (docs/standards/rules.json).
// The conformance matrix (scripts/conformance.mjs, check `no-public-email`) finds the candidate files; this module judges them.

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LOCAL = "[\\w.+-]+";
const SUBDOMAINS = "(?:[\\w-]+\\.)*";
const PRIVACY_KEY = /"[^"]*(?:privacy|confidentialit)[^"]*"\s*:/i;

/** The address of one of our domains (a subdomain included), global and case-insensitive. */
export const addressPattern = (domains) => new RegExp(`${LOCAL}@${SUBDOMAINS}(?:${domains.map(escape).join("|")})\\b`, "gi");

/** What the repository scan looks for: only a file with such an address is read and judged. */
export const candidateOf = (check) => new RegExp(addressPattern(check.domains).source, "i");

const anyMatch = (patterns, text) => patterns.some((p) => new RegExp(p, "i").test(text));
const segmentsOf = (path) => path.split("/");

/** Is this tracked path a source that renders on a public page (not a test, a seed, a script, a doc or an example)? */
export function isPublicSource(path, check) {
  const segments = segmentsOf(path);
  const file = segments.at(-1);
  if (anyMatch(check.skipPaths, path)) return false;
  if (segments.slice(0, -1).some((s) => check.skipSegments.includes(s))) return false;
  if (check.publicFiles.includes(file)) return true;
  const extension = file.includes(".") ? file.split(".").at(-1) : "";
  return check.extensions.includes(extension) && segments.slice(0, -1).some((s) => check.publicSegments.includes(s));
}

/** Is this line one of the written exceptions? */
function isException(path, line, check) {
  if (anyMatch(check.privacyPaths, path)) return true;
  if (PRIVACY_KEY.test(line)) return true;
  if (check.customerData.some((marker) => line.includes(marker))) return true;
  return false;
}

/** The lines of one public source that show an address of ours outside an exception: [{ line, address }]. */
export function publicEmailHits(path, text, check) {
  const hits = [];
  text.split("\n").forEach((line, index) => {
    for (const address of line.match(addressPattern(check.domains)) ?? []) {
      if (!isException(path, line, check)) hits.push({ line: index + 1, address });
    }
  });
  return hits;
}
