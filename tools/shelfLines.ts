/* LINES OF THE BOOKSHELF'S VERSE QUOTED IN AN ENTRY, found and made the
   reference ⌃⌘R makes for them. A run is consecutive lines, quoted or bare,
   each the next line of one passage, letters and numerals alone; code is
   left, and so is a quotation already under a link to the bookshelf (pin:
   shelfLines.test › quotedRuns). A run after a short citation ending in a
   colon makes that citation the link, its words kept; any other run gives
   way to the whole reference (pin: shelfLines.test › referRuns) */
import type { ShelfIndex, Referred } from "./bookshelfQuotes.ts";

const norm = (s: string): string => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{Nd}]+/gu, "");
const FENCE = /^\s*(?:>\s*)*(```|~~~)/;
const QUOTE = /^\s*>/;
/* a line as the verse it may hold: its quotation's marks, its indent, a
   pair's other column and a closing line break off */
const bare = (l: string): string => l.replace(/^\s*(?:>\s*)*/, "").replace(/(?<!\\)\s\|\s.*$/, "").replace(/(?:<br\s*\/?>|\\)\s*$/i, "").trim();
/* a run this short in letters is too common to be a quotation */
const ENOUGH = 30;
/* a half-line opening or ending a run, at least this long in letters */
const HALF = 6;
/* a citation line introducing a run, no longer than this */
const CITATION = 40;

/* two lines close in their letters: their letter pairs shared, by Dice's
   measure, at least this much — Heav'n against Heaven, a dropped letter */
const ALIKE = 0.8;
function alike(a: string, b: string): boolean {
  if (!a || !b) return false;
  const pairs = (t: string): string[] => [...t].slice(1).map((c, i) => t[i] + c);
  const pa = pairs(a), pb = pairs(b), left = [...pb];
  let shared = 0;
  for (const p of pa) { const at = left.indexOf(p); if (at >= 0) { shared++; left.splice(at, 1); } }
  return 2 * shared / (pa.length + pb.length) >= ALIKE;
}

/* a line joining two places of a passage with an ellipsis is not one line of it */
const SPLICE = /\p{L}[^\p{L}]*(?:…|\.\.\.)[^\p{L}]*\p{L}/u;

function distance(a: string, b: string): number {
  let row = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}
/* a half-line: the start (or end) of a line, two letters' change allowed
   once it is eight long — fixt against fixed, mee against me */
function halfOf(n: string, line: string, start: boolean): boolean {
  if (start ? line.startsWith(n) : line.endsWith(n)) return true;
  if (n.length < 8) return false;
  for (let k = n.length - 2; k <= Math.min(n.length + 2, line.length); k++)
    if (distance(n, start ? line.slice(0, k) : line.slice(-k)) <= 2) return true;
  return false;
}

export interface Run { start: number; end: number; key: string; from: number; to: number }

export function quotedRuns(md: string, index: ShelfIndex): Run[] {
  const lines = md.split("\n"), runs: Run[] = [];
  const skip = new Array(lines.length).fill(false);
  let fence = false;
  lines.forEach((l, i) => {
    if (FENCE.test(l)) { fence = !fence; skip[i] = true; return; }
    if (fence) skip[i] = true;
  });
  /* a quotation under a link to the bookshelf is a reference already */
  for (let i = 0; i < lines.length; i++) {
    if (!/\]\(#(?:bookshelf|page)\//.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    while (j < lines.length && QUOTE.test(lines[j])) skip[j++] = true;
  }
  for (let i = 0; i < lines.length; i++) {
    const floor = runs.length ? runs[runs.length - 1].end : -1;
    const n = skip[i] ? "" : norm(bare(lines[i]));
    if (n.length < 12) continue;
    let best: Run | null = null;
    for (const { e, i: u } of index.at.get(n) ?? []) {
      const s = index.entries[e];
      const fits = (j: number, p: number): boolean => j < lines.length && !skip[j] && p < s.left.length && !!s.left[p] && norm(bare(lines[j])) === s.left[p];
      const near = (j: number, p: number): boolean => j < lines.length && !skip[j] && p < s.left.length && alike(norm(bare(lines[j])), s.left[p] ?? "");
      const carried = (j: number): boolean => !skip[j] && !SPLICE.test(bare(lines[j])) && !!norm(bare(lines[j]));
      const said = (j: number): boolean => j < lines.length && !skip[j] && !!norm(bare(lines[j]));
      let k = i, p = u, end = i, last = u, letters = 0;
      /* a line spelled otherwise is carried when the next goes on with the
         passage, or when it is close to the passage's own (pin:
         shelfLines.test › quotedRuns: a run carries through) (pin:
         shelfLines.test › quotedRuns: a run's last line); a blank line is
         carried when the passage goes on after it (pin: shelfLines.test ›
         quotedRuns: a line's closing); a half-line ends a run (pin:
         shelfLines.test › quotedRuns: a run's last line that) */
      for (;;) {
        if (!fits(k, p) && !(k > i && said(k) && (fits(k + 1, p + 1) || near(k, p)))) {
          if (k > i && k < lines.length && !skip[k] && !said(k) && fits(k + 1, p)) { k++; continue; }
          const n = k > i && said(k) ? norm(bare(lines[k])) : "";
          if (n.length >= HALF && p < s.left.length && carried(k) && halfOf(n, s.left[p], true)) { end = k; last = p; }
          break;
        }
        if (fits(k, p)) letters += s.left[p].length;
        end = k++; last = p++;
      }
      /* the lines before may be the passage's own spelled otherwise, and
         the first of them the end of the passage's line before, a
         half-line (pin: shelfLines.test › quotedRuns: a run's first line)
         (pin: shelfLines.test › quotedRuns: opening lines) */
      let start = i, first = u;
      while (start - 1 > floor && first > 0 && carried(start - 1)) {
        const o = norm(bare(lines[start - 1])), l = s.left[first - 1];
        if (alike(o, l)) { start--; first--; continue; }
        if (o.length >= HALF && halfOf(o, l, false)) { start--; first--; }
        break;
      }
      if (letters >= ENOUGH && (!best || end - start > best.end - best.start)) best = { start, end, key: s.key, from: s.units[first].line, to: s.units[last].line };
    }
    if (best) { runs.push(best); i = best.end; }
  }
  return runs;
}

export function referRuns(md: string, runs: Run[], mint: (run: Run) => Pick<Referred, "text" | "url" | "passage">): string {
  const lines = md.split("\n");
  for (const r of [...runs].reverse()) {
    const m = mint(r);
    /* a run quoted inside a quotation keeps the outer one (pin:
       shelfLines.test › referRuns: a run quoted inside) */
    const outer = ">".repeat(Math.max(0, (lines[r.start].match(/^\s*((?:>\s*)*)/)![1].match(/>/g) ?? []).length - 1));
    const within = (l: string): string => !outer ? l : !l ? outer : l.startsWith(">") ? outer + l : outer + " " + l;
    const prev = r.start > 0 ? lines[r.start - 1] : "", next = r.end + 1 < lines.length ? lines[r.end + 1] : "";
    const cited = bare(prev);
    const tail = next.trim() ? [""] : [];
    if (cited && /:\s*$/.test(cited) && cited.length <= CITATION && !/\]\(/.test(cited))
      lines.splice(r.start - 1, r.end - r.start + 2, ...["[" + cited.replace(/:\s*$/, "") + "](" + m.url + "):", "", ...m.passage.split("\n"), ...tail].map(within));
    else
      lines.splice(r.start, r.end - r.start + 1, ...[...(prev.trim() ? [""] : []), ...m.text.split("\n"), ...tail].map(within));
  }
  return lines.join("\n");
}
