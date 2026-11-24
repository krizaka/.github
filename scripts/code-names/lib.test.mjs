import test from "node:test";
import assert from "node:assert/strict";
import { findHits, replace, loadList, listProblems, isHistory } from "./lib.mjs";

const list = loadList();
const to = (text, kinds) => replace(text, { kinds, list });

const FORMS = [
  ["java-package", "com.krizaka.orazaka.chat", "com.krizaka.sovkora.chat"],
  ["npm", "@krizaka/orazaka-shared", "@krizaka/sovkora-shared"],
  ["repo-url", "github.com/krizaka/orazaka/pull/1", "github.com/krizaka/sovkora/pull/1"],
  ["repo-url", "krizaka/orazaka-packs", "krizaka/sovkora-packs"],
  ["env", "ORAZAKA_USER_EMAIL=a", "SOVKORA_USER_EMAIL=a"],
  ["env", "DATABASE_PASSWORD_ORAZAKA_DB", "DATABASE_PASSWORD_SOVKORA_DB"],
  ["database", "orazaka_db", "sovkora_db"],
  ["database", "orazaka_studio_db", "sovkora_studio_db"],
  ["database", "role orazaka_app", "role sovkora_app"],
  ["amqp", "orazaka.jobs", "sovkora.jobs"],
  ["amqp", "orazaka.events", "sovkora.events"],
  ["amqp", "orazaka.dlx", "sovkora.dlx"],
  ["capability", "orazaka.core.chat.completion", "sovkora.core.chat.completion"],
  ["capability", "orazaka.validation.x", "sovkora.validation.x"],
  ["pack-schema", "orazaka.dev/v1", "sovkora.dev/v1"],
  ["host", "broker-dev.orazaka.com", "broker-dev.sovkora.com"],
  ["host", "orazaka.com", "sovkora.com"],
  ["spring-key", "orazaka.datasource.url", "sovkora.datasource.url"],
  ["table", "FROM orazaka_models", "FROM sovkora_models"],
  ["header", "X-Orazaka-Read-Id", "X-Sovkora-Read-Id"],
  ["module", "orazaka-job-service", "sovkora-job-service"],
  ["word", "Orazaka", "Sovkora"],
  ["word", "orazaka", "sovkora"],
  ["word", "ORAZAKA", "SOVKORA"],
  ["word", "the Yomizaka app", "the Verikora app"],
  ["word", "akinaza", "folioviv"],
  ["word", "Kachizaka", "Kridoc"],
  ["env", "KACHIZAKA_KEY", "KRIDOC_KEY"],
  ["module", "yomizaka-web", "verikora-web"],
  ["table", "akinaza_books", "folioviv_books"],
];

for (const [kind, from, expected] of FORMS) {
  test(`replace: ${kind} « ${from} »`, () => {
    assert.equal(to(from), expected);
    assert.equal(findHits(from, "a.txt", { list })[0].kind, kind);
    assert.deepEqual(findHits(expected, "a.txt", { list }), []);
  });
}

test("replace: only the asked kinds, the others stay untouched even where a general form would match inside", () => {
  assert.equal(to("orazaka_db and orazaka", ["word"]), "orazaka_db and sovkora");
  assert.equal(to("ORAZAKA_KEY orazaka-chat", ["module"]), "ORAZAKA_KEY sovkora-chat");
});

test("findHits: a substring in any case, with its place", () => {
  for (const text of ["ORAZAKA_KEY", "brand-orazaka", "com.krizaka.orazaka", "orazaka_db", "xorazakax"]) {
    assert.equal(findHits(text, "a.txt", { list }).length, 1, text);
  }
  const [hit] = findHits("a\n  see Orazaka here", "a.txt", { list });
  assert.deepEqual([hit.term, hit.line, hit.column, hit.match], ["orazaka", 2, 7, "Orazaka"]);
  assert.equal(findHits("nothing here", "a.txt", { list }).length, 0);
});

test("findHits: a hit with no form is still a hit, with no kind", () => {
  assert.equal(findHits("xorazakax", "a.txt", { list })[0].kind, null);
  assert.equal(to("xorazakax"), "xorazakax");
});

test("history paths are the only exceptions and report nothing", () => {
  assert.deepEqual(findHits("orazaka", "CHANGELOG.md", { list }), []);
  assert.deepEqual(findHits("orazaka", "packages/a/CHANGELOG-1.md", { list }), []);
  assert.deepEqual(findHits("orazaka", "infra/migrations/2026-01-01-x.sql", { list }), []);
  assert.deepEqual(findHits("orazaka", "standards/code-names.json", { list }), []);
  assert.deepEqual(findHits("orazaka", "scripts/code-names/lib.test.mjs", { list }), []);
  assert.equal(findHits("orazaka", "src/a.ts", { list }).length, 1);
  assert.equal(isHistory("src/CHANGELOG.md.bak", { list }), false);
});

test("a history glob scoped to a repository applies only there", () => {
  const scoped = { ...list, history: ["repo-x:docs/design/**"] };
  assert.equal(findHits("orazaka", "docs/design/a.md", { list: scoped, repo: "repo-x" }).length, 0);
  assert.equal(findHits("orazaka", "docs/design/a.md", { list: scoped, repo: "other" }).length, 1);
  assert.equal(findHits("orazaka", "docs/design/a.md", { list: scoped }).length, 1);
});

test("the list validates against its schema", () => {
  assert.deepEqual(listProblems(list), []);
  assert.deepEqual(list.terms.map((t) => [t.term, t.replacement]), [["orazaka", "sovkora"], ["yomizaka", "verikora"], ["akinaza", "folioviv"], ["kachizaka", "kridoc"]]);
});

test("the schema refuses a term without replacement, a form without kind, a bad version and a bad regex", () => {
  const clone = () => structuredClone(list);
  const noReplacement = clone();
  delete noReplacement.terms[0].replacement;
  assert.match(listProblems(noReplacement).join(), /replacement/);
  const noKind = clone();
  delete noKind.terms[1].forms[0].kind;
  assert.match(listProblems(noKind).join(), /kind/);
  const badVersion = clone();
  badVersion.version = "1";
  assert.match(listProblems(badVersion).join(), /version/);
  const badRegex = clone();
  badRegex.terms[0].forms[0].regex = "(";
  assert.match(listProblems(badRegex).join(), /regex/);
});
