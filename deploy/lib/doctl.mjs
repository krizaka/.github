// doctl, always in the Krizaka team's context. Nothing here ever switches the global context or touches another team.
import { spawn } from "node:child_process";
import { GuardError } from "./errors.mjs";

/** The only doctl context a Krizaka deploy may use (the other one, `erika`, is not Krizaka's). */
export const CONTEXT = "default";
/** The DigitalOcean team behind that context (`doctl account get`); KRIZAKA_DO_TEAM overrides it. */
export const DEFAULT_TEAM = "Krizaka-team";

/** Runs `doctl <args>`; resolves with stdout, rejects with stderr (never the arguments' values). */
export function defaultExec(args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("doctl", args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => reject(new Error(`doctl could not start: ${e.message}`)));
    child.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error(`doctl ${args.filter((a) => !a.startsWith("-")).slice(0, 3).join(" ")} failed (${code}): ${err.trim().slice(0, 400)}`)),
    );
    child.stdin.end(input ?? "");
  });
}

/** Refuses any doctl context but `default`: a variable, or a flag on the command line. */
export function assertContext({ env = process.env, argv = [] } = {}) {
  const fromEnv = env.DIGITALOCEAN_CONTEXT;
  if (fromEnv && fromEnv !== CONTEXT) {
    throw new GuardError("context", `DIGITALOCEAN_CONTEXT is '${fromEnv}': a Krizaka deploy runs in the '${CONTEXT}' context only`);
  }
  const at = argv.findIndex((a) => a === "--context" || a.startsWith("--context="));
  if (at >= 0) {
    const value = argv[at].includes("=") ? argv[at].split("=")[1] : argv[at + 1];
    if (value !== CONTEXT) throw new GuardError("context", `--context ${value}: only '${CONTEXT}' is allowed`);
  }
}

export function createDoctl({ exec = defaultExec, env = process.env } = {}) {
  const expectedTeam = env.KRIZAKA_DO_TEAM || DEFAULT_TEAM;
  const run = (args, options) => {
    if (args.some((a) => a === "--context" || a === "-c" || a.startsWith("--context="))) {
      throw new GuardError("context", "the context is fixed by krizaka-deploy; do not pass one");
    }
    return exec(["--context", CONTEXT, ...args], options);
  };
  const json = async (args) => {
    const out = await run([...args, "-o", "json"]);
    const parsed = JSON.parse(out || "null");
    return Array.isArray(parsed) ? parsed[0] : parsed;
  };
  return {
    run,
    json,
    expectedTeam,
    /** Refuses when the credentials do not belong to the Krizaka team (whatever the context says). */
    async assertTeam() {
      const account = await json(["account", "get"]);
      const team = account?.team?.name;
      if (team !== expectedTeam) {
        throw new GuardError("team", `doctl is authenticated for team '${team ?? "unknown"}', not '${expectedTeam}'`);
      }
      return team;
    },
  };
}
