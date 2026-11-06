// The counts over time: one entry per day, kept on the data branch next to the catalogue (automation/history.json) so the cockpit
// can draw the trend. A run of the same day replaces that day's entry; the list keeps the last MAX_DAYS days.
import { FLAGS } from "./flags.mjs";

export const MAX_DAYS = 400;

/** The day's counts: { date, units, byKind, flags }. */
export function entryOf(catalogue) {
  return { date: catalogue.generatedAt.slice(0, 10), units: catalogue.summary.units, byKind: catalogue.summary.byKind, flags: Object.fromEntries(FLAGS.map((f) => [f, catalogue.summary.flags[f] ?? 0])) };
}

/** The previous history with today's entry added (or replaced). */
export function appendHistory(history, entry) {
  const kept = (Array.isArray(history) ? history : []).filter((e) => e.date !== entry.date);
  return [...kept, entry].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-MAX_DAYS);
}
