/* Its own comment scanner: TypeScript 7 exposes none to JavaScript
   (`ts.createScanner` undefined). */
import { createHash } from "node:crypto";
import { basename, dirname } from "node:path";

export interface Block {
  file: string;
  start: number;
  end: number;
  raw: string;
  body: string;
}

type Span = { at: number; to: number; line: boolean };

interface Lex { src: string; i: number; prev: string; word: string; depth: number; braces: number[]; out: Span[] }

const REGEX_AFTER = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const regexCan = (x: Lex): boolean => x.prev === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(x.prev) || (/\w/.test(x.prev) && REGEX_AFTER.has(x.word));
const moved = (x: Lex, prev: string, i: number): boolean => { x.prev = prev; x.word = ""; x.i = i; return true; };

/* the index of the quote closing a string opened before `i`, or of the line's end */
function stringEnd(src: string, i: number, q: string): number {
  const inside = (k: number): boolean => k < src.length && src[k] !== q && src[k] !== "\n";
  for (; inside(i); i++) if (src[i] === "\\") i++;
  return i;
}
function blockEnd(src: string, at: number): number {
  const e = src.indexOf("*/", at + 2);
  return e < 0 ? src.length : e + 2;
}
function template(x: Lex, i: number): number {
  const { src } = x;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") { i++; continue; }
    if (c === "`") { x.prev = "`"; x.word = ""; return i + 1; }
    if (src.startsWith("${", i)) { x.braces.push(x.depth++); x.prev = "{"; x.word = ""; return i + 2; }
  }
  return i;
}
function comment(x: Lex): boolean {
  const line = x.src.startsWith("//", x.i);
  if (!line && !x.src.startsWith("/*", x.i)) return false;
  const e = x.src.indexOf("\n", x.i);
  const to = line ? (e < 0 ? x.src.length : e) : blockEnd(x.src, x.i);
  x.out.push({ at: x.i, to, line });
  x.i = to;
  return true;
}
function quoted(x: Lex): boolean {
  const c = x.src[x.i];
  if (c !== "'" && c !== '"') return false;
  return moved(x, c, stringEnd(x.src, x.i + 1, c) + 1);
}
const closesSubstitution = (x: Lex): boolean => x.src[x.i] === "}" && x.braces.at(-1) === x.depth - 1;
function templated(x: Lex): boolean {
  if (x.src[x.i] === "`") { x.i = template(x, x.i + 1); return true; }
  if (!closesSubstitution(x)) return false;
  x.braces.pop();
  x.depth--;
  x.i = template(x, x.i + 1);
  return true;
}
function regexEnd(src: string, j: number): number {
  let cls = false;
  for (; j < src.length && src[j] !== "\n"; j++) {
    const c = src[j];
    if (c === "\\") j++;
    else if (c === "[" || c === "]") cls = c === "[";
    else if (c === "/" && !cls) break;
  }
  return j;
}
function regex(x: Lex): boolean {
  if (x.src[x.i] !== "/" || !regexCan(x)) return false;
  let i = regexEnd(x.src, x.i + 1) + 1;
  while (i < x.src.length && /\w/.test(x.src[i])) i++;
  return moved(x, "/", i);
}
function word(x: Lex): boolean {
  if (!/[\w$]/.test(x.src[x.i])) return false;
  let j = x.i;
  while (j < x.src.length && /[\w$]/.test(x.src[j])) j++;
  x.word = x.src.slice(x.i, j);
  x.prev = x.src[j - 1];
  x.i = j;
  return true;
}
function plain(x: Lex): boolean {
  const c = x.src[x.i];
  if (c === "{") x.depth++;
  else if (c === "}") x.depth--;
  if (/\s/.test(c)) { x.i++; return true; }
  return word(x) || moved(x, c, x.i + 1);
}
const LEXEMES = [comment, quoted, templated, regex, plain];

function jsComments(src: string): Span[] {
  const x: Lex = { src, i: 0, prev: "", word: "", depth: 0, braces: [], out: [] };
  while (x.i < src.length) LEXEMES.some((step) => step(x));
  return x.out;
}

function cssComments(src: string): Span[] {
  const out: Span[] = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"') i = stringEnd(src, i + 1, c);
    else if (src.startsWith("/*", i)) {
      const to = blockEnd(src, i);
      out.push({ at: i, to, line: false });
      i = to - 1;
    }
  }
  return out;
}

function markupComments(src: string): Span[] {
  const out: Span[] = [];
  for (let i = src.indexOf("<!--"); i >= 0; i = src.indexOf("<!--", i)) {
    const e = src.indexOf("-->", i + 4);
    const to = e < 0 ? src.length : e + 3;
    out.push({ at: i, to, line: false });
    i = to;
  }
  return out;
}

/* the parts of a page outside the element named, blanked with newlines
   kept, so each part is scanned in place and its line numbers hold */
function only(src: string, tag: "script" | "style" | "markup"): string {
  const re = /<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/g;
  const blank = (s: string): string => s.replace(/[^\n]/g, " ");
  let out = "", last = 0;
  for (let m; (m = re.exec(src)); ) {
    const inner = m.index + m[0].indexOf(">") + 1, innerEnd = inner + m[2].length;
    if (tag === "markup") { out += src.slice(last, m.index) + blank(src.slice(m.index, m.index + m[0].length)); }
    else { out += blank(src.slice(last, inner)) + (m[1] === tag ? m[2] : blank(m[2])) + blank(src.slice(innerEnd, m.index + m[0].length)); }
    last = m.index + m[0].length;
  }
  return out + (tag === "markup" ? src.slice(last) : blank(src.slice(last)));
}

function strip(raw: string): string {
  return raw
    .replace(/^\/\*+|\*+\/$|^<!--|-->$/g, "")
    .split("\n")
    .map((l) => l.replace(/^\s*(\/\/+|\*(?!\/))?/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const pageSpans = (src: string): Span[] => [...markupComments(only(src, "markup")), ...jsComments(only(src, "script")), ...cssComments(only(src, "style"))];
function spansOf(file: string, src: string): Span[] {
  if (file.endsWith(".css")) return cssComments(src);
  const page = file.endsWith(".svelte") || file.endsWith(".html");
  return page ? pageSpans(src) : jsComments(src);
}
interface Lines { line(at: number): number; alone(s: Span): boolean }
function linesOf(src: string): Lines {
  const lineAt: number[] = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineAt.push(i + 1);
  const line = (at: number): number => {
    let lo = 0, hi = lineAt.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (lineAt[m] <= at) lo = m; else hi = m - 1; }
    return lo + 1;
  };
  return { line, alone: (s) => src.slice(lineAt[line(s.at) - 1], s.at).trim() === "" };
}
interface Open { span: Span; block: Block }
/* a line comment alone on the line after another such one joins its block */
const joins = (last: Open | null, s: Span, start: number, lines: Lines): last is Open =>
  !!last && s.line && last.span.line && lines.alone(s) && lines.alone(last.span) && start === last.block.end + 1;
function extend(last: Open, s: Span, end: number, raw: string): void {
  last.block.end = end;
  last.block.raw += "\n" + raw;
  last.block.body = strip(last.block.raw.split("\n").map((l) => l.trim()).join("\n"));
  last.span = s;
}
export function commentBlocks(file: string, src: string): Block[] {
  const spans = spansOf(file, src).sort((a, b) => a.at - b.at);
  const lines = linesOf(src);
  const out: Block[] = [];
  let last: Open | null = null;
  for (const s of spans) {
    const start = lines.line(s.at), end = lines.line(Math.max(s.at, s.to - 1));
    const raw = src.slice(s.at, s.to);
    if (joins(last, s, start, lines)) { extend(last, s, end, raw); continue; }
    const block: Block = { file, start, end, raw, body: strip(raw) };
    out.push(block);
    last = { span: s, block };
  }
  return out;
}

/* ---- the pins ---- */

export interface PinSources {
  steps: string[];
  corner: string;
  bridge: string;
  bridgeRun: string;
  readerRun: string;
  tests: Map<string, string[]>;
}

export interface Pin { text: string; head: string; label: string }

export function pins(body: string): Pin[] {
  return [...body.matchAll(/\(pin:\s*([^()]*)\)/g)].map((m) => {
    const text = m[1].trim();
    const cut = text.indexOf(" › ");
    return cut < 0 ? { text, head: "", label: text } : { text, head: text.slice(0, cut), label: text.slice(cut + 3) };
  });
}

export function testTitles(src: string): string[] {
  return [...src.matchAll(/\b(?:it|test|describe)(?:\.\w+)*(?:\([^()]*\))?\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2].replace(/\\(.)/g, "$1"));
}

function literal(span: string, text: string): boolean {
  return ['"', "'", "`"].some((q) => span.includes(q + text + q));
}

type Resolver = (pin: Pin, src: PinSources) => string | null;
const bridgeLine = (label: string) => (l: string): boolean => l === label || l.startsWith(label + " ");
const bridgePin: Resolver = ({ label }, src) => {
  if (!literal(src.bridge, label)) return "no step \"" + label + "\" in tools/helium-bridge.ts";
  return src.bridgeRun.split("\n").some(bridgeLine(label)) ? null : "no line \"" + label + "\" in tools/expected/bridge.approved.txt";
};
const readerPin: Resolver = ({ label }, src) =>
  src.readerRun.split("\n").some((l) => l.startsWith(label + ": ")) ? null : "no reading \"" + label + "\" in tools/expected/reader.approved.txt";
function consoleRun(corner: string): string[] {
  const lines = corner.split("\n");
  const at = lines.findIndex((l) => l.startsWith("console: "));
  return at < 0 ? [] : [lines[at].slice("console: ".length), ...lines.slice(at + 1)];
}
const consolePin: Resolver = ({ label }, src) =>
  consoleRun(src.corner).some((l) => l.replace(/^\w+: /, "").startsWith(label)) ? null : "no console line beginning \"" + label + "\" in tools/expected/corner.approved.txt";
const testPin: Resolver = ({ head, label }, src) => {
  const files = src.tests.get(head);
  if (!files) return "no " + head + ".ts under src/";
  return files.some((t) => testTitles(t).some((x) => x.startsWith(label))) ? null : "no test in " + head + ".ts titled \"" + label + "…\"";
};
/* a section's text, from its header to the next in its file, else to the file's end */
function sectionIn(file: string, head: string): string | null {
  const starts = [...file.matchAll(/^section\((["'])(.*?)\1, /gm)];
  const at = starts.findIndex((m) => m[2] === head);
  if (at < 0) return null;
  return file.slice(starts[at].index, at + 1 < starts.length ? starts[at + 1].index : undefined);
}
const sectionOf = (steps: string[], head: string): string | null =>
  steps.map((f) => sectionIn(f, head)).find((span) => span !== null) ?? null;
const stepPin: Resolver = ({ head, label }, src) => {
  const span = sectionOf(src.steps, head);
  if (span === null) return "no section \"" + head + "\" in tools/steps/";
  if (!literal(span, label)) return "no reading \"" + label + "\" in the section \"" + head + "\"";
  return src.corner.split("\n").some((l) => l.startsWith(label + ": ")) ? null : "no reading \"" + label + "\" in tools/expected/corner.approved.txt";
};
const RESOLVERS: Record<string, Resolver> = { bridge: bridgePin, reader: readerPin, console: consolePin };
const resolverOf = (head: string): Resolver => RESOLVERS[head] ?? (head.endsWith(".test") ? testPin : stepPin);

/* null when the pin resolves, else why not */
export function unresolved(pin: Pin, src: PinSources): string | null {
  if (!pin.head) return "not in the form `(pin: <where> › <what>)`";
  return resolverOf(pin.head)(pin, src);
}

/* ---- another module named ---- */

export interface NameIndex {
  owners: Map<string, Set<string>>;
  declared: Map<string, Set<string>>;
}

const stem = (file: string): string => basename(file).replace(/(\.test)?(\.svelte)?\.(ts|svelte|css|html|mjs|js)$/, "").toLowerCase();
const unit = (file: string): string => dirname(file) + "/" + stem(file);

export function nameIndex(files: Map<string, string>): NameIndex {
  const owners = new Map<string, Set<string>>();
  const declared = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, k: string, v: string): void => { let s = m.get(k); if (!s) m.set(k, (s = new Set())); s.add(v); };
  for (const [file, src] of files) {
    const code = file.endsWith(".svelte") ? only(src, "script") : src;
    const top = file.endsWith(".svelte") ? /^ {0,2}(?:export\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm : /^(?:export\s+)?(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;
    for (const m of code.matchAll(top)) add(owners, m[1], unit(file));
    for (const m of code.matchAll(/\b(?:function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) add(declared, unit(file), m[1]);
    if (file.endsWith(".svelte")) add(owners, basename(file, ".svelte"), unit(file));
  }
  return { owners, declared };
}

/* a name worth reading as another module's: one with a hump, a digit or
   an underscore, so `open`, `place` and `view` never count */
const coined = (n: string): boolean => /[a-z][A-Z]|[A-Z].*[a-z].*[A-Z]|\d|_/.test(n);

const ROLES: [RegExp, string[]][] = [
  [/\bthe session['’]s\b/, ["src/session"]],
  [/\bthe bridge['’]s\b/, ["src/session"]],
  [/\bmain['’]s\b/, ["src/main"]],
  [/\bthe serializer['’]s\b/, ["src/model/serialize"]],
  [/\bthe parser['’]s\b/, ["src/model/parse"]],
  [/\bthe schema['’]s\b/, ["src/model/schema"]],
  [/\bthe layer['’]s\b/, ["src/store/entries"]],
  [/\bthe warm['’]s\b/, ["src/store/entries"]],
  [/\bthe ledger['’]s\b/, ["src/ui/notices"]],
  [/\bthe gutter['’]s\b/, ["src/editor/linenumbers"]],
  [/\bthe masthead['’]s\b/, ["src/ui/masthead", "src/ui/mastheadmodel"]],
  [/\bthe landing['’]s\b/, ["src/editor/landing"]],
  [/\bthe clipboard['’]s\b/, ["src/ui/clipboard"]],
  [/\bthe source['’]s\b/, ["src/editor/sourceview"]],
  [/\bthe surface['’]s\b/, ["src/editor/surface"]],
  [/\bthe keeper['’]s\b/, ["src/editor/placekeeper"]],
  [/\bthe UI['’]s\b/, ["src/ui/"]],
];
/* an owner ending in a slash is a directory: every file under it owns the noun */
const owns = (owner: string, own: string): boolean => owner.endsWith("/") ? own.startsWith(owner) : own === owner;

function otherIdentifiers(text: string, own: string, index: NameIndex): string[] {
  const mine = index.declared.get(own);
  const other = (tok: string): boolean => {
    const at = index.owners.get(tok);
    return !!at && !at.has(own) && !mine?.has(tok) && coined(tok);
  };
  return [...new Set(text.match(/[A-Za-z_$][\w$]*/g) ?? [])].filter(other);
}
function otherPaths(text: string, file: string, own: string): string[] {
  const self = (path: string): boolean =>
    stem(path) === stem(file) && (!path.includes("/") || own.endsWith(unit(path).replace(/^(\.\.?\/)+/, "")));
  return [...text.matchAll(/(?:[\w.-]+\/)*[\w-]+(?:\.[\w-]+)*\.(?:ts|svelte|mjs|js|css|html)\b/g)].map((m) => m[0]).filter((p) => !self(p));
}
function otherRoles(text: string, own: string): string[] {
  const hits: string[] = [];
  for (const [re, owners] of ROLES) {
    const m = text.match(new RegExp(re.source, "i"));
    if (m && !owners.some((o) => owns(o, own.toLowerCase()))) hits.push(m[0]);
  }
  return hits;
}
export function namesOther(block: Block, index: NameIndex): string[] {
  const own = unit(block.file);
  const text = block.body.replace(/\(pin:[^()]*\)/g, " ");
  return [...new Set([...otherIdentifiers(text, own, index), ...otherPaths(text, block.file, own), ...otherRoles(text, own)])];
}

/* ---- provenance: dates and who asked, kept out of comments ---- */

/* "asked" is left out: nearly every "asked" in a comment is prose ("the
   depth asked for"), and each one recording provenance carried a date.
   "the plan" hits nothing else in the tree (MEASURED by grep over src) */
const PROVENANCE = /\b\d{4}-\d\d-\d\d\b|\bthe reader\b|\bthe review(?:er)?\b|\bconfirmation pass(?:es)?\b|\bthe plan(?:'s)?\b/gi;

export function provenance(block: Block): string[] {
  const text = block.body.replace(/\(pin:[^()]*\)/g, " ").replace(/"[^"]*"|`[^`]*`/g, " ");
  return [...new Set([...text.matchAll(PROVENANCE)].map((m) => m[0]))];
}

/* ---- the diff ---- */

export const ledgerSeal = (blocks: Block[]): string => createHash("sha256").update(JSON.stringify(blocks.map((b) => [b.file, b.raw]))).digest("hex");

/* the new side's added lines, per file, from `git diff --unified=0` */
function addHunk(lines: Set<number>, h: RegExpExecArray): void {
  const a = +h[1], n = h[2] === undefined ? 1 : +h[2];
  for (let k = 0; k < n; k++) lines.add(a + k);
}
export function addedLines(diff: string): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  let file: string | null = null;
  for (const l of diff.split("\n")) {
    if (l.startsWith("+++ ")) {
      file = l === "+++ /dev/null" ? null : l.slice(6);
      if (file) out.set(file, out.get(file) ?? new Set());
      continue;
    }
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (h && file) addHunk(out.get(file)!, h);
  }
  return out;
}

export function touched(blocks: Block[], added: Set<number> | undefined): Block[] {
  if (!added) return [];
  return blocks.filter((b) => { for (let l = b.start; l <= b.end; l++) if (added.has(l)) return true; return false; });
}
