// The regular expressions written in shell: the patterns given to grep/egrep/rg, sed/perl, awk and jq, and the right-hand side of
// `[[ x =~ pattern ]]`. Shell has no parser to borrow, so the text is cut into words with a small tokenizer (quotes, escapes,
// comments, operators) and each command is read word by word. A heuristic, as the ADR says: it can miss a pattern, it never
// counts a plain word as one.

const OPERATORS = new Set(["|", "&", ";", "(", ")", "\n"]);
const META = new Set(["\\", "^", "$", "*", "+", "?", "(", ")", "[", "]", "{", "}", "|"]);
const GREP_COMMANDS = new Set(["grep", "egrep", "rg", "zgrep"]);
const GREP_VALUE_FLAGS = new Set(["-m", "-A", "-B", "-C", "-f", "-g", "-t", "--include", "--exclude", "--exclude-dir", "--glob", "--max-count"]);
const JQ_FUNCTIONS = ["test", "match", "capture", "sub", "gsub", "scan", "splits"];

export const hasMeta = (text) => [...text].some((c) => META.has(c));

/** The end of a quoted run starting after its opening quote at `from`: the index of the closing quote (or the end of the text). */
function findClose(text, from, quote) {
  let i = from;
  while (i < text.length && text[i] !== quote) i += text[i] === "\\" && quote === '"' ? 2 : 1;
  return Math.min(i, text.length);
}

/** One step of the tokenizer: the text a character adds to the current word, where to go next, and whether it ends a word or a command. */
function stepOf(script, i, atWordStart) {
  const c = script[i];
  if (c === "'" || c === '"') {
    const close = findClose(script, i + 1, c);
    return { add: script.slice(i + 1, close), next: close + 1 };
  }
  if (c === "\\" && i + 1 < script.length) return { add: script[i + 1] === "\n" ? "" : c + script[i + 1], next: i + 2 };
  if (c === "#" && atWordStart) {
    const eol = script.indexOf("\n", i);
    return { command: true, next: eol === -1 ? script.length : eol };
  }
  if (OPERATORS.has(c)) return { command: true, next: i + 1 };
  if (c === " " || c === "\t") return { word: true, next: i + 1 };
  return { add: c, next: i + 1 };
}

/** The commands of a script: lists of words, quotes removed, operators and comments dropped. */
export function commandsOf(script) {
  const commands = [];
  let words = [];
  let word = null;
  const endWord = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  let i = 0;
  while (i < script.length) {
    const step = stepOf(script, i, word === null);
    if (step.add !== undefined) word = (word ?? "") + step.add;
    if (step.word || step.command) endWord();
    if (step.command && words.length) {
      commands.push(words);
      words = [];
    }
    i = step.next;
  }
  endWord();
  if (words.length) commands.push(words);
  return commands;
}

/** The text up to the next unescaped `delimiter` from `from`, and the index of that delimiter. */
function untilDelimiter(text, from, delimiter) {
  let i = from;
  while (i < text.length && text[i] !== delimiter) i += text[i] === "\\" ? 2 : 1;
  const end = Math.min(i, text.length);
  return { body: text.slice(from, end), end };
}

const isDelimiter = (c) => c > " " && c.toLowerCase() === c.toUpperCase() && !"0123456789".includes(c);

/** The patterns of a sed (or perl) script: `s<d>pattern<d>…` substitutions and `/pattern/` addresses. */
export function sedPatterns(script) {
  const found = [];
  for (const part of script.split(";")) {
    const cmd = part.trim();
    if (cmd.length > 2 && (cmd[0] === "s" || cmd[0] === "m") && isDelimiter(cmd[1])) {
      found.push(untilDelimiter(cmd, 2, cmd[1]).body);
    } else if (cmd[0] === "/") {
      found.push(untilDelimiter(cmd, 1, "/").body);
    }
  }
  return found.filter(Boolean);
}

const AWK_BEFORE = new Set([" ", "(", "~", "!", "{", "}", ";"]);

/** The `/pattern/` literals of an awk program that hold a metacharacter. */
export function awkPatterns(program) {
  const found = [];
  let i = 0;
  while (i < program.length) {
    if (program[i] === "/" && AWK_BEFORE.has(program[i - 1] ?? " ")) {
      const { body, end } = untilDelimiter(program, i + 1, "/");
      if (body && hasMeta(body)) found.push(body);
      i = end + 1;
    } else {
      i += 1;
    }
  }
  return found;
}

/** The first string argument of the regex functions of a jq program (`test("…")`, `sub("…"; …)`). */
export function jqPatterns(program) {
  const found = [];
  for (const fn of JQ_FUNCTIONS) {
    let at = program.indexOf(`${fn}("`);
    while (at !== -1) {
      const { body } = untilDelimiter(program, at + fn.length + 2, '"');
      if (body) found.push(body);
      at = program.indexOf(`${fn}("`, at + 1);
    }
  }
  return found;
}

const EXTENDED_FLAGS = new Set(["--extended-regexp", "--perl-regexp"]);
const isValueFlag = (arg) => GREP_VALUE_FLAGS.has(arg);
const isOptionWithValue = (arg) => arg.startsWith("--include=") || arg.startsWith("--exclude");

/** The pattern a grep-like command is given (`-e pattern` or the first operand) and whether it is an extended / Perl one. */
function grepPattern(args) {
  let extended = false;
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "-e" && args[i + 1] !== undefined) return { pattern: args[i + 1], extended: true };
    if (!arg.startsWith("-") || arg === "-") return { pattern: arg, extended };
    extended = extended || EXTENDED_FLAGS.has(arg) || (!arg.startsWith("--") && (arg.includes("E") || arg.includes("P")));
    i += isValueFlag(arg) && !isOptionWithValue(arg) ? 2 : 1;
  }
  return null;
}

const firstOperand = (args) => args.find((a) => !a.startsWith("-"));
const scriptAfter = (args, flags) => {
  const at = args.findIndex((a) => flags.includes(a));
  return at !== -1 && args[at + 1] !== undefined ? args[at + 1] : null;
};

const SCRIPT_FLAGS = { sed: ["-e"], perl: ["-e", "-pe", "-ne", "-pi"] };

function grepFound(base, args) {
  const hit = grepPattern(args);
  return hit && (hit.extended || base === "egrep" || hasMeta(hit.pattern)) ? [hit.pattern] : [];
}

function scriptFound(base, args) {
  const script = scriptAfter(args, SCRIPT_FLAGS[base]) ?? (base === "sed" ? firstOperand(args) : null);
  return script ? sedPatterns(script) : [];
}

/** The patterns one command carries, by the command it runs. */
function patternsOfCommand(words) {
  let start = 0;
  while (start < words.length && (words[start].includes("=") || words[start] === "sudo" || words[start] === "xargs")) start += 1;
  const [command = "", ...args] = words.slice(start);
  const base = command.slice(command.lastIndexOf("/") + 1);
  const tilde = words.indexOf("=~");
  const found = tilde !== -1 && words[tilde + 1] ? [words[tilde + 1]] : [];
  if (GREP_COMMANDS.has(base)) return [...found, ...grepFound(base, args)];
  if (base === "sed" || base === "perl") return [...found, ...scriptFound(base, args)];
  if (base === "awk") return [...found, ...awkPatterns(firstOperand(args) ?? "")];
  return base === "jq" ? [...found, ...args.flatMap(jqPatterns)] : found;
}

/** Every regular expression of a shell script (or of the `run:` blocks of a workflow). */
export function shellPatterns(script) {
  return commandsOf(script).flatMap(patternsOfCommand);
}
