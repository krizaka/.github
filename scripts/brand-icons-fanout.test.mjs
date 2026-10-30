import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { branchFor, pullRequestOf, syncScriptOf, SYNC_SCRIPTS } from "./brand-icons-fanout.mjs";

test("each repository's own sync script is found, the first that exists", () => {
  assert.equal(syncScriptOf((p) => p === "scripts/sync-brand-icons.mjs"), "scripts/sync-brand-icons.mjs");
  assert.equal(syncScriptOf((p) => p === "site/scripts/sync-brand-icons.mjs"), "site/scripts/sync-brand-icons.mjs");
  assert.equal(syncScriptOf((p) => p === "apps/site/scripts/sync-brand-icons.mjs"), "apps/site/scripts/sync-brand-icons.mjs");
  assert.equal(syncScriptOf(() => false), null, "a repository without a brand-icons guard is skipped, not an error");
  assert.ok(SYNC_SCRIPTS.length >= 4);
});

test("one branch per day, so a second dispatch updates the same pull request", () => {
  assert.equal(branchFor(new Date("2026-10-29T23:59:00Z")), "chore/brand-icons-2026-10-29");
});

test("the pull request is the app's, bot-authored, with auto-merge and the model trailer", () => {
  const pr = pullRequestOf("krizaka-com", "chore/brand-icons-2026-10-29");
  assert.match(pr.title, /^chore\(brand\): icons follow the CDN brand manifest$/);
  assert.match(pr.body, /🤖 Generated with \[Claude Code\]\(https:\/\/claude\.com\/claude-code\)\s*$/);
  assert.deepEqual(pr.mergeArgs, ["pr", "merge", "--auto", "-R", "krizaka/krizaka-com", "chore/brand-icons-2026-10-29"]);
  assert.ok(!pr.mergeArgs.includes("--squash"), "a merge queue refuses a strategy");
  assert.deepEqual(pr.squashArgs, [...pr.mergeArgs, "--squash"], "a repository without a queue needs one");
});

test("the workflow listens for the brand event and the registry list, never a hand-kept one", () => {
  const yml = readFileSync(new URL("../.github/workflows/brand-icons-sync.yml", import.meta.url), "utf8");
  assert.match(yml, /repository_dispatch:\s*\n\s*types: \[brand-changed\]/);
  assert.match(yml, /workflow_dispatch:/);
  assert.match(yml, /node scripts\/brand-icons-fanout\.mjs/);
  assert.doesNotMatch(yml, /CONSUMERS/);
});
