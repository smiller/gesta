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
/* a half-line ending a run, at least this long in letters */
const HALF = 10;
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
    const n = skip[i] ? "" : norm(bare(lines[i]));
    if (n.length < 12) continue;
    let best: Run | null = null;
    for (const { e, i: u } of index.at.get(n) ?? []) {
      const s = index.entries[e];
      const fits = (j: number, p: number): boolean => j < lines.length && !skip[j] && p < s.left.length && !!s.left[p] && norm(bare(lines[j])) === s.left[p];
      const near = (j: number, p: number): boolean => j < lines.length && !skip[j] && p < s.left.length && alike(norm(bare(lines[j])), s.left[p] ?? "");
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
          if (n.length >= HALF && p < s.left.length && s.left[p].startsWith(n)) { end = k; last = p; }
          break;
        }
        if (fits(k, p)) letters += s.left[p].length;
        end = k++; last = p++;
      }
      if (letters >= ENOUGH && (!best || end - i > best.end - best.start)) best = { start: i, end, key: s.key, from: s.units[u].line, to: s.units[last].line };
    }
    if (best) { runs.push(best); i = best.end; }
  }
  return runs;
}

export function referRuns(md: string, runs: Run[], mint: (run: Run) => Pick<Referred, "text" | "url" | "passage">): string {
  const lines = md.split("\n");
  for (const r of [...runs].reverse()) {
    const m = mint(r);
    const prev = r.start > 0 ? lines[r.start - 1] : "", next = r.end + 1 < lines.length ? lines[r.end + 1] : "";
    const cited = bare(prev);
    const tail = next.trim() ? [""] : [];
    if (cited && /:\s*$/.test(cited) && cited.length <= CITATION && !/\]\(/.test(cited))
      lines.splice(r.start - 1, r.end - r.start + 2, "[" + cited.replace(/:\s*$/, "") + "](" + m.url + "):", "", ...m.passage.split("\n"), ...tail);
    else
      lines.splice(r.start, r.end - r.start + 1, ...(prev.trim() ? [""] : []), ...m.text.split("\n"), ...tail);
  }
  return lines.join("\n");
}
