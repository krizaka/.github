// The one AGENTS.md of every product and library repository (AGENTS.repo.md): rendered for a repository, and checked.
// The conformance rule `agents-template` runs `problemsOf` on each repository's AGENTS.md; its fan-out writes `render`'s
// output and moves what the old AGENTS.md said to docs/agents.md, so nothing a repository wrote is lost.
import { readFileSync } from "node:fs";
import { posix } from "node:path";

const ROOT = new URL("../", import.meta.url);
export const TEMPLATE_PATH = "AGENTS.repo.md";
export const DETAILS_PATH = "docs/agents.md";
export const MARKER = "krizaka-agents-template v1";
/** @fixed: the template's own length budget — the contract an agent reads first must fit one screen and a half. */
export const MAX_LINES = 80;
export const SKILL_URL = "https://github.com/krizaka/krizaka-skills/blob/main/skills/krizaka-engineering/SKILL.md";
export const REQUIRED_HEADINGS = ["## Profile", "## Commands", "## Read first", "## The 10 rules that matter", "## Before you push"];

export const readTemplate = () => readFileSync(new URL(TEMPLATE_PATH, ROOT), "utf8");

/** The commands an agent runs, from the repository's scripts (npm) or its kind (Maven, Python). */
export function commandsOf(kind, packageJson) {
  const scripts = packageJson ? (JSON.parse(packageJson).scripts ?? {}) : {};
  const wanted = ["format", "lint", "typecheck", "test", "build"].filter((s) => scripts[s]);
  if (wanted.length > 0) return ["```bash", ...wanted.map((s) => `npm run ${s}`), "```"].join("\n");
  const byKind = {
    maven: ["./mvnw -B verify   # compile, tests, ArchUnit, PMD, NullAway"],
    python: ["uv run pytest"],
    rust: ["cargo fmt --check && cargo clippy -- -D warnings && cargo test"],
    iac: ["tofu fmt -check && tofu validate"],
  };
  const lines = byKind[kind];
  return lines ? ["```bash", ...lines, "```"].join("\n") : "See the README: this repository has no build of its own.";
}

/** The AGENTS.md of a repository (`entry` is its line of repos.json). */
export function render(entry, { packageJson = null, template = readTemplate() } = {}) {
  const purpose = entry.role ? `${entry.role.replace(/\.?$/, ".")}` : "What this repository is: see the README.";
  return template
    .replaceAll("{{name}}", entry.name)
    .replaceAll("{{purpose}}", purpose)
    .replaceAll("{{kind}}", entry.kind ?? "none")
    .replaceAll("{{team}}", entry.team ?? entry.owner ?? "krizaka")
    .replaceAll("{{commands}}", commandsOf(entry.kind, packageJson));
}

/** What the old AGENTS.md said, kept as the repository's detail page. */
export function detailsOf(name, oldAgents) {
  const body = oldAgents.replace(/^#\s+.*\n+/, "");
  return `# ${name} — detail for agents\n\nMoved here from AGENTS.md when it took the org template (krizaka/.github \`AGENTS.repo.md\`). AGENTS.md is the short contract; this page is the repository's own detail, read by section.\n\n${body.trimEnd()}\n`;
}

const LINK = /\]\(([^)\s]+)\)/g;

/**
 * Why an AGENTS.md does not follow the template (empty: it does). `paths`: the repository's files, to resolve relative links.
 * @param {string | null} text
 * @param {string[]} paths
 */
export function problemsOf(text, paths) {
  if (text === null) return ["no AGENTS.md"];
  const problems = [];
  const lines = text.trimEnd().split("\n");
  if (!text.includes(MARKER)) problems.push(`not rendered from the template (no « ${MARKER} » marker)`);
  if (lines.length > MAX_LINES) problems.push(`${lines.length} lines (at most ${MAX_LINES})`);
  for (const heading of REQUIRED_HEADINGS) {
    if (!lines.some((l) => l.startsWith(heading))) problems.push(`no « ${heading} » heading`);
  }
  if (!text.includes(SKILL_URL)) problems.push("no link to the krizaka-engineering skill");
  if (/\{\{\w+\}\}/.test(text)) problems.push("a {{placeholder}} was left");
  for (const [, target] of text.matchAll(LINK)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const file = posix.normalize(target.split("#")[0]).replace(/\/$/, "");
    const exists = paths.includes(file) || paths.some((p) => p.startsWith(`${file}/`));
    if (!exists) problems.push(`broken link « ${target} »`);
  }
  return problems;
}
