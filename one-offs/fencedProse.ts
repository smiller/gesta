/* A FENCE WITH NO LANGUAGE HOLDING PROSE is read as a quotation: the
   entries' indented quotations arrived in code fences. Only what reads
   surely as prose moves; a command, a path, an address or a code sign
   keeps the fence, and so does a layout — columns set with tabs, runs of
   spaces or pipes, lines indented apart from one another — which a
   quotation would collapse or redraw (pin: fencedProse.test › fenceKind) */
import { schema } from "../src/model/schema.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import type { Node } from "prosemirror-model";

/* the letters of a text, spacing, the quotation's marks and the marks of
   emphasis aside: a run of stars or underscores opening or closing a word
   was typed as emphasis (pin: fencedProse.test › quoteFencedProse: marks of
   emphasis); one standing apart is text, and its loss a change (pin:
   fencedProse.test › quoteFencedProse: marks the quotation would pair) */
const letters = (s: string): string => s.replace(/^\s*>\s?/gm, "")
  .replace(/(?<![\p{L}\p{N}])[*_]+(?=[\p{L}\p{N}])|(?<=[\p{L}\p{N}.,;:!?’”"')\]])[*_]+(?![\p{L}\p{N}])/gu, "").replace(/\s+/g, "");

export type FenceKind = "code" | "prose" | "aligned" | "unsafe" | "left";

const COMMANDS = new Set(("cd ls git npm npx node yarn pnpm claude rails rake rspec bundle gem ruby python python3 pip pip3 brew sudo curl wget " +
  "cp mv rm mkdir rmdir touch ssh scp rsync open cat echo export source chmod chown tar zip unzip make docker heroku psql mysql " +
  "sqlite3 vim nano grep sed awk find xattr defaults osascript launchctl pbcopy pbpaste tail head less man kill pkill ps top").split(" "));
const CODE_SIGNS = [
  /^(\$|#!|>>>|%)\s/,
  /^(~\/|\/|\.\.?\/|https?:\/\/|www\.)\S*$/,
  /[;{}]\s*$/,
  /==|=>|!=|&&|\|\||\+\+|::|->/,
  /^\s*(def|function|class|import|from|return|var|let|const|#include|SELECT|INSERT|UPDATE|DELETE)\b/,
  /^\s*[\w.[\]]+\s*=\s*\S/,
  /<\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>/i,
  /\w\([^)]*\)\s*$/,
  /^\S{26,}$/,
  /(^|\s)--?[A-Za-z][\w-]*(\s|$)/,
  /\b[A-Za-z]:\\/,
];
const width = (lead: string): number => [...lead].reduce((n, c) => n + (c === "\t" ? 4 : 1), 0);

/* columns set by tabs, a table's bar, runs of spaces, or lines starting at different depths */
const columned = (lines: string[]): boolean =>
  lines.some((l) => /\S\t/.test(l) || /^\s*\|/.test(l)) || lines.filter((l) => /\S {3,}\S/.test(l)).length >= 2;
function aligned(lines: string[]): boolean {
  if (columned(lines)) return true;
  const leads = lines.map((l) => width(/^\s*/.exec(l)![0]));
  return Math.min(...leads) !== Math.max(...leads);
}
const codeLine = (t: string): boolean => COMMANDS.has(t.split(/\s+/)[0]) || CODE_SIGNS.some((re) => re.test(t));
const wordy = (l: string): boolean => l.trim().split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w)).length >= 4;
export function fenceKind(lang: string, body: string[]): FenceKind {
  const lines = body.filter((l) => l.trim());
  if (lang || !lines.length) return "code";
  if (aligned(lines)) return "aligned";
  if (lines.some((l) => codeLine(l.trim()))) return "code";
  return lines.some(wordy) ? "prose" : "code";
}

/* PROSE WRAPPED AT A MEASURE IS ONE LINE A PARAGRAPH: a run whose every
   line but the last reaches the measure, none of them an item, is joined;
   a list and verse keep a line each (pin: fencedProse.test ›
   quoteFencedProse: prose wrapped at a measure) */
const MEASURE = 55;
/* an en dash opening a line is the prose's own, wrapped there; a line
   indented, or a table's row, is never joined */
const ITEM = /^(\d+[.):]|[-*•]|\(?[a-z]\))\s/i;
function unwrapped(lines: string[]): string[] {
  const out: string[] = [];
  let run: string[] = [];
  const flush = (): void => {
    const wrapped = run.length > 1 && run.slice(0, -1).every((l) => l.length >= MEASURE) && !run.some((l) => ITEM.test(l) || /^\s|^\|/.test(l));
    out.push(...(wrapped ? [run.join(" ")] : run));
    run = [];
  };
  for (const l of lines) { if (l) run.push(l); else { flush(); out.push(""); } }
  flush();
  return out;
}
/* THE OLD INLINE SPELLINGS, read: text between slashes is italic, and an
   Emacs link `[[address][label]]` a link; a slash inside a word, an
   address or a fraction is text (pin: fencedProse.test › quoteFencedProse:
   text between slashes is italic) */
const ORG = /\[\[([^\]\s]+)\](?:\[([^\]]+)\])?\]/;
const ITALIC = /(^|[\s([“‘"'—–-])\/(?=[^\s/])([^/\n]*?[\p{L}\p{N}][^/\n]*?[^\s/]|[\p{L}\p{N}])\/(?=$|[\s.,;:!?)\]”’"'—–-])/u;
interface Token { at: number; length: number; node: Node }
const linkToken = (o: RegExpExecArray): Token =>
  ({ at: o.index, length: o[0].length, node: schema.text(o[2] ?? o[1], [schema.marks.link.create({ href: o[1] })]) });
const italicToken = (it: RegExpExecArray): Token =>
  ({ at: it.index + it[1].length, length: it[2].length + 2, node: schema.text(it[2], [schema.marks.em.create()]) });
/* the first link or italic in the text, a link where both start together */
function nextToken(rest: string): Token | null {
  const o = ORG.exec(rest), it = ITALIC.exec(rest);
  const link = o ? linkToken(o) : null, italic = it ? italicToken(it) : null;
  if (!link || !italic) return link ?? italic;
  return link.at <= italic.at ? link : italic;
}
function inline(line: string): Node[] {
  const out: Node[] = [];
  let rest = line;
  for (let t = nextToken(rest); rest; t = nextToken(rest)) {
    if (!t) { out.push(schema.text(rest)); break; }
    if (t.at) out.push(schema.text(rest.slice(0, t.at)));
    out.push(t.node);
    rest = rest.slice(t.at + t.length);
  }
  return out;
}
/* the same line as the words it reads as */
const plain = (line: string): string => inline(line).map((n) => n.text).join("");
/* the quotation the model would write: one paragraph of lines, a blank
   line two breaks, spelled as it reads back, so a mark of emphasis typed in
   the fence is written as the model writes emphasis */
/* a rule drawn with underscores or stars, no letter in it, is code: in a
   quotation, which is one paragraph, its marks would pair with the next
   rule's (pin: fencedProse.test › quoteFencedProse: a line of a layout
   with no letter) */
const RULE = /^(?=.*[_*]{2})[^\p{L}\p{N}]+$/u;
function paragraph(lines: string[]): Node {
  const kids: Node[] = [];
  unwrapped(lines).forEach((l, i) => {
    if (i) kids.push(schema.nodes.hard_break.create());
    if (RULE.test(l.trim())) kids.push(...(l.match(/^\s*/)![0] ? [schema.text(l.match(/^\s*/)![0])] : []), schema.text(l.trim(), [schema.marks.code.create()]));
    else if (l) kids.push(...inline(l));
  });
  return schema.nodes.paragraph.create(null, kids);
}
/* a single space opening a line is a wrap's, not an indent */
const lead = (l: string): number => { const w = width(/^\s*/.exec(l)![0]); return w < 2 ? 0 : w; };
/* the lines with the fence's blank ends gone and, kept by a layout, each
   line's indent past the least */
function rows(body: string[], layout: boolean): string[] {
  const out = body.map((l) => layout ? l.replace(/\s+$/, "") : l.trim());
  while (out.length && !out[out.length - 1]) out.pop();
  while (out.length && !out[0]) out.shift();
  if (!layout) return out;
  const least = Math.min(...out.filter((l) => l).map(lead));
  return out.map((l) => l && " ".repeat(lead(l) - least) + l.trimStart());
}
/* a fence asked to be a quotation for all its layout: kept line for line,
   its indented lines a quotation inside it, or a list of its unindented
   lines with the indented ones their sub-items */
export type Shape = "layout" | "nest" | "outline";
function outline(lines: string[]): Node[] {
  const items: Node[][] = [];
  for (const l of lines.filter((l) => l)) {
    if (/^\s/.test(l) && items.length) items[items.length - 1].push(schema.nodes.list_item.create(null, paragraph([l.trimStart()])));
    else items.push([paragraph([l])]);
  }
  return [schema.nodes.bullet_list.create(null, items.map(([head, ...subs]) =>
    schema.nodes.list_item.create(null, subs.length ? [head, schema.nodes.bullet_list.create(null, subs)] : [head])))];
}
/* a line joins the group before it when blank or indented as its first line is */
const joinsGroup = (last: string[] | undefined, l: string): last is string[] => !!last && (!l || /^\s/.test(last[0]) === /^\s/.test(l));
function nest(lines: string[]): Node[] {
  const groups: string[][] = [];
  for (const l of lines) {
    const last = groups[groups.length - 1];
    if (joinsGroup(last, l)) last.push(l); else groups.push([l]);
  }
  return groups.map((g) => /^\s/.test(g[0]) ? schema.nodes.blockquote.create(null, paragraph(rows(g, true))) : paragraph(g));
}
const SHAPES: Record<Shape, (lines: string[]) => Node[]> = { outline, nest, layout: (lines) => indentedWhole(lines) };
function shaped(body: string[], shape?: Shape): Node[] {
  const lines = rows(body, !!shape);
  return shape ? SHAPES[shape](lines) : [paragraph(lines)];
}
/* a layout's paragraph indented whole is a quotation inside it, the
   indented paragraphs in a row one quotation, their blank lines kept; a
   paragraph only partly indented is verse, and keeps its indents (pin:
   fencedProse.test › quoteFencedProse: in a layout a paragraph indented
   whole) */
function paragraphsOf(lines: string[]): string[][] {
  const paras: string[][] = [[]];
  for (const l of lines) {
    const last = paras[paras.length - 1];
    if (l) last.push(l);
    else if (last.length) paras.push([]);
  }
  return paras;
}
function indentedWhole(lines: string[]): Node[] {
  const paras = paragraphsOf(lines);
  const out: Node[] = [];
  let run: string[] = [], inner = false;
  const flush = (): void => {
    if (run.length) out.push(inner ? schema.nodes.blockquote.create(null, paragraph(rows(run, true))) : paragraph(run));
    run = [];
  };
  for (const p of paras.filter((p) => p.length)) {
    const whole = p.every((l) => /^\s/.test(l));
    if (whole !== inner) { flush(); inner = whole; }
    run.push(...(run.length ? ["", ...p] : p));
  }
  flush();
  return out;
}
function quotation(body: string[], shape?: Shape): string {
  const doc = schema.nodes.doc.create(null, schema.nodes.blockquote.create(null, shaped(body, shape)));
  return serializeMarkdown(parseMarkdown(serializeMarkdown(doc))).replace(/\n+$/, "");
}

export interface Fence { line: number; kind: FenceKind; body: string[]; quoted?: string }
/* `leave`: a fence's first line, named to keep it as it stands; `asked`:
   one named to be a quotation whatever it reads as, and its shape */
export function quoteFencedProse(md: string, leave: (line: number) => boolean = () => false,
  asked: (line: number) => Shape | undefined = () => undefined): { md: string; fences: Fence[] } {
  const src = md.split("\n"), out: string[] = [], fences: Fence[] = [];
  for (let i = 0; i < src.length; i++) {
    const open = /^(```|~~~)\s*(\S*).*$/.exec(src[i]);
    if (!open) { out.push(src[i]); continue; }
    let j = i + 1;
    while (j < src.length && !new RegExp("^" + open[1] + "\\s*$").test(src[j])) j++;
    if (j >= src.length) { out.push(...src.slice(i)); break; }
    const body = src.slice(i + 1, j);
    const fence: Fence = { line: i + 1, kind: fenceKind(open[2].replace(/`/g, ""), body), body };
    const shape = asked(fence.line);
    if (shape) fence.kind = "prose";
    if (fence.kind === "prose" && leave(fence.line)) fence.kind = "left";
    if (fence.kind === "prose") {
      fence.quoted = quotation(body, shape);
      /* a quotation that would read as other words than the fence held,
         or whose marks run over a line break, keeps the fence (pin:
         fencedProse.test › quoteFencedProse: a quotation that would change
         the words) (pin: fencedProse.test › quoteFencedProse: marks the
         quotation would pair) */
      const read = parseMarkdown(fence.quoted);
      let paired = false;
      read.descendants((n) => { if (n.type.name === "hard_break" && n.marks.some((m) => m.type.name !== "code")) paired = true; });
      if (paired || letters(body.map(plain).join("\n")) !== letters(read.textContent)) { fence.kind = "unsafe"; delete fence.quoted; }
    }
    if (fence.quoted) out.push(fence.quoted);
    else out.push(...src.slice(i, j + 1));
    fences.push(fence);
    i = j;
  }
  return { md: out.join("\n"), fences };
}
