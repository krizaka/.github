// The dispatch contract (krizaka-internal#4080): every `repository_dispatch` event a workflow sends has a listener, and every
// listener has a sender; docs/dispatch-events.json names the listeners an event MUST keep (the org profile listens to `brand-changed`).
//   node scripts/dispatch-contract.mjs            reads the workflows of every active repo through the GitHub API (GH_TOKEN)
//   node scripts/dispatch-contract.mjs --local    reads only this checkout (offline)
// Why the API and not a committed copy: a registry the senders declare drifts the day a sender forgets; the workflows themselves
// are the truth, and the token of the workflow can read them. The registry only holds what cannot be read: the required listeners.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NAME = "[a-z][a-z0-9-]*";

/** Events a text sends: `event_type=x`, `event_type: x`, `"event_type": "x"`, `event-type: x`. */
export function senders(text) {
  const out = new Set();
  for (const m of text.matchAll(new RegExp(`event[_-]type["']?\\s*[=:]\\s*["']?(${NAME})`, "g"))) out.add(m[1]);
  return [...out];
}

/** Events a workflow listens to: the `types:` of its `repository_dispatch:` trigger (inline or block list). */
export function listeners(text) {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => /^\s*repository_dispatch:\s*(#.*)?$/.test(l));
  if (i < 0) return [];
  const indent = lines[i].match(/^\s*/)[0].length;
  const out = [];
  let inTypes = false;
  for (const line of lines.slice(i + 1)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (line.match(/^\s*/)[0].length <= indent) break;
    const inline = line.match(/^\s*types:\s*\[([^\]]*)\]/);
    if (inline) { out.push(...inline[1].split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean)); inTypes = false; continue; }
    if (/^\s*types:\s*(#.*)?$/.test(line)) { inTypes = true; continue; }
    const item = line.match(/^\s*-\s*["']?([^"'\s#]+)/);
    if (inTypes && item) out.push(item[1]); else inTypes = false;
  }
  return out;
}

/**
 * The contract's problems. `files` = [{ repo, path, text }]; `required` = { event: ["repo:workflow-file", ...] }.
 * A sender in a text that is not a workflow (a script, an action) counts as a sender; only workflows are listeners.
 */
export function check(files, required = {}) {
  const sent = new Map();
  const heard = new Map();
  const add = (map, event, where) => map.set(event, [...(map.get(event) ?? []), where]);
  for (const f of files) {
    const where = `${f.repo}:${f.path}`;
    for (const e of senders(f.text)) add(sent, e, where);
    if (/(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/.test(f.path) || /^\.github\/workflows\//.test(f.path)) for (const e of listeners(f.text)) add(heard, e, where);
  }
  const problems = [];
  for (const [e, where] of sent) if (!heard.has(e)) problems.push(`sender without listener: ${e} (sent from ${where.join(", ")})`);
  for (const [e, where] of heard) if (!sent.has(e) && !(e in required)) problems.push(`listener nobody sends: ${e} (listened by ${where.join(", ")})`);
  for (const [e, must] of Object.entries(required)) {
    for (const where of must) {
      const [repo, file] = where.split(":");
      if (!(heard.get(e) ?? []).some((w) => w === `${repo}:.github/workflows/${file}`)) problems.push(`${where} must listen to ${e} and does not`);
    }
  }
  return problems;
}

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

function localFiles() {
  const out = [];
  const walk = (rel) => {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) return;
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const r = join(rel, e.name);
      if (e.isDirectory()) walk(r);
      else if (/\.(ya?ml|mjs|sh)$/.test(e.name) && !/\.test\./.test(e.name) && r !== "scripts/dispatch-contract.mjs") out.push({ repo: ".github", path: r, text: readFileSync(join(ROOT, r), "utf8") });
    }
  };
  for (const d of [".github/workflows", "scripts", "actions", "workflow-templates"]) walk(d);
  return out;
}

function remoteFiles(repos) {
  const out = [];
  for (const r of repos) {
    if (r.name === ".github") continue; // read from the checkout
    let names;
    try { names = JSON.parse(gh("api", `repos/${r.owner}/${r.name}/contents/.github/workflows`, "--jq", "[.[] | select(.type==\"file\") | .path]")); } catch { continue; }
    for (const path of names) out.push({ repo: r.name, path, text: gh("api", "-H", "Accept: application/vnd.github.raw", `repos/${r.owner}/${r.name}/contents/${path}`) });
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const local = process.argv.includes("--local");
  const registry = JSON.parse(readFileSync(join(ROOT, "docs/dispatch-events.json"), "utf8"));
  const repos = JSON.parse(readFileSync(join(ROOT, "repos.json"), "utf8")).repositories.filter((r) => !r.archived);
  const files = [...localFiles(), ...(local ? [] : remoteFiles(repos))];
  const problems = check(files, registry.required);
  for (const p of problems) console.log(`FAIL  ${p}`);
  console.log(problems.length ? `${problems.length} dispatch contract problem(s).` : `Dispatch contract holds (${files.length} files read${local ? ", local only" : ""}).`);
  process.exit(problems.length ? 1 : 0);
}
