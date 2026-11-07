// The architecture's numbers as Markdown (architecture/summary.md on the data branch, and the run's summary).
const cell = (text) => String(text ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ");

export function renderSummary(arch) {
  const s = arch.summary;
  const lines = [
    `# Architecture as code (ADR-027) — ${arch.generatedAt.slice(0, 10)}`,
    "",
    `**${s.inSync} / ${s.active}** active repositories in sync with \`main\` · **${s.drift}** drift items · homes: ${s.homes.ok} ok, ${s.homes.missing} missing, ${s.homes.invalid} invalid${s.unknown ? ` · ${s.unknown} not read` : ""}.`,
    "",
    `Drift by kind: ${Object.entries(s.byKind).map(([k, n]) => `${k} ${n}`).join(", ")}. Read from krizaka/.github at \`${(arch.base.commit ?? "").slice(0, 7)}\`, LikeC4 ${arch.tool.likec4}, @krizaka/org ${arch.tool.org}.`,
    "",
    "| repository | commit | verdict | why |",
    "| :-- | :-- | :-- | :-- |",
  ];
  for (const v of arch.verdicts) {
    const why = v.status === "unknown" ? v.why : v.items.slice(0, 3).map((i) => `${i.kind}: ${i.why}`).join("; ") + (v.items.length > 3 ? ` (+${v.items.length - 3})` : "");
    lines.push(`| ${v.repo} | ${v.commit ? `\`${v.commit.slice(0, 7)}\`` : "—"} | ${v.status} | ${cell(why)} |`);
  }
  lines.push("", "| system | home | model | repositories bound |", "| :-- | :-- | :-- | --: |");
  for (const sys of arch.systems) lines.push(`| ${sys.name} | ${sys.home} | ${sys.status} | ${sys.repos.length} |`);
  return `${lines.join("\n")}\n`;
}
