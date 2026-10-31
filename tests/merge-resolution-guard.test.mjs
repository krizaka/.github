import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { classify, NOTE } from "../scripts/stale-prs.mjs";
import { explained, judge, parseDiff } from "../scripts/merge-resolution-guard.mjs";

const lines = (n, p = "line of content number") => Array.from({ length: n }, (_, i) => `${p} ${i}`);

test("parseDiff: added and removed lines per file", () => {
  const d = parseDiff("--- a/x.md\n+++ b/x.md\n@@ -1 +1 @@\n-old line here\n+new line here\n");
  assert.deepEqual(d["x.md"], { added: ["new line here"], removed: ["old line here"] });
});

test("judge: dropping what main added fails past the limit, passes under it", () => {
  const main = { "docs/a.md": { added: lines(60), removed: [] } };
  assert.equal(judge({ "docs/a.md": { added: [], removed: lines(60) } }, main, "").ok, false);
  assert.equal(judge({ "docs/a.md": { added: [], removed: lines(10) } }, main, "").ok, true);
});

test("judge: the PR's own deletions are not main's content", () => {
  const main = { "docs/a.md": { added: lines(60), removed: [] } };
  assert.equal(judge({ "docs/a.md": { added: [], removed: lines(500, "old text of mine") } }, main, "").ok, true);
});

test("judge: generated folders count on their own, trivial lines are ignored", () => {
  assert.equal(judge({ "docs/_generated/x.md": { added: [], removed: lines(80) } }, {}, "").ok, false);
  const braces = Array(100).fill("}");
  assert.equal(judge({ "a.md": { added: [], removed: braces } }, { "a.md": { added: braces, removed: [] } }, "").ok, true);
});

test("a `deletion-explained:` line lets it through; an empty one does not", () => {
  const prDiff = { "docs/_generated/x.md": { added: [], removed: lines(80) } };
  assert.equal(judge(prDiff, {}, "Why\n\ndeletion-explained: the generator moved these pages").ok, true);
  assert.equal(explained("deletion-explained:"), false);
  assert.equal(judge(prDiff, {}, "deletion-explained:   ").ok, false);
});

test("end to end on a real repository: a resolution that drops main's lines fails, then passes once explained", () => {
  const dir = mkdtempSync(join(tmpdir(), "mrg-"));
  const id = ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false"];
  const g = (...a) => execFileSync("git", ["-C", dir, ...id, ...a], { encoding: "utf8" });
  g("init", "-q", "-b", "main");
  mkdirSync(join(dir, "docs"));
  writeFileSync(join(dir, "docs/a.md"), "start of the document\n");
  g("add", ".");
  g("commit", "-qm", "init");
  g("checkout", "-qb", "feature");
  writeFileSync(join(dir, "b.txt"), "feature work that is unrelated\n");
  g("add", ".");
  g("commit", "-qm", "feature");
  g("checkout", "-q", "main");
  writeFileSync(join(dir, "docs/a.md"), `start of the document\n${lines(70).join("\n")}\n`);
  g("commit", "-qam", "main adds docs");
  g("update-ref", "refs/remotes/origin/main", "main");
  g("checkout", "-q", "feature");
  g("merge", "-q", "--no-commit", "--no-ff", "main");
  writeFileSync(join(dir, "docs/a.md"), "start of the document\n"); // the hand resolution drops main's additions
  g("commit", "-qam", "merge main (resolved)");
  // As the workflow sees it: base = origin/main, branch point = the last main commit before the PR was opened (here the root).
  const root = g("rev-list", "--max-parents=0", "HEAD").trim();
  const run2 = (body) => {
    writeFileSync(join(dir, "..", "pr-body.txt"), body);
    try {
      execFileSync("node", ["scripts/merge-resolution-guard.mjs", "--repo-dir", dir, "--base", "origin/main", "--branch-point", root, "--body-file", join(dir, "..", "pr-body.txt")], { stdio: "pipe" });
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  assert.equal(run2("nothing said"), 1);
  assert.equal(run2("deletion-explained: the old section moved to the handbook"), 0);
});

test("stale PRs: 7 days refresh, 21 idle days close, keep-open and drafts are left", () => {
  const now = Date.parse("2026-10-31T00:00:00Z");
  const at = (d) => new Date(now - d * 86400000).toISOString();
  assert.equal(classify({ created_at: at(3), updated_at: at(1) }, now), "none");
  assert.equal(classify({ created_at: at(9), updated_at: at(1) }, now), "update");
  assert.equal(classify({ created_at: at(40), updated_at: at(22) }, now), "close");
  assert.equal(classify({ created_at: at(40), updated_at: at(22), labels: [{ name: "keep-open" }] }, now), "none");
  assert.equal(classify({ created_at: at(9), updated_at: at(1), draft: true }, now), "none");
  assert.match(NOTE, /21 days/);
});
