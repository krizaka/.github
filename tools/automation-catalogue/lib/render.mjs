// The markdown summary of the catalogue (published beside catalogue.json): counts by kind, the flags, a table per repository and
// the units behind each flag. Facts only, copied from the JSON; the trend comes from history.json.
import { FLAGS } from "./flags.mjs";

const TITLES = { nothingCalls: "Nothing calls it", noTest: "No test", regexOver80: "Regex over 80 characters", overSize: "Over 400 lines", noHeader: "No header", copied: "Copied" };
const LISTED = 40;
const row = (cells) => `| ${cells.join(" | ")} |`;
const table = (head, rows) => [row(head), row(head.map(() => ":--")), ...rows.map(row)].join("\n");
const short = (text, max = 90) => (text.length > max ? `${text.slice(0, max - 1)}…` : text).split("|").join("\\|");

function repoTable(summary) {
  const rows = Object.entries(summary.repos)
    .sort(([a, x], [b, y]) => FLAGS.reduce((n, f) => n + y[f], 0) - FLAGS.reduce((n, f) => n + x[f], 0) || (a < b ? -1 : 1))
    .map(([name, r]) => [name, r.units, ...FLAGS.map((f) => r[f])]);
  return table(["Repository", "Units", ...FLAGS.map((f) => TITLES[f])], rows);
}

function flagList(units, flag) {
  const hits = units.filter((u) => u.flags.includes(flag));
  const sorted = flag === "regexOver80" ? hits.sort((a, b) => b.regex.longest - a.regex.longest) : hits;
  const lines = sorted.slice(0, LISTED).map((u) => `- \`${u.repo}\` \`${u.path}\` (${u.kind}, ${u.lines} lines${flag === "regexOver80" ? `, longest regex ${u.regex.longest}` : ""})`);
  const more = hits.length > LISTED ? [`- … and ${hits.length - LISTED} more in catalogue.json`] : [];
  return `### ${TITLES[flag]} (${hits.length})\n\n${[...lines, ...more].join("\n") || "None."}`;
}

/** The page. `history` is the list of daily entries (may be empty). */
export function renderCatalogue(catalogue, history = []) {
  const { summary, units } = catalogue;
  const kinds = table(["Kind", "Units"], Object.entries(summary.byKind).map(([k, n]) => [k, n]));
  const types = table(["Type", "Units"], Object.entries(summary.byType).map(([k, n]) => [k, n]));
  const recent = history.slice(-14).map((e) => [e.date, e.units, ...FLAGS.map((f) => e.flags[f])]);
  return [
    "# Automation catalogue",
    `Generated ${catalogue.generatedAt} by ${catalogue.runUrl ?? "a local run"} from the files of ${catalogue.repositories.length} active repositories at their default branch (ADR-026). Machine-readable: [catalogue.json](catalogue.json), schema \`${catalogue.schema}\`; fields explained in docs/standards/automation-catalogue.md.`,
    `**${summary.units} units.**`,
    "## By kind\n\n" + kinds,
    "## By type\n\n" + types,
    "## By repository\n\n" + repoTable(summary),
    "## Flags\n\n" + FLAGS.map((f) => flagList(units, f)).join("\n\n"),
    ...(recent.length ? ["## Over time\n\n" + table(["Day", "Units", ...FLAGS.map((f) => TITLES[f])], recent)] : []),
  ].join("\n\n") + "\n";
}
