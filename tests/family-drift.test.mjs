import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import {
  checkFooter, checkHome, checkProfile, checkRegistry, checkSiteLive, fetchLive, issueFor, norm, readFooter, readHome, readProfile, report, runGuard, upsertIssues,
} from "../scripts/family-drift.mjs";

const fx = (name) => readFileSync(new URL(`./fixtures/family-drift/${name}`, import.meta.url), "utf8");
const org = JSON.parse(fx("org.json"));
const rules = (drifts) => drifts.map((d) => d.rule).sort();

test("html reader: the LAST footer, its links, its text", () => {
  const html = `<footer>one <a href="/a">A</a></footer><main/><footer class="x"><a href="https://b.example/">B</a> <a href="/c"><svg/></a> Fait à Montréal</footer>`;
  const f = readFooter(html);
  assert.deepEqual(f.links.map((l) => l.href), ["https://b.example/", "/c"]);
  assert.match(f.text, /Fait à Montréal/);
  assert.equal(readFooter(fx("no-footer.html")), null);
});

test("html reader: the accessible name of an icon link is its label", () => {
  const f = readFooter(`<footer><a href="https://x.example" aria-label="Instagram"><svg/></a></footer>`);
  assert.equal(f.links[0].text, "Instagram");
});

test("a conforming footer has no drift", () => {
  const drifts = checkFooter({ id: "ui", expected: org.footers.ui, read: readFooter(fx("footer-ui-conform.html")) });
  assert.deepEqual(drifts, []);
});

test("the « before » footer of www: two socials, a dead Agents link, no line, no legal", () => {
  const drifts = checkFooter({
    id: "krizaka", expected: org.footers.krizaka, read: readFooter(fx("footer-www-before.html")),
    familyHosts: ["agents.krizaka.com", "krizaka.github.io"],
  });
  assert.deepEqual(rules(drifts).filter((r, i, a) => a.indexOf(r) === i), ["footer-line", "footer-social", "footer-unexpected-link", "footer-legal"].sort());
  const social = drifts.filter((d) => d.rule === "footer-social");
  assert.equal(social.length, 1, "one drift per rule and per site");
  assert.match(social[0].detail, /YouTube.*LinkedIn/);
  assert.match(drifts.find((d) => d.rule === "footer-unexpected-link").detail, /krizaka-agents/);
});

test("a page without a footer is one drift", () => {
  assert.deepEqual(rules(checkFooter({ id: "ui", expected: org.footers.ui, read: null })), ["footer-absent"]);
});

test("a developer footer without its source, licence or release notes drifts", () => {
  const html = readFileSync(new URL("./fixtures/family-drift/footer-ui-conform.html", import.meta.url), "utf8")
    .replace(/<ul><li><a href="[^"]*">Source<\/a><\/li>.*?<\/ul>/s, "");
  const drifts = checkFooter({ id: "ui", expected: org.footers.ui, read: readFooter(html) });
  assert.deepEqual(rules(drifts), ["footer-licence", "footer-release-notes", "footer-source", "footer-version"]);
});

test("home reader: h1, data-slot and primary buttons", () => {
  const h = readHome(`<h1>A <b>promise</b></h1><section data-slot="hero"></section><section data-slot="proof"></section><a data-primary="true">Go</a>`);
  assert.deepEqual(h, { h1: "A promise", slots: ["hero", "proof"], primary: 1 });
});

test("home: the h1 must be words.line, the slots of the kind present, exactly one primary", () => {
  const kinds = { docs: { required: ["hero", "proof"], optional: ["what"] } };
  const line = { fr: "Le FR.", en: "The EN." };
  const ok = checkHome({ id: "ui", kind: "docs", kinds, line, home: { h1: "The EN.", slots: ["hero", "proof"], primary: 1 } });
  assert.deepEqual(ok, []);
  const bad = checkHome({ id: "ui", kind: "docs", kinds, line, home: { h1: "Something else", slots: ["hero"], primary: 2 } });
  assert.deepEqual(rules(bad), ["home-primary", "home-promise", "home-slot"]);
});

test("profile reader: links and text of the README", () => {
  const p = readProfile(fx("profile.md"));
  assert.ok(p.links.some((l) => l.href === "https://www.sovkora.com"));
  assert.ok(p.links.some((l) => l.href === "https://agents.krizaka.com"));
});

test("profile: a link to a member that is not public and live, and a promise that differs from words.line, are drifts", () => {
  const drifts = checkProfile({
    read: readProfile(fx("profile.md")), members: org.members, familyHosts: ["agents.krizaka.com"], publicHosts: new Set(["www.krizaka.com", "www.sovkora.com"]),
  });
  assert.deepEqual(rules(drifts), ["profile-promise", "profile-unexpected-link"]);
  assert.match(drifts.find((d) => d.rule === "profile-promise").subject, /sovkora/i);
});

test("siteLive both ways: true and silent, false and answering", () => {
  const m = (siteLive) => ({ id: "x", urls: { site: "https://x.example", siteLive } });
  assert.deepEqual(checkSiteLive(m(true), { status: 200 }), []);
  assert.deepEqual(rules(checkSiteLive(m(true), { status: 0 })), ["site-silent"]);
  assert.deepEqual(rules(checkSiteLive(m(true), { status: 404 })), ["site-silent"]);
  assert.deepEqual(checkSiteLive(m(false), { status: 0 }), []);
  assert.deepEqual(rules(checkSiteLive(m(false), { status: 200 })), ["site-answering"]);
});

test("registry: a site or a repository without a registry line is a drift, and a line without a member", () => {
  const registry = { sites: [{ id: "krizaka", kind: "company", repo: "krizaka-com" }, { id: "ghost", kind: "docs", repo: "krizaka-ghost" }] };
  const repos = [
    { name: "krizaka-com", kind: "site", archived: false },
    { name: "krizaka-blog", kind: "site", archived: false },
    { name: "krizaka-old", kind: "site", archived: true },
    { name: "krizaka-ts", kind: "npm", archived: false },
  ];
  const drifts = checkRegistry({ registry, members: org.members.filter((m) => ["krizaka", "ui"].includes(m.id)), repos });
  assert.deepEqual(
    drifts.map((d) => `${d.rule}:${d.subject}`).sort(),
    ["registry-member-unknown:ghost", "registry-repo-missing:krizaka-blog", "registry-repo-unknown:krizaka-ghost", "registry-site-missing:ui"],
  );
});

test("an issue per drift: a stable title and a body", () => {
  const d = { rule: "link-dead", subject: "www:https://x.example/a", detail: "answers 404" };
  const i = issueFor(d);
  assert.equal(i.title, ".github · fix(family): link-dead: www:https://x.example/a");
  assert.match(i.body, /answers 404/);
  assert.equal(issueFor(d).title, i.title);
});

test("runGuard: reports every drift, a dead family link included, agents left out while not public", async () => {
  const registry = { profile: "https://p.example/README.md", unprobed: ["https://p.example/private/"], kinds: { docs: { required: ["hero"], optional: [] }, company: { required: [], optional: [] } },
    sites: [{ id: "krizaka", kind: "company", repo: "krizaka-com" }, { id: "ui", kind: "docs", repo: "krizaka-ui" }, { id: "agents", kind: "agents", repo: "krizaka-agents-site", public: false, host: "agents.krizaka.com" }] };
  const pages = {
    "https://www.krizaka.com": { status: 200, body: fx("footer-www-before.html") },
    "https://ui.krizaka.com": { status: 200, body: fx("footer-ui-conform.html") },
    "https://p.example/README.md": { status: 200, body: fx("profile.md") + "\n[Roadmap](https://p.example/private/board)\n" },
  };
  const probed = [];
  const fetchPage = async (url) => { probed.push(url); return pages[url.replace(/\/$/, "")] ?? { status: url.includes("sovkora") ? 404 : 200, body: "" }; };
  const footerFor = (id) => org.footers[id];
  const repos = [{ name: "krizaka-com", kind: "site" }, { name: "krizaka-ui", kind: "npm" }];
  const { drifts } = await runGuard({ registry, org: { members: org.members.filter((m) => ["krizaka", "ui", "sovkora"].includes(m.id)), footer: {} }, footerFor, repos, fetchPage });
  const r = rules(drifts);
  assert.ok(r.includes("link-dead"), r.join());
  assert.ok(r.includes("footer-social"));
  assert.ok(r.includes("registry-site-missing"));
  assert.ok(!probed.some((u) => u.includes("/private/")), "a link behind a login is never probed");
  assert.ok(!drifts.some((d) => d.subject.startsWith("agents")), "agents is not checked while it is not public");
});

test("html reader: a `>` inside a quoted class, scripts and styles, unquoted and single-quoted attributes", () => {
  const f = readFooter(`<footer><script>var a = "<a href='/no'>";</script><a class="[&>svg]:x" href=/yes data-x>Yes</a><a href='/two' aria-label='Two'><b>2</b></a><style>a{}</style></footer>`);
  assert.deepEqual(f.links, [{ href: "/yes", text: "Yes" }, { href: "/two", text: "Two" }]);
  assert.equal(f.text, "Yes 2");
  assert.equal(readFooter("<footer><a href='/x'>unclosed").links[0].href, "/x");
});

test("profile reader: images are not links, a badge that is a link keeps its target and the bold names are read", () => {
  const p = readProfile("**Sovkora** ![img](https://i.example/a.png) [![badge](https://b.example/x.svg)](https://dev.sovkora.com) [Site](https://www.sovkora.com \"title\")");
  assert.deepEqual(p.links.map((l) => l.href), ["https://dev.sovkora.com", "https://www.sovkora.com"]);
  assert.ok(p.bold.has("sovkora"));
});

test("norm drops the slash and the fragment, and leaves a relative link alone", () => {
  assert.equal(norm("https://WWW.krizaka.com/en/#top"), "https://www.krizaka.com/en");
  assert.equal(norm("/en/privacy"), "/en/privacy");
});

test("the report says « no drift » or lists each drift", () => {
  assert.match(report([]), /No drift/);
  assert.match(report([{ rule: "a", subject: "b", detail: "c | d" }]), /1 drift\(s\)[\s\S]*`a`.*c \\\| d/);
});

test("upsertIssues opens an issue, comments on the open one, and counts what the cap leaves", () => {
  const calls = [];
  const gh = (args, input) => {
    calls.push([args[1], input]);
    return args[1] === "list" ? JSON.stringify(args[7].includes("seen") ? [{ number: 7, title: ".github · fix(family): r: seen" }] : []) : "";
  };
  const left = upsertIssues([{ rule: "r", subject: "seen", detail: "d" }, { rule: "r", subject: "new", detail: "d" }], gh);
  assert.equal(left, 0);
  assert.deepEqual(calls.map((c) => c[0]), ["list", "comment", "list", "create"]);
  const many = Array.from({ length: 83 }, (_, n) => ({ rule: "r", subject: String(n), detail: "d" }));
  assert.equal(upsertIssues(many, () => "[]"), 3);
});

test("fetchLive: the status and the body, status 0 when nothing answers", async () => {
  const server = createServer((req, res) => res.writeHead(req.url === "/gone" ? 404 : 200).end("hello"));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.deepEqual(await fetchLive(`${base}/`), { status: 200, body: "hello" });
    assert.equal((await fetchLive(`${base}/gone`)).status, 404);
  } finally {
    server.close();
  }
  assert.deepEqual(await fetchLive("http://127.0.0.1:1/"), { status: 0, body: "" });
});

test("runGuard: a site that is silent while siteLive is true, a profile that does not answer", async () => {
  const registry = { profile: "https://p.example/README.md", kinds: {}, sites: [{ id: "ui", kind: "docs", repo: "krizaka-ui" }] };
  const { drifts } = await runGuard({
    registry, org: { members: org.members.filter((m) => m.id === "ui") }, footerFor: () => { throw new Error("no selection"); },
    repos: [{ name: "krizaka-ui", kind: "npm" }], fetchPage: async (url) => (url.includes("p.example") ? { status: 500, body: "" } : { status: 200, body: "<h1>x</h1>" }),
  });
  assert.deepEqual(rules(drifts), ["footer-selection-missing", "home-primary", "home-promise", "profile-unreadable"]);
  const silent = await runGuard({ registry, org: { members: org.members.filter((m) => m.id === "ui") }, footerFor: () => org.footers.ui, repos: [{ name: "krizaka-ui", kind: "npm" }], fetchPage: async () => ({ status: 0, body: "" }) });
  assert.ok(rules(silent.drifts).includes("site-silent"));
});
