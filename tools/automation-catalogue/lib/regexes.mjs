// Measures the regular expressions of a unit (ADR-026 principle 4: a regex over 80 characters is a list, a structured input or a
// real pattern, and is written as such). JavaScript and TypeScript are read with the TypeScript compiler (regex literals and
// `new RegExp(...)`, a constant string followed one step), Python with its own `ast` (`re.*` calls), shell with the word-by-word
// reader of shell-patterns.mjs. One measure for all: { count, longest, over80, long: [the patterns over 80, cut at 200] }.
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { shellPatterns } from "./shell-patterns.mjs";

export const LONG_REGEX = 80;
const PYTHON_PATHS = ["/usr/bin/python3", "/opt/homebrew/bin/python3", "/usr/local/bin/python3"];
// Run with `python3 -I -c`: reads {name: source} on stdin, prints {name: [patterns]}.
const PYTHON_READER = `
import ast, json, sys
FUNCS = {"compile", "search", "match", "fullmatch", "sub", "subn", "findall", "finditer", "split"}
def patterns(source):
    try:
        tree = ast.parse(source)
    except (SyntaxError, ValueError):
        return []
    consts = {}
    for n in ast.walk(tree):
        if isinstance(n, ast.Assign) and isinstance(n.value, ast.Constant) and isinstance(n.value.value, str):
            for t in n.targets:
                if isinstance(t, ast.Name):
                    consts[t.id] = n.value.value
    out = []
    for n in ast.walk(tree):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in FUNCS and isinstance(n.func.value, ast.Name) and n.func.value.id in ("re", "regex"):
            arg = n.args[0] if n.args else next((k.value for k in n.keywords if k.arg == "pattern"), None)
            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                out.append(arg.value)
            elif isinstance(arg, ast.Name) and arg.id in consts:
                out.append(consts[arg.id])
            elif isinstance(arg, ast.JoinedStr):
                out.append(ast.unparse(arg))
    return out
sources = json.load(sys.stdin)
json.dump({name: patterns(src) for name, src in sources.items()}, sys.stdout)
`;

/** The measure of a list of patterns. */
export function measureOf(patterns) {
  const lengths = patterns.map((p) => p.length);
  return {
    count: patterns.length,
    longest: lengths.length ? Math.max(...lengths) : 0,
    over80: lengths.filter((n) => n > LONG_REGEX).length,
    long: patterns.filter((p) => p.length > LONG_REGEX).map((p) => p.slice(0, 200)),
  };
}

const isText = (node) => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);

/** The patterns of a JavaScript or TypeScript source: regex literals and `RegExp(text)` / `new RegExp(text)`. */
export function jsPatterns(text, fileName) {
  const kind = fileName.endsWith(".ts") || fileName.endsWith(".mts") || fileName.endsWith(".cts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
  const constants = new Map();
  const found = [];
  const collect = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.name) && isText(node.initializer)) constants.set(node.name.text, node.initializer.text);
    ts.forEachChild(node, collect);
  };
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
      const literal = node.getText(source);
      found.push(literal.slice(1, literal.lastIndexOf("/")));
    } else if ((ts.isNewExpression(node) || ts.isCallExpression(node)) && ts.isIdentifier(node.expression) && node.expression.text === "RegExp" && node.arguments?.length) {
      const [arg] = node.arguments;
      if (isText(arg)) found.push(arg.text);
      else if (ts.isIdentifier(arg) && constants.has(arg.text)) found.push(constants.get(arg.text));
      else if (arg.kind !== ts.SyntaxKind.RegularExpressionLiteral) found.push(arg.getText(source));
    }
    ts.forEachChild(node, visit);
  };
  collect(source);
  visit(source);
  return found;
}

/** The patterns of many Python sources at once (one `python3` process): { name: source } -> { name: [patterns] }. */
export function pythonPatterns(sources) {
  const names = Object.keys(sources);
  if (names.length === 0) return {};
  const bin = PYTHON_PATHS.find((p) => {
    try {
      execFileSync(p, ["-I", "-c", "pass"]);
      return true;
    } catch {
      return false;
    }
  });
  if (!bin) return Object.fromEntries(names.map((n) => [n, []]));
  return JSON.parse(execFileSync(bin, ["-I", "-c", PYTHON_READER], { input: JSON.stringify(sources), encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }));
}

/** The patterns of one text in a language (Python goes through `pythonPatterns` in batch, see `patternsByUnit`). */
export function patternsOf(text, language, fileName) {
  if (language === "javascript" || language === "typescript") return jsPatterns(text, fileName);
  if (language === "shell") return shellPatterns(text);
  return [];
}
