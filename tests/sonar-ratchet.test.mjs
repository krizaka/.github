import { test } from "node:test";
import assert from "node:assert/strict";
import { counts, current, regressions, lowered, main, projectOf, KEYS } from "../actions/sonar-ratchet/sonar-ratchet.mjs";

const api = (table) => async (p) => {
  const pr = p.match(/pullRequest=(\d+)/)?.[1];
  const scope = pr ? `pr${pr}` : "main";
  if (p.startsWith("/api/hotspots")) return { paging: { total: table[scope].hotspots } };
  const type = p.match(/types=(\w+)/)[1];
  if (type === "BUG") return { total: table[scope].bugs };
  if (type === "VULNERABILITY") return { total: table[scope].vulnerabilities };
  return { total: 0, facets: [{ property: "severities", values: Object.entries(table[scope].smells).map(([val, count]) => ({ val, count })) }] };
};
const T = { main: { bugs: 2, vulnerabilities: 1, hotspots: 3, smells: { MAJOR: 10, MINOR: 5 } }, pr7: { bugs: 0, vulnerabilities: 0, hotspots: 0, smells: { MINOR: 1 } } };
const zeros = () => Object.fromEntries(KEYS.map((k) => [k, 0]));

test("counts reads bugs, vulnerabilities, hotspots and smells per severity", async () => {
  const c = await counts(api(T), "p");
  assert.deepEqual(c, { bugs: 2, vulnerabilities: 1, hotspots: 3, smells_blocker: 0, smells_critical: 0, smells_major: 10, smells_minor: 5, smells_info: 0 });
});

test("a pull request adds its own new-code issues to the default branch's", async () => {
  const c = await current(api(T), "p", { pullRequest: "7" });
  assert.equal(c.smells_minor, 6);
  assert.equal(c.bugs, 2);
});

test("a count above the baseline is a regression, equal or lower is not", () => {
  const base = { bugs: 2, vulnerabilities: 1, hotspots: 3, smells_major: 10, smells_minor: 5 };
  assert.deepEqual(regressions({ ...zeros(), ...base, smells_minor: 6 }, base), [{ key: "smells_minor", now: 6, baseline: 5 }]);
  assert.deepEqual(regressions({ ...zeros(), ...base, bugs: 1 }, base), []);
});

test("a key missing from the baseline counts as zero", () => {
  assert.equal(regressions({ ...zeros(), smells_info: 1 }, {}).length, 1);
});

test("update lowers a count and never raises one", () => {
  const next = lowered({ ...zeros(), bugs: 5, smells_major: 4 }, { bugs: 2, smells_major: 10 });
  assert.equal(next.bugs, 2);
  assert.equal(next.smells_major, 4);
});

test("the project key comes from the file, else from sonar-project.properties", () => {
  assert.equal(projectOf({ project: "a" }, "sonar.projectKey=b"), "a");
  assert.equal(projectOf(null, "sonar.organization=o\nsonar.projectKey=krizaka_x\n"), "krizaka_x");
  assert.equal(projectOf(null, ""), undefined);
});

const run = async (argv, files, table = T) => {
  const out = [];
  const written = {};
  const code = await main(argv, {
    get: api(table), log: (l) => out.push(l),
    exists: (p) => p in files, read: (p) => files[p], write: (p, c) => { written[p] = JSON.parse(c); },
  });
  return { code, out, written };
};
const base = JSON.stringify({ project: "p", counts: { bugs: 2, vulnerabilities: 1, hotspots: 3, smells_major: 10, smells_minor: 5 } });

test("the default branch passes at the baseline and a pull request that raises a count fails", async () => {
  assert.equal((await run([], { "sonar-ratchet.json": base })).code, 0);
  const r = await run(["--pull-request", "7"], { "sonar-ratchet.json": base });
  assert.equal(r.code, 1);
  assert.match(r.out.join("\n"), /smells_minor is 6, baseline 5/);
});

test("without a baseline file the check fails and says how to create it", async () => {
  const r = await run([], { "sonar-project.properties": "sonar.projectKey=p" });
  assert.equal(r.code, 1);
  assert.match(r.out[0], /--update/);
});

test("--update writes a new file, then only lowers it", async () => {
  const first = await run(["--update"], { "sonar-project.properties": "sonar.projectKey=p" });
  assert.equal(first.written["sonar-ratchet.json"].counts.bugs, 2);
  const worse = { ...T, main: { ...T.main, bugs: 9, smells: { MAJOR: 1 } } };
  const again = await run(["--update"], { "sonar-ratchet.json": base }, worse);
  assert.equal(again.written["sonar-ratchet.json"].counts.bugs, 2);
  assert.equal(again.written["sonar-ratchet.json"].counts.smells_major, 1);
});
