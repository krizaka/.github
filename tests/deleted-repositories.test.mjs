import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// 2026-11-06: the founder deleted these three repositories. krizaka-users and krizaka-platform-kit are folders of krizaka-build
// since ADR-021; krizaka-accounts comes back when a shared accounts site is needed. No live file names them as a repository.
const GONE = ["krizaka-accounts", "krizaka-users", "krizaka-platform-kit"];
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

// ADR-029 (krizaka-internal#2864): Sovkora's other 15 repositories became folders of krizaka/sovkora, the UI kit packages of
// krizaka-ui; each is deleted after the consolidation. repos.json is generated (scripts/gen-repos.mjs) and drops them once
// GitHub no longer lists them; the hand-maintained registries name none of them from the consolidation on.
const SOVKORA_GONE = [
  "sovkora-build", "sovkora-contracts", "sovkora-engine", "sovkora-edge-service", "sovkora-conversation-service",
  "sovkora-job-service", "sovkora-knowledge-service", "sovkora-automation-service", "sovkora-studio-service",
  "sovkora-worker-media", "sovkora-packs", "sovkora-web", "sovkora-mobile", "sovkora-cli", "sovkora-ui-kit",
];

test("no hand-maintained registry names a Sovkora repository folded into krizaka/sovkora", () => {
  const registries = {
    "docs/standards/ci-profiles.json": Object.keys(json("docs/standards/ci-profiles.json").repos),
    "docs/standards/surfaces.json": Object.values(json("docs/standards/surfaces.json").products).flatMap((p) => [...p.repos, ...p.surfaces.map((s) => s.repo)]),
    "profile/products.json": Object.values(json("profile/products.json").products).flatMap((p) => [p.repo, p.bom?.repo, ...(p.components ?? []).map((c) => c.repo)]),
    "profile/quality.json": json("profile/quality.json").groups.flatMap((g) => g.repos),
    "release-repos.json": json("release-repos.json").products.flatMap((p) => p.repos),
  };
  const rules = JSON.stringify(json("docs/standards/rules.json"));
  const standard = read("docs/standards/repositories.md");
  const inventory = standard.slice(standard.indexOf("## Current repository names"), standard.indexOf("## Deleted on the Sovkora consolidation"));
  for (const gone of SOVKORA_GONE) {
    for (const [file, names] of Object.entries(registries)) assert.ok(!names.includes(gone), `${file} names ${gone}`);
    assert.ok(!rules.includes(`"${gone}"`), `rules.json targets ${gone}`);
    assert.doesNotMatch(inventory, new RegExp(`\\| \`${gone}\` \\|`), `repositories.md still lists ${gone} as current`);
    assert.match(standard, new RegExp(`\\| \`${gone}\` \\| \`(sovkora|krizaka-ui)\`, `), `repositories.md says where ${gone} went`);
  }
  for (const file of [
    "profile/MEMBER_README.md",
    "scripts/audit-guards.mjs",
    "scripts/dev-preview-probe.mjs",
    "scripts/gen-release-consumers.mjs",
    "orchestration/release-consumers.json",
    ".github/workflows/feature-surfaces.yml",
  ]) {
    const text = read(file);
    for (const gone of SOVKORA_GONE) assert.doesNotMatch(text, new RegExp(`(^|[^\\w-])${gone}(?![\\w-])`), `${file} names ${gone}`);
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
  ]) {
    const text = read(file);
    for (const gone of GONE) {
      assert.doesNotMatch(text, new RegExp(`github\\.com/krizaka/${gone}(?![-\\w])`), `${file} links ${gone}`);
      if (file !== "scripts/repository-names.mjs") continue;
      assert.ok(!text.includes(`"${gone}"`), `${file} allows ${gone}`);
    }
  }
  for (const file of ["docs/standards/repositories.md", "docs/standards/ci-and-deploy.md", ".github/workflows/maven.yml"]) {
    for (const gone of GONE) assert.doesNotMatch(read(file), new RegExp(`\`${gone}\`|repositories:.*${gone}(?![-\\w])`), `${file} still lists ${gone}`);
  }
});
