// The `registry` input of maven.yml (ADR-019): the shell step that parses it is run here for each value.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/maven.yml", import.meta.url), "utf8");
const step = workflow.split("# registry-parse:begin\n")[1].split("          # registry-parse:end")[0];

function parse(registry) {
  const out = join(mkdtempSync(join(tmpdir(), "reg-")), "output");
  const run = spawnSync("bash", ["-c", step], { env: { ...process.env, REGISTRY: registry, GITHUB_OUTPUT: out }, encoding: "utf8" });
  const text = run.status === 0 ? readFileSync(out, "utf8") : "";
  return { status: run.status, stdout: run.stdout, outputs: Object.fromEntries(text.split("\n").filter(Boolean).map((l) => l.split("="))) };
}

test("github, central, and both at once", () => {
  assert.deepEqual(parse("github").outputs, { github: "true", central: "false" });
  assert.deepEqual(parse("central").outputs, { github: "false", central: "true" });
  assert.deepEqual(parse("github,central").outputs, { github: "true", central: "true" });
  assert.deepEqual(parse("central github").outputs, { github: "true", central: "true" });
});

test("an empty or unknown registry fails, never publishes nowhere", () => {
  assert.equal(parse("").status, 1);
  const bad = parse("github,nexus");
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /unknown registry: nexus/);
});

test("one release job per registry; GitHub writes packages with the workflow token only, permissions come from the caller", () => {
  const github = workflow.split("  release-github:")[1].split("  release-central:")[0];
  assert.doesNotMatch(github, /^    permissions:/m, "inherits the caller's grant, so callers on central keep working");
  assert.doesNotMatch(github, /secrets\.MAVEN_/);
  assert.match(workflow.split("  release-central:")[1], /environment: maven-central/);
});

// "Already published?" (a tag push and a workflow_dispatch reach the deploy job for the same tag): the step is run here
// with a fake mvnw and a fake curl standing for the registry.
const publishedStep = workflow
  .split("      - name: Already published?\n")[1]
  .split("        run: |\n")[1]
  .split("\n\n")[0]
  .replace(/^ {10}/gm, "");

function checkPublished({ http, remoteSum }) {
  const dir = mkdtempSync(join(tmpdir(), "pub-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(join(dir, "pom.xml"), "<project/>\n");
  writeFileSync(join(dir, "mvnw"), '#!/bin/sh\ncase "$*" in *groupId*) echo com.krizaka;; *) echo krizaka-platform-kit;; esac\n', { mode: 0o755 });
  writeFileSync(join(bin, "curl"), `#!/bin/sh\nwhile [ $# -gt 0 ]; do [ "$1" = -o ] && out="$2"; shift; done\nprintf '%s' '${remoteSum}' > "$out"\nprintf '%s' '${http}'\n`, { mode: 0o755 });
  const out = join(dir, "output");
  const run = spawnSync("bash", ["-c", publishedStep], {
    cwd: dir,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_OUTPUT: out, GITHUB_REF_NAME: "v0.4.3", GITHUB_TOKEN: "x", REPOSITORY: "krizaka/krizaka-platform-kit" },
    encoding: "utf8",
  });
  const sum = spawnSync("sh", ["-c", "shasum pom.xml 2>/dev/null || sha1sum pom.xml"], { cwd: dir, encoding: "utf8" }).stdout.slice(0, 40);
  return { status: run.status, stdout: run.stdout, sum, outputs: existsSync(out) ? readFileSync(out, "utf8") : "" };
}

test("a version not on the registry is deployed", () => {
  const r = checkPublished({ http: "404", remoteSum: "" });
  assert.equal(r.status, 0);
  assert.match(r.outputs, /published=false/);
});

test("a version already published with the same checksum is skipped, and said so", () => {
  const probe = checkPublished({ http: "404", remoteSum: "" });
  const r = checkPublished({ http: "200", remoteSum: probe.sum });
  assert.equal(r.status, 0);
  assert.match(r.outputs, /published=true/);
  assert.match(r.stdout, /already published, same checksum/);
});

test("a version published with another checksum fails, an unexpected answer fails", () => {
  assert.notEqual(checkPublished({ http: "200", remoteSum: "0".repeat(40) }).status, 0);
  assert.notEqual(checkPublished({ http: "500", remoteSum: "" }).status, 0);
});

test("the deploy step and the concurrency group follow the check", () => {
  const github = workflow.split("  release-github:")[1].split("  release-central:")[0];
  assert.match(github, /concurrency:\n\s+group: release-github-.*ref_name/);
  assert.match(github, /name: Deploy\n\s+if: steps\.published\.outputs\.published != 'true'/);
});
