#!/usr/bin/env node
// Licence gate (krizaka/.github, ADR-012): reads an SBOM (CycloneDX from Trivy, or SPDX from GitHub's dependency graph) and fails when a
// third-party component is under a licence the org policy forbids. The policy is an allowlist (policy.json): a licence that is neither
// allowed nor forbidden is reported as « unknown » and does not fail; a forbidden one fails unless the repository lists the package in
// its own exceptions file (.licence-exceptions.json) with a reason and an expiry date.
//
//   node licence-gate.mjs --sbom sbom.cdx.json [--policy policy.json] [--exceptions .licence-exceptions.json] [--report out.md] [--today YYYY-MM-DD]
//
// Pure functions are exported for tests (licence-gate.test.mjs). No dependency.
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Split a SPDX expression at the top level on an operator (OR / AND), respecting parentheses. */
export function splitTop(expr, op) {
  const parts = [];
  let depth = 0;
  let cur = "";
  const tokens = expr.split(/(\s+|\(|\))/).filter((t) => t !== "");
  for (const t of tokens) {
    if (t === "(") depth++;
    if (t === ")") depth--;
    if (depth === 0 && t.trim().toUpperCase() === op) {
      parts.push(cur.trim());
      cur = "";
    } else cur += t;
  }
  parts.push(cur.trim());
  return parts.filter(Boolean);
}

/** True when the parenthesis opened at index 0 closes at the last character. */
function enclosed(e) {
  let depth = 0;
  for (let i = 0; i < e.length - 1; i++) {
    if (e[i] === "(") depth++;
    else if (e[i] === ")") depth--;
    if (depth === 0) return false;
  }
  return true;
}

/** Remove parentheses that enclose the whole expression. */
export function unwrap(expr) {
  let e = expr.trim();
  while (e.startsWith("(") && e.endsWith(")") && enclosed(e)) e = e.slice(1, -1).trim();
  return e;
}

/** The class of one licence id: "allowed" | "forbidden" | "unknown". */
export function classifyId(id, policy) {
  const [base, exception] = id.trim().split(/ WITH /i).map((x) => x.trim());
  if (exception && policy.allowedExceptions.some((x) => x.toLowerCase() === exception.toLowerCase())) return "allowed";
  const match = (list) => list.some((p) => (p.endsWith("*") ? base.startsWith(p.slice(0, -1)) : base === p));
  if (match(policy.forbidden)) return "forbidden";
  if (match(policy.allowed)) return "allowed";
  return "unknown";
}

const RANK = { allowed: 0, unknown: 1, forbidden: 2 };

/** The class of a whole SPDX expression: OR takes the best alternative, AND the worst term. */
export function classify(expr, policy) {
  if (!expr || /^(NOASSERTION|NONE)$/i.test(expr.trim())) return "unknown";
  const e = unwrap(expr);
  const ors = splitTop(e, "OR");
  if (ors.length > 1) return ors.map((x) => classify(x, policy)).sort((a, b) => RANK[a] - RANK[b])[0];
  const ands = splitTop(e, "AND");
  if (ands.length > 1) return ands.map((x) => classify(x, policy)).sort((a, b) => RANK[b] - RANK[a])[0];
  return classifyId(e, policy);
}

function cdxLicence(c) {
  const ls = c.licenses ?? [];
  if (!ls.length) return "NOASSERTION";
  return ls
    .map((l) => l.expression ?? l.license?.id ?? l.license?.name ?? "NOASSERTION")
    .map((x) => (ls.length > 1 ? `(${x})` : x))
    .join(" AND ");
}

/** Normalise an SBOM to [{ name, version, purl, licence }]. Accepts CycloneDX JSON, SPDX JSON, or GitHub's { sbom: SPDX } wrapper. */
export function components(sbom) {
  if (sbom.bomFormat === "CycloneDX") {
    return (sbom.components ?? []).map((c) => ({
      name: c.group ? `${c.group}:${c.name}` : c.name,
      type: c.type ?? "library",
      version: c.version ?? "",
      purl: c.purl ?? "",
      licence: cdxLicence(c),
    }));
  }
  const spdx = sbom.sbom ?? sbom;
  return (spdx.packages ?? []).map((p) => ({
    name: p.name,
    version: p.versionInfo ?? "",
    purl: (p.externalRefs ?? []).find((r) => r.referenceType === "purl")?.referenceLocator ?? "",
    licence: [p.licenseConcluded, p.licenseDeclared].find((x) => x && x !== "NOASSERTION") ?? "NOASSERTION",
  }));
}

/** System packages of a base image (deb, apk, rpm) and first-party packages are not judged by this gate. */
export function inScope(c, policy) {
  if (c.type === "operating-system" || /^pkg:(deb|apk|rpm|alpm)\//.test(c.purl)) return false;
  if (policy.firstParty.some((p) => c.purl.includes(p) || c.name.startsWith(p))) return false;
  if (c.name.startsWith("com.github.krizaka/")) return false; // the repository itself, in GitHub's SBOM
  return true;
}

export function evaluate(list, policy, exceptions = [], today = new Date().toISOString().slice(0, 10)) {
  const out = { forbidden: [], excepted: [], unknown: [], allowed: 0, skipped: 0 };
  for (const c of list) {
    if (!inScope(c, policy)) {
      out.skipped++;
      continue;
    }
    const k = classify(c.licence, policy);
    if (k === "allowed") out.allowed++;
    else if (k === "unknown") out.unknown.push(c);
    else {
      const ex = exceptions.find((x) => x.package === c.name && x.reason && (!x.expires || x.expires >= today));
      if (ex) out.excepted.push({ ...c, reason: ex.reason, expires: ex.expires });
      else out.forbidden.push(c);
    }
  }
  return out;
}

export function report(r) {
  const row = (c) => {
    const reason = c.reason ? " " + c.reason + " (until " + (c.expires ?? "—") + ") |" : "";
    return `| ${c.name} | ${c.version} | \`${c.licence}\` |${reason}`;
  };
  const lines = [
    "## Licence gate",
    "",
    `${r.allowed} allowed · ${r.forbidden.length} forbidden · ${r.excepted.length} excepted · ${r.unknown.length} unknown · ${r.skipped} not judged (system or first-party)`,
    "",
  ];
  if (r.forbidden.length) lines.push("### Forbidden", "", "| Package | Version | Licence |", "| :-- | :-- | :-- |", ...r.forbidden.map(row), "");
  if (r.excepted.length) lines.push("### Excepted", "", "| Package | Version | Licence | Reason |", "| :-- | :-- | :-- | :-- |", ...r.excepted.map(row), "");
  if (r.unknown.length) lines.push("### Unknown (checked by hand, does not fail)", "", "| Package | Version | Licence |", "| :-- | :-- | :-- |", ...r.unknown.map(row), "");
  return lines.join("\n");
}

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const sbomPath = arg("sbom");
  if (!sbomPath) {
    console.error("usage: licence-gate.mjs --sbom <file> [--policy p.json] [--exceptions e.json] [--report out.md]");
    process.exit(2);
  }
  const policy = JSON.parse(readFileSync(arg("policy", join(HERE, "policy.json")), "utf8"));
  const exPath = arg("exceptions", ".licence-exceptions.json");
  const exceptions = existsSync(exPath) ? (JSON.parse(readFileSync(exPath, "utf8")).exceptions ?? []) : [];
  const r = evaluate(components(JSON.parse(readFileSync(sbomPath, "utf8"))), policy, exceptions, arg("today"));
  const md = report(r);
  console.log(md);
  const out = arg("report") ?? process.env.GITHUB_STEP_SUMMARY;
  if (out) writeFileSync(out, md + "\n", { flag: "a" });
  if (r.forbidden.length) {
    for (const c of r.forbidden) {
      console.log(`::error title=Forbidden licence::${c.name}@${c.version} is under ${c.licence} (ADR-012). Replace it, or list it in .licence-exceptions.json with a reason and an expiry.`);
    }
    process.exit(1);
  }
}
