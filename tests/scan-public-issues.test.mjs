import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classify, inScope, renderReport } from "../scripts/scan-public-issues.mjs";

const NOW = Date.parse("2026-10-30T12:00:00Z");
const DAY = 24 * 3600 * 1000;
const app = (over = {}) => ({ user: { login: "krizaka-agents[bot]" }, labels: [], created_at: "2026-10-30T08:00:00Z", ...over });

test("classify flags each sensitive category by title", () => {
  assert.ok(classify({ title: "fraud-signals: publish what the check misses" }).fraud);
  assert.ok(classify({ title: "bug(security): Turnstile tokens are never verified server-side" }).security);
  assert.ok(classify({ title: "quality(sonar): resolve 112 static analysis findings (22 bugs, 59 vulnerabilities)" }).security);
  assert.ok(classify({ title: "feat(billing): Starter 29 $ with 3 free months" }).pricing);
  assert.ok(classify({ title: "DNS at Porkbun: DMARC and SPF" }).infra);
  assert.ok(classify({ title: "legal: the single lawyer review" }).legal);
  assert.ok(classify({ title: "Corporate bank account for the company" }).founder);
});

test("classify reads the body only past a threshold, and the labels as hints", () => {
  assert.deepEqual(classify({ title: "feat(ui): a button", body: "one threshold" }), {});
  assert.equal(classify({ title: "feat(checks): signals", body: "recall 0 on overlays; false positive over 5 %" }).fraud, "body ×3");
  assert.equal(classify({ title: "chore: tidy", body: "", labels: ["area:security"] }).security, "label area:security");
});

test("classify leaves plain product work alone", () => {
  for (const title of ["feat(tree-view): rich nodes", "fix(nav): the bar flickers on mobile", "docs: README badges", "feat(form): Money input"]) {
    assert.deepEqual(classify({ title, body: "Acceptance criteria: renders in both themes." }), {}, title);
  }
});

test("inScope: only our apps, no PR, not marked public, opened in the window", () => {
  const since = NOW - 7 * DAY;
  assert.equal(inScope(app(), since), true);
  assert.equal(inScope(app({ user: { login: "orazaka[bot]" } }), since), true);
  assert.equal(inScope(app({ user: { login: "someone" } }), since), false);
  assert.equal(inScope(app({ user: { login: "dependabot[bot]" } }), since), false);
  assert.equal(inScope(app({ pull_request: {} }), since), false);
  assert.equal(inScope(app({ labels: [{ name: "public" }] }), since), false);
  assert.equal(inScope(app({ created_at: "2026-10-01T00:00:00Z" }), since), false);
});

test("renderReport lists every suspect with its categories, or says none", () => {
  const md = renderReport([{ url: "https://github.com/krizaka/yomizaka/issues/1", categories: { fraud: "title", pricing: "body ×3" } }], new Date(NOW));
  assert.match(md, /1 suspect issue/);
  assert.match(md, /- \[ \] https:\/\/github\.com\/krizaka\/yomizaka\/issues\/1 — `fraud` \(title\), `pricing` \(body ×3\)/);
  assert.match(md, /gh issue transfer <n> krizaka\/krizaka-internal/);
  assert.match(renderReport([], new Date(NOW)), /No suspect issue\./);
});

test("the workflow runs daily and on new issues, writes only to krizaka-internal, and never echoes titles", () => {
  const wf = readFileSync(new URL("../.github/workflows/public-issues-scan.yml", import.meta.url), "utf8");
  assert.match(wf, /schedule:/);
  assert.match(wf, /issues:\s*\n\s*types: \[opened\]/);
  assert.match(wf, /repositories: krizaka-internal/);
  assert.match(wf, /permission-issues: write/);
  const src = readFileSync(new URL("../scripts/scan-public-issues.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(src, /console\.log\([^)]*title/);
});
