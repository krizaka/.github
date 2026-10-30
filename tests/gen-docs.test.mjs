// scripts/gen-docs.mjs (krizaka/.github#351): the markers, the offline sources, the remote ones with injected readers, and the
// « docs are current » check run against this repository's own standards.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BLOCKS, TOOL_DIRS, blockOf, ciJobs, configExports, guardPaths, npmVersions, protection, queueState, regenerate, remoteContext, requiredChecks, withBlock, workflowJobs,
} from "../scripts/gen-docs.mjs";

const repoFile = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("withBlock replaces only what is between the markers, and refuses a missing block", () => {
  const text = "intro\n<!-- gen:a:start -->\nold\n<!-- gen:a:end -->\nprose\n";
  assert.equal(blockOf(text, "a"), "old\n");
  assert.equal(withBlock(text, "a", "new"), "intro\n<!-- gen:a:start -->\nnew\n<!-- gen:a:end -->\nprose\n");
  assert.equal(withBlock(withBlock(text, "a", "new"), "a", "new"), withBlock(text, "a", "new"), "idempotent");
  assert.throws(() => withBlock(text, "b", "x"), /gen:b markers are missing/);
});

test("workflowJobs reads the id, name and needs of each top-level job", () => {
  const jobs = workflowJobs("name: x\njobs:\n  a:\n    name: Alpha\n    runs-on: x\n  b:\n    needs: [a, c]\n    name: ${{ format('B {0}', m) }}\n  c:\n    needs: a\n");
  assert.deepEqual(jobs.map((j) => [j.id, j.name, j.needs]), [["a", "Alpha", []], ["b", "${{ format('B {0}', m) }}", ["a", "c"]], ["c", "", ["a"]]]);
});

test("ciJobs lists every job of the shared workflows, a matrix name as « one check per matrix leg »", () => {
  const out = ciJobs();
  for (const job of ["verify", "sonar", "sonar-light", "gate", "release"]) assert.match(out, new RegExp(`\`${job}\``));
  assert.match(out, /one check per matrix leg/);
  assert.doesNotMatch(out, /\$\{\{/);
});

test("guardPaths states the title pattern, the exemption and every kind of guard of guard-paths.json", () => {
  const out = guardPaths();
  const g = JSON.parse(repoFile("docs/standards/guard-paths.json"));
  assert.ok(out.includes(g.exemptLabel));
  for (const kind of Object.keys(g.guards)) assert.match(out, new RegExp(`\\| ${kind} \\|`));
});

test("protection reads required checks, strict and the Merge queue ruleset; nothing readable gives null", () => {
  const api = (path) =>
    path.includes("/protection/") ? (path.includes("/x/") ? null : { contexts: ["ci / CI gate"], strict: false }) : [{ name: "Merge queue" }];
  const one = protection(["r"], api);
  assert.deepEqual(one, [{ repo: "r", checks: ["ci / CI gate"], strict: false, queue: true }]);
  assert.match(requiredChecks(one), /\| `r` \| `ci \/ CI gate` \| no \| yes \|/);
  assert.match(queueState(one), /On the merge queue \(1\):\*\* `r`/);
  assert.equal(protection(["r"], () => null), null);
});

test("a table cell escapes the backslash before the pipe, so the pipe cannot be un-escaped", () => {
  const out = npmVersions([{ name: "a\\|b", version: "1" }]);
  assert.ok(out.includes("`a\\\\\\|b`"), out);
});

test("configExports lists the bins and the entry points", () => {
  const out = configExports({ version: "1.2.3", bin: { b: "x", a: "y" }, exports: { ".": "i", "./dep": "d", "./package.json": "p" } });
  assert.match(out, /1\.2\.3 ships 2 commands \(`a`, `b`\) and 2 entry points: `\.`, `\.\/dep`/);
});

test("a remote block that cannot be read is kept as it is, and an offline run never touches a remote block", () => {
  const files = { "docs/standards/guards.md": "<!-- gen:queue-state:start -->\nkept\n<!-- gen:queue-state:end -->\n" };
  const blocks = [{ file: "docs/standards/guards.md", name: "queue-state", remote: true, render: (c) => (c.protection() ? "x" : null) }];
  const ctx = remoteContext(() => null, () => null, () => ["r"]);
  const failed = regenerate(files, { remote: true, ctx, blocks });
  assert.deepEqual(failed.skipped, ["queue-state"]);
  assert.equal(failed.files["docs/standards/guards.md"], files["docs/standards/guards.md"]);
  assert.deepEqual(regenerate(files, { remote: false, ctx, blocks }).skipped, []);
});

test("docs are current: the offline blocks of this repository's standards are what the sources say", () => {
  const files = Object.fromEntries([...new Set(BLOCKS.map((b) => b.file))].map((p) => [p, repoFile(p)]));
  const { changed } = regenerate(files, { remote: false });
  assert.deepEqual(changed, [], `regenerate with node scripts/gen-docs.mjs: ${changed.join(", ")}`);
  for (const b of BLOCKS) assert.notEqual(blockOf(files[b.file], b.name), null, `${b.file} lacks gen:${b.name}`);
});

test("external tools run with a fixed set of system directories, never the caller's search path (Sonar S4036)", () => {
  const source = repoFile("scripts/gen-docs.mjs");
  assert.doesNotMatch(source, /execFileSync\("(gh|curl)"/, "go through runTool");
  assert.match(source, /runTool\("gh"/);
  assert.match(source, /runTool\("curl"/);
  for (const dir of TOOL_DIRS.split(":")) assert.ok(dir.startsWith("/"), `${dir} must be absolute`);
});
