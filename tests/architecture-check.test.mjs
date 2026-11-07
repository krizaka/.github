// The cell of the rule architecture-model (ADR-027, krizaka-internal#2810): the architecture tool's verdict, at the matrix's commit.
import test from "node:test";
import assert from "node:assert/strict";
import { architectureVerdict, loadVerdicts } from "../scripts/architecture-check.mjs";
import { evaluate, loadRules, snapshotOf } from "../scripts/conformance.mjs";

const SHA = "a".repeat(40);
const HASH = "f".repeat(64);
const file = (verdicts) => JSON.stringify({ schema: "krizaka.architecture/1", verdicts });
const pass = { repo: "r", commit: SHA, status: "pass", items: [], evidence: [{ repo: "home", path: "docs/architecture/r.c4", sha256: HASH }] };
const fail = { repo: "r", commit: SHA, status: "fail", items: [{ kind: "undocumented", why: "r/apps/web is on main and no current element binds it" }], evidence: [] };
const snap = (commit = SHA) => snapshotOf("r", "app", [], async () => null, { commit });
const from = (text) => loadVerdicts("fixture.json", () => text);

test("pass at the same commit, with the model files as evidence", () => {
  const out = architectureVerdict(from(file([pass])), snap());
  assert.deepEqual(out, { ok: true, why: "", evidence: [{ path: "home:docs/architecture/r.c4", sha256: HASH }] });
});

test("fail names the drift", () => {
  const out = architectureVerdict(from(file([fail])), snap());
  assert.equal(out.ok, false);
  assert.match(out.why, /^undocumented: r\/apps\/web is on main/);
});

test("another commit, no verdict, no file, or a repository the tool could not read: unknown, never green", () => {
  const other = architectureVerdict(from(file([pass])), snap("b".repeat(40)));
  assert.equal(other.ok, null);
  assert.match(other.why, /not the same commit/);
  assert.equal(architectureVerdict(from(file([])), snap()).ok, null);
  assert.equal(architectureVerdict(loadVerdicts("fixture.json", () => { throw new Error("no such file"); }), snap()).ok, null);
  assert.equal(architectureVerdict(from(JSON.stringify({ schema: "other" })), snap()).ok, null);
  assert.equal(architectureVerdict(from(file([{ repo: "r", commit: null, status: "unknown", why: "tarball 502" }])), snap()).ok, null);
});

test("the rule is registered, reported (not a security rule) and its cell is unknown without the tool's output", async () => {
  const rule = loadRules().find((r) => r.id === "architecture-model");
  assert.ok(rule, "architecture-model is in rules.json");
  assert.equal(rule.security, undefined);
  process.env.ARCHITECTURE_JSON = new URL("./no-architecture-here.json", import.meta.url).pathname;
  const cells = await evaluate([rule], [snap()]);
  assert.equal(cells.r["architecture-model"].status, "unknown");
});
