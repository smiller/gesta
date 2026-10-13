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

/* the letters of a text, spacing and the quotation's marks aside */
const letters = (s: string): string => s.replace(/^\s*>\s?/gm, "").replace(/\s+/g, "");

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

export function fenceKind(lang: string, body: string[]): FenceKind {
  if (lang) return "code";
  const lines = body.filter((l) => l.trim());
  if (!lines.length) return "code";
  if (lines.some((l) => /\S\t/.test(l) || /^\s*\|/.test(l)) || lines.filter((l) => /\S {3,}\S/.test(l)).length >= 2) return "aligned";
  const leads = lines.map((l) => width(/^\s*/.exec(l)![0]));
  if (Math.min(...leads) !== Math.max(...leads)) return "aligned";
  for (const l of lines) {
    const t = l.trim();
    if (COMMANDS.has(t.split(/\s+/)[0])) return "code";
    if (CODE_SIGNS.some((re) => re.test(t))) return "code";
  }
  const wordy = lines.some((l) => {
    const words = l.trim().split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w));
    return words.length >= 4;
  });
  return wordy ? "prose" : "code";
}

/* PROSE WRAPPED AT A MEASURE IS ONE LINE A PARAGRAPH: a run whose every
   line but the last reaches the measure, none of them an item, is joined;
   a list and verse keep a line each (pin: fencedProse.test ›
   quoteFencedProse: prose wrapped at a measure) */
const MEASURE = 55;
/* an en dash opening a line is the prose's own, wrapped there */
const ITEM = /^(\d+[.):]|[-*•]|\(?[a-z]\))\s/i;
function unwrapped(lines: string[]): string[] {
  const out: string[] = [];
  let run: string[] = [];
  const flush = (): void => {
    const wrapped = run.length > 1 && run.slice(0, -1).every((l) => l.length >= MEASURE) && !run.some((l) => ITEM.test(l));
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
const ITALIC = /(^|[\s([“‘"'—–-])\/(?=[^\s/])([^/\n]*?[^\s/])\/(?=$|[\s.,;:!?)\]”’"'—–-])/;
function inline(line: string): Node[] {
  const out: Node[] = [];
  let rest = line;
  while (rest) {
    const o = ORG.exec(rest), it = ITALIC.exec(rest);
    const oAt = o ? o.index : Infinity, iAt = it ? it.index + it[1].length : Infinity;
    if (oAt === Infinity && iAt === Infinity) { out.push(schema.text(rest)); break; }
    if (oAt <= iAt) {
      if (oAt) out.push(schema.text(rest.slice(0, oAt)));
      out.push(schema.text(o![2] ?? o![1], [schema.marks.link.create({ href: o![1] })]));
      rest = rest.slice(oAt + o![0].length);
    } else {
      if (iAt) out.push(schema.text(rest.slice(0, iAt)));
      out.push(schema.text(it![2], [schema.marks.em.create()]));
      rest = rest.slice(iAt + it![2].length + 2);
    }
  }
  return out;
}
/* the same line as the words it reads as */
const plain = (line: string): string => inline(line).map((n) => n.text).join("");
/* the quotation the model would write: one paragraph of lines, a blank
   line two breaks, spelled by the serializer so nothing in it reads as
   markdown it was not */
function quotation(body: string[]): string {
  const kids: Node[] = [];
  let lines = body.map((l) => l.trim());
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  while (lines.length && !lines[0]) lines.shift();
  lines = unwrapped(lines);
  lines.forEach((l, i) => {
    if (i) kids.push(schema.nodes.hard_break.create());
    if (l) kids.push(...inline(l));
  });
  const doc = schema.nodes.doc.create(null, schema.nodes.blockquote.create(null, schema.nodes.paragraph.create(null, kids)));
  return serializeMarkdown(doc).replace(/\n+$/, "");
}

export interface Fence { line: number; kind: FenceKind; body: string[]; quoted?: string }
/* `leave`: a fence's first line, named to keep it as it stands */
export function quoteFencedProse(md: string, leave: (line: number) => boolean = () => false): { md: string; fences: Fence[] } {
  const src = md.split("\n"), out: string[] = [], fences: Fence[] = [];
  for (let i = 0; i < src.length; i++) {
    const open = /^(```|~~~)\s*(\S*).*$/.exec(src[i]);
    if (!open) { out.push(src[i]); continue; }
    let j = i + 1;
    while (j < src.length && !new RegExp("^" + open[1] + "\\s*$").test(src[j])) j++;
    if (j >= src.length) { out.push(...src.slice(i)); break; }
    const body = src.slice(i + 1, j);
    const fence: Fence = { line: i + 1, kind: fenceKind(open[2].replace(/`/g, ""), body), body };
    if (fence.kind === "prose" && leave(fence.line)) fence.kind = "left";
    if (fence.kind === "prose") {
      fence.quoted = quotation(body);
      /* a quotation that would read as other words than the fence held
         keeps the fence (pin: fencedProse.test › quoteFencedProse: a
         quotation that would change the words) */
      if (letters(body.map(plain).join("\n")) !== letters(parseMarkdown(fence.quoted).textContent)) { fence.kind = "unsafe"; delete fence.quoted; }
    }
    if (fence.quoted) out.push(fence.quoted);
    else out.push(...src.slice(i, j + 1));
    fences.push(fence);
    i = j;
  }
  return { md: out.join("\n"), fences };
}
