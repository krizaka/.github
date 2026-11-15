// `krizaka-deploy verify --app <name> --sha <sha>`: exit 1 unless the deployment caused by that commit reaches ACTIVE.
import { appendFileSync } from "node:fs";
import { createDoctl } from "./doctl.mjs";
import { GuardError } from "./errors.mjs";
import { verify } from "./verify.mjs";

export async function verifyCommand({ value }) {
  try {
    const result = await verify(
      {
        app: value("--app"),
        sha: value("--sha"),
        graceMinutes: Number(value("--grace") ?? 10),
        timeoutMinutes: Number(value("--timeout") ?? 25),
        intervalSeconds: Number(value("--interval") ?? 20),
      },
      { doctl: createDoctl(), argv: process.argv.slice(2) },
    );
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### deploy-verify\n\n${result.ok ? "✅" : "❌"} ${result.message}\n`);
    if (!result.ok) console.error(`::error title=deployment failed ${result.app}::${result.message}`);
    else console.log(result.message);
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error(error instanceof GuardError ? `REFUSED ${error.message}` : `FAILED ${error.message}`);
    process.exit(1);
  }
}
