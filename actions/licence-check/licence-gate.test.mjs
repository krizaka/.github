import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { classify, components, evaluate, report, splitTop, unwrap } from "./licence-gate.mjs";

const policy = JSON.parse(readFileSync(new URL("./policy.json", import.meta.url), "utf8"));

test("splitTop and unwrap respect parentheses", () => {
  assert.deepEqual(splitTop("MIT OR (Apache-2.0 AND BSD-3-Clause)", "OR"), ["MIT", "(Apache-2.0 AND BSD-3-Clause)"]);
  assert.equal(unwrap("((MIT))"), "MIT");
  assert.equal(unwrap("(MIT) AND (ISC)"), "(MIT) AND (ISC)");
});

test("permissive and weak copyleft pass, strong and network copyleft fail", () => {
  for (const ok of ["MIT", "Apache-2.0", "LGPL-3.0-or-later", "MPL-2.0", "EPL-2.0", "BSD-3-Clause AND MIT"]) assert.equal(classify(ok, policy), "allowed", ok);
  for (const bad of ["AGPL-3.0-only", "GPL-3.0-or-later", "SSPL-1.0", "BUSL-1.1", "CC-BY-NC-4.0", "Elastic-2.0", "MIT AND GPL-2.0-only"]) assert.equal(classify(bad, policy), "forbidden", bad);
});

test("OR takes the best alternative, an allowed exception clears GPL", () => {
  assert.equal(classify("BSD-3-Clause OR GPL-2.0-only", policy), "allowed");
  assert.equal(classify("EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0", policy), "allowed");
  assert.equal(classify("GPL-2.0-only WITH Classpath-exception-2.0", policy), "allowed");
  assert.equal(classify("(CC-BY-4.0 AND MIT) OR (CC-BY-NC-SA-4.0 AND MIT)", policy), "allowed");
});

test("missing or unrecognised licences are unknown, never allowed", () => {
  assert.equal(classify("NOASSERTION", policy), "unknown");
  assert.equal(classify("", policy), "unknown");
  assert.equal(classify("LicenseRef-custom", policy), "unknown");
  assert.equal(classify("MIT AND LicenseRef-custom", policy), "unknown");
});

test("reads CycloneDX (Trivy) and SPDX (GitHub dependency graph)", () => {
  const cdx = components({
    bomFormat: "CycloneDX",
    components: [
      { name: "a", version: "1", purl: "pkg:npm/a@1", licenses: [{ license: { id: "MIT" } }] },
      { group: "org.x", name: "b", version: "2", licenses: [{ expression: "AGPL-3.0-only" }] },
    ],
  });
  assert.deepEqual(cdx.map((c) => [c.name, c.licence]), [["a", "MIT"], ["org.x:b", "AGPL-3.0-only"]]);
  const spdx = components({ sbom: { packages: [{ name: "c", versionInfo: "3", licenseConcluded: "NOASSERTION", licenseDeclared: "ISC" }] } });
  assert.equal(spdx[0].licence, "ISC");
});

test("system packages and first-party packages are not judged; exceptions need a reason and expire", () => {
  const list = [
    { name: "busybox", type: "library", purl: "pkg:apk/alpine/busybox@1", licence: "GPL-2.0-only" },
    { name: "alpine", type: "operating-system", purl: "", licence: "NOASSERTION" },
    { name: "@krizaka/ui", purl: "pkg:npm/%40krizaka/ui@3", licence: "Apache-2.0" },
    { name: "bad", purl: "pkg:npm/bad@1", licence: "AGPL-3.0-only" },
    { name: "late", purl: "pkg:npm/late@1", licence: "GPL-3.0-only" },
    { name: "ok", purl: "pkg:npm/ok@1", licence: "MIT" },
  ];
  const ex = [
    { package: "bad", reason: "build tool, never shipped", expires: "2027-01-01" },
    { package: "late", reason: "old", expires: "2026-01-01" },
  ];
  const r = evaluate(list, policy, ex, "2026-10-26");
  assert.equal(r.skipped, 3);
  assert.equal(r.allowed, 1);
  assert.deepEqual(r.excepted.map((c) => c.name), ["bad"]);
  assert.deepEqual(r.forbidden.map((c) => c.name), ["late"]);
  assert.match(report(r), /1 forbidden · 1 excepted/);
});
