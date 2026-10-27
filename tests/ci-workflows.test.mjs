// The shared CI (node-ci.yml, java-ci.yml): structure the pilots rely on, and the gate's verdict run for real.
// No YAML dependency: the workflows are read as text; the gate's script is cut out of the file and run under bash.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WORKFLOWS = ["node-ci", "java-ci", "expo-ci", "python-ci", "krizaka-ci", "mobile-e2e"];
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
      assert.match(job.text, /!cancelled\(\) && \(?needs\.changes\.outputs\.code != 'false'/, `${name}/${job.id}`);
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
  const vars = NODE({ CODE: "false", VERIFY: "skipped", CONTAINER: "skipped", CONTAINER_WANTED: "true", DOCKER_CODE: "false" });
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
  assert.equal(runGate("krizaka-ci", PACK({ DETECT: "failure", CODE: "false", VERIFY: "skipped" })).status, 1);
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

test("node gate: the duplication check must run unless the gate said false, and a failure is red", () => {
  const wanted = { DUP_WANTED: "true" };
  assert.equal(runGate("node-ci", NODE({ ...wanted, DUP: "success" })).status, 0);
  assert.equal(runGate("node-ci", NODE({ ...wanted, DUP: "failure" })).status, 1);
  assert.equal(runGate("node-ci", NODE({ ...wanted, DUP: "skipped" })).status, 1);
  assert.equal(runGate("node-ci", NODE({ ...wanted, CODE: "false", VERIFY: "skipped", DUP: "skipped" })).status, 0);
});

test("node gate: the image is built whenever a Dockerfile, manifest or lockfile changed, even when the main gate said false", () => {
  const base = { CODE: "false", VERIFY: "skipped", CONTAINER_WANTED: "true" };
  assert.equal(runGate("node-ci", NODE({ ...base, DOCKER_CODE: "true", CONTAINER: "success" })).status, 0);
  assert.equal(runGate("node-ci", NODE({ ...base, DOCKER_CODE: "true", CONTAINER: "skipped" })).status, 1, "skipped although a Docker file changed");
  assert.equal(runGate("node-ci", NODE({ ...base, DOCKER_CODE: "true", CONTAINER: "failure" })).status, 1);
  assert.equal(runGate("node-ci", NODE({ ...base, DOCKER_CODE: "false", CONTAINER: "skipped" })).status, 0);
  // a broken Docker gate (no answer) runs the build
  assert.equal(runGate("node-ci", NODE({ ...base, DOCKER_CODE: "", CONTAINER: "skipped" })).status, 1);
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

// The daily SEO check (epic #119): the products' public addresses are www.<product>.com (indexed),
// every dev.<product>.com is checked as a development host that sends its pages to www.
test("the daily SEO check covers the www addresses and the dev hosts (--redirects-to www)", () => {
  const yml = readFileSync(new URL("../.github/workflows/seo-family.yml", import.meta.url), "utf8");
  for (const p of ["orazaka", "yomizaka", "akinaza"]) {
    assert.match(yml, new RegExp(`host: www\\.${p}\\.com,`), `www.${p}.com`);
    assert.match(yml, new RegExp(`host: dev\\.${p}\\.com, args: "--index off --redirects-to https://www\\.${p}\\.com"`), `dev.${p}.com`);
  }
  for (const p of ["orochia", "yasakia", "yororis", "kachizaka"]) assert.doesNotMatch(yml, new RegExp(`\\.${p}\\.com`), `${p} is paused`);
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

const PACK = (o) => ({ DETECT: "success", STACK: "node", CODE: "true", CHANGES: "success", VERIFY: "success", ...o });

test("krizaka-ci gate: green on success and docs-only; red on failure, an unasked skip, or no stack; open on a broken changes gate", () => {
  assert.deepEqual(runGate("krizaka-ci", PACK({})), { status: 0, result: "success" });
  assert.equal(runGate("krizaka-ci", PACK({ CODE: "false", VERIFY: "skipped" })).status, 0);
  assert.equal(runGate("krizaka-ci", PACK({ VERIFY: "failure" })).status, 1);
  assert.equal(runGate("krizaka-ci", PACK({ VERIFY: "cancelled" })).status, 1);
  assert.equal(runGate("krizaka-ci", PACK({ VERIFY: "skipped" })).status, 1);
  assert.equal(runGate("krizaka-ci", PACK({ CHANGES: "failure", CODE: "" })).status, 0);
  // A repository the pack cannot read (no stack, a bad .krizaka/ci.json) is red, even though nothing else ran.
  assert.equal(runGate("krizaka-ci", PACK({ DETECT: "failure", STACK: "", CHANGES: "skipped", CODE: "", VERIFY: "skipped" })).status, 1);
  assert.equal(runGate("krizaka-ci", PACK({ DETECT: "failure", CODE: "false", VERIFY: "skipped" })).status, 1);
});

test("krizaka-ci: one line for the caller (no required input), and nothing that publishes, deploys or applies", () => {
  const src = read("krizaka-ci");
  assert.doesNotMatch(src, /required: true/);
  assert.doesNotMatch(src, /\b(tofu|terraform) (apply|plan)\b|doctl|krizaka-deploy|npm publish|workspace\.mjs publish|deploy\b.*@/);
  const verify = jobs(src).find((j) => j.id === "verify");
  assert.match(verify.text, /needs\.detect\.result == 'success'/);
});

/** The `inputs:` of one of this repository's composite actions. */
function actionInputs(name) {
  const src = readFileSync(new URL(`../actions/${name}/action.yml`, import.meta.url), "utf8");
  const block = src.slice(src.indexOf("\ninputs:\n") + 9, src.search(/\n(outputs|runs):\n/));
  return new Set([...block.matchAll(/^ {2}([\w-]+):\s*$/gm)].map((m) => m[1]));
}

test("every call of a build-pack action passes only inputs the action declares", () => {
  const files = [...WORKFLOWS.map((n) => `.github/workflows/${n}.yml`), "actions/agent-setup/action.yml"];
  let calls = 0;
  for (const file of files) {
    const lines = readFileSync(new URL(`../${file}`, import.meta.url), "utf8").split("\n");
    lines.forEach((line, i) => {
      const m = line.match(/^(\s*)(?:-\s+)?uses: krizaka\/\.github\/actions\/([\w-]+)@/);
      if (!m) return;
      calls++;
      const declared = actionInputs(m[2]);
      const indent = m[1].length + 2;
      let j = i + 1;
      while (j < lines.length && (lines[j].trim() === "" || lines[j].search(/\S/) >= indent) && !/^\s*-\s/.test(lines[j])) {
        if (/^\s*with:\s*$/.test(lines[j])) {
          const keyIndent = lines[j].search(/\S/) + 2;
          for (let k = j + 1; k < lines.length && (lines[k].trim() === "" || lines[k].search(/\S/) >= keyIndent); k++) {
            const key = lines[k].match(/^\s*([\w-]+):/);
            if (key && lines[k].search(/\S/) === keyIndent) assert.ok(declared.has(key[1]), `${file}:${k + 1} ${m[2]} has no input "${key[1]}"`);
          }
        }
        j++;
      }
    });
  }
  assert.ok(calls >= 15, `found ${calls} calls`);
});

test("agent setup selects the detected Node and pnpm versions before installing dependencies", () => {
  const src = readFileSync(new URL("../actions/agent-setup/action.yml", import.meta.url), "utf8");
  assert.match(src, /node-version: \$\{\{ fromJSON\(steps\.detect\.outputs\.plan\)\.nodeVersion \}\}/);
  assert.match(src, /version: \$\{\{ fromJSON\(steps\.detect\.outputs\.plan\)\.pnpmVersion \}\}/);
  assert.ok(src.indexOf("node-version: ${{ fromJSON(steps.detect.outputs.plan).nodeVersion }}") < src.indexOf("name: Install the dependencies"));
});

test("setup action resolves pnpm from the shared detector before pnpm/action-setup", () => {
  const src = readFileSync(new URL("../actions/setup/action.yml", import.meta.url), "utf8");
  assert.match(src, /--pnpm-version/);
  assert.match(src, /version: \$\{\{ steps\.pnpm-version\.outputs\.version \}\}/);
});

// --- mobile-e2e.yml (krizaka/.github#241): Maestro flows on an emulator, the check required on a mobile repository's main.
const E2E = (o) => ({ CODE: "true", CHANGES: "success", E2E: "success", ...o });

test("mobile-e2e: the gate is green on success and docs-only, red on a failed, cancelled or unasked-skipped run, open on a broken changes gate", () => {
  assert.equal(runGate("mobile-e2e", E2E({})).status, 0);
  assert.equal(runGate("mobile-e2e", E2E({ CODE: "false", E2E: "skipped" })).status, 0);
  assert.equal(runGate("mobile-e2e", E2E({ E2E: "failure" })).status, 1);
  assert.equal(runGate("mobile-e2e", E2E({ E2E: "cancelled" })).status, 1);
  assert.equal(runGate("mobile-e2e", E2E({ E2E: "skipped" })).status, 1);
  assert.equal(runGate("mobile-e2e", E2E({ CHANGES: "failure", CODE: "" })).status, 0);
});

test("mobile-e2e: the required check is `gate`, a reusable workflow, and the heavy job reports artifacts even on failure", () => {
  const src = read("mobile-e2e");
  assert.match(src, /\non:\n {2}workflow_call:/);
  const e2e = jobs(src).find((j) => j.id === "e2e");
  assert.match(e2e.text, /needs\.changes\.outputs\.code != 'false'/);
  assert.match(e2e.text, /uses: actions\/upload-artifact@[0-9a-f]{40}[^\n]*\n\s+if: \$\{\{ always\(\) \}\}/);
  assert.match(jobs(src).find((j) => j.id === "gate").text, /^ {4}name: gate$/m);
});

test("mobile-e2e: Maestro is pinned by version and sha256, the emulator action by SHA, KVM is enabled", () => {
  const src = read("mobile-e2e");
  assert.match(src, /sha256sum -c/);
  assert.match(src, /expected=[0-9a-f]{64}/);
  assert.match(src, /maestro-version:\n\s+description:[^\n]*\n\s+type: string\n\s+default: "\d+\.\d+\.\d+"/);
  assert.match(src, /uses: reactivecircus\/android-emulator-runner@[0-9a-f]{40}/);
  assert.match(src, /99-kvm4all\.rules/);
});

test("mobile-e2e: the demo account is masked, scrubbed from the reports, and only ever the caller's or a random one", () => {
  const src = read("mobile-e2e");
  assert.match(src, /::add-mask::\$password/);
  assert.match(src, /::add-mask::\$email/);
  assert.match(src, /openssl rand/);
  assert.match(src, /Scrub the demo account from the reports/);
  // The only secrets the workflow declares are the demo account's.
  const secrets = src.slice(src.indexOf("    secrets:\n"), src.indexOf("    outputs:\n"));
  assert.deepEqual([...secrets.matchAll(/^ {6}([A-Z_]+):$/gm)].map((m) => m[1]).sort(), ["DEMO_ACCOUNT_EMAIL", "DEMO_ACCOUNT_PASSWORD"]);
});

// --- SonarCloud after the tests, the image after verify and scanned (krizaka/.github#237).
test("node gate: SonarCloud wanted must succeed after a green verify; a skip or failure is red; docs-only stays green", () => {
  const wanted = { SONAR_WANTED: "true" };
  assert.equal(runGate("node-ci", NODE({ ...wanted, SONAR: "success" })).status, 0);
  assert.equal(runGate("node-ci", NODE({ ...wanted, SONAR: "failure" })).status, 1);
  assert.equal(runGate("node-ci", NODE({ ...wanted, SONAR: "skipped" })).status, 1);
  assert.equal(runGate("node-ci", NODE({ ...wanted, CODE: "false", VERIFY: "skipped", SONAR: "skipped", SONAR_LIGHT: "success" })).status, 0);
  // verify failed: sonar is rightly skipped, the gate is red once (by verify)
  assert.equal(runGate("node-ci", NODE({ ...wanted, VERIFY: "failure", SONAR: "skipped" })).status, 1);
  // not wanted: no effect
  assert.equal(runGate("node-ci", NODE({ SONAR: "skipped" })).status, 0);
});

test("node gate: the image is not built when verify failed — verify alone makes the gate red", () => {
  const vars = NODE({ VERIFY: "failure", CONTAINER_WANTED: "true", CONTAINER: "skipped" });
  assert.deepEqual(runGate("node-ci", vars), { status: 1, result: "failure" });
});

test("java and python gates: SonarCloud wanted must succeed; not wanted changes nothing", () => {
  assert.equal(runGate("java-ci", JAVA({ SONAR_WANTED: "true", SONAR: "success" })).status, 0);
  assert.equal(runGate("java-ci", JAVA({ SONAR_WANTED: "true", SONAR: "skipped" })).status, 1);
  assert.equal(runGate("java-ci", JAVA({ SONAR_WANTED: "true", SONAR: "failure" })).status, 1);
  assert.equal(runGate("java-ci", JAVA({ SONAR: "skipped" })).status, 0);
  assert.equal(runGate("python-ci", SIMPLE({ SONAR_WANTED: "true", SONAR: "success" })).status, 0);
  assert.equal(runGate("python-ci", SIMPLE({ SONAR_WANTED: "true", SONAR: "skipped" })).status, 1);
  assert.equal(runGate("python-ci", SIMPLE({ SONAR_WANTED: "true", SONAR: "failure" })).status, 1);
});

for (const name of ["node-ci", "java-ci", "python-ci"]) {
  test(`${name}: the sonar job waits for the tests, uses the org secret, awaits the quality gate and is part of the CI gate`, () => {
    const src = read(name);
    const sonar = jobs(src).find((j) => j.id === "sonar");
    assert.ok(sonar, "a sonar job exists");
    assert.match(sonar.text, /^ {4}needs: \[changes, (verify|checks)\]$/m);
    assert.match(sonar.text, /needs\.(verify|checks)\.result == 'success'/);
    assert.match(sonar.text, /SONAR_TOKEN: \$\{\{ secrets\.SONAR_TOKEN \}\}/);
    assert.match(sonar.text, /uses: SonarSource\/sonarqube-scan-action@[0-9a-f]{40}/);
    assert.match(sonar.text, /-Dsonar\.qualitygate\.wait=true/);
    assert.doesNotMatch(sonar.text, /echo[^\n]*\$SONAR_TOKEN|\$\{\{ *secrets\.SONAR_TOKEN *\}\}[^\n]*\n[^\n]*run:/);
    assert.match(src, /secrets:\n {6}SONAR_TOKEN:\n[^\n]*\n {8}required: false/);
    assert.match(jobs(src).find((j) => j.id === "gate").text, /needs: \[[^\]]*\bsonar\b/);
  });
}

test("node-ci: the image waits for verify, is scanned (fixable HIGH and CRITICAL fail, written allowlist) with an SBOM, and is never pushed", () => {
  const src = read("node-ci");
  const container = jobs(src).find((j) => j.id === "container");
  assert.match(container.text, /^ {4}needs: \[changes, docker-changes, verify\]$/m);
  assert.match(container.text, /needs\.verify\.result == 'success' \|\| needs\.verify\.result == 'skipped'/);
  assert.match(container.text, /uses: aquasecurity\/trivy-action@[0-9a-f]{40}/);
  assert.match(container.text, /severity: HIGH,CRITICAL/);
  assert.match(container.text, /ignore-unfixed: true/);
  assert.match(container.text, /exit-code: "1"/);
  assert.match(container.text, /trivyignores: \$\{\{ steps\.allow\.outputs\.file \}\}/);
  assert.match(container.text, /format: cyclonedx/);
  assert.match(container.text, /name: sbom-cyclonedx/);
  // scan before the smoke script
  assert.ok(container.text.indexOf("Scan the image") < container.text.indexOf("script: ${{ inputs.container-smoke }}"));
  assert.doesNotMatch(src, /push: true|docker push/);
  assert.match(readFileSync(new URL("../actions/build/action.yml", import.meta.url), "utf8"), /push: false/);
});

test("node-ci: a monorepo package's lcov is rebased to the project root before the analysis", () => {
  const verify = jobs(read("node-ci")).find((j) => j.id === "verify");
  assert.match(verify.text, /awk -v p="\$pkg" '\/\^SF:\/ && substr\(\$0,4,1\) != "\/"/);
  assert.match(verify.text, /\[ "\$pkg" = "\." \] && continue/);
});

// --- Light Sonar scan on docs-only changes (.github#330) and fix-needs-guard (.github#323).
test("gates: docs-only with Sonar wanted needs the light scan to succeed; a failed light scan or guard is red", () => {
  for (const [name, base] of [["node-ci", NODE], ["java-ci", JAVA]]) {
    const docs = { SONAR_WANTED: "true", CODE: "false", VERIFY: "skipped", SONAR: "skipped" };
    assert.equal(runGate(name, base({ ...docs, SONAR_LIGHT: "success" })).status, 0, name);
    assert.equal(runGate(name, base({ ...docs, SONAR_LIGHT: "skipped" })).status, 1, name);
    assert.equal(runGate(name, base({ ...docs, SONAR_LIGHT: "failure" })).status, 1, name);
    assert.equal(runGate(name, base({ GUARD: "failure" })).status, 1, name);
    assert.equal(runGate(name, base({ GUARD: "success" })).status, 0, name);
    assert.equal(runGate(name, base({ GUARD: "skipped" })).status, 0, name);
  }
});

for (const name of ["node-ci", "java-ci"]) {
  test(`${name}: sonar-light has no build or coverage step, uses the org secret and awaits the quality gate; guard reads the central config`, () => {
    const src = read(name);
    const light = jobs(src).find((j) => j.id === "sonar-light");
    assert.ok(light, "a sonar-light job exists");
    assert.match(light.text, /^ {4}needs: changes$/m);
    assert.match(light.text, /needs\.changes\.outputs\.code == 'false'/);
    assert.match(light.text, /SONAR_TOKEN: \$\{\{ secrets\.SONAR_TOKEN \}\}/);
    assert.match(light.text, /-Dsonar\.qualitygate\.wait=true/);
    assert.doesNotMatch(light.text, /download-artifact|setup-node|setup-java|npm |pnpm |mvnw/);
    const guard = jobs(src).find((j) => j.id === "guard");
    assert.ok(guard, "a guard job exists");
    assert.match(guard.text, /scripts\/fix-needs-guard\.mjs/);
    assert.match(guard.text, /docs\/standards\/guard-paths\.json/);
    assert.match(guard.text, /PR: \$\{\{ github\.event\.pull_request\.number \}\}/);
    const gate = jobs(src).find((j) => j.id === "gate").text;
    assert.match(gate, /needs: \[[^\]]*\bsonar-light\b[^\]]*\bguard\b/);
  });
}
