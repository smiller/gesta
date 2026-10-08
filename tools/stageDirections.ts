/* A whole direction one italic run: a row counts as a line unless
   everything it draws is italic, and a direction with its names in roman
   was counted. `capitals`: the names came in lower case where the print had
   small capitals, and stand outside the italics; `join`: directions run
   over several rows. */

export interface Options { capitals: boolean; join: boolean }
export interface Change { line: number; before: string; after: string }
export interface Left { line: number; text: string; why: string }

type Ch = { c: string; it: boolean };

/* a single * toggles italics; ** is bold, kept as text */
function chars(s: string): Ch[] {
  const out: Ch[] = [];
  let it = false;
  for (let i = 0; i < s.length; i++) {
    if (s.startsWith("**", i)) { out.push({ c: "*", it }, { c: "*", it }); i++; continue; }
    if (s[i] === "*") { it = !it; continue; }
    out.push({ c: s[i], it });
  }
  return out;
}
const text = (cs: Ch[]): string => cs.map((x) => x.c).join("");
const inkIn = (cs: Ch[], italic: boolean): Ch[] => cs.filter((x) => x.it === italic && x.c.trim());

/* roman words set off inside italics that are not names: a foreign phrase,
   a newspaper's title */
const KEEP = new Set(["quid", "pro", "quo", "pas", "seul", "Post"]);
const WORD = /(?<![’'\p{L}])\p{L}[\p{L}.\-]*/gu;

/* the roman runs' words in capitals, a possessive's s left small */
function capitalise(cs: Ch[]): Ch[] {
  const out = cs.map((x) => ({ ...x }));
  let i = 0;
  while (i < out.length) {
    if (out[i].it) { i++; continue; }
    let j = i;
    while (j < out.length && !out[j].it) j++;
    const run = out.slice(i, j).map((x) => x.c).join("");
    for (const m of run.matchAll(WORD)) {
      if (KEEP.has(m[0])) continue;
      const up = m[0].toUpperCase();
      for (let k = 0; k < up.length; k++) out[i + m.index! + k].c = up[k];
    }
    i = j;
  }
  return out;
}

const tidy = (s: string): string => s
  .replace(/(\p{L})“s(?!\p{L})/gu, "$1’s")
  .replace(/(\p{L}) ’s(?!\p{L})/gu, "$1’s")
  .replace(/^\s+/, "").replace(/\s+$/, "");

const PREFIX = /^((?:>\s?)*)/;
const OPENS = /^\*?\s*\[/;
const NOTE = /^\*?\[\*?(?:The end|End) of\b/;

export function fixPlay(md: string, opts: Options): { md: string; changes: Change[]; left: Left[] } {
  const lines = md.split("\n");
  const out: string[] = [];
  const changes: Change[] = [], left: Left[] = [];
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    const prefix = PREFIX.exec(line)![1], body = line.slice(prefix.length);
    if (OPENS.test(body) && !NOTE.test(body) && !body.includes("**")) {
      let cs = chars(body);
      const plain = text(cs);
      const open = plain.indexOf("[");
      let close = plain.indexOf("]", open);
      let dir = cs.slice(open + 1, close < 0 ? cs.length : close);
      const trail = close < 0 ? [] : cs.slice(close + 1);
      let used = n;
      if (close < 0 && opts.join) {
        /* the rows after an open bracket that are italic, their roman ink
           names in capitals, up to a blank line */
        for (let k = n + 1; k < lines.length; k++) {
          const b = lines[k].slice(PREFIX.exec(lines[k])![1].length);
          if (!b.trim() || !b.startsWith("*") || OPENS.test(b)) break;
          const more = chars(b);
          if (inkIn(more, false).some((x) => /\p{Ll}/u.test(x.c))) break;
          dir = dir.concat([{ c: " ", it: true }], more);
          used = k;
          if (text(more).includes("]")) { const at = text(dir).lastIndexOf("]"); dir = dir.slice(0, at); close = 0; break; }
        }
      }
      const romanLower = inkIn(dir, false).some((x) => /\p{Ll}/u.test(x.c));
      const anyItalic = inkIn(dir, true).length > 0;
      if (inkIn(trail, true).length) { left.push({ line: n + 1, text: line, why: "speech in italics beside the direction" }); out.push(line); continue; }
      if (!opts.capitals && anyItalic && romanLower) { left.push({ line: n + 1, text: line, why: "words in roman inside the direction" }); out.push(line); continue; }
      if (opts.capitals && anyItalic) dir = capitalise(dir);
      const after = prefix + "*[" + tidy(text(dir)) + "]*" + text(trail);
      for (let k = n + 1; k <= used; k++) changes.push({ line: k + 1, before: lines[k], after: "(joined to the line above)" });
      if (after !== line || used > n) changes.push({ line: n + 1, before: line, after });
      out.push(after);
      n = used;
      continue;
    }
    if (opts.capitals) {
      const after = line.replace(/\(\*([^()]*)\)/g, (whole, inner: string) => {
        const cs = chars("*" + inner);
        if (!inkIn(cs, false).length) return whole;
        return "(*" + tidy(text(capitalise(cs))) + "*)";
      });
      if (after !== line) changes.push({ line: n + 1, before: line, after });
      out.push(after);
      continue;
    }
    out.push(line);
  }
  changes.sort((a, b) => a.line - b.line);
  return { md: out.join("\n"), changes, left };
}
