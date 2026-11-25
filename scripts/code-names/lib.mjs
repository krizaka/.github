// The retired code names, read from docs/standards/code-names.json (krizaka-internal#4284): pure functions used by the check, the sweep and the
// codemod. `findHits(text, path)` lists the places a retired name is written; `replace(text, {kinds})` turns each into its commercial name.
// Dependency-free: the validator covers only the schema keywords below, and a keyword it does not know is itself an error.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const LIST_FILE = join(here, "..", "..", "docs", "standards", "code-names.json");
export const SCHEMA_FILE = join(here, "..", "..", "docs", "standards", "code-names.schema.json");

const KNOWN = new Set(["$schema", "$id", "title", "description", "type", "properties", "required", "additionalProperties", "items", "minItems", "minLength", "pattern", "enum"]);
const TYPES = {
  object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  array: Array.isArray,
  string: (v) => typeof v === "string",
};

function scalarProblems(schema, value, at) {
  const out = [];
  if (schema.enum && !schema.enum.includes(value)) out.push(`${at}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(", ")}`);
  if (schema.pattern && typeof value === "string" && !new RegExp(schema.pattern).test(value)) out.push(`${at}: must match ${schema.pattern}`);
  if (schema.minLength !== undefined && typeof value === "string" && value.length < schema.minLength) out.push(`${at}: is empty`);
  if (schema.minItems !== undefined && Array.isArray(value) && value.length < schema.minItems) out.push(`${at}: needs at least ${schema.minItems} item(s)`);
  return out;
}

function objectProblems(schema, value, at) {
  const props = schema.properties ?? {};
  const extra = schema.additionalProperties === false ? Object.keys(value).filter((k) => !(k in props)).map((k) => `${at}: unknown key « ${k} »`) : [];
  const missing = (schema.required ?? []).filter((k) => !(k in value)).map((k) => `${at}: « ${k} » is required`);
  const inner = Object.keys(props).filter((k) => k in value).flatMap((k) => problems(props[k], value[k], `${at}.${k}`));
  return [...extra, ...missing, ...inner];
}

/** Every problem of `value` against `schema`, as readable lines; an empty list is a valid value. */
export function problems(schema, value, at = "code-names") {
  const unknown = Object.keys(schema).filter((k) => !KNOWN.has(k)).map((k) => `${at}: the schema uses « ${k} », which this reader does not check`);
  if (unknown.length) return unknown;
  if (schema.type && !TYPES[schema.type]?.(value)) return [`${at}: expected ${schema.type}`];
  const own = scalarProblems(schema, value, at);
  if (schema.type === "object") return [...own, ...objectProblems(schema, value, at)];
  if (schema.type === "array" && schema.items) return [...own, ...value.flatMap((v, i) => problems(schema.items, v, `${at}[${i}]`))];
  return own;
}

const regexProblem = (regex, flags, at) => {
  try {
    new RegExp(regex, flags);
    return [];
  } catch (e) {
    return [`${at}.regex: ${e.message}`];
  }
};

/** Every problem of a list: the schema first, then what a schema cannot say (each regex compiles, a term has one replacement). */
export function listProblems(list, schema = JSON.parse(readFileSync(SCHEMA_FILE, "utf8"))) {
  const found = problems(schema, list);
  if (found.length) return found;
  return list.terms.flatMap((t, i) => [
    ...regexProblem(t.detect, "i", `terms[${i}].detect`),
    ...t.forms.flatMap((f, j) => regexProblem(f.regex, f.flags ?? "i", `terms[${i}].forms[${j}]`)),
  ]);
}

/** The validated list; throws, listing every problem, when the file does not match the schema. */
export function loadList(file = LIST_FILE) {
  const list = JSON.parse(readFileSync(file, "utf8"));
  const found = listProblems(list);
  if (found.length) throw new Error(`code-names: ${file} is invalid:\n- ${found.join("\n- ")}`);
  return list;
}

const GLOB_TOKENS = { "**/": "(?:.*/)?", "**": ".*", "*": "[^/]*", "?": "[^/]" };
const escapeToken = (t) => GLOB_TOKENS[t] ?? "\\" + t;
const globRegex = (glob) => new RegExp("^" + glob.replace(/\*\*\/|\*\*|\*|\?|[.+^${}()|[\]\\]/g, escapeToken) + "$");

/** The history globs of a repository: the central ones, plus the ones scoped to it (`<repo>:<glob>`). */
function historyGlobs(list, repo) {
  return list.history.flatMap((entry) => {
    const scope = /^([^:/*]+):(.+)$/.exec(entry);
    if (!scope) return [entry];
    return scope[1] === repo ? [scope[2]] : [];
  });
}

/** Whether `path` is a history path, the only permanent exception. */
export function isHistory(path, { list = loadList(), repo } = {}) {
  return historyGlobs(list, repo).some((glob) => globRegex(glob).test(path));
}

const overlaps = (claimed, start, end) => claimed.some((c) => start < c.end && end > c.start);

function claimsOf(text, term) {
  const claimed = [];
  const detect = new RegExp(term.detect, "gi");
  if (!detect.test(text)) return claimed;
  for (const form of term.forms) {
    for (const m of text.matchAll(new RegExp(form.regex, `${form.flags ?? "i"}g`))) {
      const end = m.index + m[0].length;
      if (m[0] && !overlaps(claimed, m.index, end)) claimed.push({ start: m.index, end, form, match: m, term });
    }
  }
  return claimed;
}

function unclassifiedOf(text, term, claimed) {
  const out = [];
  for (const m of text.matchAll(new RegExp(term.detect, "gi"))) {
    if (!overlaps(claimed, m.index, m.index + m[0].length)) out.push({ start: m.index, end: m.index + m[0].length, form: null, match: m, term });
  }
  return out;
}

/** Every place of `text` that writes a term, each with the form that claims it, in text order. */
function placesOf(text, list) {
  const places = list.terms.flatMap((term) => {
    const claimed = claimsOf(text, term);
    return [...claimed, ...unclassifiedOf(text, term, claimed)];
  });
  return places.sort((a, b) => a.start - b.start);
}

function positionOf(text, index) {
  const before = text.slice(0, index);
  const line = before.split("\n").length;
  return { line, column: index - (before.lastIndexOf("\n") + 1) + 1 };
}

/**
 * The hits of `text`, a file at `path`: `{ term, replacement, kind, match, index, line, column }`; `kind` is null when no form knows the
 * place (still a hit). A history path has none.
 */
export function findHits(text, path, { list = loadList(), repo } = {}) {
  if (isHistory(path, { list, repo })) return [];
  return placesOf(text, list).map((p) => {
    const offset = p.match[0].search(new RegExp(p.term.term, "i"));
    const index = p.start + offset;
    return {
      term: p.term.term,
      replacement: p.term.replacement,
      kind: p.form?.kind ?? null,
      match: p.match[0].slice(offset, offset + p.term.term.length),
      index,
      ...positionOf(text, index),
    };
  });
}

const upperFirst = (s) => s[0].toUpperCase() + s.slice(1);

/** The replacement in the case of the name found: upper case stays upper, a capital stays a capital. */
function casedLike(found, replacement) {
  if (found === found.toUpperCase()) return replacement.toUpperCase();
  return found[0] === found[0].toUpperCase() ? upperFirst(replacement) : replacement;
}

function replacementOf(place) {
  const { form, match, term } = place;
  const expanded = form.to.replace(/\$(\d)/g, (_, n) => match[n] ?? "");
  const found = new RegExp(term.term, "i").exec(match[0])[0];
  return expanded.replace(term.replacement, casedLike(found, term.replacement));
}

/**
 * `text` with every place of the asked kinds replaced (all kinds when `kinds` is absent), the case kept. A place of another kind is left
 * as it is, even where a more general form would have matched inside it (a database name stays when only the bare word is asked).
 */
export function replace(text, { kinds, list = loadList() } = {}) {
  const wanted = kinds ? new Set(kinds) : null;
  const edits = placesOf(text, list).filter((p) => p.form && (!wanted || wanted.has(p.form.kind)));
  let out = "";
  let at = 0;
  for (const p of edits) {
    out += text.slice(at, p.start) + replacementOf(p);
    at = p.end;
  }
  return out + text.slice(at);
}
