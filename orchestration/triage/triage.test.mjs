import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const LABELS = new Set(["priority:p0", "priority:p1", "priority:p2", "paused", "blocked", "needs-adr", "adr-validated", "ready-for-agent"]);
const RELATIONS = new Set(["blocks", "blocked_by", "duplicate_of", "part_of"]);
const REASONS = new Set(["completed", "not_planned"]);
const isRef = (v) => typeof v === "string" && /^[A-Za-z0-9._-]+#\d+$/.test(v);
const isText = (v) => typeof v === "string" && v.trim().length > 0;

const files = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));

test("there is at least one triage file", () => {
  assert.ok(files.length > 0);
});

for (const file of files) {
  const actions = JSON.parse(readFileSync(join(dir, file), "utf8"));

  test(`${file}: is a list of actions with a repo and an issue number`, () => {
    assert.ok(Array.isArray(actions) && actions.length > 0);
    for (const a of actions) {
      assert.ok(isText(a.repo) && !a.repo.includes("/"), `repo in ${JSON.stringify(a)}`);
      assert.ok(Number.isInteger(a.issue) && a.issue > 0, `issue in ${JSON.stringify(a)}`);
    }
  });

  test(`${file}: every action has the shape of its kind`, () => {
    for (const a of actions) {
      switch (a.action) {
        case "comment":
          assert.ok(isText(a.body), `body in ${JSON.stringify(a)}`);
          break;
        case "label":
          assert.ok(Array.isArray(a.add) && Array.isArray(a.remove), `add/remove in ${JSON.stringify(a)}`);
          assert.ok(a.add.length + a.remove.length > 0, `empty label action in ${JSON.stringify(a)}`);
          for (const l of [...a.add, ...a.remove]) assert.ok(LABELS.has(l), `unknown label ${l}`);
          break;
        case "close":
          assert.ok(REASONS.has(a.reason), `reason in ${JSON.stringify(a)}`);
          assert.ok(isText(a.body), `a close cites its evidence: ${JSON.stringify(a)}`);
          break;
        case "link":
          assert.ok(isRef(a.to), `to in ${JSON.stringify(a)}`);
          assert.ok(RELATIONS.has(a.relation), `relation in ${JSON.stringify(a)}`);
          assert.notEqual(a.to, `${a.repo}#${a.issue}`, "an issue never links to itself");
          break;
        default:
          assert.fail(`unknown action ${a.action}`);
      }
    }
  });
}
