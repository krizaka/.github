// The regular expressions written in shell: the patterns given to grep/egrep/rg, sed/perl, awk and jq, and the right-hand side of
// `[[ x =~ pattern ]]`. Shell has no parser to borrow, so the text is cut into words with a small tokenizer (quotes, escapes,
// comments, operators) and each command is read word by word. A heuristic, as the ADR says: it can miss a pattern, it never
// counts a plain word as one.

const OPERATORS = ["|", "&", ";", "(", ")", "\n"];
const META = ["\\", "^", "$", "*", "+", "?", "(", ")", "[", "]", "{", "}", "|"];
const GREP_COMMANDS = ["grep", "egrep", "rg", "zgrep"];
const GREP_VALUE_FLAGS = ["-m", "-A", "-B", "-C", "-f", "-g", "-t", "--include", "--exclude", "--exclude-dir", "--glob", "--max-count"];
const JQ_FUNCTIONS = ["test", "match", "capture", "sub", "gsub", "scan", "splits"];

export const hasMeta = (text) => [...text].some((c) => META.includes(c));

/** The commands of a script: lists of words, quotes removed, operators and comments dropped. */
export function commandsOf(script) {
  const commands = [];
  let words = [];
  let word = null;
  const endWord = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  const endCommand = () => {
    endWord();
    if (words.length) commands.push(words);
    words = [];
  };
  for (let i = 0; i < script.length; i += 1) {
    const c = script[i];
    if (c === "'" || c === '"') {
      const close = findClose(script, i + 1, c);
      word = (word ?? "") + script.slice(i + 1, close);
      i = close;
    } else if (c === "\\" && i + 1 < script.length) {
      word = (word ?? "") + (script[i + 1] === "\n" ? "" : c + script[i + 1]);
      i += 1;
    } else if (c === "#" && word === null) {
      while (i < script.length && script[i] !== "\n") i += 1;
      endCommand();
    } else if (OPERATORS.includes(c)) {
      endCommand();
    } else if (c === " " || c === "\t") {
      endWord();
    } else {
      word = (word ?? "") + c;
    }
  }
  endCommand();
  return commands;
}

function findClose(text, from, quote) {
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === "\\" && quote === '"') i += 1;
    else if (text[i] === quote) return i;
  }
  return text.length;
}

/** The text up to the next unescaped `delimiter` from `from`, and the index of that delimiter. */
function untilDelimiter(text, from, delimiter) {
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === "\\") i += 1;
    else if (text[i] === delimiter) return { body: text.slice(from, i), end: i };
  }
  return { body: text.slice(from), end: text.length };
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

/** The `/pattern/` literals of an awk program that hold a metacharacter. */
export function awkPatterns(program) {
  const found = [];
  for (let i = 0; i < program.length; i += 1) {
    const before = program[i - 1] ?? " ";
    if (program[i] === "/" && [" ", "(", "~", "!", "{", "}", ";"].includes(before)) {
      const { body, end } = untilDelimiter(program, i + 1, "/");
      if (body && hasMeta(body)) found.push(body);
      i = end;
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

function grepPattern(args) {
  let extended = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-e" && args[i + 1] !== undefined) return { pattern: args[i + 1], extended: true };
    if (GREP_VALUE_FLAGS.includes(arg) || arg.startsWith("--include=") || arg.startsWith("--exclude")) {
      i += GREP_VALUE_FLAGS.includes(arg) ? 1 : 0;
    } else if (arg.startsWith("-") && arg.length > 1) {
      extended = extended || arg.includes("E") || arg.includes("P") || arg === "--extended-regexp" || arg === "--perl-regexp";
    } else {
      return { pattern: arg, extended };
    }
  }
  return null;
}

const firstOperand = (args) => args.find((a) => !a.startsWith("-"));
const scriptAfter = (args, flags) => {
  const at = args.findIndex((a) => flags.includes(a));
  return at !== -1 && args[at + 1] !== undefined ? args[at + 1] : null;
};

function patternsOfCommand(words) {
  let start = 0;
  while (start < words.length && (words[start].includes("=") || words[start] === "sudo" || words[start] === "xargs")) start += 1;
  const [command, ...args] = words.slice(start);
  const base = (command ?? "").slice((command ?? "").lastIndexOf("/") + 1);
  const found = [];
  const tilde = words.indexOf("=~");
  if (tilde !== -1 && words[tilde + 1]) found.push(words[tilde + 1]);
  if (GREP_COMMANDS.includes(base)) {
    const hit = grepPattern(args);
    if (hit && (hit.extended || base === "egrep" || hasMeta(hit.pattern))) found.push(hit.pattern);
  } else if (base === "sed") {
    const script = scriptAfter(args, ["-e"]) ?? firstOperand(args);
    if (script) found.push(...sedPatterns(script));
  } else if (base === "perl") {
    const script = scriptAfter(args, ["-e", "-pe", "-ne", "-pi"]);
    if (script) found.push(...sedPatterns(script));
  } else if (base === "awk") {
    const program = firstOperand(args);
    if (program) found.push(...awkPatterns(program));
  } else if (base === "jq") {
    found.push(...args.flatMap(jqPatterns));
  }
  return found;
}

/** Every regular expression of a shell script (or of the `run:` blocks of a workflow). */
export function shellPatterns(script) {
  return commandsOf(script).flatMap(patternsOfCommand);
}
