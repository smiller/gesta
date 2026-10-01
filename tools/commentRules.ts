/* Its own comment scanner: TypeScript 7 exposes none to JavaScript
   (`ts.createScanner` undefined). */
import { basename, dirname } from "node:path";

export interface Block {
  file: string;
  start: number;
  end: number;
  raw: string;
  body: string;
}

type Span = { at: number; to: number; line: boolean };

function jsComments(src: string): Span[] {
  const out: Span[] = [];
  const braces: number[] = [];
  let depth = 0;
  let prev = "";
  let word = "";
  const REGEX_AFTER = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
  const regexCan = (): boolean => prev === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || (/\w/.test(prev) && REGEX_AFTER.has(word));
  const template = (i: number): number => {
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "\\") { i++; continue; }
      if (c === "`") { prev = "`"; word = ""; return i + 1; }
      if (c === "$" && src[i + 1] === "{") { braces.push(depth++); prev = "{"; word = ""; return i + 2; }
    }
    return i;
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === "/" && n === "/") {
      const e = src.indexOf("\n", i);
      const to = e < 0 ? src.length : e;
      out.push({ at: i, to, line: true });
      i = to;
      continue;
    }
    if (c === "/" && n === "*") {
      const e = src.indexOf("*/", i + 2);
      const to = e < 0 ? src.length : e + 2;
      out.push({ at: i, to, line: false });
      i = to;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      for (; j < src.length && src[j] !== c && src[j] !== "\n"; j++) if (src[j] === "\\") j++;
      i = j + 1; prev = c; word = "";
      continue;
    }
    if (c === "`") { i = template(i + 1); continue; }
    if (c === "}" && braces.length && braces[braces.length - 1] === depth - 1) { braces.pop(); depth--; i = template(i + 1); continue; }
    if (c === "/" && regexCan()) {
      let j = i + 1, cls = false;
      for (; j < src.length && src[j] !== "\n"; j++) {
        if (src[j] === "\\") { j++; continue; }
        if (src[j] === "[") cls = true;
        else if (src[j] === "]") cls = false;
        else if (src[j] === "/" && !cls) break;
      }
      i = j + 1;
      while (i < src.length && /\w/.test(src[i])) i++;
      prev = "/"; word = "";
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    if (/\s/.test(c)) { i++; continue; }
    if (/[\w$]/.test(c)) {
      let j = i;
      while (j < src.length && /[\w$]/.test(src[j])) j++;
      word = src.slice(i, j); prev = src[j - 1]; i = j;
      continue;
    }
    prev = c; word = "";
    i++;
  }
  return out;
}

function cssComments(src: string): Span[] {
  const out: Span[] = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"') {
      for (i++; i < src.length && src[i] !== c && src[i] !== "\n"; i++) if (src[i] === "\\") i++;
    } else if (c === "/" && src[i + 1] === "*") {
      const e = src.indexOf("*/", i + 2);
      const to = e < 0 ? src.length : e + 2;
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

export function commentBlocks(file: string, src: string): Block[] {
  const spans: Span[] = file.endsWith(".css") ? cssComments(src)
    : file.endsWith(".svelte") || file.endsWith(".html") ? [...markupComments(only(src, "markup")), ...jsComments(only(src, "script")), ...cssComments(only(src, "style"))]
    : jsComments(src);
  spans.sort((a, b) => a.at - b.at);
  const lineAt: number[] = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineAt.push(i + 1);
  const line = (at: number): number => { let lo = 0, hi = lineAt.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (lineAt[m] <= at) lo = m; else hi = m - 1; } return lo + 1; };
  const alone = (s: Span): boolean => src.slice(lineAt[line(s.at) - 1], s.at).trim() === "";
  const out: Block[] = [];
  let last: { span: Span; block: Block } | null = null;
  for (const s of spans) {
    const start = line(s.at), end = line(Math.max(s.at, s.to - 1));
    const raw = src.slice(s.at, s.to);
    if (last && s.line && last.span.line && alone(s) && alone(last.span) && start === last.block.end + 1) {
      last.block.end = end;
      last.block.raw += "\n" + raw;
      last.block.body = strip(last.block.raw.split("\n").map((l) => l.trim()).join("\n"));
      last.span = s;
      continue;
    }
    const block: Block = { file, start, end, raw, body: strip(raw) };
    out.push(block);
    last = { span: s, block };
  }
  return out;
}

/* ---- the pins ---- */

export interface PinSources {
  steps: string;
  corner: string;
  bridge: string;
  bridgeRun: string;
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

/* null when the pin resolves, else why not */
export function unresolved(pin: Pin, src: PinSources): string | null {
  if (!pin.head) return "not in the form `(pin: <where> › <what>)`";
  const { head, label } = pin;
  if (head === "bridge") {
    if (!literal(src.bridge, label)) return "no step \"" + label + "\" in tools/helium-bridge.mjs";
    if (!src.bridgeRun.split("\n").some((l) => l === label || l.startsWith(label + " "))) return "no line \"" + label + "\" in tools/expected/bridge.approved.txt";
    return null;
  }
  if (head === "console") {
    const lines = src.corner.split("\n");
    const at = lines.findIndex((l) => l.startsWith("console: "));
    const run = at < 0 ? [] : [lines[at].slice("console: ".length), ...lines.slice(at + 1)];
    return run.some((l) => l.replace(/^\w+: /, "").startsWith(label)) ? null : "no console line beginning \"" + label + "\" in tools/expected/corner.approved.txt";
  }
  if (head.endsWith(".test")) {
    const files = src.tests.get(head);
    if (!files) return "no " + head + ".ts under src/";
    return files.some((t) => testTitles(t).some((x) => x.startsWith(label))) ? null : "no test in " + head + ".ts titled \"" + label + "…\"";
  }
  const starts = [...src.steps.matchAll(/^\s*\[(["'])(.*?)\1, async \(\) => \{/gm)];
  const at = starts.findIndex((m) => m[2] === head);
  if (at < 0) return "no section \"" + head + "\" in tools/helium-steps.mjs";
  const span = src.steps.slice(starts[at].index, at + 1 < starts.length ? starts[at + 1].index : undefined);
  if (!literal(span, label)) return "no reading \"" + label + "\" in the section \"" + head + "\"";
  if (!src.corner.split("\n").some((l) => l.startsWith(label + ": "))) return "no reading \"" + label + "\" in tools/expected/corner.approved.txt";
  return null;
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
  [/\bthe ledger['’]s\b/, ["src/chrome/notices"]],
  [/\bthe gutter['’]s\b/, ["src/editor/linenumbers"]],
  [/\bthe masthead['’]s\b/, ["src/chrome/masthead", "src/chrome/mastheadmodel"]],
  [/\bthe landing['’]s\b/, ["src/editor/landing"]],
  [/\bthe clipboard['’]s\b/, ["src/chrome/clipboard"]],
  [/\bthe source['’]s\b/, ["src/editor/sourceview"]],
  [/\bthe surface['’]s\b/, ["src/editor/surface"]],
  [/\bthe keeper['’]s\b/, ["src/editor/placekeeper"]],
  [/\bthe chrome['’]s\b/, ["src/chrome/"]],
];
/* an owner ending in a slash is a directory: every file under it owns the noun */
const owns = (owner: string, own: string): boolean => owner.endsWith("/") ? own.startsWith(owner) : own === owner;

export function namesOther(block: Block, index: NameIndex): string[] {
  const own = unit(block.file);
  const text = block.body.replace(/\(pin:[^()]*\)/g, " ");
  const hits = new Set<string>();
  const mine = index.declared.get(own);
  for (const tok of new Set(text.match(/[A-Za-z_$][\w$]*/g) ?? [])) {
    const at = index.owners.get(tok);
    if (at && !at.has(own) && !mine?.has(tok) && coined(tok)) hits.add(tok);
  }
  for (const m of text.matchAll(/(?:[\w.-]+\/)*[\w-]+(?:\.[\w-]+)*\.(?:ts|svelte|mjs|js|css|html)\b/g)) {
    const self = stem(m[0]) === stem(block.file) && (!m[0].includes("/") || own.endsWith(unit(m[0]).replace(/^(\.\.?\/)+/, "")));
    if (!self) hits.add(m[0]);
  }
  for (const [re, owners] of ROLES) {
    const m = text.match(re);
    if (m && !owners.some((o) => owns(o, own.toLowerCase()))) hits.add(m[0]);
  }
  return [...hits];
}

/* ---- provenance: the plan's record alone ---- */

/* "asked" is left out: nearly every "asked" in a comment is prose ("the
   depth asked for"), and each one recording provenance carried a date.
   "the plan" hits nothing else in the tree (MEASURED by grep over src) */
const PROVENANCE = /\b\d{4}-\d\d-\d\d\b|\bthe reader\b|\bthe review(?:er)?\b|\bconfirmation pass(?:es)?\b|\bthe plan(?:'s)?\b/gi;

export function provenance(block: Block): string[] {
  const text = block.body.replace(/\(pin:[^()]*\)/g, " ").replace(/"[^"]*"|`[^`]*`/g, " ");
  return [...new Set([...text.matchAll(PROVENANCE)].map((m) => m[0]))];
}

/* ---- the diff ---- */

/* the new side's added lines, per file, from `git diff --unified=0` */
export function addedLines(diff: string): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  let file: string | null = null;
  for (const l of diff.split("\n")) {
    if (l.startsWith("+++ ")) { file = l === "+++ /dev/null" ? null : l.slice(6); if (file) out.set(file, out.get(file) ?? new Set()); continue; }
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (h && file) { const a = +h[1], n = h[2] === undefined ? 1 : +h[2]; for (let k = 0; k < n; k++) out.get(file)!.add(a + k); }
  }
  return out;
}

export function touched(blocks: Block[], added: Set<number> | undefined): Block[] {
  if (!added) return [];
  return blocks.filter((b) => { for (let l = b.start; l <= b.end; l++) if (added.has(l)) return true; return false; });
}
