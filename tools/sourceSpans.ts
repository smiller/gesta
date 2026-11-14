/* Its own scanner: TypeScript 7 exposes none to JavaScript
   (`ts.createScanner` undefined). */
/* a "template" span is a template's text between its substitutions, never
   a substitution, whose strings are strings; `line` marks a // comment */
export interface Span { at: number; to: number; kind: "comment" | "string" | "template"; line: boolean }

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
const text = (x: Lex, at: number, to: number): void => { if (to > at) x.out.push({ at, to, kind: "template", line: false }); };
function template(x: Lex, from: number): number {
  const { src } = x;
  let i = from;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") { i++; continue; }
    if (c === "`") { text(x, from, i); x.prev = "`"; x.word = ""; return i + 1; }
    if (src.startsWith("${", i)) { text(x, from, i); x.braces.push(x.depth++); x.prev = "{"; x.word = ""; return i + 2; }
  }
  text(x, from, i);
  return i;
}
function comment(x: Lex): boolean {
  const line = x.src.startsWith("//", x.i);
  if (!line && !x.src.startsWith("/*", x.i)) return false;
  const e = x.src.indexOf("\n", x.i);
  const to = line ? (e < 0 ? x.src.length : e) : blockEnd(x.src, x.i);
  x.out.push({ at: x.i, to, kind: "comment", line });
  x.i = to;
  return true;
}
function quoted(x: Lex): boolean {
  const c = x.src[x.i];
  if (c !== "'" && c !== '"') return false;
  const to = Math.min(x.src.length, stringEnd(x.src, x.i + 1, c) + 1);
  x.out.push({ at: x.i, to, kind: "string", line: false });
  return moved(x, c, to);
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

export function spans(src: string): Span[] {
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
      out.push({ at: i, to, kind: "comment", line: false });
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
    out.push({ at: i, to, kind: "comment", line: false });
    i = to;
  }
  return out;
}

/* the parts of a page outside the element named, blanked with newlines
   kept, so each part is scanned in place and its line numbers hold */
export function only(src: string, tag: "script" | "style" | "markup"): string {
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


const pageSpans = (src: string): Span[] => [...markupComments(only(src, "markup")), ...spans(only(src, "script")), ...cssComments(only(src, "style"))];
export function spansOf(file: string, src: string): Span[] {
  if (file.endsWith(".css")) return cssComments(src);
  const page = file.endsWith(".svelte") || file.endsWith(".html");
  return page ? pageSpans(src) : spans(src);
}
