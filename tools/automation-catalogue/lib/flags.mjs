// The flags of a unit, the questions the founder asks of the catalogue (ADR-026 principle 2 and the guards of phase F):
// nothing-calls-it, no-test, regex-over-80, over-size, no-header, copied. Computed once here so the cockpit, the markdown and the
// future conformance rules read the same answer.
export const MAX_LINES = 400;
export const FLAGS = ["nothingCalls", "noTest", "regexOver80", "overSize", "noHeader", "copied"];

const CALLABLE = ["script", "npm-script", "workflow", "action", "hook-config"];
const hasEvent = (unit) => unit.calledBy.some((c) => c.type === "event");

/** The flags that hold for a unit, in the order of FLAGS. */
export function flagsOf(unit) {
  const flags = [];
  if (CALLABLE.includes(unit.type) && unit.calledBy.length === 0 && !hasEvent(unit)) flags.push("nothingCalls");
  if (unit.tests?.required && !unit.tests.has) flags.push("noTest");
  if (unit.regex?.over80 > 0) flags.push("regexOver80");
  if (unit.type === "script" && unit.lines > MAX_LINES) flags.push("overSize");
  if (unit.header === false) flags.push("noHeader");
  if (unit.copies?.length > 0) flags.push("copied");
  return flags;
}
