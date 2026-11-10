import assert from "node:assert/strict";
import { test } from "node:test";
import { committerSourceProblems, loadIdentities, maskEmail, parseLog, sourceProblems, trailerProblems } from "../scripts/check-trailers.mjs";

const BOT = "345578919+krizaka-agents[bot]@users.noreply.github.com";
const FOUNDER = "abidoussama99@gmail.com";
const commit = (message, extra = {}) => ({ sha: "aaaaaaaaaa", author: BOT, committer: BOT, message, ...extra });

test("an invented co-author e-mail is refused, whatever the name or case, and is never echoed", () => {
  const p = trailerProblems([
    commit("fix: a\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n"),
    commit("feat: b\n\nco-authored-by: Someone <someone.invented@example.org>\n"),
    commit("feat: no e-mail at all\n\nCo-authored-by: Nobody\n"),
  ]);
  assert.equal(p.length, 3);
  assert.ok(!p.join(" ").includes("anthropic"), "the stranger's domain is not echoed");
  assert.ok(!p.join(" ").includes("invented"), "the stranger's address is not echoed");
});

test("our bots and the founder are accepted as co-authors", () => {
  const ok = [
    commit(`feat: a\n\nCo-authored-by: krizaka-agents[bot] <${BOT}>\n`),
    commit("feat: b\n\nCo-authored-by: orazaka <345578125+sovkora[bot]@users.noreply.github.com>\n"),
    commit(`feat: c\n\nCo-authored-by: Oussama <${FOUNDER}>\n`),
    commit("feat: d\n\nCo-authored-by: Oussama <7701298+oussamaABID@users.noreply.github.com>\n"),
    commit("docs: e (co-authored work is credited in the PR body)\n"),
  ];
  assert.deepEqual(trailerProblems(ok), []);
});

test("a look-alike of an allowed identity (wrong id, other address) is refused", () => {
  const bad = [
    commit("a\n\nCo-authored-by: x <345578920+krizaka-agents[bot]@users.noreply.github.com>\n"),
    commit("b\n\nCo-authored-by: x <abidoussama98@gmail.com>\n"),
  ];
  assert.equal(trailerProblems(bad).length, 2);
});

test("the author and the committer are checked against the same list", () => {
  assert.deepEqual(trailerProblems([commit("feat: x\n", { author: FOUNDER })]), []);
  const p = trailerProblems([commit("feat: x\n", { author: "made.up@example.com", committer: "other@example.com" })]);
  assert.equal(p.length, 2);
  assert.ok(!p.join(" ").includes("example"), "no stranger e-mail in the output");
  assert.equal(trailerProblems([commit("x\n", { committer: "noreply@github.com" })]).length, 0, "GitHub's own committer (web, merge queue)");
  assert.equal(trailerProblems([commit("x\n", { author: "noreply@github.com" })]).length, 1, "but never as an author");
});

test("the merge queue accepts GitHub's noreply trailer of an allowed account, refuses a stranger's", () => {
  const ok = [commit("feat: x (#1)\n\nCo-authored-by: krizaka-agents[bot] <krizaka-agents[bot]@users.noreply.github.com>\n")];
  assert.equal(trailerProblems(ok, { squash: true }).length, 0);
  assert.equal(trailerProblems(ok).length, 1, "a pull request's own commits need an exact e-mail of the list");
  const stranger = [commit("feat: y\n\nCo-authored-by: Eve <999+eve@users.noreply.github.com>\n")];
  assert.equal(trailerProblems(stranger, { squash: true }).length, 1);
  const wrongId = [commit("feat: z\n\nCo-authored-by: x <1+krizaka-agents[bot]@users.noreply.github.com>\n")];
  assert.equal(trailerProblems(wrongId, { squash: true }).length, 1, "an allowed login with another id is a stranger");
  const model = [commit("feat: y\n\nCo-authored-by: Claude <noreply@anthropic.com>\n")];
  assert.equal(trailerProblems(model, { squash: true }).length, 1);
});

test("the allow-list names exact ids, no wildcard", () => {
  const { emails } = loadIdentities();
  for (const e of emails) assert.ok(!e.includes("*"), e);
  assert.ok(emails.has(BOT));
  assert.equal(maskEmail("stranger@evil.test"), "s***@***");
});

test("git log records split on the record separator", () => {
  const raw = `s1\x00${BOT}\x00${BOT}\x00fix: a\n\nbody\n\x1e\ns2\x00${FOUNDER}\x00${BOT}\x00feat: b\n\x1e\n`;
  const c = parseLog(raw);
  assert.deepEqual(c.map((x) => x.sha), ["s1", "s2"]);
  assert.equal(c[1].author, FOUNDER);
  assert.equal(c[0].committer, BOT);
});

test("a writer of a trailer must name an allowed identity on the line", () => {
  const bad = [
    { path: "a.yml", text: 'git commit -m "x" -m "Co-Authored-By: Bot <a@b.c>"' },
    { path: "b.sh", text: 'git commit -m "x" -m "Co-Authored-By: $NAME"' },
  ];
  assert.equal(sourceProblems(bad).length, 2);
  const ok = [{ path: "c.yml", text: `git commit -m "x" -m "Co-authored-by: Oussama <${FOUNDER}>"` }];
  assert.deepEqual(sourceProblems(ok), []);
});

test("a comment or a step name may mention it, and the checker itself is skipped", () => {
  const f = [
    { path: "a.yml", text: "# no Co-authored-by here\n- name: No Co-authored-by line\n  run: x" },
    { path: "scripts/check-trailers.mjs", text: "co-authored-by" },
  ];
  assert.deepEqual(sourceProblems(f), []);
});

test("an automation that commits as a known bot with the prefix-less e-mail is refused at the source", () => {
  const bare = "krizaka-agents[bot]@users.noreply.github.com";
  const bad = [
    { path: ".github/workflows/x.yml", text: `          git config user.email "${bare}"` },
    { path: "scripts/y.mjs", text: `  git("-c", "user.email=${bare}", "commit", "-m", t);` },
    { path: ".github/workflows/z.yml", text: `          export GIT_AUTHOR_EMAIL='${bare}' GIT_COMMITTER_EMAIL='${bare}'` },
    { path: "scripts/w.mjs", text: `  git("-c", "user.email=1+krizaka-agents[bot]@users.noreply.github.com", "commit");` },
  ];
  // one per line, and two on the GIT_AUTHOR/GIT_COMMITTER line
  assert.equal(committerSourceProblems(bad).length, 5);
  assert.doesNotMatch(committerSourceProblems(bad).join(" "), /users\.noreply\.github\.com/, "the offending address is not echoed back");
});

test("the exact id+login e-mail and a non-identity line pass the source check", () => {
  const ok = [
    { path: ".github/workflows/x.yml", text: `          git config user.email "${BOT}"` },
    { path: "scripts/y.mjs", text: `  git("-c", "user.email=${BOT}", "commit");` },
    { path: ".github/workflows/x.yml", text: "          git config user.name 'krizaka-agents[bot]'" },
    { path: "scripts/check-trailers.test.mjs", text: `git config user.email "krizaka-agents[bot]@users.noreply.github.com"` },
    { path: ".github/workflows/x.yml", text: "          # git config user.email krizaka-agents[bot]@users.noreply.github.com" },
  ];
  assert.deepEqual(committerSourceProblems(ok), []);
});

test("an automation that commits as an unknown bot is refused at the source", () => {
  const bad = [
    { path: ".github/workflows/release.yml", text: `          git config user.email "krizaka-release[bot]@users.noreply.github.com"` },
    { path: ".github/workflows/docs-sync.yml", text: `          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"` },
  ];
  assert.equal(committerSourceProblems(bad).length, 2);
  assert.doesNotMatch(committerSourceProblems(bad).join(" "), /users\.noreply\.github\.com/, "the offending address is not echoed back");
});

test("a renamed app: its new login passes, its old login (kept in `retired` for history) fails a new commit", () => {
  const ok = { sha: "a", author: "345578125+sovkora[bot]@users.noreply.github.com", committer: "noreply@github.com", message: "x\n\nCo-authored-by: sovkora-for-mac[bot] <350524889+sovkora-for-mac[bot]@users.noreply.github.com>" };
  const old = { sha: "b", author: "345578125+orazaka[bot]@users.noreply.github.com", committer: "noreply@github.com", message: "x" };
  assert.deepEqual(trailerProblems([ok]), []);
  assert.ok(trailerProblems([old]).length > 0);
});

// Founder, 2026-11-10 (krizaka-internal#3145): « on autorise Dependabot bien sûr ». GitHub's own Dependabot app, by its exact id.
test("Dependabot's commits pass, by its exact id; a look-alike does not", () => {
  const DEPENDABOT = "49699333+dependabot[bot]@users.noreply.github.com";
  assert.deepEqual(trailerProblems([commit("chore(deps): bump x\n", { author: DEPENDABOT, committer: "noreply@github.com" })]), []);
  assert.equal(trailerProblems([commit("chore(deps): bump x\n", { author: "49699334+dependabot[bot]@users.noreply.github.com" })]).length, 1);
});
