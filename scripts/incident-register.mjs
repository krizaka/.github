// Validates rows of the confidentiality-incident register (P-39.1 art. 3.8; r. 3.1).
// Dependency-free. Usage: node scripts/incident-register.mjs <register.json>
import { readFileSync } from "node:fs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (s) => typeof s === "string" && DATE.test(s) && !Number.isNaN(Date.parse(s));
const FIVE_YEARS_DAYS = 5 * 365;

export function validateRow(row) {
  const e = [];
  if (!/^INC-\d{4}-\d{3}$/.test(row?.id ?? "")) e.push("id must look like INC-2026-001");
  if (!isDate(row.knownOn)) e.push("knownOn must be a date");
  if (row.occurredOn !== undefined && !isDate(row.occurredOn)) e.push("occurredOn must be a date");
  if (typeof row.description !== "string" || row.description.length < 10) e.push("description is required");
  if (!Array.isArray(row.informationConcerned) || !row.informationConcerned.length) e.push("informationConcerned is required");
  if (!Number.isInteger(row.personsConcerned?.count) || row.personsConcerned.count < 0) e.push("personsConcerned.count is required");
  for (const k of ["sensitivity", "consequences", "likelihood"]) {
    if (!row.riskAssessment?.[k]) e.push(`riskAssessment.${k} is required (art. 3.6)`);
  }
  if (typeof row.seriousInjuryRisk !== "boolean") e.push("seriousInjuryRisk must be a boolean");
  if (!Array.isArray(row.noticesSent)) e.push("noticesSent must be a list");
  else if (row.seriousInjuryRisk === true) {
    for (const to of ["cai", "persons"]) {
      if (!row.noticesSent.some((n) => n.to === to && isDate(n.on))) e.push(`serious risk: a dated notice to "${to}" is required (art. 3.5)`);
    }
  }
  if (!Array.isArray(row.measures) || !row.measures.length) e.push("measures is required");
  if (typeof row.drill !== "boolean") e.push("drill must be a boolean");
  if (isDate(row.knownOn) && isDate(row.retainUntil)) {
    const days = (Date.parse(row.retainUntil) - Date.parse(row.knownOn)) / 86_400_000;
    if (days < FIVE_YEARS_DAYS) e.push("retainUntil must be at least five years after knownOn (r. 3.1)");
  } else e.push("retainUntil must be a date");
  return e;
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const bad = validateRegister(JSON.parse(readFileSync(process.argv[2], "utf8")));
  for (const [id, errs] of Object.entries(bad)) console.error(id, errs.join("; "));
  process.exit(Object.keys(bad).length ? 1 : 0);
}
