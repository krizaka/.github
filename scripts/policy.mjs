#!/usr/bin/env node
// The reader of policy.json, the org policy (krizaka-internal#2781): loads it, VALIDATES it against docs/standards/policy.schema.json
// and fails closed — an invalid, unknown-key, out-of-bounds or missing file throws, nothing is guessed.
//   node scripts/policy.mjs get train.prCapPerLane    prints one value (a workflow reads it this way)
//   node scripts/policy.mjs check                      validates the file, exit 1 and the problems when invalid
// The validator is dependency-free (like scripts/docs-map.mjs) and covers only the keywords the schema uses; a schema keyword it
// does not know is itself an error, so the schema cannot ask for a check this reader silently skips. Its Python twin is
// krizaka-agents tools/policy.py (same schema, same verdicts).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const POLICY_FILE = join(here, "..", "policy.json");
export const SCHEMA_FILE = join(here, "..", "docs", "standards", "policy.schema.json");

const KNOWN = new Set(["$schema", "$id", "title", "description", "type", "properties", "required", "additionalProperties", "minimum", "maximum", "enum", "const"]);
const TYPES = {
  object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  string: (v) => typeof v === "string",
  integer: (v) => Number.isInteger(v),
  boolean: (v) => typeof v === "boolean",
};

function ownProblems(schema, value, at) {
  const out = [];
  if (!TYPES[schema.type]?.(value)) return [`${at}: expected ${schema.type}`];
  if (schema.const !== undefined && value !== schema.const) out.push(`${at}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) out.push(`${at}: must be one of ${schema.enum.join(", ")}`);
  if (schema.minimum !== undefined && value < schema.minimum) out.push(`${at}: ${value} is under the minimum ${schema.minimum}`);
  if (schema.maximum !== undefined && value > schema.maximum) out.push(`${at}: ${value} is over the maximum ${schema.maximum}`);
  return out;
}

/** Every problem of `value` against `schema`, as readable lines; an empty list is a valid value. */
export function problems(schema, value, at = "policy") {
  const unknown = Object.keys(schema).filter((k) => !KNOWN.has(k)).map((k) => `${at}: the schema uses « ${k} », which this reader does not check`);
  if (unknown.length) return unknown;
  const own = ownProblems(schema, value, at);
  if (schema.type !== "object" || own.length) return own;
  const props = schema.properties ?? {};
  const extra = schema.additionalProperties === false ? Object.keys(value).filter((k) => !(k in props)).map((k) => `${at}: unknown key « ${k} »`) : [];
  const missing = (schema.required ?? []).filter((k) => !(k in value)).map((k) => `${at}: « ${k} » is required`);
  const inner = Object.keys(props).filter((k) => k in value).flatMap((k) => problems(props[k], value[k], `${at}.${k}`));
  return [...extra, ...missing, ...inner];
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`policy: cannot read ${file}: ${e.message}`);
  }
}

/** The validated policy; throws, listing every problem, when the file is missing, not JSON or does not match the schema. */
export function loadPolicy(file = POLICY_FILE, schemaFile = SCHEMA_FILE) {
  const policy = readJson(file);
  const list = problems(readJson(schemaFile), policy);
  if (list.length) throw new Error(`policy: ${file} is invalid:\n- ${list.join("\n- ")}`);
  return policy;
}

/** The value at a dotted path (`train.prCapPerLane`); throws when the path does not exist. */
export function getValue(policy, path) {
  let node = policy;
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object" || !(key in node)) throw new Error(`policy: no value at « ${path} »`);
    node = node[key];
  }
  return node;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, path] = process.argv.slice(2);
  try {
    const policy = loadPolicy();
    if (cmd === "get" && path) console.log(getValue(policy, path));
    else if (cmd === "check") console.log("ok: policy.json matches its schema");
    else {
      console.error("usage: policy.mjs get <dotted.path> | check");
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
