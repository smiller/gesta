/* A SPEECH'S LINES CLOSED UP inside a `::: verse` block, quoted or not: the
   blank lines between two lines of verse go, those before a speaker and
   round a bracketed direction stay, and a run of blank lines becomes one. A
   line wholly italic and not in brackets is verse (pin: speechGaps.test ›
   speechGaps: a line wholly italic). A gap whose line above is listed apart stays. */

export interface Change { line: number; above: string; below: string; kind: "joined" | "collapsed" }

const body = (l: string): string => l.replace(/^(?:> ?)*/, "").trim();
const blank = (l: string): boolean => !body(l);
const isLine = (l: string): boolean => {
  const t = body(l);
  return !!t && !/^\*\*.*\*\*$/.test(t) && !/^\*\(.*\)\*$/.test(t) && !t.startsWith(":::");
};

function inVerse(verse: boolean, l: string): boolean {
  if (/^::: ?verse\b/.test(body(l))) return true;
  return verse && body(l) !== ":::";
}
function gapEnd(lines: string[], i: number): number {
  let j = i;
  while (j + 1 < lines.length && blank(lines[j + 1])) j++;
  return j;
}

interface Closing { lines: string[]; out: string[]; changes: Change[]; apart: string[] }
const joins = (c: Closing, above: string, below: string): boolean => isLine(above) && isLine(below) && !c.apart.includes(above);
/* the blank run from line i closed or kept as one; the index of its last line */
function closeGap(c: Closing, i: number): number {
  const j = gapEnd(c.lines, i);
  const above = c.lines[i - 1] ?? "", below = c.lines[j + 1] ?? "";
  if (joins(c, above, below)) {
    c.changes.push({ line: i, above, below, kind: "joined" });
    return j;
  }
  c.out.push(c.lines[i]);
  if (j > i) c.changes.push({ line: i, above, below, kind: "collapsed" });
  return j;
}

export function closeSpeeches(md: string, apart: string[]): { text: string; changes: Change[] } {
  const c: Closing = { lines: md.split("\n"), out: [], changes: [], apart };
  let verse = false;
  for (let i = 0; i < c.lines.length; i++) {
    const l = c.lines[i];
    verse = inVerse(verse, l);
    if (verse && blank(l)) i = closeGap(c, i);
    else c.out.push(l);
  }
  return { text: c.out.join("\n"), changes: c.changes };
}
