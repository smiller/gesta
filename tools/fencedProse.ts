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

/* the quotation the model would write: one paragraph of lines, a blank
   line two breaks, spelled by the serializer so nothing in it reads as
   markdown it was not */
function quotation(body: string[]): string {
  const kids: Node[] = [];
  const lines = body.map((l) => l.trim());
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  while (lines.length && !lines[0]) lines.shift();
  lines.forEach((l, i) => {
    if (i) kids.push(schema.nodes.hard_break.create());
    if (l) kids.push(schema.text(l));
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
      if (letters(body.join("\n")) !== letters(parseMarkdown(fence.quoted).textContent)) { fence.kind = "unsafe"; delete fence.quoted; }
    }
    if (fence.quoted) out.push(fence.quoted);
    else out.push(...src.slice(i, j + 1));
    fences.push(fence);
    i = j;
  }
  return { md: out.join("\n"), fences };
}
