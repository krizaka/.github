// The shared CI (node-ci.yml, java-ci.yml): structure the pilots rely on, and the gate's verdict run for real.
// No YAML dependency: the workflows are read as text; the gate's script is cut out of the file and run under bash.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WORKFLOWS = ["node-ci", "java-ci", "expo-ci", "python-ci"];
const read = (name) => readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), "utf8");

/** The jobs of a workflow, as { id, text } (top-level `jobs:` entries, two-space indented). */
function jobs(src) {
  const body = src.slice(src.indexOf("\njobs:\n") + 6);
  const out = [];
  let current = null;
  for (const line of body.split("\n")) {
    const m = line.match(/^ {2}([a-z][\w-]*):\s*$/);
    if (m) {
      current = { id: m[1], text: "" };
      out.push(current);
    } else if (current) current.text += `${line}\n`;
  }
  return out;
}

for (const name of WORKFLOWS) {
  const src = read(name);

  test(`${name}: least privilege — a read-only token at the top, no write scope anywhere`, () => {
    assert.match(src, /\npermissions:\n {2}contents: read\n/);
    assert.doesNotMatch(src, /:\s*write\b/);
  });

  test(`${name}: every job has a timeout (calls to reusable workflows excepted)`, () => {
    for (const job of jobs(src)) {
      if (/^ {4}uses:/m.test(job.text)) continue;
      assert.match(job.text, /^ {4}timeout-minutes:/m, `${name}/${job.id} has no timeout-minutes`);
    }
  });

  test(`${name}: every action is pinned by a full commit SHA`, () => {
    const uses = [...src.matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)/gm)].map((m) => m[1]).filter((u) => !u.startsWith("./"));
    assert.ok(uses.length > 0);
    for (const u of uses) assert.match(u, /@[0-9a-f]{40}$/, `${u} is not pinned`);
  });

  test(`${name}: the changes gate is the shared one and the gate job always reports`, () => {
    assert.match(src, /uses: krizaka\/\.github\/\.github\/workflows\/changes\.yml@[0-9a-f]{40}/);
    const gate = jobs(src).find((j) => j.id === "gate");
    assert.ok(gate, "a gate job exists");
    assert.match(gate.text, /^ {4}if: \$\{\{ always\(\) \}\}$/m);
    const needs = gate.text.match(/^ {4}needs: \[(.*)\]$/m)[1].split(",").map((s) => s.trim());
    const ids = jobs(src).map((j) => j.id).filter((id) => id !== "gate");
    assert.deepEqual(needs.sort(), ids.sort(), "the gate waits for every other job");
  });

  test(`${name}: the heavy jobs run unless the gate answered exactly 'false' (fail-open)`, () => {
    for (const job of jobs(src).filter((j) => ["verify", "container"].includes(j.id))) {
      assert.match(job.text, /!cancelled\(\) && needs\.changes\.outputs\.code != 'false'/, `${name}/${job.id}`);
    }
  });
}

/** The gate step's script of a workflow, de-indented. */
function gateScript(name) {
  const lines = read(name).split("\n");
  const start = lines.findIndex((l) => l === "      - id: verdict");
  assert.ok(start > 0, "verdict step found");
  const run = lines.findIndex((l, i) => i > start && l === "        run: |");
  const body = [];
  for (const line of lines.slice(run + 1)) {
    if (line.trim() && !line.startsWith("          ")) break;
    body.push(line.slice(10));
  }
  return body.join("\n");
}

/** Runs the gate script with the given job results; returns { status, result }. */
function runGate(name, vars) {
  const dir = mkdtempSync(join(tmpdir(), "gate-"));
  const out = join(dir, "output");
  const summary = join(dir, "summary");
  writeFileSync(out, "");
  writeFileSync(summary, "");
  let status = 0;
  try {
    execFileSync("bash", ["-c", gateScript(name)], {
      env: { PATH: process.env.PATH, GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: summary, ...vars },
      stdio: "pipe",
    });
  } catch (error) {
    status = error.status;
  }
  return { status, result: /result=(\w+)/.exec(readFileSync(out, "utf8"))?.[1] };
}

const NODE = (o) => ({ CODE: "true", CHANGES: "success", VERIFY: "success", CONTAINER: "skipped", CONTAINER_WANTED: "false", ...o });

test("node gate: green when everything that had to run succeeded", () => {
  assert.deepEqual(runGate("node-ci", NODE({})), { status: 0, result: "success" });
});

test("node gate: green on a docs-only change (the gate said false, the heavy jobs were skipped)", () => {
  const vars = NODE({ CODE: "false", VERIFY: "skipped", CONTAINER: "skipped", CONTAINER_WANTED: "true" });
  assert.deepEqual(runGate("node-ci", vars), { status: 0, result: "success" });
});

test("node gate: red when verify fails or is cancelled", () => {
  assert.deepEqual(runGate("node-ci", NODE({ VERIFY: "failure" })), { status: 1, result: "failure" });
  assert.equal(runGate("node-ci", NODE({ VERIFY: "cancelled" })).status, 1);
});

test("node gate: red when the container job fails", () => {
  const vars = NODE({ CONTAINER: "failure", CONTAINER_WANTED: "true" });
  assert.deepEqual(runGate("node-ci", vars), { status: 1, result: "failure" });
});

test("node gate: red when verify was skipped although the gate did not say false", () => {
  assert.equal(runGate("node-ci", NODE({ VERIFY: "skipped" })).status, 1);
  assert.equal(runGate("node-ci", NODE({ CODE: "", VERIFY: "skipped" })).status, 1);
});

test("node gate: red when the container job was wanted and skipped without the gate's answer", () => {
  assert.equal(runGate("node-ci", NODE({ CONTAINER: "skipped", CONTAINER_WANTED: "true" })).status, 1);
});

test("node gate: a broken changes gate does not fail a run whose jobs all passed (fail-open)", () => {
  assert.deepEqual(runGate("node-ci", NODE({ CHANGES: "failure", CODE: "" })), { status: 0, result: "success" });
});

test("node gate: e2e wanted must run unless the UI gate said false", () => {
  const wanted = { E2E_WANTED: "true", UI_CODE: "true" };
  assert.deepEqual(runGate("node-ci", NODE({ ...wanted, E2E: "success" })), { status: 0, result: "success" });
  assert.equal(runGate("node-ci", NODE({ ...wanted, E2E: "skipped" })).status, 1);
  assert.equal(runGate("node-ci", NODE({ ...wanted, E2E: "failure" })).status, 1);
  // no UI file changed: the e2e is legitimately skipped, the gate stays green
  assert.equal(runGate("node-ci", NODE({ ...wanted, UI_CODE: "false", E2E: "skipped" })).status, 0);
  // docs-only: nothing ran
  assert.equal(runGate("node-ci", NODE({ ...wanted, CODE: "false", VERIFY: "skipped", E2E: "skipped" })).status, 0);
  // a broken plan fails the gate
  assert.equal(runGate("node-ci", NODE({ PLAN: "failure" })).status, 1);
});

test("node-ci: parallel plan — a leg per task, e2e shards 1..n", () => {
  const src = read("node-ci");
  const lines = src.slice(src.indexOf("      - id: plan"), src.indexOf("  verify:")).split("\n");
  const run = lines.slice(lines.findIndex((l) => l === "        run: |") + 1).map((l) => l.slice(10)).join("\n");
  const out = (vars) => {
    const dir = mkdtempSync(join(tmpdir(), "plan-"));
    const file = join(dir, "output");
    writeFileSync(file, "");
    execFileSync("bash", ["-c", run], { env: { PATH: process.env.PATH, GITHUB_OUTPUT: file, ...vars }, stdio: "pipe" });
    return readFileSync(file, "utf8");
  };
  const base = { PARALLEL: "true", LINT: "lint", TYPECHECK: "", QUALITY: "", TEST: "test", BUILD: "build", AFTER: "", SHARDS: "3" };
  assert.match(out(base), /tasks=\["lint","test","build"\]/);
  assert.match(out(base), /shards=\[1,2,3\]/);
  assert.match(out({ ...base, QUALITY: "depcruise" }), /tasks=\["lint","quality","test","build"\]/);
  assert.match(out({ ...base, PARALLEL: "false" }), /tasks=\["all"\]/);
  assert.match(out({ ...base, BUILD: "", AFTER: "scripts/x.sh" }), /"build"/, "an after-build script alone still needs the build leg");
  assert.throws(() => out({ ...base, SHARDS: "9" }));
});

const JAVA = (o) => ({ CODE: "true", CHANGES: "success", VERIFY: "success", ...o });

test("java gate: green when verify succeeded, and on a docs-only change", () => {
  assert.equal(runGate("java-ci", JAVA({})).status, 0);
  assert.equal(runGate("java-ci", JAVA({ CODE: "false", VERIFY: "skipped" })).status, 0);
});

test("java gate: red on failure, cancellation, or an unasked skip; open when the changes gate broke", () => {
  assert.equal(runGate("java-ci", JAVA({ VERIFY: "failure" })).status, 1);
  assert.equal(runGate("java-ci", JAVA({ VERIFY: "cancelled" })).status, 1);
  assert.equal(runGate("java-ci", JAVA({ VERIFY: "skipped" })).status, 1);
  assert.equal(runGate("java-ci", JAVA({ CHANGES: "failure", CODE: "" })).status, 0);
});

// The daily SEO check (epic #119): the products' public addresses are www.<product>.com (indexed; Orochia's noindex for now),
// every dev.<product>.com is checked as a development host that sends its pages to www.
test("the daily SEO check covers the www addresses and the dev hosts (--redirects-to www)", () => {
  const yml = readFileSync(new URL("../.github/workflows/seo-family.yml", import.meta.url), "utf8");
  for (const p of ["orazaka", "orochia", "yasakia", "yororis", "yomizaka", "kachizaka", "akinaza"]) {
    assert.match(yml, new RegExp(`host: www\\.${p}\\.com,`), `www.${p}.com`);
    assert.match(yml, new RegExp(`host: dev\\.${p}\\.com, args: "--index off --redirects-to https://www\\.${p}\\.com"`), `dev.${p}.com`);
  }
  assert.match(yml, /host: www\.orochia\.com, args: "--index off"/, "Orochia's www stays noindex");
  assert.doesNotMatch(yml, /^\s+- dev\./m, "no dev host is checked as an indexed site");
});

const SIMPLE = (o) => ({ CODE: "true", CHANGES: "success", VERIFY: "success", EAS: "skipped", ...o });

test("expo and python gates: green on success and docs-only, red on failure or an unasked skip, open on a broken changes gate", () => {
  for (const name of ["expo-ci", "python-ci"]) {
    assert.equal(runGate(name, SIMPLE({})).status, 0, name);
    assert.equal(runGate(name, SIMPLE({ CODE: "false", VERIFY: "skipped" })).status, 0, name);
    assert.equal(runGate(name, SIMPLE({ VERIFY: "failure" })).status, 1, name);
    assert.equal(runGate(name, SIMPLE({ VERIFY: "skipped" })).status, 1, name);
    assert.equal(runGate(name, SIMPLE({ CHANGES: "failure", CODE: "" })).status, 0, name);
  }
});

test("expo-ci: the EAS job only exists on a v* tag and needs the checks to succeed", () => {
  const eas = jobs(read("expo-ci")).find((j) => j.id === "eas");
  assert.match(eas.text, /startsWith\(github\.ref, 'refs\/tags\/v'\)/);
  assert.match(eas.text, /needs\.checks\.result == 'success'/);
  assert.equal(runGate("expo-ci", SIMPLE({ EAS: "failure" })).status, 1);
});
