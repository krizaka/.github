// The header of an automation (ADR-026 principle 3): the comment block at the top that says why it exists, what it does and how
// it runs ("manual" when a person runs it). Read as prose: the leading comment lines, a Python docstring, a /* */ block. A header
// is present when that prose holds at least MIN_LETTERS letters. `what` is its first sentence, the catalogue's description.

export const MIN_LETTERS = 60;
const SKIPPED_LINES = new Set(["", "set -e", "set -eu", "set -euo pipefail", "'use strict';", '"use strict";']);
const QUOTES = ['"""', "'''"];

const isLetter = (c) => c.toLowerCase() !== c.toUpperCase();
const lettersIn = (text) => [...text].filter(isLetter).length;
const stripMarks = (line, marks) => {
  let at = 0;
  while (at < line.length && marks.includes(line[at])) at += 1;
  return line.slice(at).trim();
};

function isSkippable(line) {
  return line.startsWith("#!") || SKIPPED_LINES.has(line) || line.startsWith("# shellcheck") || line.startsWith("# -*-");
}

const isLeading = (line, language) => isSkippable(line) || (language === "yaml" && (line.startsWith("name:") || line.startsWith("run-name:")));
const isLineComment = (line) => line.startsWith("//") || (line.startsWith("#") && !line.startsWith("#!"));

/** A block opener (`"""`, `'''` in Python, `/*`): its first prose and the closing mark still to find, or null when the line opens none. */
function openingOf(line, language) {
  const quote = language === "python" ? QUOTES.find((q) => line.startsWith(q)) : undefined;
  if (quote) {
    const rest = line.slice(3);
    const end = rest.indexOf(quote);
    return end === -1 ? { text: rest, close: quote, last: false } : { text: rest.slice(0, end), close: null, last: true };
  }
  if (!line.startsWith("/*")) return null;
  const end = line.indexOf("*/");
  return end === -1 ? { text: stripMarks(line.slice(2), "*/ "), close: "*/", last: false } : { text: stripMarks(line.slice(2, end), "*/ "), close: null, last: false };
}

/** The prose lines of the header of a file, in order (empty when there is none). */
export function headerLines(text, language) {
  const out = [];
  let close = null;
  for (const raw of text.split("\n").slice(0, 60)) {
    const line = raw.trim();
    if (close) {
      const end = line.indexOf(close);
      out.push(stripMarks(end === -1 ? line : line.slice(0, end), "*#/ "));
      if (end !== -1) close = null;
      continue;
    }
    if (out.length === 0 && isLeading(line, language)) continue;
    const opening = openingOf(line, language);
    if (opening) {
      out.push(opening.text);
      close = opening.close;
      if (opening.last) break;
    } else if (isLineComment(line)) {
      out.push(stripMarks(line, "/# "));
    } else {
      break;
    }
  }
  return out.filter(Boolean);
}

/** { present, manual, what } for one file. */
export function headerOf(text, language) {
  const prose = headerLines(text, language).join(" ");
  return { present: lettersIn(prose) >= MIN_LETTERS, manual: prose.toLowerCase().includes("manual"), what: firstSentence(prose) };
}

/** The first sentence: up to the first full stop followed by a space or the end, at most 200 characters. */
export function firstSentence(prose) {
  const flat = prose.split(" ").filter(Boolean).join(" ");
  let end = flat.length;
  for (let i = 0; i < flat.length; i += 1) {
    if (flat[i] === "." && (i === flat.length - 1 || flat[i + 1] === " ")) {
      end = i + 1;
      break;
    }
  }
  return flat.slice(0, Math.min(end, 200));
}
