import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// 2026-11-06: the founder deleted these three repositories. krizaka-users and krizaka-platform-kit are folders of krizaka-build
// since ADR-021; krizaka-accounts comes back when a shared accounts site is needed. No live file names them as a repository.
const GONE = ["krizaka-accounts", "krizaka-users", "krizaka-platform-kit", "krizaka-notifications", "krizaka-billing"];
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const json = (path) => JSON.parse(read(path));

test("the registry, the CI profiles and the rules target none of them", () => {
  const names = json("repos.json").repositories.map((r) => r.name);
  const profiles = Object.keys(json("docs/standards/ci-profiles.json").repos ?? json("docs/standards/ci-profiles.json"));
  const rules = JSON.stringify(json("docs/standards/rules.json"));
  for (const gone of GONE) {
    assert.ok(!names.includes(gone), `repos.json lists ${gone}`);
    assert.ok(!profiles.includes(gone), `ci-profiles.json lists ${gone}`);
    assert.ok(!rules.includes(`"${gone}"`), `rules.json targets ${gone}`);
  }
});

test("the profile quality table lists none of them", () => {
  const repos = json("profile/quality.json").groups.flatMap((g) => g.repos);
  for (const gone of GONE) assert.ok(!repos.includes(gone), `profile/quality.json lists ${gone}`);
});

test("no live file links the deleted repositories", () => {
  for (const file of [
    "SUPPORT.md",
    "CONTRIBUTING.md",
    "profile/MEMBER_README.md",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/workflows/maven.yml",
    "docs/standards/repositories.md",
    "docs/standards/ci-and-deploy.md",
    "scripts/repository-names.mjs",
    "scripts/dev-preview-probe.mjs",
  ]) {
    const text = read(file);
    for (const gone of GONE) {
      assert.doesNotMatch(text, new RegExp(`github\\.com/krizaka/${gone}(?![-\\w])`), `${file} links ${gone}`);
      if (!file.startsWith("scripts/")) continue;
      assert.ok(!text.includes(`"${gone}"`), `${file} names ${gone}`);
    }
  }
  for (const file of ["docs/standards/repositories.md", "docs/standards/ci-and-deploy.md", ".github/workflows/maven.yml"]) {
    for (const gone of GONE) assert.doesNotMatch(read(file), new RegExp(`\`${gone}\`|repositories:.*${gone}(?![-\\w])`), `${file} still lists ${gone}`);
  }
});
