import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLog, trailerProblems } from "../scripts/check-trailers.mjs";

test("any co-author trailer is refused, whatever its case or author, and its e-mail is not echoed", () => {
  const commits = [
    { sha: "aaaaaaaaaa", message: "fix: a\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n" },
    { sha: "bbbbbbbbbb", message: "feat: b\n\nco-authored-by: krizaka-agents[bot] <x@users.noreply.github.com>\n" },
    { sha: "cccccccccc", message: "docs: c (co-authored work is credited in the PR body)\n" },
  ];
  const p = trailerProblems(commits);
  assert.equal(p.length, 2);
  assert.match(p[0], /^aaaaaaa .*Claude Opus 5\.5/);
  assert.ok(!p.join(" ").includes("@"), "no e-mail in the output");
});

test("git log records split on the record separator", () => {
  const raw = "s1\x00fix: a\n\nbody\n\x1e\ns2\x00feat: b\n\x1e\n";
  assert.deepEqual(parseLog(raw).map((c) => c.sha), ["s1", "s2"]);
});
