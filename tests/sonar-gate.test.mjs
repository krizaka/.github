// Sonar on a pull request (rules review of 2026-11-05): only the Security rating blocks; the other quality-gate conditions warn.
// A/A/A stays the target before production: on main, the merge queue and the release, the full gate still fails.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseReport, verdict, sonarUrl, oneLine } from "../scripts/sonar-gate.mjs";

const cond = (metricKey, status = "ERROR") => ({ metricKey, status, comparator: "GT", errorThreshold: "1", actualValue: "3" });

test("a failed gate on reliability, maintainability, coverage or duplication only warns", () => {
  const v = verdict({ status: "ERROR", conditions: [cond("new_reliability_rating"), cond("new_maintainability_rating"), cond("new_coverage"), cond("new_duplicated_lines_density"), cond("new_security_hotspots_reviewed")] });
  assert.deepEqual(v.block, []);
  assert.equal(v.warn.length, 5);
});

test("a Security rating worse than A or new vulnerabilities block", () => {
  for (const m of ["new_security_rating", "security_rating", "new_vulnerabilities", "vulnerabilities"]) {
    const v = verdict({ status: "ERROR", conditions: [cond(m), cond("new_coverage"), cond("new_bugs", "OK")] });
    assert.deepEqual(v.block.map((c) => c.metricKey), [m]);
    assert.deepEqual(v.warn.map((c) => c.metricKey), ["new_coverage"]);
  }
});

test("a gate that passed has nothing to say; an unreadable status blocks (fail closed)", () => {
  assert.deepEqual(verdict({ status: "OK", conditions: [cond("new_coverage", "OK")] }), { block: [], warn: [] });
  assert.equal(verdict(null).block.length, 1);
  assert.equal(verdict({ status: "NONE" }).block.length, 1);
});

test("the scanner's report-task.txt gives the server and the background task", () => {
  const r = parseReport("projectKey=krizaka_x\nserverUrl=https://sonarcloud.io\nceTaskId=AY1\nceTaskUrl=https://sonarcloud.io/api/ce/task?id=AY1\n");
  assert.deepEqual(r, { projectKey: "krizaka_x", serverUrl: "https://sonarcloud.io", ceTaskId: "AY1", ceTaskUrl: "https://sonarcloud.io/api/ce/task?id=AY1" });
});

test("sonarUrl only fetches an https SonarCloud URL, refusing anything else (SSRF guard, jssecurity:S8476)", () => {
  assert.equal(sonarUrl("https://sonarcloud.io/api/ce/task?id=AY1").hostname, "sonarcloud.io");
  assert.throws(() => sonarUrl("http://sonarcloud.io/api/ce/task"), /refused/); // not https
  assert.throws(() => sonarUrl("https://evil.example.com/api/ce/task"), /refused/); // another host
  assert.throws(() => sonarUrl("https://sonarcloud.io.evil.com/api"), /refused/); // look-alike host
  assert.throws(() => sonarUrl("file:///etc/passwd"), /refused/); // not even http(s)
});

test("oneLine strips CR/LF so a Sonar value cannot inject a workflow command (log injection, jssecurity:S5145)", () => {
  assert.doesNotMatch(oneLine("3\n::error::spoofed"), /[\r\n]/);
  assert.equal(oneLine("3\r\n::set-output name=x::y"), "3 ::set-output name=x::y");
  assert.equal(oneLine(undefined), "");
  assert.equal(oneLine(42), "42");
});

test("every Sonar scan of the shared CI keeps the full gate except on a pull request, where sonar-gate.mjs decides", () => {
  for (const name of ["node-ci", "java-ci", "maven", "python-ci"]) {
    const src = readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), "utf8");
    const scans = src.split("- id: scan\n").slice(1);
    const waits = src.match(/-Dsonar\.qualitygate\.wait=true/g).length;
    assert.equal(scans.length, waits, `${name}: every awaited scan is the step \`scan\``);
    for (const after of scans) {
      const step = after.slice(0, after.indexOf("\n      - "));
      assert.match(step, /continue-on-error: \$\{\{ github\.event_name == 'pull_request' \}\}/, `${name}: only a pull request may continue`);
      const next = after.slice(0, after.indexOf("\n\n  ") > 0 ? after.indexOf("\n\n  ") : undefined);
      assert.match(next, /if: \$\{\{ github\.event_name == 'pull_request' && steps\.scan\.outcome == 'failure' \}\}/);
      assert.match(next, /repository: krizaka\/\.github\n {10}ref: main/);
      assert.match(next, /node \.krizaka-sonar-gate\/scripts\/sonar-gate\.mjs --report "\$REPORT"/);
      assert.match(next, /exit 1; fi/, "no script: the gate fails closed");
    }
  }
});
