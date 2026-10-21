// `krizaka-deploy watch`: the post-merge deploy check as a command (exit 1 when a merge started no deployment).
import { appendFileSync } from "node:fs";
import { createDoctl } from "./doctl.mjs";
import { GuardError } from "./errors.mjs";
import { watch } from "./watch.mjs";

const line = (r) => `${r.app} (${r.repo}@${r.branch}${r.sha ? ` ${r.sha.slice(0, 10)}` : ""})`;

export async function watchCommand({ flag, value }) {
  try {
    const summary = process.env.GITHUB_STEP_SUMMARY;
    const report = await watch(
      { graceMinutes: Number(value("--grace") ?? 10), trigger: flag("--trigger"), only: (value("--apps") ?? "").split(",").filter(Boolean) },
      { doctl: createDoctl(), argv: process.argv.slice(2) },
    );
    console.log(`ok ${report.ok.length} · waiting ${report.waiting.length} · manual ${report.manual.length} · failed ${report.failed.length} · missing ${report.missing.length}`);
    if (summary) {
      const rows = [
        ...report.missing.map((r) => `- **missing** ${line(r)}, merged ${r.ageMinutes} min ago${r.triggered ? `, triggered ${r.triggered}` : ""}`),
        ...report.failed.map((r) => `- **failed** ${line(r)}: ${r.deployment} ${r.phase}`),
      ];
      appendFileSync(summary, `### krizaka-deploy watch\n\n${rows.join("\n") || "Every merge to main started a deployment."}\n`);
    }
    process.exit(report.missing.length ? 1 : 0);
  } catch (error) {
    console.error(error instanceof GuardError ? `REFUSED ${error.message}` : `FAILED ${error.message}`);
    process.exit(1);
  }
}
