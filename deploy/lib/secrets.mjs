// Where a secret value comes from. Never printed, never logged: callers only ever name the key.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * 1. the environment — `KRIZAKA_SECRET_<KEY>` (CI: repository secrets mapped by the workflow);
 * 2. locally, the company vault through `secret.sh @<product> <KEY>` (stdout is captured, nothing is echoed).
 * Resolves with the value or undefined.
 */
export function createSecretProvider({ env = process.env, product, tool, run = execFileAsync } = {}) {
  const script = tool ?? env.KRIZAKA_SECRET_TOOL ?? join(homedir(), ".krizaka-worktrees/tools/secret.sh");
  return async function secret(key) {
    const fromEnv = env[`KRIZAKA_SECRET_${key}`];
    if (fromEnv) return fromEnv;
    if (!product || !existsSync(script)) return undefined;
    try {
      const { stdout } = await run(script, [`@${product}`, key], { encoding: "utf8" });
      return stdout.replace(/\r?\n$/, "") || undefined;
    } catch {
      return undefined;
    }
  };
}
