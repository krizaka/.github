// Validates rows of the confidentiality-incident register (P-39.1 art. 3.8; r. 3.1).
// Dependency-free. Usage: node scripts/incident-register.mjs <register.json>
import { readFileSync } from "node:fs";
import { relative, resolve, isAbsolute } from "node:path";

const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const nonEmptyList = (v) => Array.isArray(v) && v.length > 0;
const DAY_MS = 86_400_000;
const FIVE_YEARS_DAYS = 5 * 365;

// Each check returns an error message, or "" when the row is fine.
const CHECKS = [
  (r) => (/^INC-\d{4}-\d{3}$/.test(r.id ?? "") ? "" : "id must look like INC-2026-001"),
  (r) => (isDate(r.knownOn) ? "" : "knownOn must be a date"),
  (r) => (r.occurredOn === undefined || isDate(r.occurredOn) ? "" : "occurredOn must be a date"),
  (r) => (typeof r.description === "string" && r.description.length >= 10 ? "" : "description is required"),
  (r) => (nonEmptyList(r.informationConcerned) ? "" : "informationConcerned is required"),
  (r) => (Number.isInteger(r.personsConcerned?.count) && r.personsConcerned.count >= 0 ? "" : "personsConcerned.count is required"),
  (r) => ["sensitivity", "consequences", "likelihood"].filter((k) => !r.riskAssessment?.[k]).map((k) => `riskAssessment.${k} is required (art. 3.6)`).join("; "),
  (r) => (typeof r.seriousInjuryRisk === "boolean" ? "" : "seriousInjuryRisk must be a boolean"),
  (r) => (Array.isArray(r.noticesSent) ? "" : "noticesSent must be a list"),
  noticesForSeriousRisk,
  (r) => (nonEmptyList(r.measures) ? "" : "measures is required"),
  (r) => (typeof r.drill === "boolean" ? "" : "drill must be a boolean"),
  retention,
];

function noticesForSeriousRisk(r) {
  if (r.seriousInjuryRisk !== true || !Array.isArray(r.noticesSent)) return "";
  return ["cai", "persons"]
    .filter((to) => !r.noticesSent.some((n) => n.to === to && isDate(n.on)))
    .map((to) => `serious risk: a dated notice to "${to}" is required (art. 3.5)`)
    .join("; ");
}

function retention(r) {
  if (!isDate(r.knownOn) || !isDate(r.retainUntil)) return "retainUntil must be a date";
  const days = (Date.parse(r.retainUntil) - Date.parse(r.knownOn)) / DAY_MS;
  return days >= FIVE_YEARS_DAYS ? "" : "retainUntil must be at least five years after knownOn (r. 3.1)";
}

export function validateRow(row) {
  return CHECKS.map((check) => check(row ?? {})).filter(Boolean).flatMap((m) => m.split("; "));
}

export function validateRegister(rows) {
  if (!Array.isArray(rows)) return { "(register)": ["must be a list"] };
  const out = {};
  const seen = new Set();
  for (const r of rows) {
    const errs = validateRow(r);
    if (seen.has(r?.id)) errs.push("duplicate id");
    seen.add(r?.id);
    if (errs.length) out[r?.id ?? "(no id)"] = errs;
  }
  return out;
}

// The CLI only reads a .json file inside the current directory.
export function safeRegisterPath(arg, cwd = process.cwd()) {
  const full = resolve(cwd, String(arg ?? ""));
  const rel = relative(cwd, full);
  if (!full.endsWith(".json") || rel.startsWith("..") || isAbsolute(rel)) throw new Error("register must be a .json file inside the working directory");
  return full;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bad = validateRegister(JSON.parse(readFileSync(safeRegisterPath(process.argv[2]), "utf8")));
  for (const [id, errs] of Object.entries(bad)) console.error(id, errs.join("; "));
  process.exit(Object.keys(bad).length ? 1 : 0);
}
