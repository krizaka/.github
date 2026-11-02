// Guard (krizaka-internal#1999): no workflow or script of this repository opens an issue in the repository it runs in.
// Our issues live in the private krizaka-internal; the daily « Public issues conformance » was red with 40 issues opened
// by the alert workflows (SEO family, post-deploy, journeys) and the weekly conformance run, each in a public repository.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { loadRules } from "../scripts/conformance.mjs";

const files = [
  ...readdirSync(new URL("../.github/workflows/", import.meta.url)).map((f) => `.github/workflows/${f}`),
  ...readdirSync(new URL("../scripts/", import.meta.url)).filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs")).map((f) => `scripts/${f}`),
];

// An issue created (CLI or REST) on the running repository or on a repository taken from a variable.
const SELF = [
  /gh\s+issue\s+create(?![^\n]*krizaka\/krizaka-internal)/,
  /gh\s+api\s+"?repos\/\$\{?GITHUB_REPOSITORY\}?\/issues"?\s+-[fF]/,
  /gh\s+api\s+"?repos\/\$\{\{\s*github\.repository\s*\}\}\/issues"?\s+-[fF]/,
  /POST[^\n]*`\/repos\/krizaka\/\$\{step\.repo\}\/issues`/,
  /issues\.create\(\s*\{(?![^}]*repo:\s*["']krizaka-internal["'])/,
];

test("no workflow or script opens an issue in the repository it runs in", () => {
  const bad = [];
  for (const f of files) {
    const text = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    for (const re of SELF) if (re.test(text)) bad.push(`${f}: ${re}`);
  }
  assert.deepEqual(bad, [], "open the issue in krizaka/krizaka-internal (app token, title `<repo> · <type>(<scope>): …`, repo:/lane:/type: labels)");
});

// The org-wide rule: the matrix refuses it in every active repository (krizaka-internal#2267), and its pattern really matches what the
// product repositories wrote (orazaka main-is-red, krizaka-infra DNS drift) and none of what is allowed.
test("the conformance rule no-self-issues refuses a self-issue and accepts the internal one", () => {
  const rule = loadRules().find((r) => r.id === "no-self-issues");
  assert.ok(rule, "rules.json carries no-self-issues");
  const re = new RegExp(rule.check.pattern);
  for (const bad of [
    'gh issue create -R "$GITHUB_REPOSITORY" --title "main is red" --body "$body"',
    'gh issue create --title "DNS drift"',
    'gh api "repos/${GITHUB_REPOSITORY}/issues" -f title="x"',
    "gh api repos/${{ github.repository }}/issues -f title=x",
    "uses: peter-evans/create-issue-from-file@v5",
    'await github.rest.issues.create({ owner, repo: context.repo.repo, title })',
  ]) assert.match(bad, re, bad);
  for (const good of [
    'gh issue create -R krizaka/krizaka-internal --title "x"',
    'gh api repos/krizaka/krizaka-internal/issues -f title="x"',
    "uses: krizaka/.github/actions/alert-issue@abc",
    'gh issue comment "$n" -R "$GITHUB_REPOSITORY" --body "$body"',
  ]) assert.doesNotMatch(good, re, good);
});

test("the shared composite actions do not open a self-issue either", () => {
  const bad = [];
  for (const d of readdirSync(new URL("../actions/", import.meta.url))) {
    const url = new URL(`../actions/${d}/action.yml`, import.meta.url);
    if (!existsSync(url)) continue;
    const text = readFileSync(url, "utf8");
    for (const re of SELF) if (re.test(text)) bad.push(`actions/${d}: ${re}`);
  }
  assert.deepEqual(bad, []);
});
