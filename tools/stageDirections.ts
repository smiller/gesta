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
  const out: Ch[] = [];
  let i = 0;
  while (i < cs.length) {
    if (cs[i].it) { out.push(cs[i++]); continue; }
    let j = i;
    while (j < cs.length && !cs[j].it) j++;
    const run = cs.slice(i, j).map((x) => x.c).join("").replace(WORD, (w) => (KEEP.has(w) ? w : w.toUpperCase()));
    for (const c of run) out.push({ c, it: false });
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
/* a link's text or a note marker, not a direction */
const NOT_A_DIRECTION = /^\*?\s*\[[^\]]*\]\(|^\*?\s*\[\d+\]/;

export function fixPlay(md: string, opts: Options): { md: string; changes: Change[]; left: Left[] } {
  const lines = md.split("\n");
  const out: string[] = [];
  const changes: Change[] = [], left: Left[] = [];
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    const prefix = PREFIX.exec(line)![1], body = line.slice(prefix.length);
    if (OPENS.test(body) && !NOTE.test(body) && !NOT_A_DIRECTION.test(body) && !body.includes("**")) {
      let cs = chars(body);
      const plain = text(cs);
      const open = plain.indexOf("[");
      const close = plain.indexOf("]", open);
      let dir = cs.slice(open + 1, close < 0 ? cs.length : close);
      let trail = close < 0 ? [] : cs.slice(close + 1);
      let used = n;
      if (close < 0 && opts.join) {
        /* the rows after an open bracket that are italic, their roman ink
           names in capitals, up to a blank line */
        for (let k = n + 1; k < lines.length; k++) {
          const p = PREFIX.exec(lines[k])![1], b = lines[k].slice(p.length);
          if (p !== prefix || !b.trim() || !b.startsWith("*")) break;
          const more = chars(b), at = text(more).indexOf("]");
          const head = at < 0 ? more : more.slice(0, at);
          if (text(head).includes("[")) break;
          if (inkIn(head, false).some((x) => /\p{Ll}/u.test(x.c))) break;
          dir = dir.concat([{ c: " ", it: true }], head);
          used = k;
          if (at >= 0) { trail = more.slice(at + 1); break; }
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
    /* a scene set out in italic paragraphs, without brackets: Tey's, its
       names left roman in lower case like a bracketed direction's */
    /* mostly italic, or roman only in runs short enough to be names, so a
       speech opening on an emphasised word is not taken; never a bullet or
       a line holding a link */
    if (opts.capitals && body.startsWith("*") && !body.startsWith("* ") && !body.startsWith("*[") && !body.includes("**") && !body.includes("](")) {
      const cs = chars(body), roman = inkIn(cs, false).length;
      const runs = text(cs.map((x) => (x.it ? { c: "\n", it: true } : x))).split("\n");
      const short = runs.every((r) => (r.match(WORD) ?? []).length <= 5);
      if (roman && (inkIn(cs, true).length > 2 * roman || short)) {
        const after = prefix + "*" + tidy(text(capitalise(cs))) + "*";
        changes.push({ line: n + 1, before: line, after });
        out.push(after);
        continue;
      }
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
