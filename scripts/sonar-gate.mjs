#!/usr/bin/env node
// Sonar on a pull request (rules review of 2026-11-05, « Sonar : sur une PR, seule la note Sécurité bloque »).
//
//   node sonar-gate.mjs --report <projectBaseDir>/.scannerwork/report-task.txt      (the Sonar token in the environment)
//
// The shared CI awaits the quality gate (-Dsonar.qualitygate.wait=true). On a pull request the scan step may continue on a failed
// gate, and this script reads that analysis's gate: a condition on the Security rating (or the vulnerabilities behind it) fails
// the job; reliability, maintainability, coverage, duplication and hotspots only warn. On main, in the merge queue and for the
// release the full gate still fails: A/A/A stays the target before production. Anything unreadable fails (closed).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** The quality-gate metrics that block a pull request: the Security rating and the vulnerabilities that make it. */
export const SECURITY = /^(new_)?(security_rating|vulnerabilities)$/;

/** The only hosts the gate ever calls: SonarCloud. report-task.txt is scanner-written, but a URL read from a file is never trusted. */
export const SONAR_HOSTS = new Set(["sonarcloud.io"]);

/** An https SonarCloud URL as a URL object; anything else throws (SSRF guard, jssecurity:S8476). */
export function sonarUrl(raw) {
  const u = new URL(raw);
  if (u.protocol !== "https:" || !SONAR_HOSTS.has(u.hostname)) throw new Error(`refused non-SonarCloud URL (${u.protocol}//${u.hostname})`);
  return u;
}

/** One log line: strip CR/LF so a Sonar-provided value can never inject a GitHub Actions workflow command (log injection, jssecurity:S5145). */
export const oneLine = (s) => String(s ?? "").replace(/[\r\n]+/g, " ");

/** report-task.txt (key=value lines) as an object. */
export function parseReport(text) {
  return Object.fromEntries(
    text
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

/** The conditions of a project status that block, and those that warn. */
export function verdict(projectStatus) {
  if (!projectStatus || !["OK", "WARN", "ERROR"].includes(projectStatus.status)) {
    return { block: [{ metricKey: "quality gate", status: "unreadable" }], warn: [] };
  }
  const failed = (projectStatus.conditions ?? []).filter((c) => c.status === "ERROR");
  return { block: failed.filter((c) => SECURITY.test(c.metricKey)), warn: failed.filter((c) => !SECURITY.test(c.metricKey)) };
}

const line = (c) => `${oneLine(c.metricKey)}: ${oneLine(c.actualValue ?? "?")} (threshold ${oneLine(c.comparator ?? "")} ${oneLine(c.errorThreshold ?? "?")})`;

async function get(url, token) {
  const safe = sonarUrl(url);
  const res = await fetch(safe, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${safe.pathname}: ${res.status}`);
  return res.json();
}

export async function main(argv, { token = process.env.SONAR_TOKEN, wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const at = argv.indexOf("--report");
  if (at < 0 || !token) {
    console.log("::error::sonar-gate: --report <report-task.txt> and the Sonar token are required");
    return 1;
  }
  try {
    const report = parseReport(readFileSync(argv[at + 1], "utf8"));
    let task = null;
    for (let i = 0; i < 30; i++) {
      task = (await get(report.ceTaskUrl, token)).task;
      if (!["PENDING", "IN_PROGRESS"].includes(task?.status)) break;
      await wait(10000);
    }
    if (task?.status !== "SUCCESS" || !task.analysisId) throw new Error(`analysis ${task?.status ?? "unknown"}`);
    const url = `${report.serverUrl}/api/qualitygates/project_status?analysisId=${encodeURIComponent(task.analysisId)}`;
    const { block, warn } = verdict((await get(url, token)).projectStatus);
    for (const c of warn) console.log(`::warning title=Sonar (not blocking on a pull request)::${line(c)}. A/A/A stays the target before production.`);
    for (const c of block) console.log(`::error title=Sonar Security rating::${line(c)}`);
    if (block.length === 0) console.log(`Sonar: the Security rating holds; ${warn.length} other condition(s) only warn on a pull request.`);
    return block.length ? 1 : 0;
  } catch (e) {
    console.log(`::error::sonar-gate: the quality gate cannot be read (${oneLine(e.message)}): failing closed`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
