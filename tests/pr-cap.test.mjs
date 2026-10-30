import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAP, exemptReason, overCap, trackingBody, verdict } from "../scripts/pr-cap.mjs";

const pr = (number, extra = {}) => ({ number, user: { login: "someone" }, labels: [], title: "feat: x", head: { ref: `feat/${number}` }, created_at: "2026-10-20T00:00:00Z", ...extra });
const open = (n) => Array.from({ length: n }, (_, i) => pr(i + 1));

test("the cap is five", () => assert.equal(CAP, 5));

test("a new PR passes while the others are under the cap and fails as the one over it", () => {
  assert.equal(verdict(open(5), pr(5)).ok, true, "4 others + itself = 5");
  assert.equal(verdict([...open(5), pr(6)], pr(6)).ok, false, "5 others: it would be the 6th");
});

test("the PR itself is not counted among the others", () => {
  assert.equal(verdict(open(5), pr(1)).others, 4);
});

test("Dependabot security, the pin PR and release PRs are exempt, an ordinary Dependabot bump is not", () => {
  const full = open(6);
  const bot = { login: "dependabot[bot]" };
  assert.equal(verdict(full, pr(90, { user: bot, labels: [{ name: "security" }] })).ok, true);
  assert.equal(verdict(full, pr(91, { user: bot, labels: [{ name: "dependencies" }] })).ok, false);
  assert.equal(verdict(full, pr(92, { head: { ref: "deps/pins-eabaefb8" } })).ok, true);
  assert.equal(verdict(full, pr(93, { head: { ref: "changeset-release/main" }, title: "Version Packages" })).ok, true);
  assert.equal(verdict(full, pr(94, { head: { ref: "release-please--branches--main" } })).ok, true);
  assert.equal(exemptReason(pr(95)), null);
  assert.equal(exemptReason(pr(96, { head: { ref: "deps/a/b" } })), null, "only the single-segment deps/<label> branch");
});

test("overCap names the repositories above five, most loaded first, with their oldest PRs", () => {
  const old = pr(1, { created_at: "2026-10-01T00:00:00Z" });
  const byRepo = { a: open(5), b: [old, ...open(7).slice(1)], c: open(9), d: [] };
  const over = overCap(byRepo);
  assert.deepEqual(over.map((o) => [o.repo, o.count]), [["c", 9], ["b", 7]]);
  assert.equal(over[1].oldest[0].number, 1);
  assert.equal(over[1].oldest.length, 3);
});

test("the tracking body lists the repositories over the cap, or says all is well", () => {
  const now = Date.parse("2026-10-30T12:00:00Z");
  const body = trackingBody({ a: open(5), c: [pr(7, { created_at: "2026-10-17T12:00:00Z" }), ...open(5)] }, now);
  assert.match(body, /\| c \| 6 \| #7 \(13 d\)/);
  assert.doesNotMatch(body, /\| a \|/);
  assert.match(trackingBody({ a: open(2) }, now), /at or under the cap/);
});

test("the workflow runs the report on a schedule and the check as a reusable, literally named job", () => {
  const text = readFileSync(".github/workflows/pr-cap.yml", "utf8");
  assert.match(text, /schedule:/);
  assert.match(text, /workflow_call:/);
  assert.match(text, /name: PR cap\n/);
  assert.match(text, /pr-cap\.mjs check/);
  assert.match(text, /pr-cap\.mjs report/);
});
