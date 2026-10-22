import test from "node:test";
import assert from "node:assert/strict";
import { entriesFrom, nextTag, noDash, parseTitle, releaseNote, renderBody } from "./release-notes.mjs";

const pr = (title, body = "", n = 1) => ({ title, body, html_url: `https://github.com/krizaka/yomizaka/pull/${n}` });

test("parseTitle reads type, breaking mark and subject; a non-conventional title has no type", () => {
  assert.deepEqual(parseTitle("feat(verify): read the lease (#12)"), { type: "feat", breaking: false, subject: "read the lease" });
  assert.deepEqual(parseTitle("fix!: drop the old API"), { type: "fix", breaking: true, subject: "drop the old API" });
  assert.equal(parseTitle("Update stuff").type, "");
});

test("releaseNote reads the language's line and nothing else", () => {
  const body = "Why.\n\nRelease-note-fr: Lit votre bail.\nRelease-note-en: Reads your lease.\n";
  assert.equal(releaseNote(body, "fr"), "Lit votre bail.");
  assert.equal(releaseNote(body, "en"), "Reads your lease.");
  assert.equal(releaseNote("nothing", "fr"), undefined);
  assert.equal(releaseNote(undefined, "en"), undefined);
});

for (const [title, shown] of [
  ["feat: a", true],
  ["fix(ui): b", true],
  ["perf: c", true],
  ["refactor!: d", true],
  ["chore: e", false],
  ["ci: f", false],
  ["deps: g", false],
  ["docs: h", false],
  ["test: i", false],
  ["chore(deps): bump x", false],
  ["Plain title", false],
]) {
  test(`${title} is ${shown ? "shown" : "skipped"}`, () => assert.equal(entriesFrom([pr(title)]).length, shown ? 1 : 0));
}

test("entries use the PR's own notes, else the title text, never a dash", () => {
  const [a, b] = entriesFrom([pr("feat: read the lease (#1)", "Release-note-fr: Lit votre bail — en un clic.", 1), pr("fix: stop the crash", "", 2)]);
  assert.deepEqual(a.text, { en: "Read the lease.", fr: "Lit votre bail: en un clic." });
  assert.deepEqual(b.text, { en: "Stop the crash.", fr: "Stop the crash." });
});

test("nextTag counts the day's releases, with or without a v", () => {
  const now = new Date("2026-10-22T10:00:00Z");
  assert.equal(nextTag([], now), "2026.10.22.1");
  assert.equal(nextTag(["2026.10.22.1", "v2026.10.22.2", "2026.10.21.9", "1.2.3"], now), "2026.10.22.3");
});

test("renderBody gives both languages, counts and one bullet per change with its PR link", () => {
  const body = renderBody(entriesFrom([pr("feat: a", "", 1), pr("fix: b", "", 2), pr("feat: c", "", 3)]));
  assert.match(body, /## English\n\nNew: 2\. Fixed: 1\.\n\n- feat: A\. https:\/\/github\.com\/krizaka\/yomizaka\/pull\/1/);
  assert.match(body, /## Français\n\nNouveautés : 2\. Corrections : 1\./);
  assert.doesNotMatch(body, /—/);
});

test("noDash", () => assert.equal(noDash("a — b—c"), "a: b-c"));
