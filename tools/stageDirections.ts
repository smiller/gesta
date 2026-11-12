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

interface Play { lines: string[]; out: string[]; changes: Change[]; left: Left[]; opts: Options }
interface Direction { dir: Ch[]; trail: Ch[]; used: number }
const romanLower = (cs: Ch[]): boolean => inkIn(cs, false).some((x) => /\p{Ll}/u.test(x.c));
const bracketedDirection = (body: string): boolean =>
  OPENS.test(body) && !NOTE.test(body) && !NOT_A_DIRECTION.test(body) && !body.includes("**");
const continues = (p: string, b: string, prefix: string): boolean => p === prefix && !!b.trim() && b.startsWith("*");
/* the rows after an open bracket that are italic, their roman ink
   names in capitals, up to a blank line */
/* a row's characters up to its closing bracket, and what follows it; no trail while the bracket stays open */
function rowHead(b: string): { head: Ch[]; trail?: Ch[] } {
  const more = chars(b), at = text(more).indexOf("]");
  return at < 0 ? { head: more } : { head: more.slice(0, at), trail: more.slice(at + 1) };
}
const joinsOn = (head: Ch[]): boolean => !text(head).includes("[") && !romanLower(head);
function joinRows(play: Play, n: number, prefix: string, d: Direction): void {
  for (let k = n + 1; k < play.lines.length; k++) {
    const p = PREFIX.exec(play.lines[k])![1], b = play.lines[k].slice(p.length);
    const row = continues(p, b, prefix) ? rowHead(b) : null;
    if (!row || !joinsOn(row.head)) return;
    d.dir = d.dir.concat([{ c: " ", it: true }], row.head);
    d.used = k;
    if (row.trail) { d.trail = row.trail; return; }
  }
}
function directionOf(play: Play, n: number, prefix: string, body: string): Direction {
  const cs = chars(body);
  const plain = text(cs);
  const open = plain.indexOf("[");
  const close = plain.indexOf("]", open);
  if (close >= 0) return { dir: cs.slice(open + 1, close), trail: cs.slice(close + 1), used: n };
  const d: Direction = { dir: cs.slice(open + 1), trail: [], used: n };
  if (play.opts.join) joinRows(play, n, prefix, d);
  return d;
}
function leftWhy(d: Direction, opts: Options): string | null {
  if (inkIn(d.trail, true).length) return "speech in italics beside the direction";
  return !opts.capitals && inkIn(d.dir, true).length > 0 && romanLower(d.dir) ? "words in roman inside the direction" : null;
}
/* the line the bracketed direction ends on */
function bracketed(play: Play, n: number, prefix: string, body: string): number {
  const line = play.lines[n];
  const d = directionOf(play, n, prefix, body);
  const why = leftWhy(d, play.opts);
  if (why) { play.left.push({ line: n + 1, text: line, why }); play.out.push(line); return n; }
  if (play.opts.capitals && inkIn(d.dir, true).length > 0) d.dir = capitalise(d.dir);
  const after = prefix + "*[" + tidy(text(d.dir)) + "]*" + text(d.trail);
  recordJoin(play, n, d.used, after);
  play.out.push(after);
  return d.used;
}
function recordJoin(play: Play, n: number, used: number, after: string): void {
  for (let k = n + 1; k <= used; k++) play.changes.push({ line: k + 1, before: play.lines[k], after: "(joined to the line above)" });
  if (after !== play.lines[n] || used > n) play.changes.push({ line: n + 1, before: play.lines[n], after });
}
/* a scene set out in italic paragraphs, without brackets: Tey's, its
   names left roman in lower case like a bracketed direction's */
/* mostly italic, or roman only in runs short enough to be names, so a
   speech opening on an emphasised word is not taken; never a bullet or
   a line holding a link */
const sceneLine = (body: string): boolean =>
  body.startsWith("*") && !body.startsWith("* ") && !body.startsWith("*[") && !body.includes("**") && !body.includes("](");
function namesOnly(cs: Ch[], roman: number): boolean {
  const runs = text(cs.map((x) => (x.it ? { c: "\n", it: true } : x))).split("\n");
  return inkIn(cs, true).length > 2 * roman || runs.every((r) => (r.match(WORD) ?? []).length <= 5);
}
function scene(play: Play, n: number, prefix: string, body: string): boolean {
  if (!play.opts.capitals || !sceneLine(body)) return false;
  const cs = chars(body), roman = inkIn(cs, false).length;
  if (!roman || !namesOnly(cs, roman)) return false;
  const after = prefix + "*" + tidy(text(capitalise(cs))) + "*";
  play.changes.push({ line: n + 1, before: play.lines[n], after });
  play.out.push(after);
  return true;
}
function parenthetical(play: Play, n: number): boolean {
  if (!play.opts.capitals) return false;
  const line = play.lines[n];
  const after = line.replace(/\(\*([^()]*)\)/g, (whole, inner: string) => {
    const cs = chars("*" + inner);
    if (!inkIn(cs, false).length) return whole;
    return "(*" + tidy(text(capitalise(cs))) + "*)";
  });
  if (after !== line) play.changes.push({ line: n + 1, before: line, after });
  play.out.push(after);
  return true;
}

export function fixPlay(md: string, opts: Options): { md: string; changes: Change[]; left: Left[] } {
  const play: Play = { lines: md.split("\n"), out: [], changes: [], left: [], opts };
  for (let n = 0; n < play.lines.length; n++) {
    const line = play.lines[n];
    const prefix = PREFIX.exec(line)![1], body = line.slice(prefix.length);
    if (bracketedDirection(body)) n = bracketed(play, n, prefix, body);
    else if (!scene(play, n, prefix, body) && !parenthetical(play, n)) play.out.push(line);
  }
  play.changes.sort((a, b) => a.line - b.line);
  return { md: play.out.join("\n"), changes: play.changes, left: play.left };
}
