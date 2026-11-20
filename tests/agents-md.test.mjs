// The one AGENTS.md of every repository (docs/standards/agents-template.md, krizaka/krizaka-internal#876): rendered, checked, rolled out.
import test from "node:test";
import assert from "node:assert/strict";
import { claudeProblems, commandsOf, detailsOf, MAX_LINES, problemsOf, readTemplate, render, REQUIRED_HEADINGS, SKILL_URL } from "../scripts/agents-md.mjs";
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
  assert.ok(MAX_LINES === 150);
  assert.match(text, /Main product repository\./);
});

test("the rendered AGENTS.md passes its own check once docs/agents.md exists", () => {
  const text = render(ENTRY, { packageJson: PKG });
  assert.deepEqual(problemsOf(text, ["AGENTS.md", "docs/agents.md"]), []);
  assert.deepEqual(problemsOf(text, ["AGENTS.md"]), ["broken link « docs/agents.md »"]);
});

test("the check names what is missing: marker, length, headings, skill link", () => {
  const problems = problemsOf("# AGENTS.md\n\n## Project context\n" + "line\n".repeat(160), []);
  assert.ok(problems.some((p) => p.includes("marker")));
  assert.ok(problems.some((p) => p.includes("lines (at most 150)")));
  assert.ok(problems.some((p) => p.includes("## Essential commands")));
  assert.ok(problems.some((p) => p.includes("krizaka-engineering skill")));
  assert.deepEqual(problemsOf(null, []), ["no AGENTS.md"]);
});

test("151 lines fails, 150 lines of the template passes", () => {
  const ok = render(ENTRY, { packageJson: PKG });
  const pad = (n) => ok.trimEnd() + "\n" + "- more\n".repeat(n);
  const have = ok.trimEnd().split("\n").length;
  assert.deepEqual(problemsOf(pad(150 - have), ["docs/agents.md"]), []);
  assert.deepEqual(problemsOf(pad(151 - have), ["docs/agents.md"]), ["151 lines (at most 150)"]);
});

test("a missing section fails, and so do sections out of order", () => {
  const ok = render(ENTRY, { packageJson: PKG });
  const paths = ["docs/agents.md"];
  assert.deepEqual(problemsOf(ok.replace("## Expected validation workflow", "## Checks"), paths), ["no « ## Expected validation workflow » heading"]);
  const swapped = ok.replace("## Essential commands", "## TMP").replace("## Architecture & conventions", "## Essential commands").replace("## TMP", "## Architecture & conventions");
  assert.ok(problemsOf(swapped, paths).some((p) => p.includes("out of order")));
});

test("CLAUDE.md: a symlink or the one line @AGENTS.md passes; empty, missing or a few lines fail", () => {
  const ok = render(ENTRY, { packageJson: PKG });
  const paths = ["docs/agents.md"];
  assert.deepEqual(problemsOf(ok, paths, "@AGENTS.md\n"), []);
  assert.deepEqual(problemsOf(ok, paths, "@AGENTS.md"), []);
  assert.deepEqual(problemsOf(ok, paths, "AGENTS.md"), [], "a symlink reads as its target path");
  assert.equal(problemsOf(ok, paths, "").length, 1);
  assert.equal(problemsOf(ok, paths, "# Claude\n\nSee AGENTS.md\n").length, 1);
  assert.equal(problemsOf(ok, paths, null).length, 1);
  assert.deepEqual(problemsOf(ok, paths), [], "no CLAUDE.md argument: not judged");
  assert.match(claudeProblems("a\nb\nc")[0], /3 lines/);
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
  const files = { "AGENTS.md": "# Old\n\nRule one.\nRule two.\nRule three.\n", "CLAUDE.md": "# Claude\n\nOld claude words.\n", "package.json": PKG };
  const snap = snapshotOf("demo-app", "app", Object.keys(files), async (p) => files[p] ?? null);
  assert.equal((await runCheck(rule.check, snap)).ok, false);
  const repos = JSON.stringify([ENTRY]);
  const readLocal = (p) => (p === "repos.json" ? repos : readTemplate());
  const out = await filesFor(rule, { sha: "c".repeat(40), repo: "demo-app", current: async (p) => files[p] ?? null, readLocal });
  assert.deepEqual(out.map((f) => f.path), ["AGENTS.md", "CLAUDE.md", "docs/agents.md"]);
  assert.match(out[2].content, /Rule three\./);
  assert.match(out[2].content, /Old claude words\./);
  assert.equal(out[1].content, "@AGENTS.md\n");
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
