import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FSL_LINE, SECTIONS, applyBlocks, problemsOf, renderBlocks, renderSchema } from "../scripts/product-readme.mjs";

const data = JSON.parse(readFileSync(new URL("../profile/products.json", import.meta.url), "utf8"));
const SCHEMA = "flowchart LR\n  user --> web";
const blocks = renderBlocks(data, "verikora", { schema: SCHEMA });
const handWritten = "## Quick start\n\n```bash\nnpm i\nnpm run dev\nopen http://localhost:3000\n```\n\n## Details\n\nMore.\n";
const readmeOf = (b) => `${b.head}\n\n## Quick start\n\n\`\`\`bash\nnpm i\nnpm run dev\nopen http://localhost:3000\n\`\`\`\n\n${b.badges}\n\n## Details\n\nMore.\n\n${b.footer}\n`;

describe("renderBlocks", () => {
  it("renders the head: mark, name, promise, status once, schema", () => {
    assert.match(blocks.head, /krizaka-assets\.b-cdn\.net\/brand\/verikora\/mark-light\.svg/);
    assert.match(blocks.head, /mark-dark\.svg/);
    assert.match(blocks.head, /# Verikora/);
    assert.ok(blocks.head.includes(data.products.verikora.proof));
    assert.equal(blocks.head.split(data.statuses.development).length - 1, 1);
    assert.match(blocks.head, /```mermaid\nflowchart LR/);
  });
  it("uses the product colour, and a default when it has none", () => {
    const own = renderBlocks({ ...data, products: { verikora: { ...data.products.verikora, colour: "a1b2c3" } } }, "verikora", { schema: SCHEMA });
    assert.match(own.head, /a1b2c3/);
    assert.match(blocks.head, /3e76a8/);
  });
  it("renders only CI, licence and security badges", () => {
    const images = blocks.badges.match(/!\[[^\]]*\]\(/g) ?? [];
    assert.equal(images.length, 3);
    assert.match(blocks.badges, /krizaka\/verikora\/actions\/workflows\/ci\.yml/);
    assert.match(blocks.badges, /security\.yml/);
    assert.match(blocks.badges, /[Ll]icen[cs]e/);
  });
  it("renders the FSL line and the family footer", () => {
    assert.equal(FSL_LINE, "FSL-1.1-ALv2: source-available, each release becomes Apache-2.0 two years later");
    assert.ok(blocks.footer.includes(FSL_LINE));
    assert.match(blocks.footer, /github\.com\/krizaka/);
  });
  it("refuses an unknown product", () => assert.throws(() => renderBlocks(data, "nope", { schema: SCHEMA }), /nope/));
  it("refuses an empty schema", () => assert.throws(() => renderBlocks(data, "verikora", { schema: "" }), /schema/));
});

describe("renderSchema", () => {
  it("embeds Mermaid text as a fence and an image path as an image", () => {
    assert.match(renderSchema("docs/architecture/c1.mmd", "a --> b"), /^```mermaid\na --> b\n```$/);
    assert.equal(renderSchema("docs/architecture/c1.svg", undefined), "![Architecture (C1)](docs/architecture/c1.svg)");
  });
});

describe("problemsOf", () => {
  it("is empty for a README built from the template", () => assert.deepEqual(problemsOf(readmeOf(blocks), blocks), []));
  it("reports a stale block", () => {
    const stale = readmeOf(blocks).replace(data.products.verikora.proof, "an old promise");
    assert.match(problemsOf(stale, blocks).join("\n"), /head.*stale/i);
  });
  it("reports a missing block", () => {
    const missing = readmeOf(blocks).replace(blocks.footer, "");
    assert.match(problemsOf(missing, blocks).join("\n"), /footer/);
  });
  it("reports a missing hand-written section", () => {
    const text = readmeOf(blocks).replace("## Quick start", "## Start");
    assert.match(problemsOf(text, blocks).join("\n"), /Quick start/);
  });
  it("reports badges placed before the quick start", () => {
    const text = `${blocks.head}\n\n${blocks.badges}\n\n${handWritten}\n${blocks.footer}\n`;
    assert.match(problemsOf(text, blocks).join("\n"), /after the quick start/);
  });
  it("names the template sections", () => assert.deepEqual(SECTIONS, ["Quick start", "Details"]));
});

describe("applyBlocks", () => {
  it("rewrites stale blocks and keeps the hand-written text", () => {
    const stale = readmeOf(blocks).replace(data.products.verikora.proof, "old");
    const fixed = applyBlocks(stale, blocks);
    assert.deepEqual(problemsOf(fixed, blocks), []);
    assert.ok(fixed.includes("npm run dev"));
  });
});

describe("the command line", () => {
  const run = (args, cwd) => spawnSync(process.execPath, [new URL("../scripts/product-readme.mjs", import.meta.url).pathname, ...args], { cwd, encoding: "utf8" });
  const repo = () => {
    const dir = mkdtempSync(join(tmpdir(), "pr-"));
    mkdirSync(join(dir, "docs/architecture"), { recursive: true });
    writeFileSync(join(dir, "docs/architecture/c1.mmd"), SCHEMA);
    writeFileSync(join(dir, "README.md"), readmeOf(blocks));
    return dir;
  };
  it("--check exits 0 on a fresh README", () => assert.equal(run(["--product", "verikora", "--check"], repo()).status, 0));
  it("--check exits 1 on a stale README, and the default run rewrites it", () => {
    const dir = repo();
    writeFileSync(join(dir, "README.md"), readmeOf(blocks).replace("# Verikora", "# Old"));
    const checked = run(["--product", "verikora", "--check"], dir);
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /stale/);
    assert.equal(run(["--product", "verikora"], dir).status, 0);
    assert.equal(run(["--product", "verikora", "--check"], dir).status, 0);
  });
  it("--check exits 1 when the schema file is missing", () => {
    const dir = repo();
    writeFileSync(join(dir, "docs/architecture/c1.mmd"), "");
    assert.equal(run(["--product", "verikora", "--check"], dir).status, 1);
  });
  it("--print writes nothing and prints the three blocks", () => {
    const out = run(["--product", "verikora", "--print"], repo());
    assert.equal(out.status, 0);
    assert.match(out.stdout, /product-readme:footer:end/);
  });
});
