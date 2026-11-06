import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { POLICY_FILE, SCHEMA_FILE, getValue, loadPolicy, problems } from "../scripts/policy.mjs";

const schema = JSON.parse(readFileSync(SCHEMA_FILE, "utf8"));
const good = JSON.parse(readFileSync(POLICY_FILE, "utf8"));
const dir = mkdtempSync(join(tmpdir(), "policy-"));
const write = (value) => {
  const file = join(dir, `p${Math.random()}.json`);
  writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
  return file;
};
const withTrain = (patch) => ({ ...good, train: { ...good.train, ...patch } });

test("the committed policy is valid and says five per lane per repository, fix(main) exempt", () => {
  const policy = loadPolicy();
  assert.equal(getValue(policy, "train.prCapPerLane"), 5);
  assert.equal(getValue(policy, "train.capScope"), "lane-per-repository");
  assert.equal(getValue(policy, "train.fixMainExempt"), true);
});

test("an unknown key is refused, at the root and in a section", () => {
  assert.match(problems(schema, { ...good, extra: 1 }).join(), /unknown key « extra »/);
  assert.match(problems(schema, withTrain({ cap: 3 })).join(), /unknown key « cap »/);
});

test("a wrong type is refused", () => {
  assert.match(problems(schema, withTrain({ prCapPerLane: "5" })).join(), /prCapPerLane: expected integer/);
  assert.match(problems(schema, withTrain({ prCapPerLane: 5.5 })).join(), /expected integer/);
  assert.match(problems(schema, withTrain({ fixMainExempt: "yes" })).join(), /expected boolean/);
});

test("a value out of bounds or out of its set is refused", () => {
  assert.match(problems(schema, withTrain({ prCapPerLane: 0 })).join(), /under the minimum 1/);
  assert.match(problems(schema, withTrain({ prCapPerLane: 11 })).join(), /over the maximum 10/);
  assert.match(problems(schema, withTrain({ capScope: "per-repository" })).join(), /must be one of lane-per-repository/);
  assert.match(problems(schema, { ...good, version: 2 }).join(), /over the maximum 1/);
});

test("a missing key is refused", () => {
  const { train, ...noTrain } = good;
  assert.match(problems(schema, noTrain).join(), /« train » is required/);
  const { fixMainExempt, ...partial } = good.train;
  assert.match(problems(schema, { ...good, train: partial }).join(), /« fixMainExempt » is required/);
});

test("loadPolicy fails closed: a missing file, a file that is not JSON, an invalid file", () => {
  assert.throws(() => loadPolicy(join(dir, "absent.json")), /cannot read/);
  assert.throws(() => loadPolicy(write("{ nope")), /cannot read/);
  assert.throws(() => loadPolicy(write(withTrain({ prCapPerLane: 99 }))), /is invalid:\n- .*maximum 10/);
  assert.equal(loadPolicy(write(good)).train.prCapPerLane, 5);
});

test("a schema keyword the reader does not check is itself an error, never skipped", () => {
  assert.match(problems({ type: "integer", multipleOf: 2 }, 4).join(), /multipleOf/);
});

test("getValue names the missing path", () => {
  assert.throws(() => getValue(good, "train.nope"), /no value at « train.nope »/);
  assert.throws(() => getValue(good, "train.prCapPerLane.x"), /no value at/);
});

test("the CLI prints a value and exits 1 on an unknown path", () => {
  const cli = join(import.meta.dirname, "..", "scripts", "policy.mjs");
  assert.equal(execFileSync("node", [cli, "get", "train.prCapPerLane"], { encoding: "utf8" }).trim(), "5");
  assert.throws(() => execFileSync("node", [cli, "get", "train.nope"], { stdio: "pipe" }), /status 1|Command failed/);
});

// Security: the schema is closed and holds no place for a secret, a path or an address.
const FORBIDDEN_NAME = ["secret", "token", "key", "password", "url"];
const walk = (node, visit, at = "policy") => {
  visit(node, at);
  for (const [k, v] of Object.entries(node.properties ?? {})) walk(v, visit, `${at}.${k}`);
};

test("no key of the schema or of policy.json is named like a secret, a token, a password or an address", () => {
  const names = [];
  walk(schema, (n) => names.push(...Object.keys(n.properties ?? {})));
  const collect = (v) => (v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [k, ...collect(x)]) : []);
  for (const name of [...names, ...collect(good)].filter((n) => n !== "$schema")) {
    assert.ok(!FORBIDDEN_NAME.some((f) => name.toLowerCase().includes(f)), `key « ${name} » looks like a secret or an address`);
  }
});

test("every object of the schema is closed, every property is described and required or optional on purpose", () => {
  walk(schema, (n, at) => {
    assert.ok(n.description?.length > 20, `${at}: a description is required`);
    if (n.type === "object") {
      assert.equal(n.additionalProperties, false, `${at}: additionalProperties must be false`);
      assert.ok(Array.isArray(n.required) && n.required.length > 0, `${at}: required keys`);
    }
    assert.equal(n.patternProperties, undefined, `${at}: no free-form key map`);
  });
});

test("no value is free text: a string is a constant or one of a set, a number has bounds", () => {
  walk(schema, (n, at) => {
    if (n.type === "string") assert.ok(n.const !== undefined || Array.isArray(n.enum), `${at}: a string must be const or enum`);
    if (n.type === "integer") assert.ok(n.minimum !== undefined && n.maximum !== undefined, `${at}: bounds are required`);
  });
});
