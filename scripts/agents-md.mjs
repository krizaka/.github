// The one AGENTS.md of every product and library repository (docs/standards/agents-template.md, v2): rendered for a repository, and checked.
// The conformance rule `agents-template` runs `problemsOf` on each repository's AGENTS.md; its fan-out writes `render`'s
// output and moves what the old AGENTS.md said to docs/agents.md, so nothing a repository wrote is lost.
import { readFileSync } from "node:fs";
import { posix } from "node:path";

const ROOT = new URL("../", import.meta.url);
export const TEMPLATE_PATH = "docs/standards/agents-template.md";
export const DETAILS_PATH = "docs/agents.md";
export const MARKER = "krizaka-agents-template v2"
/** Any version of the marker: a file rendered from an older template is still the template's, not a repository page to keep. */
export const ANY_MARKER = /krizaka-agents-template v\d+/;;
/** @fixed: the founder's length budget (krizaka-internal#4505) — the contract an agent reads first must fit two screens. */
export const MAX_LINES = 150;
export const CLAUDE_PATH = "CLAUDE.md";
export const CLAUDE_LINE = "@AGENTS.md";
export const SKILL_URL = "https://github.com/krizaka/krizaka-skills/blob/main/skills/krizaka-engineering/SKILL.md";
export const REQUIRED_HEADINGS = [
  "## Project context",
  "## Essential commands",
  "## Architecture & conventions",
  "## Guard-rails & known pitfalls",
  "## Expected validation workflow",
  "## References",
];

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
  const body = oldAgents.replace(/^#[ \t][^\n]*\n+/, "");
  return `# ${name} — detail for agents\n\nMoved here from AGENTS.md when it took the org template (krizaka/.github \`docs/standards/agents-template.md\`). AGENTS.md is the short contract; this page is the repository's own detail, read by section.\n\n${body.trimEnd()}\n`;
}

/**
 * Why a CLAUDE.md is not the pointer to AGENTS.md (empty: it is). A symlink reads as its target path, a pointer as `@AGENTS.md`.
 * @param {string | null} claude
 */
export function claudeProblems(claude) {
  if (claude === null) return ["no CLAUDE.md (the one line « @AGENTS.md », or a symlink to AGENTS.md)"];
  const body = claude.trim();
  return body === CLAUDE_LINE || body === "AGENTS.md" ? [] : [`CLAUDE.md is not « ${CLAUDE_LINE} » or a symlink to AGENTS.md (${body === "" ? "empty" : `${body.split("\n").length} lines`})`];
}

const LINK = /\]\(([^)\s]+)\)/g;

/**
 * Why an AGENTS.md does not follow the template (empty: it does). `paths`: the repository's files, to resolve relative links.
 * @param {string | null} text
 * @param {string[]} paths
 * @param {string | null} [claude] the CLAUDE.md of the repository; `undefined` skips that check
 */
export function problemsOf(text, paths, claude = undefined) {
  const claudeIssues = claude === undefined ? [] : claudeProblems(claude);
  if (text === null) return ["no AGENTS.md", ...claudeIssues];
  const problems = [...claudeIssues];
  const lines = text.trimEnd().split("\n");
  if (!text.includes(MARKER)) problems.push(`not rendered from the template (no « ${MARKER} » marker)`);
  if (lines.length > MAX_LINES) problems.push(`${lines.length} lines (at most ${MAX_LINES})`);
  let from = 0;
  for (const heading of REQUIRED_HEADINGS) {
    const at = lines.findIndex((l, i) => i >= from && l.startsWith(heading));
    if (at >= 0) from = at + 1;
    else problems.push(lines.some((l) => l.startsWith(heading)) ? `« ${heading} » is out of order` : `no « ${heading} » heading`);
  }
  if (!text.includes(SKILL_URL)) problems.push("no link to the krizaka-engineering skill");
  if (/\{\{\w+\}\}/.test(text)) problems.push("a {{placeholder}} was left");
  for (const target of new Set([...text.matchAll(LINK)].map((m) => m[1]))) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const file = posix.normalize(target.split("#")[0]).replace(/\/$/, "");
    const exists = paths.includes(file) || paths.some((p) => p.startsWith(`${file}/`));
    if (!exists) problems.push(`broken link « ${target} »`);
  }
  return problems;
}
