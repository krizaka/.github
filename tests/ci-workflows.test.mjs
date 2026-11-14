// The shared CI (node-ci.yml, java-ci.yml): structure the pilots rely on, and the gate's verdict run for real.
// No YAML dependency: the workflows are read as text; the gate's script is cut out of the file and run under bash.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
// every live dev.<product>.com is checked as a development host that sends its pages to www.
// dev.sovkora.com retired 2026-11-05 (#2600): sovkora keeps its www row, its dev host is gone and must not come back.
test("the daily SEO check covers the www addresses and the dev hosts, never indexed (krizaka-internal#2659)", () => {
  const yml = readFileSync(new URL("../.github/workflows/seo-family.yml", import.meta.url), "utf8");
  for (const p of ["sovkora", "verikora", "folioviv"]) {
    assert.match(yml, new RegExp(`host: www\\.${p}\\.com,`), `www.${p}.com`);
    assert.match(yml, new RegExp(`host: dev\\.${p}\\.com, args: "--index off"`), `dev.${p}.com`);
  }
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
  const files = [...WORKFLOWS.map((n) => `.github/workflows/${n}.yml`)];
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

// krizaka-internal#3553: a report already written root-relative (SF:packages/core/x.ts) was prefixed a second time and
// SonarCloud resolved none of its files (krizaka-ui-builder#50: « Could not resolve 263 file paths », coverage 0.0 %).
test("node-ci: the lcov rebase prefixes package-relative paths once, never twice", () => {
  const verify = jobs(read("node-ci")).find((j) => j.id === "verify");
  const program = verify.text.match(/awk -v p="\$pkg" '([^']+)'/)[1];
  const input = ["SF:src/a.ts", "SF:packages/core/b.ts", "SF:/abs/c.ts", "DA:1,1", "SF:packages/core-extra/d.ts"].join("\n") + "\n";
  const out = execFileSync("awk", ["-v", "p=packages/core", program], { input, encoding: "utf8" }).split("\n");
  assert.deepEqual(out.slice(0, 5), [
    "SF:packages/core/src/a.ts",
    "SF:packages/core/b.ts",
    "SF:/abs/c.ts",
    "DA:1,1",
    "SF:packages/core/packages/core-extra/d.ts",
  ]);
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

// maven.yml (the Central-published JVM repositories) carries the same Sonar legs and an always-reporting gate as java-ci.yml.
test("maven.yml: sonar, sonar-light and an always-reporting gate, the release job is release-central only (ADR-021)", () => {
  const src = read("maven");
  const ids = jobs(src).map((j) => j.id);
  for (const id of ["changes", "verify", "sonar", "sonar-light", "gate", "registry", "release-central"]) assert.ok(ids.includes(id), `job ${id}`);
  assert.ok(!ids.includes("release-github"), "release-github removed (krizaka-internal#2701)");
  const gate = jobs(src).find((j) => j.id === "gate");
  assert.match(gate.text, /if: \$\{\{ always\(\) \}\}/);
  assert.match(gate.text, /needs: \[changes, verify, sonar, sonar-light\]/);
  assert.match(src, /sonar:\n\s+description:[^\n]*\n\s+required: false\n\s+default: false/);
  assert.match(src, /startsWith\(github\.ref, 'refs\/tags\/v'\)/);
});

// The reusable workflows all run the SAME repo-layout action (a stale pin once refused `.claude/` in every consumer).
test("every reusable workflow pins actions/repo-layout to one and the same commit", () => {
  const pins = new Set();
  for (const name of [...WORKFLOWS.filter((w) => w !== "mobile-e2e"), "maven"]) {
    for (const m of read(name).matchAll(/actions\/repo-layout@([0-9a-f]{40}) # main/g)) pins.add(m[1]);
    assert.match(read(name), /actions\/repo-layout@[0-9a-f]{40} # main/, `${name} runs repo-layout`);
  }
  assert.equal(pins.size, 1, `one repo-layout pin, got ${[...pins].join(", ")}`);
});

// The build-pack actions the reusable workflows call by pin move together: a stale pin kept `npx playwright-core` (not found under pnpm) in every consumer.
test("the build-pack actions are pinned to one commit across the reusable workflows", () => {
  const pins = new Set();
  for (const name of [...WORKFLOWS.filter((w) => w !== "mobile-e2e"), "maven"]) {
    for (const m of read(name).matchAll(/krizaka\/\.github\/actions\/(?:setup|build|after-build|test|quality|detect)@([0-9a-f]{40}) # main/g)) pins.add(m[1]);
  }
  assert.ok(pins.size >= 1);
  assert.equal(pins.size, 1, `one pin for the build pack, got ${[...pins].join(", ")}`);
});

test("node-ci runs the repository's format:check with the lint step, opt-in by `format-script` (krizaka/.github#427)", () => {
  const src = read("node-ci");
  assert.match(src, /\n {6}format-script:\n(?: {8}.*\n)*? {8}default: ""\n/);
  const step = src.slice(src.indexOf("- name: Format (prettier --check)"));
  assert.match(step, /if: \$\{\{ inputs\.format-script != '' && \(matrix\.task == 'all' \|\| matrix\.task == 'lint'\) \}\}/);
  assert.match(step, /run: '"\$PM" run "\$SCRIPT"'/);
  // The parallel plan still makes a lint leg when only the format script is set.
  assert.match(src, /\{ \[ -n "\$LINT" \] \|\| \[ -n "\$FORMAT" \]; \} && tasks\+=\(lint\)/);
});

test("org CI throughput: the shared visual regression is gated by changes.yml and skips the merge queue; the security scan cancels superseded PR runs and skips the queue", () => {
  const visual = read("visual-regression");
  assert.match(visual, /\n {6}relevant:\n(?: {8}.*\n)*? {8}default: "\."\n/);
  assert.match(visual, /\n {6}ignore:\n(?: {8}.*\n)*? {8}default: ""\n/);
  assert.match(visual, /\n {6}on-merge-group:\n(?: {8}.*\n)*? {8}default: false\n/);
  assert.match(visual, /uses: krizaka\/\.github\/\.github\/workflows\/changes\.yml@[0-9a-f]{40}/);
  const job = jobs(visual).find((j) => j.id === "visual").text;
  assert.match(job, /needs: changes/);
  assert.match(job, /if: \$\{\{ !cancelled\(\) && \(inputs\.update \|\| \(needs\.changes\.outputs\.code != 'false' && \(github\.event_name != 'merge_group' \|\| inputs\.on-merge-group\)\)\) \}\}/);

  const scan = read("security-scan");
  assert.match(scan, /group: security-scan-\$\{\{ github\.repository \}\}-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}\n {2}cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  // The trailers job is the one that runs in the queue on purpose: it checks the squash commit itself.
  for (const j of jobs(scan).filter((x) => x.id !== "trailers")) assert.match(j.text, /if: \$\{\{ github\.event_name != 'merge_group' \}\}/, `${j.id} skipped in the merge queue`);
  assert.match(jobs(scan).find((j) => j.id === "trailers").text, /github\.event_name == 'merge_group'/, "trailers also checked in the merge queue");
});

test("java-ci: the workspace flow resolves a released krizaka-parent from an explicit registry (a parent is read before the pom's own repositories; krizaka-internal#2701: GitHub Packages is no longer the default)", () => {
  const src = read("java-ci");
  assert.match(src, /maven-packages-registry:\n(?: {8}.*\n)*? {8}default: ""/, "default is empty; callers that still resolve from a custom registry pass the URL explicitly");
  const step = src.slice(src.indexOf("- name: Maven settings, released parents from GitHub Packages"));
  assert.match(step, /if: \$\{\{ inputs\.workspace-component != '' && inputs\.maven-packages-registry != '' \}\}/);
  assert.match(step, /<id>github<\/id>/, "the repository id is the server id setup-java writes credentials for");
  assert.match(step, /<pluginRepositories><pluginRepository><id>github<\/id>/, "the plugins' dependencies (krizaka-quality) resolve from the same registry");
  assert.ok(src.indexOf("actions/setup-java@") < src.indexOf("- name: Maven settings, released parents"), "after setup-java writes settings.xml");
  assert.ok(src.indexOf("- name: Maven settings, released parents") < src.indexOf("node scripts/workspace.mjs ci"), "before the workspace build");
});

// krizaka-internal#2268: java-ci's verify reads the released krizaka-parent family from GitHub Packages with GITHUB_TOKEN. Without
// packages: read every request is 401; and a called workflow cannot hold more than its caller grants (the run is a startup_failure).
test("java-ci's verify reads GitHub Packages, and every job that calls java-ci, directly or through a local workflow, grants it", () => {
  const PACKAGES = /^ {6}packages: read\b/m;
  assert.match(jobs(read("java-ci")).find((j) => j.id === "verify").text, PACKAGES);
  const all = readdirSync(new URL("../.github/workflows/", import.meta.url)).filter((f) => f.endsWith(".yml")).map((f) => f.slice(0, -4));
  const needs = new Set(["java-ci"]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const wf of all) {
      if (needs.has(wf)) continue;
      if ([...needs].some((n) => read(wf).includes(`uses: ./.github/workflows/${n}.yml`))) needs.add(wf), (grew = true);
    }
  }
  const callers = [];
  for (const wf of all)
    for (const j of jobs(read(wf)))
      for (const n of needs)
        if (j.text.includes(`uses: ./.github/workflows/${n}.yml`)) callers.push([`${wf}/${j.id} -> ${n}`, j.text]);
  assert.ok(callers.length >= 3, "the self-test calls java-ci, and the gate calls the self-test");
  for (const [name, text] of callers) assert.match(text, PACKAGES, `${name} grants packages: read`);
});

// settings.xml names the server `github` with ${env.GITHUB_TOKEN} (setup-java `server-password`): a step that runs Maven
// without that variable reads GitHub Packages anonymously and gets 401 on the released krizaka-parent family
// (sovkora-knowledge-service#59: rewrite:dryRun could not read krizaka-rewrite-style 0.9.0).
test("java-ci: every step that runs Maven passes GITHUB_TOKEN, the password settings.xml reads", () => {
  const steps = read("java-ci").split(/\n {6}- /).slice(1);
  const maven = steps.filter((s) => /\$mvn_cmd"|scripts\/workspace\.mjs ci /.test(s));
  assert.ok(maven.length >= 3, "the Maven steps were not found");
  for (const step of maven) {
    const name = step.match(/^name: (.+)$/m)?.[1] ?? step.split("\n")[0];
    assert.match(step, /^ {10}GITHUB_TOKEN: \$\{\{ github\.token \}\}( |$)/m, `${name}: no GITHUB_TOKEN in its env`);
  }
});

test("visual regression warns on a pull request and blocks only the release to production (rules review 2026-11-05)", () => {
  const visual = read("visual-regression");
  // An input the release workflow sets; the default never blocks a pull request.
  assert.match(visual, /\n {6}blocking:\n(?: {8}.*\n)*? {8}type: boolean\n(?: {8}.*\n)*? {8}default: false\n/);
  const job = jobs(visual).find((j) => j.id === "visual").text;
  // Blocking: the input, a release, a tag or the production branch; never pull_request or merge_group.
  assert.match(job, /BLOCKING: \$\{\{ inputs\.blocking \|\| github\.event_name == 'release' \|\| startsWith\(github\.ref, 'refs\/tags\/'\) \|\| github\.ref == 'refs\/heads\/production' \}\}/);
  const compare = job.slice(job.indexOf("- id: compare"), job.indexOf("- name: How to read"));
  assert.match(compare, /::warning/, "a difference on a pull request is a warning");
  assert.match(compare, /differs=true/, "the difference is recorded so the diffs are published");
  assert.match(compare, /\[ "\$BLOCKING" = "true" \] && exit 1/, "a blocking run still fails");
  // The diffs are published whether the run failed (blocking) or warned.
  const upload = job.slice(job.indexOf("actions/upload-artifact@"));
  assert.match(upload, /if: \$\{\{ !inputs\.update && \(failure\(\) \|\| steps\.compare\.outputs\.differs == 'true'\) \}\}/);
});

// python-ci runs the formatter the pre-push hook runs, with the hook's config discovery (krizaka-internal#2813).
test("python-ci: `ruff format --check` runs when a ruff configuration exists, and only then", () => {
  const src = read("python-ci");
  const step = src.slice(src.indexOf("- name: Format (ruff)"));
  const script = step.slice(step.indexOf("run: |\n") + 7).split(/\n\n/)[0].replace(/^ {10}/gm, "");
  const run = (files, ruffExit) => {
    const dir = mkdtempSync(join(tmpdir(), "py-fmt-"));
    const bin = join(dir, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "ruff"), `#!/bin/sh\necho "ruff $*" >> "${dir}/calls"\nexit ${ruffExit}\n`, { mode: 0o755 });
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    let status = 0;
    try {
      execFileSync("bash", ["-c", script], { cwd: dir, env: { PATH: `${bin}:${process.env.PATH}`, PM: "pip" }, stdio: "pipe" });
    } catch (error) {
      status = error.status;
    }
    return { status, calls: existsSync(join(dir, "calls")) ? readFileSync(join(dir, "calls"), "utf8") : "" };
  };
  assert.deepEqual(run({ "ruff.toml": "line-length = 100\n" }, 1), { status: 1, calls: "ruff format --check .\n" });
  assert.equal(run({ "pyproject.toml": "[tool.ruff]\nline-length = 100\n" }, 0).status, 0);
  assert.deepEqual(run({ "pyproject.toml": "[project]\nname='x'\n" }, 1), { status: 0, calls: "" });
});

// krizaka-internal#3553: with `sonar` on, a missing coverage report is red, unless the caller says in
// `sonar-no-coverage-reason` that it has nothing to cover. The collect step's script is cut out and run for real.
function collectScript(name) {
  const src = read(name);
  const start = src.indexOf("- name: Collect the coverage for SonarCloud");
  const run = src.indexOf("        run: |\n", start);
  const end = src.indexOf("\n      - ", run);
  return src
    .slice(run + "        run: |\n".length, end)
    .split("\n")
    .map((l) => l.slice(10))
    .join("\n");
}

function runCollect(name, { files = {}, reason = "" }) {
  const dir = mkdtempSync(join(tmpdir(), "collect-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  const summary = join(dir, "summary.md");
  const paths = { "node-ci": "coverage/lcov.info", "python-ci": "coverage.xml" }[name] ?? "target/site/jacoco/jacoco.xml";
  let status = 0;
  let output = "";
  try {
    output = execFileSync("bash", ["-c", collectScript(name)], {
      cwd: dir,
      encoding: "utf8",
      stdio: "pipe",
      env: { ...process.env, PATHS: paths, OUT: join(dir, "out.tar"), NO_COVERAGE_REASON: reason, GITHUB_STEP_SUMMARY: summary },
    });
  } catch (e) {
    status = e.status;
    output = `${e.stdout}${e.stderr}`;
  }
  return { status, output, summary: existsSync(summary) ? readFileSync(summary, "utf8") : "", tar: existsSync(join(dir, "out.tar")) };
}

for (const name of ["node-ci", "maven", "python-ci", "java-ci"]) {
  const report = { "node-ci": "coverage/lcov.info", "python-ci": "coverage.xml" }[name] ?? "target/site/jacoco/jacoco.xml";
  const body = name === "node-ci" ? "SF:src/a.ts\nDA:1,1\n" : "<report/>\n";

  test(`${name}: coverage report present → the collect step passes`, () => {
    const r = runCollect(name, { files: { [report]: body } });
    assert.equal(r.status, 0, r.output);
    assert.ok(r.tar);
  });

  test(`${name}: no coverage report → the collect step fails and names the expected paths`, () => {
    const r = runCollect(name, {});
    assert.equal(r.status, 1, r.output);
    assert.match(r.output, /::error::no coverage report found \(expected: .*(lcov\.info|coverage\.xml|jacoco\.xml)/);
    assert.match(r.output, /sonar-no-coverage-reason/);
  });

  test(`${name}: no report with the explicit opt-out → passes and prints the reason`, () => {
    const r = runCollect(name, { reason: "a pure documentation repo" });
    assert.equal(r.status, 0, r.output);
    assert.match(r.output, /a pure documentation repo/);
    assert.match(r.summary, /a pure documentation repo/);
  });
}
