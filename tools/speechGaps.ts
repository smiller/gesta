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

export function closeSpeeches(md: string, apart: string[]): { text: string; changes: Change[] } {
  const lines = md.split("\n"), out: string[] = [], changes: Change[] = [];
  let verse = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^::: ?verse\b/.test(body(l))) verse = true;
    else if (verse && body(l) === ":::") verse = false;
    if (!verse || !blank(l)) { out.push(l); continue; }
    let j = i;
    while (j + 1 < lines.length && blank(lines[j + 1])) j++;
    const above = lines[i - 1] ?? "", below = lines[j + 1] ?? "";
    if (isLine(above) && isLine(below) && !apart.includes(above)) changes.push({ line: i, above, below, kind: "joined" });
    else {
      out.push(l);
      if (j > i) changes.push({ line: i, above, below, kind: "collapsed" });
    }
    i = j;
  }
  return { text: out.join("\n"), changes };
}
