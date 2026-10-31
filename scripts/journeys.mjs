#!/usr/bin/env node
/* The org's critical journeys (krizaka-internal#1939), the commands behind journeys.yml, post-deploy-journeys.yml and journey-line.yml:

     preflight   env: JOURNEYS_MODE=ci|post-deploy, NEEDS_PERSONA, NEEDS_PAYMENTS, PERSONAS, JOURNEY_PERSONA_PASSWORD, JOURNEY_PAYMENTS_KEY
                 FAILS on a missing credential (never a silent pass: Orazaka's dev-persona-smoke stayed green with them unset), on a
                 persona that is not of the demo cast, on a payments key that is not a test-mode key.
     report      --json playwright.json [--out summary.md]
                 reads the Playwright JSON report; FAILS when nothing ran (« nothing checked »), when a test failed unexpectedly, was skipped,
                 or « expected to fail » now passes (the product slice removes the marker). An expected failure (`test.fail()`) is listed, not hidden.
     pr-line     env: PR_TITLE, PR_BODY, PR_AUTHOR, PR_BRANCH
                 a feat/fix PR names its journey (`Journey: <name>`) or says why none (`Journey: n/a — <reason>`).

   Pure helpers are exported and tested (tests/journeys.test.mjs). Only the NAMES of missing inputs are ever printed. */
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// A persona of the seed cast (the demo accounts every product seeds), never a real account.
const DEMO_PERSONA = /^[\w.+-]+@(demo|demo\.[a-z.]+|example\.(com|org|net))$/i;
// Test-mode payment keys (Stripe's sk_test_/rk_test_/pk_test_); a live key (…_live_…) is refused.
const TEST_KEY = /^(sk|rk|pk)_test_[A-Za-z0-9]+$/;
const LIVE_KEY = /(sk|rk|pk)_live_/;

const isOn = (env, name, fallback) => (env[name] ?? fallback) !== "false";

function personaProblems(env) {
  const personas = (env.PERSONAS ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const problems = personas.filter((p) => !DEMO_PERSONA.test(p)).map((p) => `persona ${p} is not of the demo cast (name@demo or name@example.*): never a real account`);
  if (personas.length === 0) problems.push("no persona declared (input personas): a journey runs as a demo persona");
  if (env.JOURNEYS_MODE === "post-deploy" && !env.JOURNEY_PERSONA_PASSWORD) problems.push("missing the persona-password input (JOURNEY_PERSONA_PASSWORD): the run would check nothing");
  return problems;
}

function paymentProblems(env) {
  const key = env.JOURNEY_PAYMENTS_KEY ?? "";
  if (!isOn(env, "NEEDS_PAYMENTS", "false")) return LIVE_KEY.test(key) ? ["a live payments key was passed to a run that declares no payments"] : [];
  if (!key) return ["missing the payments-test-key input (JOURNEY_PAYMENTS_KEY): the payment journey would check nothing"];
  return TEST_KEY.test(key) ? [] : ["the payments key is not a test-mode key: only test-mode payments run in journeys"];
}

/** The problems of a journeys run's environment: names only, never a value. */
export function preflight(env) {
  const problems = [];
  if (env.JOURNEYS_MODE !== "ci" && env.JOURNEYS_MODE !== "post-deploy") problems.push("JOURNEYS_MODE must be ci or post-deploy");
  if (isOn(env, "NEEDS_PERSONA", "true")) problems.push(...personaProblems(env));
  return [...problems, ...paymentProblems(env)];
}

/** Every test of a Playwright JSON report, flattened: { title, status, expectedStatus, project }. */
export function testsOf(report) {
  const out = [];
  const walk = (suite, path) => {
    const here = suite.title ? [...path, suite.title] : path;
    for (const spec of suite.specs ?? [])
      for (const t of spec.tests ?? [])
        out.push({ title: [...here, spec.title].join(" › "), status: t.status, expectedStatus: t.expectedStatus, project: t.projectName ?? "" });
    for (const s of suite.suites ?? []) walk(s, here);
  };
  for (const s of report.suites ?? []) walk(s, []);
  return out;
}

/** The verdict of a report: counts, the lists a reader needs, and the reasons it is red. */
export function summarise(report) {
  const tests = testsOf(report);
  const by = (keep) => tests.filter((t) => keep(t));
  const expectedFail = by((t) => t.status === "expected" && t.expectedStatus === "failed");
  const passed = by((t) => t.status === "expected" && t.expectedStatus !== "failed");
  const unexpected = by((t) => t.status === "unexpected");
  const skipped = by((t) => t.status === "skipped");
  const flaky = by((t) => t.status === "flaky");
  const reasons = [];
  if (tests.length === 0) reasons.push("no journey ran: nothing was checked");
  for (const t of unexpected) reasons.push(t.expectedStatus === "failed" ? `« ${t.title} » is marked expected-to-fail but passes: remove the test.fail() marker (the fix landed)` : `« ${t.title} » failed`);
  for (const t of skipped) reasons.push(`« ${t.title} » is skipped: a critical journey is never skipped`);
  for (const t of flaky) reasons.push(`« ${t.title} » passed only on retry: a flaky critical journey is a failing one`);
  return { total: tests.length, passed, expectedFail, unexpected, skipped, flaky, reasons, ok: reasons.length === 0 };
}

export function render(s) {
  const lines = [`### Journeys: ${s.ok ? "green" : "RED"}`, "", `${s.passed.length} passed, ${s.expectedFail.length} expected to fail, ${s.unexpected.length} failed, ${s.skipped.length} skipped, ${s.flaky.length} flaky (of ${s.total}).`];
  if (s.expectedFail.length) lines.push("", "Expected to fail (a known bug, linked in the test; the product slice removes the marker):", ...s.expectedFail.map((t) => `- ${t.title}`));
  if (s.reasons.length) lines.push("", "Why it is red:", ...s.reasons.map((r) => `- ${r}`));
  return lines.join("\n");
}

const TYPED = /^(feat|fix)(\([^)]*\))?!?:/i;
const EXEMPT_BRANCH = /^(deps\/|dependabot\/|changeset-release\/|release-please--)/;
const NO_JOURNEY = /^n\/a\s*[—–-]\s*(\S.{9,})$/i;

/** The `Journey:` line of a PR: null when fine, else the problem. A feat/fix PR names its journey or says why none. */
export function journeyProblem({ title = "", body = "", author = "", branch = "" }) {
  if (!TYPED.test(title) || author.startsWith("dependabot") || EXEMPT_BRANCH.test(branch)) return null;
  const visible = body.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const found = visible.map((l) => l.trim()).find((l) => l.toLowerCase().startsWith("journey:"));
  const line = found === undefined ? null : [found, found.slice("journey:".length)];
  if (!line) return "the PR body has no `Journey:` line: name the journey it adds or changes, or write `Journey: n/a — <reason>`";
  const value = line[1].trim();
  if (value === "" || /^<.*>$/.test(value)) return "the `Journey:` line is empty: name the journey, or write `Journey: n/a — <reason>`";
  if (/^n\/a/i.test(value) && !NO_JOURNEY.test(value)) return "`Journey: n/a` needs a reason of at least 10 characters after the dash";
  return null;
}

const summaryOut = (text) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
const arg = (name) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : undefined);

function runPreflight() {
  const problems = preflight(process.env);
  if (problems.length === 0) return console.log("preflight: ok");
  for (const p of problems) console.error(`::error::${p}`);
  const bullets = problems.map((p) => "- " + p).join("\n");
  summaryOut("### Journeys preflight\n" + bullets);
  process.exit(1);
}

const NOTHING = { ok: false, total: 0, passed: [], expectedFail: [], unexpected: [], skipped: [], flaky: [] };

function runReport() {
  const file = arg("json");
  let s;
  try {
    s = summarise(JSON.parse(readFileSync(file, "utf8")));
  } catch (error) {
    s = { ...NOTHING, reasons: [`no readable report at ${file}: the journeys did not run (${error.code ?? error.message})`] };
  }
  const text = render(s);
  console.log(text);
  summaryOut(text);
  if (arg("out")) writeFileSync(arg("out"), text);
  process.exit(s.ok ? 0 : 1);
}

function runPrLine() {
  const problem = journeyProblem({ title: process.env.PR_TITLE, body: process.env.PR_BODY, author: process.env.PR_AUTHOR, branch: process.env.PR_BRANCH });
  if (!problem) return console.log("journey line: ok");
  console.error(`::error::${problem}`);
  process.exit(1);
}

const COMMANDS = { preflight: runPreflight, report: runReport, "pr-line": runPrLine };

function main() {
  const run = COMMANDS[process.argv[2]];
  if (!run) throw new Error("usage: journeys.mjs preflight|report|pr-line");
  run();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
