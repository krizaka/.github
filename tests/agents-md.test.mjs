// The one AGENTS.md of every repository (AGENTS.repo.md, krizaka/krizaka-internal#876): rendered, checked, rolled out.
import test from "node:test";
import assert from "node:assert/strict";
import { commandsOf, detailsOf, MAX_LINES, problemsOf, readTemplate, render, REQUIRED_HEADINGS, SKILL_URL } from "../scripts/agents-md.mjs";
import { filesFor } from "../scripts/conformance-fanout.mjs";
import { loadRules, runCheck, snapshotOf } from "../scripts/conformance.mjs";

const ENTRY = { name: "demo-app", role: "Main product repository", team: "demo", kind: "app" };
const PKG = JSON.stringify({ scripts: { lint: "eslint .", test: "vitest", build: "next build", dev: "next dev" } });

test("the template renders within the budget, every heading present, no placeholder left", () => {
  const text = render(ENTRY, { packageJson: PKG });
  assert.ok(text.trimEnd().split("\n").length <= MAX_LINES);
  for (const h of REQUIRED_HEADINGS) assert.match(text, new RegExp(`^${h}`, "m"), h);
  assert.ok(text.includes(SKILL_URL));
  assert.doesNotMatch(text, /\{\{\w+\}\}/);
  assert.match(text, /^# demo-app — agent contract/);
  assert.match(text, /Main product repository\./);
});

test("the rendered AGENTS.md passes its own check once docs/agents.md exists", () => {
  const text = render(ENTRY, { packageJson: PKG });
  assert.deepEqual(problemsOf(text, ["AGENTS.md", "docs/agents.md"]), []);
  assert.deepEqual(problemsOf(text, ["AGENTS.md"]), ["broken link « docs/agents.md »"]);
});

test("the check names what is missing: marker, length, headings, skill link", () => {
  const problems = problemsOf("# AGENTS.md\n\n## Profile\n" + "line\n".repeat(90), []);
  assert.ok(problems.some((p) => p.includes("marker")));
  assert.ok(problems.some((p) => p.includes("lines (at most 80)")));
  assert.ok(problems.some((p) => p.includes("## Commands")));
  assert.ok(problems.some((p) => p.includes("krizaka-engineering skill")));
  assert.deepEqual(problemsOf(null, []), ["no AGENTS.md"]);
});

test("commands come from the scripts, else from the kind", () => {
  assert.equal(commandsOf("app", PKG), "```bash\nnpm run lint\nnpm run test\nnpm run build\n```");
  assert.match(commandsOf("maven", null), /mvnw -B verify/);
  assert.match(commandsOf("none", null), /README/);
});

test("the old AGENTS.md is kept as docs/agents.md, its title replaced", () => {
  assert.match(detailsOf("demo-app", "# Old title\n\nKeep me.\n"), /^# demo-app — detail for agents[\s\S]*Keep me\.\n$/);
});

test("the conformance rule checks the template and its fan-out writes both files", async () => {
  const rule = loadRules().find((r) => r.id === "agents-template");
  const files = { "AGENTS.md": "# Old\n\nRule one.\nRule two.\nRule three.\n", "package.json": PKG };
  const snap = snapshotOf("demo-app", "app", Object.keys(files), async (p) => files[p] ?? null);
  assert.equal((await runCheck(rule.check, snap)).ok, false);
  const repos = JSON.stringify([ENTRY]);
  const readLocal = (p) => (p === "repos.json" ? repos : readTemplate());
  const out = await filesFor(rule, { sha: "c".repeat(40), repo: "demo-app", current: async (p) => files[p] ?? null, readLocal });
  assert.deepEqual(out.map((f) => f.path), ["AGENTS.md", "docs/agents.md"]);
  assert.match(out[1].content, /Rule three\./);
  const after = Object.fromEntries(out.map((f) => [f.path, f.content]));
  const fixed = snapshotOf("demo-app", "app", Object.keys(after), async (p) => after[p] ?? null);
  assert.deepEqual(await runCheck(rule.check, fixed), { ok: true, why: "" });
  // the template keeps the anti-slop rule green (no second section appended)
  const antiSlop = loadRules().find((r) => r.id === "agents-anti-slop");
  assert.equal((await runCheck(antiSlop.check, fixed)).ok, true);
});

test("an existing docs/agents.md makes the fix manual (never overwritten)", async () => {
  const rule = loadRules().find((r) => r.id === "agents-template");
  const files = { "AGENTS.md": "# Old\n\na\nb\nc\nd\n", "docs/agents.md": "# mine\n" };
  const readLocal = (p) => (p === "repos.json" ? JSON.stringify([ENTRY]) : readTemplate());
  assert.equal(await filesFor(rule, { sha: "c", repo: "demo-app", current: async (p) => files[p] ?? null, readLocal }), null);
});
