import assert from "node:assert/strict";
import { test } from "node:test";

import { loadPolicy } from "../scripts/policy.mjs";
import { defaultGate, drift, fetchState, gateDrift, main, repoOf } from "../scripts/sonar-drift.mjs";

const policy = loadPolicy();
const cond = (metric, op, error) => ({ id: 1, metric, op, error });
/** SonarCloud's answer for exactly the declared gate. */
const sameGate = () => ({
  qualitygates: [
    { name: "Krizaka way", isDefault: false, conditions: [] },
    {
      name: policy.sonar.qualityGate.name,
      isDefault: true,
      conditions: Object.entries(policy.sonar.qualityGate.conditions).map(([m, c]) => cond(m, c.op, c.error)),
    },
  ],
});
const repos = [
  { name: "app", visibility: "public" },
  { name: "secret", visibility: "private" },
];
const projects = [
  { key: "krizaka_app", name: "app", visibility: "public" },
  { key: "krizaka_secret", name: "secret", visibility: "private" },
];

test("the same gate and the right visibility: no drift", () => {
  assert.deepEqual(drift(policy, { gates: sameGate(), projects, repos }), { problems: [], notes: [] });
});

test("a condition missing in SonarCloud is named", () => {
  const gates = sameGate();
  gates.qualitygates[1].conditions.pop();
  const { problems } = drift(policy, { gates, projects, repos });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /is missing in SonarCloud/);
});

test("an extra condition in SonarCloud is named (decision 9 applied by hand)", () => {
  const gates = sameGate();
  gates.qualitygates[1].conditions.push(cond("new_coverage", "LT", "80"));
  const { problems } = drift(policy, { gates, projects, repos });
  assert.deepEqual(problems, ["quality gate: condition new_coverage (LT 80) is in SonarCloud, not in the policy"]);
});

test("a changed threshold or comparator is named", () => {
  const gates = sameGate();
  const bugs = gates.qualitygates[1].conditions.find((c) => c.metric === "new_bugs");
  bugs.error = "5";
  bugs.op = "LT";
  const { problems } = drift(policy, { gates, projects, repos });
  assert.deepEqual(problems, ["quality gate: condition new_bugs is LT 5 in SonarCloud, GT 0 in the policy"]);
});

test("another default gate is named", () => {
  const gates = sameGate();
  gates.qualitygates[1].name = "Other";
  assert.match(drift(policy, { gates, projects, repos }).problems[0], /default gate is « Other »/);
});

test("no default gate at all fails", () => {
  assert.equal(defaultGate({ qualitygates: [] }), null);
  assert.match(gateDrift(policy.sonar.qualityGate, null)[0], /no default gate/);
});

test("a private repository with a public project fails, naming both", () => {
  const bad = [...projects.slice(0, 1), { key: "krizaka_secret", name: "secret", visibility: "public" }];
  const { problems } = drift(policy, { gates: sameGate(), projects: bad, repos });
  assert.deepEqual(problems, ["visibility: project krizaka_secret is public but its repository secret is private"]);
});

test("a public repository may have a private project", () => {
  const p = [{ key: "krizaka_app", name: "app", visibility: "private" }];
  assert.deepEqual(drift(policy, { gates: sameGate(), projects: p, repos }).problems, []);
});

test("a project is matched by name, else by key; one that matches nothing is a note, not a failure", () => {
  assert.equal(repoOf({ key: "krizaka_secret", name: "renamed" }, repos).name, "secret");
  const { problems, notes } = drift(policy, { gates: sameGate(), projects: [{ key: "krizaka_gone", name: "gone", visibility: "public" }], repos });
  assert.deepEqual(problems, []);
  assert.deepEqual(notes, ["project krizaka_gone matches no repository"]);
});

test("fetchState and main go through the injected port, paginated, with the tokens in headers", async () => {
  const seen = [];
  const http = async (url, { headers }) => {
    seen.push({ url, headers });
    if (url.includes("qualitygates")) return sameGate();
    if (url.includes("projects/search")) return { components: projects };
    return repos;
  };
  const lines = [];
  const code = await main({ SONAR_TOKEN: "s", GH_TOKEN: "g" }, http, { log: (l) => lines.push(l) });
  assert.equal(code, 0);
  assert.deepEqual(lines, ["no drift"]);
  assert.equal(seen.length, 3);
  assert.ok(seen.every((c) => !c.url.includes("Bearer") && c.headers.authorization.startsWith("Bearer ")));
  assert.deepEqual((await fetchState(http, { sonarToken: "s", ghToken: "g" })).repos, repos);
});

test("main exits 1 and prints the drift; without tokens it refuses", async () => {
  const http = async (url) => (url.includes("qualitygates") ? { qualitygates: [] } : url.includes("projects/search") ? { components: [] } : []);
  const lines = [];
  assert.equal(await main({ SONAR_TOKEN: "s", GH_TOKEN: "g" }, http, { log: (l) => lines.push(l) }), 1);
  assert.match(lines[0], /^DRIFT quality gate: SonarCloud has no default gate/);
  await assert.rejects(main({}, http), /SONAR_TOKEN and GH_TOKEN are required/);
});
