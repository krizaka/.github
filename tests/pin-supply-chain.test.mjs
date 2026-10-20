import assert from "node:assert/strict";
import { test } from "node:test";
import { bestTag, parseRefs, pinDockerfileText, pinWorkflowText, resolveRef } from "../scripts/pin-supply-chain.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
const LS = [`${B}\trefs/heads/main`, `${A}\trefs/tags/v7`, `${A}\trefs/tags/v7.0.1`, `${A}\trefs/tags/v7.0^{}`].join("\n");

test("bestTag prefers the most precise version", () => {
  assert.equal(bestTag(["v7", "v7.0.1", "v7.0"]), "v7.0.1");
});

test("resolveRef gives the commit and the precise tag, or the branch name", () => {
  const refs = parseRefs(LS);
  assert.deepEqual(resolveRef(refs, "v7"), { sha: A, label: "v7.0.1" });
  assert.deepEqual(resolveRef(refs, "main"), { sha: B, label: "main" });
  assert.throws(() => resolveRef(refs, "nope"), /ref not found/);
});

test("pinWorkflowText pins uses lines, keeps pinned, local and docker ones", () => {
  const src = [
    "      - uses: actions/checkout@v7",
    `      - uses: actions/setup-node@${B} # v4`,
    "    uses: krizaka/orazaka/.github/workflows/component.yml@main",
    "      - uses: ./.github/actions/x",
    "      - uses: docker://alpine:3",
    "      - run: echo uses: foo@v1",
  ].join("\n");
  const { text, changes } = pinWorkflowText(src, (repo, ref) => ({ sha: A, label: `${repo}:${ref}` }));
  assert.equal(changes.length, 2);
  const lines = text.split("\n");
  assert.equal(lines[0], `      - uses: actions/checkout@${A} # actions/checkout:v7`);
  assert.equal(lines[1], src.split("\n")[1]);
  assert.equal(lines[2], `    uses: krizaka/orazaka/.github/workflows/component.yml@${A} # krizaka/orazaka:main`);
  assert.equal(lines.slice(3).join("\n"), src.split("\n").slice(3).join("\n"));
});

test("pinWorkflowText is idempotent", () => {
  const once = pinWorkflowText("- uses: a/b@v1", () => ({ sha: A, label: "v1.2.3" })).text;
  assert.equal(pinWorkflowText(once, () => assert.fail("must not resolve")).changes.length, 0);
});

test("pinDockerfileText pins images, not stages, args or scratch", () => {
  const src = ["FROM node:22-slim AS build", "FROM --platform=linux/amd64 nvidia/cuda:12.8.1-devel AS dev", "FROM build", "FROM scratch", "FROM $BASE", "FROM eclipse-temurin:21-jre"].join("\n");
  const d = "sha256:" + "c".repeat(64);
  const { text, changes } = pinDockerfileText(src, () => d);
  assert.equal(changes.length, 3);
  assert.match(text, /^FROM node:22-slim@sha256:c{64} AS build$/m);
  assert.match(text, /^FROM --platform=linux\/amd64 nvidia\/cuda:12\.8\.1-devel@sha256:c{64} AS dev$/m);
  assert.match(text, /^FROM build$/m);
  assert.match(text, /^FROM eclipse-temurin:21-jre@sha256:c{64}$/m);
});

test("--refresh moves branch-commented pins only", () => {
  const src = [`    uses: o/r/.github/workflows/w.yml@${A} # main`, `      - uses: actions/checkout@${A} # v7.0.1`].join("\n");
  const { text, changes } = pinWorkflowText(src, () => ({ sha: B, label: "main" }), { refresh: true });
  assert.equal(changes.length, 1);
  assert.equal(text.split("\n")[0], `    uses: o/r/.github/workflows/w.yml@${B} # main`);
  assert.equal(text.split("\n")[1], src.split("\n")[1]);
  assert.equal(pinWorkflowText(src, () => assert.fail("no refresh without the flag")).changes.length, 0);
});
