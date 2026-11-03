// A red scheduled guard opens an issue; green closes it (krizaka-internal#883). And the matrix page names its run.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { alertByKey, bodyOf, findByKey, labelsOf, main, markerOf, plan, planKey, titleFor, titleOf, withMarker } from "../scripts/red-run-issue.mjs";
import { BRANCH, pageOf } from "../scripts/conformance-publish.mjs";

test("red opens the guard's issue, or comments when it is already open", () => {
  assert.deepEqual(plan({ state: "red", open: undefined }), { action: "open" });
  assert.deepEqual(plan({ state: "red", open: { number: 12 } }), { action: "comment", number: 12 });
});

test("green closes the open issue, and does nothing otherwise", () => {
  assert.deepEqual(plan({ state: "green", open: { number: 12 } }), { action: "close", number: 12 });
  assert.deepEqual(plan({ state: "green", open: undefined }), { action: "none" });
});

test("the issue follows the title standard and carries the run and the end of the log", () => {
  assert.match(titleOf("audit-guards"), /^\.github · fix\(guards\): /);
  const body = bodyOf({ guard: "audit-guards", runUrl: "https://x/run/1", log: "a\n- krizaka-build: CI gate is not a required check of main\n" });
  assert.match(body, /https:\/\/x\/run\/1/);
  assert.match(body, /CI gate is not a required check/);
});

test("the matrix page says when and by which run; it is published on its data branch", () => {
  assert.equal(BRANCH, "conformance-matrix");
  const page = pageOf({ generatedAt: "2026-11-01T06:00:00Z", runUrl: "https://x/run/2", matrix: "| rule | green | red |\n" });
  assert.match(page, /Generated 2026-11-01T06:00:00Z by https:\/\/x\/run\/2/);
  assert.match(page, /\| rule \| green \| red \|/);
});

test("the scheduled guards are wired: audit-guards opens its issue, the matrix runs daily and publishes", () => {
  const audit = readFileSync(new URL("../.github/workflows/audit-guards.yml", import.meta.url), "utf8");
  assert.match(audit, /red-run-issue\.mjs --guard audit-guards/);
  assert.match(audit, /permission-issues: write/);
  const conf = readFileSync(new URL("../.github/workflows/conformance.yml", import.meta.url), "utf8");
  assert.match(conf, /cron: "0 6 \* \* \*"/);
  assert.match(conf, /conformance-publish\.mjs/);
});

test("any alert can name its own title, labels and body (the product repositories open theirs in krizaka-internal)", () => {
  assert.equal(titleFor({ title: "orazaka · fix(ci): main is red" }), "orazaka · fix(ci): main is red");
  assert.equal(titleFor({ guard: "audit-guards" }), titleOf("audit-guards"));
  assert.deepEqual(labelsOf("repo:orazaka, type:fix,"), ["repo:orazaka", "type:fix"]);
  assert.deepEqual(labelsOf(), []);
});

test("actions/alert-issue files the alert in krizaka-internal with the app token, never the job's GITHUB_TOKEN", () => {
  const action = readFileSync(new URL("../actions/alert-issue/action.yml", import.meta.url), "utf8");
  assert.match(action, /create-github-app-token@[0-9a-f]{40}/);
  assert.match(action, /repositories: krizaka-internal/);
  assert.match(action, /permission-issues: write/);
  assert.match(action, /red-run-issue\.mjs/);
  assert.doesNotMatch(action, /github\.token|secrets\.GITHUB_TOKEN/);
});

// ---- alert key (ADR-001 §A.4, krizaka-internal#2282): one issue per key, whatever its title does. Same contract as krizaka-agents tools/alerts.py.
const REPO = "krizaka/krizaka-internal";
const KEY = "main-red/orazaka";

/** A fake GitHub for krizaka-internal issues: list by label/state (newest first), search by title, create, comment, patch, labels. */
function fakeGitHub(seed = []) {
  const issues = seed.map((i) => ({ labels: [], comments: [], body: "", ...i }));
  const calls = [];
  const api = async (path, init = {}) => {
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body) : {};
    const [route, query = ""] = path.split("?");
    const q = new URLSearchParams(query);
    const view = (i) => ({ ...i, labels: i.labels.map((name) => ({ name })) });
    if (route === "/search/issues") {
      const title = decodeURIComponent(q.get("q")).match(/in:title "(.*)"/)[1];
      return { items: issues.filter((i) => i.state === "open" && i.title.includes(title)).map(view) };
    }
    const m = route.match(/^\/repos\/krizaka\/krizaka-internal\/issues(?:\/(\d+))?(?:\/(comments|labels))?$/);
    assert.ok(m, `unexpected ${method} ${path}`);
    calls.push(`${method} ${path}`);
    const issue = m[1] && issues.find((i) => i.number === Number(m[1]));
    if (!m[1] && method === "GET")
      return [...issues].sort((a, b) => b.number - a.number).filter((i) => (q.get("state") === "all" || i.state === q.get("state")) && (!q.get("labels") || i.labels.includes(q.get("labels")))).map(view);
    if (!m[1]) { const n = Math.max(0, ...issues.map((i) => i.number)) + 1; issues.push({ number: n, state: "open", comments: [], ...body }); return { number: n }; }
    if (m[2] === "comments") issue.comments.push(body.body);
    else if (m[2] === "labels") issue.labels.push(...body.labels);
    else Object.assign(issue, body);
    return {};
  };
  return { api, issues, calls };
}

const red = (gh, extra = {}) => alertByKey({ api: gh.api, repo: REPO, key: KEY, state: "red", title: "orazaka · fix(ci): main is red", body: "Run 1", labels: ["repo:orazaka"], runUrl: "https://x/run/1", ...extra });
const green = (gh) => alertByKey({ api: gh.api, repo: REPO, key: KEY, state: "green", title: "orazaka · fix(ci): main is red", body: "", labels: [], runUrl: "https://x/run/9" });

test("the key is stored in the body as a marker, and a bad key is refused", () => {
  assert.equal(markerOf("seo-family/dev.orazaka.com"), "<!-- alert-key: seo-family/dev.orazaka.com -->");
  for (const bad of ["", "a", "has space", "x-->y", "-lead", "a".repeat(121)]) assert.throws(() => markerOf(bad), /--alert-key/);
  assert.equal(withMarker("Run 1\n", KEY), `Run 1\n\n<!-- alert-key: ${KEY} -->\n`);
});

test("the plan by key: red opens, comments or reopens; green closes only an open issue", () => {
  assert.deepEqual(planKey({ state: "red", issue: undefined }), { action: "open" });
  assert.deepEqual(planKey({ state: "red", issue: { number: 3, state: "open" } }), { action: "comment", number: 3 });
  assert.deepEqual(planKey({ state: "red", issue: { number: 3, state: "closed" } }), { action: "reopen", number: 3 });
  assert.deepEqual(planKey({ state: "green", issue: { number: 3, state: "open" } }), { action: "close", number: 3 });
  assert.deepEqual(planKey({ state: "green", issue: { number: 3, state: "closed" } }), { action: "none" });
  assert.deepEqual(planKey({ state: "green", issue: undefined }), { action: "none" });
});

test("findByKey reads the most recent issue of the key and never a pull request", () => {
  const issues = [{ number: 9, body: `x\n<!-- alert-key: other/key -->` }, { number: 8, pull_request: {}, body: withMarker("", KEY) }, { number: 7, body: withMarker("old", KEY) }];
  assert.equal(findByKey(issues, KEY).number, 7);
  assert.equal(findByKey(issues, "main-red/yomizaka"), undefined);
});

test("first red run opens one issue with the marker and the alert label; the second comments it", async () => {
  const gh = fakeGitHub();
  assert.deepEqual(await red(gh), { action: "open" });
  assert.equal(gh.issues.length, 1);
  assert.match(gh.issues[0].body, new RegExp(`<!-- alert-key: ${KEY} -->`));
  assert.deepEqual(gh.issues[0].labels, ["repo:orazaka", "alert"]);
  await red(gh, { body: "Run 2: still red", title: "orazaka · fix(ci): the title moved" });  // the title moved: the key still finds it
  assert.equal(gh.issues.length, 1);
  assert.deepEqual(gh.issues[0].comments, ["Run 2: still red"]);
});

test("a closed alert is reopened with the new run", async () => {
  const gh = fakeGitHub();
  await red(gh);
  gh.issues[0].state = "closed";
  assert.equal((await red(gh, { body: "Run 3: red again" })).action, "reopen");
  assert.deepEqual([gh.issues.length, gh.issues[0].state, gh.issues[0].comments], [1, "open", ["Run 3: red again"]]);
});

test("green closes the open issue with the green run as proof, and a second green does nothing", async () => {
  const gh = fakeGitHub();
  await red(gh);
  assert.equal((await green(gh)).action, "close");
  assert.equal(gh.issues[0].state, "closed");
  assert.match(gh.issues[0].comments.at(-1), /Proof: https:\/\/x\/run\/9/);
  const before = gh.calls.length;
  assert.equal((await green(gh)).action, "none");
  assert.equal(gh.calls.length, before + 1);  // only the read of the alerts
});

test("an open issue of the same title without a key adopts it (the alerts filed before the key); another key's issue is never taken", async () => {
  const gh = fakeGitHub([{ number: 1, state: "open", title: "orazaka · fix(ci): main is red", body: "old alert" }]);
  assert.equal((await red(gh, { body: "Run 2" })).action, "comment");
  assert.equal(gh.issues.length, 1);
  assert.match(gh.issues[0].body, new RegExp(`<!-- alert-key: ${KEY} -->`));
  assert.deepEqual(gh.issues[0].labels, ["alert"]);
  assert.deepEqual(gh.issues[0].comments, ["Run 2"]);
  await red(gh, { body: "Run 3" });  // now found by its key
  assert.equal(gh.issues[0].comments.length, 2);
  const other = fakeGitHub([{ number: 1, state: "open", title: "orazaka · fix(ci): main is red", body: withMarker("x", "main-red/other"), labels: ["alert"] }]);
  assert.equal((await red(other)).action, "open");
  assert.equal(other.issues.length, 2);
});

test("main --alert-key goes through the key path; a dry run writes nothing", async () => {
  const gh = fakeGitHub();
  const argv = ["--title", "orazaka · fix(ci): main is red", "--state", "red", "--run-url", "https://x/run/1", "--alert-key", KEY, "--labels", "repo:orazaka"];
  assert.equal(await main([...argv, "--dry-run"], gh.api), 0);
  assert.equal(gh.issues.length, 0);
  assert.equal(await main(argv, gh.api), 0);
  assert.equal(gh.issues.length, 1);
});

test("actions/alert-issue passes the alert key to the script", () => {
  const action = readFileSync(new URL("../actions/alert-issue/action.yml", import.meta.url), "utf8");
  assert.match(action, /alert-key:/);
  assert.match(action, /ALERT_KEY: \$\{\{ inputs\.alert-key \}\}/);
  assert.match(action, /--alert-key/);
});
