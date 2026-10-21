#!/usr/bin/env node
// Fast local loop, one-time setup per machine (idempotent): lets Testcontainers reuse the singleton Postgres / Redis /
// RabbitMQ of AbstractContainerIntegrationTest (`.withReuse(true)`) across Maven runs instead of starting them each time.
// Reuse is a per-machine opt-in (~/.testcontainers.properties); CI never has the file, so CI keeps fresh containers.
//   node scripts/devx-local.mjs          write the setting
//   node scripts/devx-local.mjs --check  exit 1 when it is missing
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const KEY = "testcontainers.reuse.enable";

/** The properties text with `testcontainers.reuse.enable=true`, other lines untouched. */
export function withReuse(text = "") {
  const line = `${KEY}=true`;
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l.trim().startsWith(`${KEY}=`) || l.trim().startsWith(`${KEY} `));
  if (i >= 0) {
    lines[i] = line;
    return lines.join("\n");
  }
  return `${text}${text === "" || text.endsWith("\n") ? "" : "\n"}${line}\n`;
}

export const hasReuse = (text = "") => text.split("\n").some((l) => l.replace(/\s/g, "") === `${KEY}=true`);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = join(homedir(), ".testcontainers.properties");
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (process.argv.includes("--check")) process.exit(hasReuse(current) ? 0 : 1);
  if (hasReuse(current)) console.log(`${file}: reuse already enabled`);
  else {
    writeFileSync(file, withReuse(current));
    console.log(`${file}: ${KEY}=true written`);
  }
}
