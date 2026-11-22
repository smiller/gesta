import { spans } from "./sourceSpans.ts";

export type Kind = "error" | "warning" | "info" | "success";
export interface Raise { kind: Kind; forms: string[]; site: string; line: number }

const KIND: Record<string, Kind> = {
  error: "error", fail: "error", stuck: "error", stuckIdle: "error",
  warn: "warning", info: "info", progress: "info", succeed: "success", ok: "success",
};
const VARIES = "…";

type Token = { t: "text"; v: string } | { t: "op"; v: string } | { t: "group"; inner: Token[] } | { t: "var" };

const OPS = ["||", "??", "&&", "?", ":", "+"];
const unescape = (s: string): string => s.replace(/\\(.)/g, "$1");

const QUOTES = new Set(['"', "'", "`"]);
const bracket = (c: string): number => ("([{".includes(c) ? 1 : ")]}".includes(c) ? -1 : 0);
/* the index just past a bracket group opened at `i`, quotes and templates skipped */
function groupEnd(s: string, i: number): number {
  let depth = 0;
  for (; i < s.length; i++) {
    if (QUOTES.has(s[i])) { i = quoteEnd(s, i) - 1; continue; }
    depth += bracket(s[i]);
    if (depth === 0) return i + 1;
  }
  return s.length;
}
function quoteEnd(s: string, i: number): number {
  const q = s[i];
  for (i++; i < s.length && s[i] !== q; i++) {
    if (s[i] === "\\") i++;
    else if (q === "`" && s.startsWith("${", i)) i = groupEnd(s, i + 1) - 1;
  }
  return i + 1;
}
/* a template's fixed text, each substitution one … */
function templateText(body: string): string {
  let out = "";
  for (let i = 0; i < body.length; i++) {
    if (body.startsWith("${", i)) { out += VARIES; i = groupEnd(body, i + 1) - 1; }
    else if (body[i] === "\\") out += body[++i] ?? "";
    else out += body[i];
  }
  return out;
}
/* an operand that is not text: a name with its members, calls and indexes */
function atomEnd(s: string, i: number): number {
  while (i < s.length) {
    if (/[\w$.!]/.test(s[i]) || s.startsWith("?.", i)) i += s.startsWith("?.", i) ? 2 : 1;
    else if (s[i] === "(" || s[i] === "[") i = groupEnd(s, i);
    else return i;
  }
  return i;
}
function quoted(s: string, i: number, out: Token[]): number {
  const end = quoteEnd(s, i), body = s.slice(i + 1, end - 1);
  out.push({ t: "text", v: s[i] === "`" ? templateText(body) : unescape(body) });
  return end;
}
function failure(s: string, i: number, out: Token[]): number {
  const open = i + "failMsg".length;
  out.push({ t: "group", inner: [...tokens(s.slice(open + 1, firstArgEnd(s, open))), { t: "op", v: "+" }, { t: "text", v: " — " + VARIES }] });
  return groupEnd(s, open);
}
const opAt = (s: string, i: number): string | undefined => (s.startsWith("?.", i) ? undefined : OPS.find((o) => s.startsWith(o, i)));
function operator(s: string, i: number, out: Token[]): number {
  const op = opAt(s, i) ?? "";
  out.push({ t: "op", v: op });
  return i + op.length;
}
function group(s: string, i: number, out: Token[]): number {
  const end = groupEnd(s, i);
  out.push({ t: "group", inner: tokens(s.slice(i + 1, end - 1)) });
  return end;
}
function operand(s: string, i: number, out: Token[]): number {
  out.push({ t: "var" });
  return Math.max(atomEnd(s, i), i + 1);
}
type Reader = (s: string, i: number, out: Token[]) => number;
const READERS: [(s: string, i: number) => boolean, Reader][] = [
  [(s, i) => /\s/.test(s[i]), (_s, i) => i + 1],
  [(s, i) => QUOTES.has(s[i]), quoted],
  [(s, i) => s.startsWith("failMsg(", i), failure],
  [(s, i) => opAt(s, i) !== undefined, operator],
  [(s, i) => s[i] === "(", group],
];
const step: Reader = (s, i, out) => (READERS.find(([at]) => at(s, i))?.[1] ?? operand)(s, i, out);
function tokens(s: string): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < s.length;) i = step(s, i, out);
  return out;
}

const isOp = (k: Token, v: string): boolean => k.t === "op" && k.v === v;
function splitAt(ts: Token[], v: string): Token[][] {
  const parts: Token[][] = [[]];
  for (const k of ts) if (isOp(k, v)) parts.push([]); else parts[parts.length - 1].push(k);
  return parts;
}
/* the branch after a condition's ?, to its own : (a nested choice counted) */
function choice(ts: Token[], q: number): [Token[], Token[]] {
  let depth = 0;
  for (let i = q + 1; i < ts.length; i++) {
    if (isOp(ts[i], "?")) depth++;
    else if (isOp(ts[i], ":") && depth-- === 0) return [ts.slice(q + 1, i), ts.slice(i + 1)];
  }
  return [ts.slice(q + 1), []];
}
const joined = (a: string, b: string): string => (a + b).replace(/…+/g, VARIES);
function concatenated(parts: Token[][]): string[] {
  return parts.map(formsOf).reduce((acc, next) => acc.flatMap((a) => next.map((b) => joined(a, b))), [""]);
}
function single(ts: Token[]): string[] {
  const k = ts.length === 1 ? ts[0] : null;
  if (k?.t === "text") return [k.v];
  if (k?.t === "group") return formsOf(k.inner);
  return [VARIES];
}
function formsOf(ts: Token[]): string[] {
  const q = ts.findIndex((k) => isOp(k, "?"));
  if (q >= 0) return [...new Set(choice(ts, q).flatMap(formsOf))];
  for (const either of ["||", "??"]) if (ts.some((k) => isOp(k, either))) return [...new Set(splitAt(ts, either).flatMap(formsOf))];
  if (ts.some((k) => isOp(k, "&&"))) return formsOf(splitAt(ts, "&&").pop() ?? []);
  if (ts.some((k) => isOp(k, "+"))) return [...new Set(concatenated(splitAt(ts, "+")))];
  return single(ts);
}
/* every message a raise's first argument can be: its fixed text, … for each part that varies */
export const messageForms = (arg: string): string[] => formsOf(tokens(arg));

/* the source with comments blanked and strings' insides blanked, offsets kept */
function codeOnly(src: string): string {
  const chars = [...src];
  const blank = (at: number, to: number): void => { for (let i = at; i < to; i++) if (chars[i] !== "\n") chars[i] = " "; };
  for (const s of spans(src)) s.kind === "comment" ? blank(s.at, s.to) : blank(s.at + 1, s.to - 1);
  return chars.join("");
}
const CALL = /(?<![\w$])((?:[\w$]+\??\.)*)(error|warn|info|succeed|ok|fail|progress|stuck|stuckIdle)\s*(?:\?\.)?\(/g;
/* a declaration heads its own line, with nothing it is called on: a ternary's
   colon after a call is no signature's */
const lineStart = (code: string, at: number): boolean => /^\s*$/.test(code.slice(code.lastIndexOf("\n", at - 1) + 1, at));
const afterFunction = (code: string, at: number): boolean => /function\s*$/.test(code.slice(Math.max(0, at - 12), at));
function headsLine(code: string, m: RegExpExecArray, close: number): boolean {
  if (m[1]) return false;
  return lineStart(code, m.index) && /^\s*[:{]/.test(code.slice(close));
}
/* a typed parameter is a signature's wherever it stands */
const typed = (arg: string): boolean => /^[\w$]+\??\s*:/.test(arg);
function declared(code: string, m: RegExpExecArray, close: number, arg: string): boolean {
  if (afterFunction(code, m.index) || typed(arg)) return true;
  return headsLine(code, m, close);
}
function firstArgEnd(code: string, open: number): number {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if ("([{".includes(code[i])) depth++;
    else if (")]}".includes(code[i]) && --depth === 0) return i;
    else if (code[i] === "," && depth === 1) return i;
  }
  return code.length;
}
/* a header's parameters on the call's own line: `(text) =>`, `ok(msg, ms) {` */
function ownParameters(line: string): string[] {
  return [...line.matchAll(/\(([^()]*)\)\s*(?::\s*[\w<>[\]|]+\s*)?(?:=>|\{)/g)].flatMap((h) => h[1].split(",").map((p) => p.split(/[:=?]/)[0].trim()));
}
const handedOn = (src: string, at: number, arg: string): boolean =>
  /^[\w$]+$/.test(arg) && ownParameters(src.slice(src.lastIndexOf("\n", at) + 1, at)).includes(arg);
/* these count only called on something: a bare ok() was a helper of the
   same name (pin: alertCatalogue.test › raiseCalls: progress's ends) */
const HELD = new Set(["ok", "fail", "progress", "stuck", "stuckIdle"]);
const unheld = (m: RegExpExecArray): boolean => !m[1] && HELD.has(m[2]);
function raiseAt(src: string, code: string, m: RegExpExecArray): Raise | null {
  if (m[1].startsWith("console.") || unheld(m)) return null;
  const open = m.index + m[0].length - 1, close = groupEnd(code, open);
  const arg = src.slice(open + 1, firstArgEnd(code, open)).trim();
  if (declared(code, m, close, arg) || handedOn(src, m.index, arg)) return null;
  return { kind: KIND[m[2]], forms: arg ? messageForms(arg) : [VARIES], site: (m[1] + m[2] + "(" + arg + ")").replace(/\s+/g, " "), line: src.slice(0, m.index).split("\n").length };
}
/* every call that raises an alert, by its kind's name */
export function raiseCalls(src: string): Raise[] {
  const code = codeOnly(src);
  return [...code.matchAll(CALL)].map((m) => raiseAt(src, code, m)).filter((r): r is Raise => r !== null);
}

export interface Entry { kind: Kind; entry: string }
const HEADING = /^## (Error|Warning|Info|Success)\b/;
const firstCell = (row: string): string => (row.split(/(?<!\\)\|/)[1] ?? "").replace(/\\\|/g, "|");
/* each table row's first cell under a kind's heading, its backticked text */
export function catalogued(md: string): Entry[] {
  let kind: Kind | null = null;
  const out: Entry[] = [];
  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) kind = (HEADING.exec(line)?.[1].toLowerCase() as Kind | undefined) ?? null;
    else if (kind && line.startsWith("|")) for (const m of firstCell(line).matchAll(/`([^`]+)`/g)) out.push({ kind, entry: m[1] });
  }
  return out;
}

export type Placed = Raise & { file: string };
const key = (kind: Kind, entry: string): string => kind + ": " + entry;
/* what a raise needs the catalogue to hold: its fixed words, or its call where its words vary */
const needs = (r: Placed): string[] => [
  ...r.forms.filter((f) => f !== VARIES).map((f) => key(r.kind, f)),
  ...(r.forms.includes(VARIES) ? [key(r.kind, r.file + " › " + r.site)] : []),
];
export function catalogueGaps(raises: Placed[], entries: Entry[]): { missing: string[]; stale: string[] } {
  const have = new Set(entries.map((e) => key(e.kind, e.entry)));
  const wanted = new Map<string, string>();
  for (const r of raises) for (const k of needs(r)) if (!wanted.has(k)) wanted.set(k, k + " (" + r.file + ":" + r.line + ")");
  return {
    missing: [...wanted].filter(([k]) => !have.has(k)).map(([, at]) => at),
    stale: [...have].filter((k) => !wanted.has(k)),
  };
}
