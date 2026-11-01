import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { END, START, renderQuality, replaceBlock, verifyRepos } from "../scripts/profile-quality.mjs";

const config = JSON.parse(readFileSync(new URL("../profile/quality.json", import.meta.url), "utf8"));
const readme = readFileSync(new URL("../profile/README.md", import.meta.url), "utf8");

test("every row carries the six badges, duplicated lines included", () => {
  const rows = renderQuality(config).split("\n").slice(2);
  assert.equal(rows.length, config.groups.flatMap((g) => g.repos).length);
  for (const row of rows) {
    assert.equal((row.match(/project_badges\/measure/g) ?? []).length, 6);
    assert.match(row, /metric=duplicated_lines_density/);
  }
});

test("krizaka-platform-kit is gone (it lives in krizaka-build, ADR-021)", () => {
  assert.doesNotMatch(renderQuality(config), /platform-kit/);
});

test("the README table is the generated one", () => {
  assert.equal(replaceBlock(readme, renderQuality(config)), readme);
});

test("replaceBlock refuses a README without markers", () => {
  assert.throws(() => replaceBlock("nothing", "x"), /markers/);
  assert.ok(readme.includes(START) && readme.includes(END));
});

test("verifyRepos reports a missing, an archived and a Sonar-less repository", async () => {
  const small = { organization: "o", sonarOrganization: "o", groups: [{ label: "G", repos: ["ok", "gone", "old", "nosonar"] }] };
  const fetchJson = async (url) => {
    if (url.includes("sonarcloud")) return { components: [{ key: "o_ok" }, { key: "o_gone" }, { key: "o_old" }] };
    if (url.endsWith("/gone")) return null;
    return { archived: url.endsWith("/old") };
  };
  assert.deepEqual(await verifyRepos(small, fetchJson), ["gone: no such repository", "old: repository is archived", "nosonar: no Sonar project o_nosonar"]);
});
