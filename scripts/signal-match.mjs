// WHY  « Does this text look like X? » was answered by regexes made of long word lists (269 characters for one category).
//      A list of words is data: it is easier to read, review and extend as a list than as `a|b|\bc\b|d.e`.
// WHAT `countSignals(text, signals)`: how many non-overlapping matches the signals have in the text, scanning left to right
//      (at each position the first signal that matches wins, like an alternation). A signal is a TERM (a string) or a small
//      named RegExp for what a term cannot say (a lookbehind, a digit run). Case-insensitive.
//      Term syntax: plain text is a substring · `|` first = a word starts here · `|` last = a word ends here · `^` first =
//      start of the text · `?` = any one character (not a line break). Example: `|recall|`, `false?positive`, `^security|`.
// HOW  Imported by scripts/public-issue-rules.mjs; nothing to run. Tests: tests/signal-match.test.mjs.
// OWNER krizaka/.github (lane platform), ADR-026 phase D.

const LINE_BREAKS = "\n\r  ";
/** One character of a word: letter, digit or underscore (the `\w` of a regex). */
export const WORD_CHAR = /^\w$/;
const isWordChar = (char) => char !== undefined && WORD_CHAR.test(char);

/** A term as `{ text, atStart, wordStart, wordEnd }`, the text in lower case. */
export function parseTerm(raw) {
  let text = raw.toLowerCase();
  const atStart = text.startsWith("^");
  if (atStart) text = text.slice(1);
  const wordStart = text.startsWith("|");
  if (wordStart) text = text.slice(1);
  const wordEnd = text.endsWith("|");
  if (wordEnd) text = text.slice(0, -1);
  return { text, atStart, wordStart, wordEnd };
}

/** The length matched by the term at `index` of the (lower-case) text, or 0. */
function termLengthAt(text, index, term) {
  if (term.atStart && index !== 0) return 0;
  if (term.wordStart && isWordChar(text[index - 1])) return 0;
  const { text: wanted } = term;
  if (index + wanted.length > text.length) return 0;
  for (let k = 0; k < wanted.length; k++) {
    const char = text[index + k];
    const same = wanted[k] === "?" ? !LINE_BREAKS.includes(char) : wanted[k] === char;
    if (!same) return 0;
  }
  if (term.wordEnd && isWordChar(text[index + wanted.length])) return 0;
  return wanted.length;
}

/** A signal as a function `(text, index) => matched length (0 = no match)`. */
export function compileSignal(signal) {
  if (typeof signal === "string") {
    const term = parseTerm(signal);
    return (text, index) => termLengthAt(text, index, term);
  }
  const sticky = new RegExp(signal.source, "iy");
  return (text, index) => {
    sticky.lastIndex = index;
    return sticky.exec(text)?.[0].length ?? 0;
  };
}

/** The number of non-overlapping matches of the signals in the text. */
export function countSignals(text, signals) {
  const lower = text.toLowerCase();
  const matchers = signals.map(compileSignal);
  let count = 0;
  let index = 0;
  while (index < lower.length) {
    let length = 0;
    for (const matcher of matchers) {
      length = matcher(lower, index);
      if (length > 0) break;
    }
    if (length > 0) count++;
    index += Math.max(length, 1);
  }
  return count;
}
