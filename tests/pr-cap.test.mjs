import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { exemptReason, laneOf, overCap, rulesFromPolicy, trackingBody, verdict } from "../scripts/pr-cap.mjs";

const RULES = { cap: 5, fixMainExempt: true };
const lane = (name) => [{ name: `lane:${name}` }];
const pr = (number, extra = {}) => ({ number, user: { login: "someone" }, labels: lane("platform"), title: "feat: x", head: { ref: `feat/${number}` }, created_at: "2026-10-20T00:00:00Z", ...extra });
const open = (n, extra = {}) => Array.from({ length: n }, (_, i) => pr(i + 1, extra));

test("the rules come from policy.json: five per lane, fix(main) exempt", () => assert.deepEqual(rulesFromPolicy(), RULES));

test("a PR with a lane label counts in that lane; the bot and the unlabelled have their own", () => {
  assert.equal(laneOf(pr(1, { labels: lane("yomizaka") })), "yomizaka");
  assert.equal(laneOf(pr(2, { labels: [], user: { login: "dependabot[bot]" } })), "dependabot");
  assert.equal(laneOf(pr(3, { labels: [{ name: "bug" }] })), "unlabelled");
});

test("a new PR passes while its lane's others are under the cap and fails as the one over it", () => {
  assert.equal(verdict(open(5), pr(5), RULES).ok, true, "4 others + itself = 5");
  assert.equal(verdict([...open(5), pr(6)], pr(6), RULES).ok, false, "5 others: it would be the 6th");
});

test("the cap is per lane: another lane's PRs do not fill it", () => {
  const others = open(8, { labels: lane("akinaza") });
  assert.equal(verdict([...others, pr(50)], pr(50), RULES).ok, true);
  assert.equal(verdict([...others, pr(50)], pr(50), RULES).others, 0);
  assert.equal(verdict([...others, ...open(5, { labels: lane("platform") }).map((p) => ({ ...p, number: p.number + 100 })), pr(50)], pr(50), RULES).ok, false);
});

test("the PR itself is not counted among the others", () => {
  assert.equal(verdict(open(5), pr(1), RULES).others, 4);
});

test("fix-main is neither blocked nor counted when the policy says so, and counted when it does not", () => {
  const full = [...open(5), pr(60, { title: "fix(main): red lint" })];
  assert.equal(verdict(full, pr(70, { title: "fix(main): x" }), RULES).ok, true, "fix-main by title");
  assert.equal(verdict(full, pr(71, { labels: [...lane("platform"), { name: "fix-main" }] }), RULES).ok, true, "fix-main by label");
  assert.equal(verdict([...open(4), pr(60, { title: "fix(main): red" })], pr(72), RULES).ok, true, "a fix-main PR does not fill the cap");
  assert.equal(verdict([...open(4), pr(60, { title: "fix(main): red" })], pr(72), { ...RULES, fixMainExempt: false }).ok, false, "counted when not exempt");
  assert.equal(verdict(full, pr(99, { title: "fix(ui): x" }), RULES).ok, false, "only fix(main)");
});

test("Dependabot security, the pin PR and release PRs are exempt, an ordinary Dependabot bump is not", () => {
  const full = open(6);
  const bot = { login: "dependabot[bot]" };
  assert.equal(verdict(full, pr(90, { user: bot, labels: [{ name: "security" }] }), RULES).ok, true);
  assert.equal(verdict([...open(5, { labels: [], user: bot })], pr(91, { user: bot, labels: [{ name: "dependencies" }] }), RULES).ok, false, "the dependabot lane is full");
  assert.equal(verdict(full, pr(92, { head: { ref: "deps/pins-eabaefb8" } }), RULES).ok, true);
  assert.equal(verdict(full, pr(93, { head: { ref: "changeset-release/main" }, title: "Version Packages" }), RULES).ok, true);
  assert.equal(verdict(full, pr(94, { head: { ref: "release-please--branches--main" } }), RULES).ok, true);
  assert.equal(exemptReason(pr(95), RULES), null);
  assert.equal(exemptReason(pr(96, { head: { ref: "deps/a/b" } }), RULES), null, "only the single-segment deps/<label> branch");
});

test("overCap names the lanes above the cap per repository, most loaded first, with their oldest PRs", () => {
  const old = pr(1, { created_at: "2026-10-01T00:00:00Z" });
  const byRepo = { a: open(5), b: [old, ...open(8).slice(1)], c: open(10), d: [], e: [...open(6, { labels: lane("x") }), ...open(6, { labels: lane("y") }).map((p) => ({ ...p, number: p.number + 50 }))] };
  const over = overCap(byRepo, RULES);
  assert.deepEqual(over.map((o) => [o.repo, o.lane, o.count]), [["c", "platform", 10], ["b", "platform", 8], ["e", "x", 6], ["e", "y", 6]]);
  assert.equal(over[1].oldest[0].number, 1);
  assert.equal(over[1].oldest.length, 3);
});

test("the tracking body lists the lanes over the cap, or says all is well", () => {
  const now = Date.parse("2026-10-30T12:00:00Z");
  const body = trackingBody({ a: open(5), c: [pr(7, { created_at: "2026-10-17T12:00:00Z" }), ...open(5)] }, now, RULES);
  assert.match(body, /\| c \| platform \| 6 \| #7 \(13 d\)/);
  assert.doesNotMatch(body, /\| a \|/);
  assert.match(trackingBody({ a: open(3) }, now, RULES), /at or under the cap of 5/);
});

test("the workflow runs the report on a schedule and the check as a reusable, literally named job", () => {
  const text = readFileSync(".github/workflows/pr-cap.yml", "utf8");
  assert.match(text, /schedule:/);
  assert.match(text, /workflow_call:/);
  assert.match(text, /name: PR cap\n/);
  assert.match(text, /pr-cap\.mjs check/);
  assert.match(text, /pr-cap\.mjs report/);
});
