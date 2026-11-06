import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { kindOfName, kindOfScript, kindOfWorkflow, isScript, isStandardNpm, isTestFile } from "../lib/classify.mjs";
import { hasWord, mentions } from "../lib/callers.mjs";
import { headerOf } from "../lib/header.mjs";
import { jsPatterns, measureOf, pythonPatterns } from "../lib/regexes.mjs";
import { awkPatterns, commandsOf, jqPatterns, sedPatterns, shellPatterns } from "../lib/shell-patterns.mjs";
import { readTar } from "../lib/tar.mjs";
import { usesTarget, workflowInfo } from "../lib/workflows.mjs";

test("shell: grep, sed, awk, jq and =~ patterns are read; a plain word and a comment are not", () => {
  assert.deepEqual(shellPatterns("grep -E 'a|b+' file"), ["a|b+"]);
  assert.deepEqual(shellPatterns("grep -e 'x.*y' file && grep word file"), ["x.*y"]);
  assert.deepEqual(shellPatterns("sed -E 's#(a+)/b#\\1#' f"), ["(a+)/b"]);
  assert.deepEqual(shellPatterns("[[ $x =~ ^v[0-9]+$ ]]"), ["^v[0-9]+$"]);
  assert.deepEqual(shellPatterns("jq 'select(.n | test(\"^a.+z$\"))' f"), ["^a.+z$"]);
  assert.deepEqual(shellPatterns("# grep -E 'a|b' commented\necho hi | grep plain"), []);
  assert.deepEqual(sedPatterns("/^#/d;s/x+/y/"), ["^#", "x+"]);
  assert.deepEqual(awkPatterns("/^ok/ { n++ } $1 == 2"), ["^ok"]);
  assert.deepEqual(jqPatterns('sub("a+"; "b")'), ["a+"]);
  assert.deepEqual(commandsOf("a b; c 'd e' | f"), [["a", "b"], ["c", "d e"], ["f"]]);
});

test("regexes: literals, RegExp(text), a constant followed one step; Python re.* calls; the measure", () => {
  const found = jsPatterns('const P = "x+y"; const a = /a+/g; const b = new RegExp(P); const c = RegExp("z"); const d = new RegExp(dynamic);', "f.mjs");
  assert.deepEqual(found, ["a+", "x+y", "z", "dynamic"]);
  assert.deepEqual(jsPatterns("const r: RegExp = /t+/; type X = string;", "f.ts"), ["t+"]);
  const py = pythonPatterns({ "a.py": 're.compile("a+")\nre.sub(r"b", "", x)\nnot_re.compile("no")', "bad.py": "def (" });
  assert.deepEqual(py, { "a.py": ["a+", "b"], "bad.py": [] });
  const measure = measureOf(["a", "b".repeat(81)]);
  assert.deepEqual([measure.count, measure.longest, measure.over80, measure.long[0].length], [2, 81, 1, 81]);
});

test("header: the leading comment as prose; too short or not at the top is no header", () => {
  const long = "// Checks that every link of the docs answers, so a broken link fails the pull request.\n";
  assert.equal(headerOf(`#!/usr/bin/env node\n${long}import x from 'y';\n`, "javascript").present, true);
  assert.equal(headerOf("// TODO fix\nimport x from 'y';\n", "javascript").present, false);
  assert.equal(headerOf(`import x from 'y';\n${long}`, "javascript").present, false);
  const py = headerOf('"""Reconciles the board with the issues and the pull requests; run by the cron every hour. Manual too."""\nimport os\n', "python");
  assert.deepEqual([py.present, py.manual, py.what], [true, true, "Reconciles the board with the issues and the pull requests; run by the cron every hour."]);
  assert.equal(headerOf("#!/bin/sh\n# Backs up the database each night to the cold storage, started by the nightly workflow; never by hand.\ncp a b\n", "shell").present, true);
});

test("classify: scripts live in automation folders; tests, fixtures and sources are not units; kinds read names", () => {
  assert.equal(isScript("r", "scripts/a.mjs"), true);
  assert.equal(isScript("r", "src/scripts/a.mjs"), false);
  assert.equal(isScript("r", "scripts/fixtures/a.mjs"), false);
  assert.equal(isScript("r", "lib/a.mjs"), false);
  assert.equal(isScript(".github", "actions/x/run.mjs"), true);
  assert.equal(isScript("r", "run.sh"), true);
  assert.equal(isTestFile("scripts/a.test.mjs"), true);
  assert.equal(isTestFile("tests/a.mjs"), true);
  assert.equal(isTestFile("scripts/a.mjs"), false);
  assert.deepEqual(["promote-prod", "gen-docs", "migrate-users", "check-links", "record-demo"].map(kindOfName), ["deploy", "generator", "one-off", "CI check", "dev tool"]);
  assert.equal(kindOfWorkflow("x.yml", ["schedule", "workflow_dispatch"]), "cron");
  assert.equal(kindOfWorkflow("x.yml", ["workflow_dispatch"]), "one-off");
  assert.equal(kindOfScript("scripts/hooks/a.sh", []), "git hook");
  assert.equal(kindOfScript("scripts/x.mjs", ["cron"]), "cron");
  assert.equal(isStandardNpm("test:unit"), true);
  assert.equal(isStandardNpm("docs:gen"), false);
});

test("callers: a path or a whole-word file name matches; a generic or embedded name does not", () => {
  assert.equal(mentions("run node scripts/check-links.mjs now", "scripts/check-links.mjs"), true);
  assert.equal(mentions("node check-links.mjs", "scripts/check-links.mjs"), true);
  assert.equal(mentions("node recheck-links.mjs", "scripts/check-links.mjs"), false);
  assert.equal(mentions("node run.mjs", "scripts/run.mjs"), false, "a generic name proves nothing");
  assert.equal(mentions("import 'board_sync'", "tools/board_sync.py"), false);
  assert.equal(mentions("from board_sync import x", "tools/board_sync.py"), true);
  assert.equal(hasWord("a-b c", "b"), false);
});

test("workflows: events, schedules, uses and run blocks come from the YAML; a broken file is reported", () => {
  const info = workflowInfo("on:\n  push:\n  schedule:\n    - cron: '1 2 * * *'\njobs:\n  a:\n    uses: krizaka/.github/.github/workflows/x.yml@abc\n  b:\n    steps:\n      - uses: ./actions/y\n      - run: echo hi\n");
  assert.deepEqual([info.events, info.schedules, info.uses, info.runs], [["push", "schedule"], ["1 2 * * *"], ["krizaka/.github/.github/workflows/x.yml@abc", "./actions/y"], ["echo hi"]]);
  assert.match(workflowInfo("a: [").error, /./);
  assert.deepEqual(usesTarget("krizaka/.github/.github/workflows/x.yml@abc", "r"), { repo: ".github", kind: "workflow", path: ".github/workflows/x.yml" });
  assert.deepEqual(usesTarget("krizaka/.github/actions/setup@abc", "r"), { repo: ".github", kind: "action", path: "actions/setup" });
  assert.equal(usesTarget("actions/checkout@abc", "r"), null);
});

function tarEntry(name, body, type = "0") {
  const head = Buffer.alloc(512);
  head.write(name, 0);
  head.write(`${body.length.toString(8).padStart(11, "0")}\0`, 124);
  head.write(type, 156);
  return Buffer.concat([head, body, Buffer.alloc((512 - (body.length % 512)) % 512)]);
}

test("tar: the files of a GitHub tarball are read below the top folder; links, binaries and pax headers are handled", () => {
  const pax = Buffer.from("26 path=top/long/name.mjs\n");
  const tar = Buffer.concat([tarEntry("top/", Buffer.alloc(0), "5"), tarEntry("top/a.txt", Buffer.from("hello")), tarEntry("top/bin", Buffer.from([1, 0, 2])), tarEntry("top/link", Buffer.alloc(0), "2"), tarEntry("pax", pax, "x"), tarEntry("short", Buffer.from("long")), Buffer.alloc(1024)]);
  assert.deepEqual([...readTar(gzipSync(tar))], [["a.txt", "hello"], ["long/name.mjs", "long"]]);
});
