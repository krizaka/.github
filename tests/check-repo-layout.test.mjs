import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkLayout, detectKind, generatedReason, globToRegExp, misplacedReason } from "../scripts/check-repo-layout.mjs";

const rules = (files, config) => checkLayout(files, config).violations.map((v) => `${v.rule}:${v.path}`);

const NEXT = ["README.md", "LICENSE", "AGENTS.md", "package.json", "next.config.ts", "tsconfig.json", ".gitignore", "app/page.tsx", "lib/a.ts", "docs/x.md", "scripts/a.mjs", "tests/a.test.mjs", "public/favicon.svg"];

test("a clean Next.js app passes", () => {
  assert.deepEqual(checkLayout(NEXT), { kind: "next-app", violations: [] });
});

test("the kind is read from what the root holds", () => {
  assert.equal(detectKind(["pom.xml", "src/a"]), "maven");
  assert.equal(detectKind(["orazaka.workspace.json", "pom.xml"]), "workspace");
  assert.equal(detectKind(["pnpm-workspace.yaml", "package.json", "packages/a/package.json"]), "ts-monorepo");
  assert.equal(detectKind(["pyproject.toml"]), "python");
  assert.equal(detectKind(["stacks/a/main.tf"]), "iac");
  assert.equal(detectKind(["eas.json", "package.json"]), "expo");
  assert.equal(detectKind(["pack.schema.json", "package.json"]), "packs");
  assert.equal(detectKind(["package.json", "src/a.ts"]), "node-cli");
});

test("an unexpected root file and folder fail", () => {
  assert.deepEqual(rules([...NEXT, "random.yml", "stuff/a.txt"]), ["root-entry:random.yml", "root-entry:stuff/"]);
});

test("a root file that belongs in a folder says which", () => {
  const out = checkLayout([...NEXT, "NOTES.md", "test_a.py", ".shot2.mjs", "logo.png", "seed.sql", "a.spec.ts"]).violations;
  assert.deepEqual(out.map((v) => v.rule), Array(6).fill("root-file"));
  assert.match(out.find((v) => v.path === "NOTES.md").message, /docs\//);
  assert.match(out.find((v) => v.path === "test_a.py").message, /tests\//);
  assert.match(out.find((v) => v.path === ".shot2.mjs").message, /scripts\//);
  assert.match(out.find((v) => v.path === "logo.png").message, /Bunny/);
});

test("odd environment template names are renamed to the standard one", () => {
  const out = checkLayout([...NEXT, "exemple.env.txt", "env.sample"]).violations;
  assert.equal(out.length, 2);
  for (const v of out) assert.match(v.message, /example/);
  assert.deepEqual(rules([...NEXT, ".env.example"]), []);
});

test("tracked generated or local paths fail, anywhere they are", () => {
  const bad = ["target/a.class", "var/db/x", "data/a.json", "node_modules/a/b.js", "packages/a/dist/index.js", "svc/target/x.jar", ".env", ".env.local", "apps/web/.env.production", "docs/screenshots/a.png", ".github/pr-assets/a.png", "a/__pycache__/b.pyc", "x.log", ".venv/bin/python"];
  for (const f of bad) assert.ok(generatedReason(f), f);
  const found = checkLayout([...NEXT, ...bad]).violations.filter((v) => v.rule === "generated").map((v) => v.path);
  assert.deepEqual(found.sort(), [...bad].sort());
});

test("legitimate look-alikes are not generated", () => {
  for (const f of ["app/data/architecture.json", ".env.example", "apps/web/.env.example", "lib/target.ts", ".github/actions/build/action.yml", "docs/data/a.md", "src/main/resources/data/x.json", ".terraform.lock.hcl"]) {
    assert.equal(generatedReason(f), null, f);
  }
});

test("an allowTracked entry with a why lets a fixture through; one without a why fails", () => {
  const files = [...NEXT, "tests/fixtures/dist/a.js"];
  const ok = { allowTracked: [{ path: "tests/fixtures/dist/**", why: "a fixture that models a build output" }] };
  assert.deepEqual(rules(files, ok), []);
  const bare = { allowTracked: [{ path: "tests/fixtures/dist/**", why: "" }] };
  assert.ok(rules(files, bare).includes("config:.repo-layout.json"));
});

test("an allow entry declares a root extra, and goes stale when its target goes", () => {
  const cfg = { allow: [{ path: "payments", why: "the payment catalogue read by the shop at runtime" }] };
  assert.deepEqual(rules([...NEXT, "payments/c.json"], cfg), []);
  assert.deepEqual(rules(NEXT, cfg), ["config:.repo-layout.json"]);
  assert.deepEqual(rules([...NEXT, "x-1.yml", "x-2.yml"], { allow: [{ path: "x-*.yml", why: "numbered fixtures of the thing" }] }), []);
});

test("the licence: LICENSE next to LICENSE.md fails; FSL + Apache and a single LICENSE pass", () => {
  assert.deepEqual(rules([...NEXT, "LICENSE.md"]), ["licence:LICENSE.md"]);
  const fsl = NEXT.filter((f) => f !== "LICENSE").concat(["LICENSE.md", "LICENSE-APACHE", "NOTICE"]);
  assert.deepEqual(rules(fsl), []);
});

test("Maven modules and packs are recognised by their marker, not listed", () => {
  const mvn = ["pom.xml", "mvnw", "README.md", "mod-a/pom.xml", "mod-a/src/A.java", "src/main/A.java", ".mvn/x"];
  assert.deepEqual(rules(mvn), []);
  assert.deepEqual(rules([...mvn, "loose/readme.txt"]), ["root-entry:loose/"]);
  const packs = ["package.json", "pack.schema.json", "README.md", "wellbeing/pack.yaml", "echo/pack.yaml", "worker-common/x.py"];
  assert.deepEqual(rules(packs), ["root-entry:worker-common/"]);
});

test("an unknown kind is refused", () => {
  assert.deepEqual(rules(NEXT, { kind: "wat" }), ["config:.repo-layout.json"]);
});

test("globs", () => {
  assert.ok(globToRegExp("a/**").test("a/b/c"));
  assert.ok(globToRegExp("*.md").test("A.md"));
  assert.ok(!globToRegExp("*.md").test("d/A.md"));
  assert.equal(misplacedReason("Dockerfile.cuda"), null);
});

test("the command line: exit 0 on a clean repository, 1 with the problems listed", () => {
  const run = (dir) => {
    try {
      return { code: 0, out: execFileSync("node", ["scripts/check-repo-layout.mjs", "--root", dir, "--json"], { encoding: "utf8" }) };
    } catch (e) {
      return { code: e.status, out: e.stdout };
    }
  };
  const dir = mkdtempSync(join(tmpdir(), "layout-"));
  for (const f of NEXT) {
    mkdirSync(join(dir, f, ".."), { recursive: true });
    writeFileSync(join(dir, f), "");
  }
  const git = (...a) => execFileSync("git", ["-C", dir, ...a], { stdio: "ignore" });
  git("init", "-q");
  git("add", "-A");
  assert.equal(run(dir).code, 0);
  writeFileSync(join(dir, "NOTES.md"), "");
  git("add", "-A");
  const bad = run(dir);
  assert.equal(bad.code, 1);
  assert.equal(JSON.parse(bad.out).violations[0].path, "NOTES.md");
});

test("the accessibility baseline and the pre-commit config are allowed at the root", () => {
  assert.deepEqual(rules([...NEXT, "a11y-baseline.json", ".pre-commit-config.yaml"]), []);
});
