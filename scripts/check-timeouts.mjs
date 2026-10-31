#!/usr/bin/env node
// Time limits everywhere (krizaka-internal#2007): every job of a workflow declares `timeout-minutes`
// (a job that only calls a reusable workflow with `uses:` is exempt - the callee's jobs carry it), and
// a test config has a per-test timeout. Dependency-free; used by the conformance rule `time-limits`.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

/** Jobs without a limit in one workflow file's text: [{ job, line }]. */
export function jobsWithoutTimeout(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^jobs:\s*(#.*)?$/.test(l));
  if (start < 0) return [];
  const out = [];
  let cur = null;
  const close = () => {
    if (cur && !cur.timeout && !cur.uses) out.push({ job: cur.name, line: cur.line });
  };
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\S/.test(l) && !l.startsWith("#")) break; // next top-level key
    const job = /^ {2}([A-Za-z0-9_-]+):\s*(#.*)?$/.exec(l);
    if (job) {
      close();
      cur = { name: job[1], line: i + 1, timeout: false, uses: false };
      continue;
    }
    if (!cur) continue;
    if (/^ {4}timeout-minutes:/.test(l)) cur.timeout = true;
    if (/^ {4}uses:/.test(l)) cur.uses = true;
  }
  close();
  return out;
}

/** A test config text without a per-test timeout, or null when it has one. */
export function configWithoutTestTimeout(file, text) {
  const name = file.split("/").pop();
  if (/^playwright\.config\./.test(name)) return /\btimeout\s*:/.test(text) ? null : "no `timeout` (per test)";
  if (/^(vitest|jest)\.config\./.test(name)) return /\b(testTimeout|timeout)\s*:/.test(text) ? null : "no `testTimeout`";
  if (name === "junit-platform.properties")
    return /junit\.jupiter\.execution\.timeout\.default\s*=/.test(text) ? null : "no `junit.jupiter.execution.timeout.default`";
  return null;
}

/** `node --test` invoked in a package.json script without --test-timeout. */
export function nodeTestWithoutTimeout(text) {
  return /\bnode\b[^"\n]*--test\b/.test(text) && !/--test-timeout/.test(text);
}

function walk(dir, files = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

export function check(root) {
  const problems = [];
  for (const dir of [".github/workflows", "workflow-templates"]) {
    const d = join(root, dir);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((n) => /\.ya?ml$/.test(n)))
      for (const j of jobsWithoutTimeout(readFileSync(join(d, f), "utf8")))
        problems.push(`${dir}/${f}:${j.line} job \`${j.job}\` has no timeout-minutes`);
  }
  for (const p of walk(root)) {
    const rel = relative(root, p);
    if (/(^|\/)(node_modules|fixtures)\//.test(rel)) continue;
    const why = configWithoutTestTimeout(rel, existsSync(p) ? readFileSync(p, "utf8") : "");
    if (why && /(playwright|vitest|jest)\.config\.|junit-platform\.properties$/.test(rel)) problems.push(`${rel}: ${why}`);
    if (rel.endsWith("package.json") && nodeTestWithoutTimeout(readFileSync(p, "utf8")))
      problems.push(`${rel}: \`node --test\` without --test-timeout`);
  }
  return problems;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const problems = check(process.argv[2] ?? ".");
  for (const p of problems) console.error(p);
  if (problems.length) process.exit(1);
  console.log("time limits: every job and test config has one");
}
