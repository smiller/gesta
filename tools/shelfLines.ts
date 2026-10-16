/* LINES OF THE BOOKSHELF'S VERSE QUOTED IN AN ENTRY, found and made the
   reference ⌃⌘R makes for them. A run is consecutive lines, quoted or bare,
   each the next line of one passage, letters and numerals alone; code is
   left, and so is a quotation already under a link to the bookshelf (pin:
   shelfLines.test › quotedRuns). A run after a short citation ending in a
   colon that gives the lines makes that citation the link, its words kept;
   any other run gives way to the whole reference (pin: shelfLines.test ›
   referRuns) */
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
/* a line of one's own wording standing for a line left out: this much */
const REWORDED = 0.6;
function alike(a: string, b: string, enough = ALIKE): boolean {
  if (!a || !b) return false;
  const pairs = (t: string): string[] => [...t].slice(1).map((c, i) => t[i] + c);
  const pa = pairs(a), pb = pairs(b), left = [...pb];
  let shared = 0;
  for (const p of pa) { const at = left.indexOf(p); if (at >= 0) { shared++; left.splice(at, 1); } }
  return 2 * shared / (pa.length + pb.length) >= enough;
}

/* a line joining two places of a passage with an ellipsis is not one line of it */
const SPLICE = /\p{L}[^\p{L}]*(?:…|\.\.\.)[^\p{L}]*\p{L}/u;
/* such a line's two places, the words before the ellipsis and after */
const places = (l: string): [string, string] => { const p = bare(l).split(/(?:…|\.\.\.)/); return [norm(p[0]), norm(p[p.length - 1])]; };

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
   once it is eight long — fixt against fixed, mee against me; how many of
   the line's letters it is, the closest, or 0 */
function halfAt(n: string, line: string, start: boolean): number {
  if (start ? line.startsWith(n) : line.endsWith(n)) return n.length;
  if (n.length < 8) return 0;
  let best = 0, least = 3;
  for (let k = n.length - 2; k <= Math.min(n.length + 2, line.length); k++) {
    const d = distance(n, start ? line.slice(0, k) : line.slice(-k));
    if (d < least || d === least && Math.abs(k - n.length) < Math.abs(best - n.length)) { best = k; least = d; }
  }
  return best;
}
const halfOf = (n: string, line: string, start: boolean): boolean => halfAt(n, line, start) > 0;
/* a line this many letters short of its own or fewer is spelled otherwise,
   not halved: Heav'n, chang'd, thir (pin: shelfLines.test › quotedRuns: a
   first or last line spelled otherwise) */
const SPELT = 2;

export interface Run {
  start: number; end: number; key: string;
  /* the passage's first and last rows, a speaker's name among them, by place */
  first: number; last: number;
  /* its first and last numbered lines */
  from: number; to: number;
  /* a joined first or last line's other place, as written, kept beside the reference */
  before?: string; after?: string;
  /* how many of its line's letters a half-line opening the run quotes, from
     the line's end, and one closing it, from the line's start */
  head?: number; tail?: number;
  /* how many runs it was joined from */
  parts?: number;
  /* the speaker's row heading a passage taken from inside the speech */
  speaker?: number;
}

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
    /* the link as an address alone or as the page's full address before it */
    if (!/\]\([^)\s#]*#(?:bookshelf|page)\//.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    while (j < lines.length && QUOTE.test(lines[j])) skip[j++] = true;
  }
  /* A RUN FOLLOWED LETTER BY LETTER past either end, where the quotation is
     broken into lines otherwise than the passage: on through whole lines of
     the quotation whose letters are the passage's, a few spelled otherwise
     (pin: shelfLines.test › quotedRuns: a quotation broken into lines
     otherwise) (pin: shelfLines.test › quotedRuns: a run's last line split) */
  const words = (t: string): string[] => t.split(/[\s—–]+/).map(norm).filter(Boolean);
  /* a speaker's name opening a line, one to three capitalised words before a
     colon or a wide space: never a line of verse with a colon in it */
  const NAMED = /^(?:[A-Z][A-Za-z'’.-]*(?: [A-Z][A-Za-z'’.-]*){0,2}:\s+|[A-Z][A-Z .'’-]*[A-Z](?:\s{2,}|\t))/;
  const follow = (r: Run, floor: number): Run => {
    const s = index.entries.find((e) => e.key === r.key)!, block = s.units[r.first].blockPos, quoted = QUOTE.test(lines[r.start]);
    const ours = (k: number): boolean => k > floor && k < lines.length && !skip[k] && !!norm(bare(lines[k])) && QUOTE.test(lines[k]) === quoted;
    /* blank lines between speeches, and a stage direction of one's own, passed over where a line of the quotation follows */
    const gap = (k: number): boolean => k > floor && k < lines.length && !skip[k] && (!norm(bare(lines[k])) || /^\[[^\]]*\]$/.test(bare(lines[k])) && QUOTE.test(lines[k]) === quoted) && (!quoted || !lines[k].trim() || QUOTE.test(lines[k]));
    const theirs = (x: number): boolean => x >= 0 && x < s.units.length && s.units[x].blockPos === block;
    /* the passage's letters as they come, each with its row and the letters
       of that row up to it; then the quotation's lines met against them one by
       one, letters alone, so a word split or joined otherwise (do ’t, do’t)
       does not part them, a few letters spelled otherwise allowed */
    const walk = (d: 1 | -1, k0: number, x0: number) => {
      let stream = "";
      const row: number[] = [], into: number[] = [], wordEnd: boolean[] = [];
      for (let x = x0; theirs(x); x += d) {
        const t = d > 0 ? s.left[x] : [...s.left[x]].reverse().join("");
        /* where the row's words end, counted from the side the walk comes from */
        const ws = words(s.units[x].node.textContent), ends = new Set<number>();
        (d > 0 ? ws : [...ws].reverse()).reduce((n, w) => { ends.add(n + w.length); return n + w.length; }, 0);
        [...t].forEach((c, q) => { stream += c; row.push(x); into.push(q + 1); wordEnd.push(ends.has(q + 1)); });
      }
      let p = 0, last: { k: number; p: number } | null = null;
      for (let k = k0; k === k0 || k > r.end || k < r.start; k += d) {
        if (gap(k)) { let g = k; while (gap(g)) g += d; if (!ours(g)) break; k = g; }
        if (!ours(k)) break;
        const t = bare(lines[k]), name = t.match(NAMED)?.[0] ?? "";
        const take = (c: string, exact = false): number => {
          if (!c) return -1;
          if (d < 0) c = [...c].reverse().join("");
          if (stream.startsWith(c, p)) return c.length;
          if (exact) return -1;
          const tol = k === k0 ? Math.max(2, Math.floor(c.length / 5)) : c.length >= 8 ? Math.max(2, Math.floor(c.length / 12)) : 0;
          let best = -1, least = tol + 1;
          for (let m = Math.max(1, c.length - tol); m <= c.length + tol && p + m <= stream.length; m++) {
            const dd = distance(c, stream.slice(p, p + m));
            if (dd < least) { least = dd; best = m; }
          }
          return best;
        };
        /* a speaker's name before a line's words: met where the passage has the speaker's row, else passed over */
        /* a name alone on its line, where the passage has a speaker's row, is that row, however named */
        if (/^[A-Z][A-Z .'’-]*[.:]?$/.test(t) && p < stream.length && s.units[row[p]].kind === "speaker" && into[p] === 1) {
          p += s.left[row[p]].length; last = { k, p }; continue;
        }
        let m = name ? take(norm(t), true) : -1;
        if (m < 0) m = take(norm(t.slice(name.length)));
        /* a line ends where a word of the passage ends: evit is no line of evitata */
        if (m < 0 || !wordEnd[p + m - 1]) break;
        p += m; last = { k, p };
      }
      return last ? { k: last.k, x: row[last.p - 1], n: into[last.p - 1] } : null;
    };
    const out = { ...r };
    if (!(r.start === r.end && r.head)) {
      const rowLetters = s.left[r.last].length;
      const e = walk(1, r.end, r.last);
      if (e && (e.k > r.end || e.x > r.last || r.tail !== undefined && e.n > r.tail && e.x === r.last)) {
        out.end = e.k; out.last = e.x;
        const total = e.x === r.last ? rowLetters : s.left[e.x].length;
        if (e.n < total - SPELT) out.tail = e.n; else delete out.tail;
      }
    }
    if (!(r.start === r.end && r.tail)) {
      const b = walk(-1, r.start, r.first);
      if (b && (b.k < r.start || b.x < r.first || r.head !== undefined && b.n > r.head && b.x === r.first)) {
        out.start = b.k; out.first = b.x;
        if (b.n < s.left[b.x].length - SPELT) out.head = b.n; else delete out.head;
      }
    }
    const numbered = s.units.slice(out.first, out.last + 1).filter((u) => u.line > 0);
    return { ...out, from: numbered[0].line, to: numbered[numbered.length - 1].line };
  };
  for (let i = 0; i < lines.length; i++) {
    const floor = runs.length ? runs[runs.length - 1].end : -1;
    const n = skip[i] ? "" : norm(bare(lines[i]));
    if (n.length < 12) continue;
    let best: Run | null = null;
    for (const { e, i: u } of index.at.get(n) ?? []) {
      const s = index.entries[e];
      /* a run keeps to one verse block, the most one reference quotes */
      const block = (p: number): boolean => p >= 0 && p < s.left.length && s.units[p].blockPos === s.units[u].blockPos;
      const fits = (j: number, p: number): boolean => j < lines.length && !skip[j] && block(p) && !!s.left[p] && norm(bare(lines[j])) === s.left[p];
      const near = (j: number, p: number): boolean => j < lines.length && !skip[j] && block(p) && alike(norm(bare(lines[j])), s.left[p] ?? "");
      const carried = (j: number): boolean => j >= 0 && j < lines.length && !skip[j] && !SPLICE.test(bare(lines[j])) && !!norm(bare(lines[j]));
      const said = (j: number): boolean => j < lines.length && !skip[j] && !!norm(bare(lines[j]));
      const spliced = (j: number): boolean => j >= 0 && j < lines.length && !skip[j] && SPLICE.test(bare(lines[j]));
      let k = i, p = u, end = i, last = u, letters = 0;
      /* a line spelled otherwise is carried when the next goes on with the
         passage, or when it is close to the passage's own (pin:
         shelfLines.test › quotedRuns: a run carries through) (pin:
         shelfLines.test › quotedRuns: a run's last line); a blank line is
         carried when the passage goes on after it (pin: shelfLines.test ›
         quotedRuns: a line's closing); a half-line ends a run (pin:
         shelfLines.test › quotedRuns: a run's last line that) */
      for (;;) {
        if (!fits(k, p) && !(k > i && carried(k) && (fits(k + 1, p + 1) || near(k, p)))) {
          if (k > i && k < lines.length && !skip[k] && !said(k) && fits(k + 1, p)) { k++; continue; }
          const n = k > i && said(k) ? spliced(k) ? places(lines[k])[0] : norm(bare(lines[k])) : "";
          if (n.length >= HALF && block(p) && halfOf(n, s.left[p], true)) { end = k; last = p; }
          break;
        }
        if (fits(k, p)) letters += s.left[p].length;
        end = k++; last = p++;
      }
      /* the lines before may be the passage's own spelled otherwise, and
         the first of them the end of the passage's line before, a
         half-line (pin: shelfLines.test › quotedRuns: a run's first line)
         (pin: shelfLines.test › quotedRuns: opening lines); a line joining
         two places with an ellipsis may close one run and open the next
         (pin: shelfLines.test › quotedRuns, referRuns: a line joining) */
      let start = i, first = u;
      while (block(first - 1) && (start - 1 > floor && carried(start - 1) || start - 1 >= floor && spliced(start - 1))) {
        const o = spliced(start - 1) ? places(lines[start - 1])[1] : norm(bare(lines[start - 1])), l = s.left[first - 1];
        if (alike(o, l) && !spliced(start - 1)) { start--; first--; continue; }
        if (o.length >= HALF && halfOf(o, l, false)) { start--; first--; }
        break;
      }
      /* a first or last line short of its line's letters, however it was
         carried, is a half-line, quoted from where it starts or to where it
         ends (pin: shelfLines.test › quotedRuns: a run opening or closing) */
      const q0 = spliced(start) ? places(lines[start])[1] : norm(bare(lines[start]));
      const q1 = spliced(end) ? places(lines[end])[0] : norm(bare(lines[end]));
      const cut = (q: string, line: string, start: boolean): number | undefined => { const k = halfAt(q, line, start); return k && k < line.length - SPELT ? k : undefined; };
      const head = cut(q0, s.left[first], false), tail = cut(q1, s.left[last], true);
      /* a speaker's row is numbered 0: a run opening on one is numbered
         from the speech's first line (pin: shelfLines.test › quotedRuns: a
         quotation opening on a speaker's name) */
      const numbered = s.units.slice(first, last + 1).filter((x) => x.line > 0);
      if (letters >= ENOUGH && numbered.length && (!best || end - start > best.end - best.start))
        best = { start, end, key: s.key, first, last, from: numbered[0].line, to: numbered[numbered.length - 1].line, ...(head && { head }), ...(tail && { tail }) };
    }
    if (best) { runs.push(follow(best, floor)); i = runs[runs.length - 1].end; }
  }
  /* runs of one passage in one quotation are one run, when nothing of the
     passage is left out between them and nothing else stands there but
     blank lines, speakers' names and the passage's own rows, or when the
     lines between are one's own wording of the lines left out; other words
     of one's own, an ellipsis, the quotation's end, a line left out or a
     second verse block keep them apart (pin: shelfLines.test › quotedRuns:
     runs of one scene) (pin: shelfLines.test › quotedRuns: runs with words) */
  for (let at = runs.length - 1; at > 0; at--) {
    const a = runs[at - 1], b = runs[at];
    if (a.key !== b.key || b.start <= a.end || b.first < a.last || b.last <= a.last || QUOTE.test(lines[a.start]) !== QUOTE.test(lines[b.start])) continue;
    const s = index.entries.find((e) => e.key === a.key)!;
    /* one reference quotes one verse block */
    if (s.units[a.last].blockPos !== s.units[b.first].blockPos) continue;
    const said = new Set<number>();
    const between = (l: string): boolean => {
      if (QUOTE.test(lines[a.start]) && l.trim() && !QUOTE.test(l)) return false;
      const t = bare(l);
      if (!norm(t)) return !/…|\.\.\./.test(t);
      if (/^[A-Z][A-Z .'’-]*[.:]?$/.test(t)) return true;
      const n = norm(t.replace(/^[A-Z][\w .'’-]*?(?:\t|:\s)/i, ""));
      let found = false;
      /* a direction may be set a line early or late: any row of the two runs or between */
      for (let x = a.first; x <= b.last; x++) if (n.length >= HALF && s.left[x].includes(n) || alike(n, s.left[x])) { said.add(x); found = true; }
      if (found) return true;
      /* a line holding rows one after another, end to end, a direction between them passed over */
      for (let x = a.first; x <= b.last; x++) {
        let at = 0, y = x;
        const held: number[] = [];
        for (; y <= b.last && at < n.length; y++) {
          if (s.left[y] && n.startsWith(s.left[y], at)) { at += s.left[y].length; held.push(y); }
          else if (s.units[y].line > 0) break;
        }
        if (at === n.length && held.length > 1) { held.forEach((h) => said.add(h)); return true; }
      }
      return false;
    };
    const gap = lines.slice(a.end + 1, b.start);
    const omitted: number[] = [];
    for (let x = a.last + 1; x < b.first; x++) if (s.units[x].line > 0) omitted.push(x);
    /* one's own wording of the lines left out, line for line (pin:
       shelfLines.test › quotedRuns: lines of one's own wording) */
    const own = gap.filter((l) => norm(bare(l)) && !/^[A-Z][A-Z .'’-]*[.:]?$/.test(bare(l)));
    const reworded = own.length === omitted.length && own.length > 0 && own.every((l, k) => alike(norm(bare(l)), s.left[omitted[k]], REWORDED))
      && gap.every((l) => !(QUOTE.test(lines[a.start]) && l.trim() && !QUOTE.test(l)));
    if (!reworded) {
      if (!gap.every(between)) continue;
      if (omitted.some((x) => !said.has(x))) continue;
    }
    runs.splice(at - 1, 2, { ...a, end: b.end, last: b.last, to: b.to, tail: b.tail, parts: (a.parts ?? 1) + (b.parts ?? 1) });
    if (b.tail === undefined) delete runs[at - 1].tail;
  }
  /* a speaker's name opening the quotation, on its own line or before a
     colon, names whoever speaks where the run starts: the speaker's row
     goes into the reference, heading it where the run starts inside the
     speech; a quotation opening a speech takes its speaker's row unnamed
     (pin: shelfLines.test › quotedRuns, referenceOf: a speaker's name) */
  runs.forEach((r, at) => {
    const s = index.entries.find((e) => e.key === r.key)!, block = s.units[r.first].blockPos;
    if (s.units[r.first].kind === "speaker") return;
    let x = r.first - 1;
    while (x >= 0 && s.units[x].blockPos === block && s.units[x].kind !== "speaker") x--;
    if (x < 0 || s.units[x].blockPos !== block) return;
    const floor = at ? runs[at - 1].end : -1;
    let up = r.start - 1;
    while (up > floor && !lines[up].trim().replace(/^[>\s]*$/, "")) up--;
    const own = bare(lines[r.start]).match(NAMED)?.[0], above = up > floor ? bare(lines[up]) : "";
    /* a line above is a name in capitals, or the speaker's own name in any case: never a line of one's own */
    const capitals = /^[A-Z][A-Z .'’-]*[.:]?$/.test(above), called = norm(above) === s.left[x];
    const name = own ? own.replace(/:\s*$/, "") : above.length <= 40 && (capitals || called) ? above : "";
    const n = norm(name);
    /* a quotation opening a speech takes its speaker's row, named or not */
    if (!n && x === r.first - 1 && !r.head) { r.first = x; return; }
    /* a name on its own line inside the quotation is the speaker's, however the passage names them: FESTE for Clown */
    const ownLine = !own && !!n && QUOTE.test(lines[up]) === QUOTE.test(lines[r.start]);
    if (!n || !(ownLine || s.left[x] === n || s.left[x].includes(n) || alike(n, s.left[x]))) return;
    if (!own) r.start = up;
    if (x === r.first - 1 && !r.head) { r.first = x; return; }
    r.speaker = x;
  });
  /* an attribution closing the quotation, short, naming the work, from a dash
     or with a number, is the link's own citation and goes with it (pin:
     shelfLines.test › quotedRuns: an attribution closing) */
  runs.forEach((r, at) => {
    const next = at + 1 < runs.length ? runs[at + 1].start : lines.length, work = norm(r.key.split("/")[2] ?? "");
    let k = r.end + 1;
    while (k < next && !norm(bare(lines[k])) && (QUOTE.test(lines[k]) || !lines[k].trim())) k++;
    if (k >= next || !work) return;
    const t = bare(lines[k]);
    if (QUOTE.test(lines[k]) === QUOTE.test(lines[r.start]) && t.length <= 60 && norm(t).includes(work) && /^\\?[-–—―]|\d|\b[IVXL]+\s*[.,]\s*[ivxlIVXL]+\b/.test(t)) r.end = k;
  });
  /* a joined line shared by two runs gives way to both; its other place,
     where no run takes it, is kept as written (pin: shelfLines.test ›
     quotedRuns, referRuns: a joined line's place) */
  const joined = (j: number): boolean => SPLICE.test(bare(lines[j]));
  const quote = (l: string): string => l.match(/^\s*(?:>\s*)*/)![0];
  return runs.map((r, at) => {
    const out = { ...r };
    if (joined(r.end) && runs[at + 1]?.start !== r.end) { const l = lines[r.end], q = quote(l), rest = l.slice(q.length); out.after = q + rest.slice(rest.search(/…|\.\.\./)); }
    if (joined(r.start) && runs[at - 1]?.end !== r.start) { const l = lines[r.start], q = quote(l), rest = l.slice(q.length), m = [...rest.matchAll(/…|\.\.\./g)].pop()!; out.before = q + rest.slice(0, m.index + m[0].length).trimEnd(); }
    return out;
  });
}

export function referRuns(md: string, runs: Run[], mint: (run: Run) => Pick<Referred, "text" | "url" | "passage">): string {
  const lines = md.split("\n");
  for (const [at, r] of [...runs.entries()].reverse()) {
    const m = mint(r);
    const end = runs[at + 1]?.start === r.end ? r.end - 1 : r.end;
    /* a run quoted inside a quotation keeps the outer one (pin:
       shelfLines.test › referRuns: a run quoted inside) */
    const outer = ">".repeat(Math.max(0, (lines[r.start].match(/^\s*((?:>\s*)*)/)![1].match(/>/g) ?? []).length - 1));
    const within = (l: string): string => !outer ? l : !l ? outer : l.startsWith(">") ? outer + l : outer + " " + l;
    const prev = r.start > 0 ? lines[r.start - 1] : "", next = end + 1 < lines.length ? lines[end + 1] : "";
    const cited = bare(prev);
    const blank = (l: string): boolean => outer ? !/[^\s>]/.test(l) : !l.trim();
    const tail = blank(next) ? [] : [""];
    /* a kept place that names the work, or only numbers it, is its citation, which the reference gives (pin:
       shelfLines.test › quotedRuns, referRuns: a joined line's place) */
    const work = norm(m.text.match(/^\[[^\]]*?, (.+), [^,\]]+\]/)?.[1] ?? "");
    /* a place that is only a book's or scene's number, the link's own: (II,i), [1.1] */
    const numbered = (l: string): boolean => /^[\s>….]*[([]?\s*(?:[IVXLC]+|\d+)\s*[,.]\s*(?:[ivxlc]+|\d+)\s*[)\]]?\s*$/i.test(l);
    const kept = (l?: string): l is string => l !== undefined && !(work && norm(l).includes(work)) && !numbered(l);
    const after = !kept(r.after) ? tail.map(within) : [within(""), r.after];
    /* a citation giving the lines is the link in its own words; one giving
       only the book or scene gives way to the reference whole; a line with no
       numbers is no citation (pin: shelfLines.test › referRuns: a citation
       giving the lines) */
    const citation = !!cited && /:\s*$/.test(cited) && cited.length <= CITATION && !/\]\(/.test(cited) && !kept(r.before);
    const lined = /\d+\s*[.,:]\s*\d+\s*[-–]\s*\d+|\d+\.\d+\.\d+/.test(cited);
    const scened = /\d|\b[IVXLC]+\s*[.,]\s*[ivxlcIVXLC]+\b/.test(cited);
    if (citation && lined)
      lines.splice(r.start - 1, end - r.start + 2, ...["[" + cited.replace(/:\s*$/, "") + "](" + m.url + "):", "", ...m.passage.split("\n")].map(within), ...after);
    else if (citation && scened)
      lines.splice(r.start - 1, end - r.start + 2, ...m.text.split("\n").map(within), ...after);
    else
      lines.splice(r.start, end - r.start + 1, ...(kept(r.before) ? [r.before] : []), ...[...(!kept(r.before) && blank(prev) ? [] : [""]), ...m.text.split("\n")].map(within), ...after);
  }
  return lines.join("\n");
}

/* THE WORDS QUOTED AGAINST THE PASSAGE'S, for a reader to see where they
   part: the longest run of words they share, letters and numerals alone,
   and the rest taken out (-) or put in (+). Only words spelled otherwise,
   each change two letters at most, is spelling (pin:
   shelfLines.test › wordDiff) */
export type WordOp = ["=" | "-" | "+", string];
export function wordDiff(yours: string, theirs: string): { kind: "same" | "spelling" | "wording"; ops: WordOp[] } {
  const a = yours.split(/[\s—–]+/).filter((w) => norm(w)), b = theirs.split(/[\s—–]+/).filter((w) => norm(w));
  const ka = a.map(norm), kb = b.map(norm);
  const lcs = ka.map(() => new Array<number>(kb.length + 1).fill(0));
  lcs.push(new Array<number>(kb.length + 1).fill(0));
  for (let i = ka.length - 1; i >= 0; i--) for (let j = kb.length - 1; j >= 0; j--) lcs[i][j] = ka[i] === kb[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const ops: WordOp[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && ka[i] === kb[j]) { ops.push(["=", b[j]]); i++; j++; }
    else if (j < b.length && (i >= a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      /* a change's words taken out before those put in */
      if (i < a.length && lcs[i + 1][j] === lcs[i][j + 1]) { ops.push(["-", a[i++]]); continue; }
      ops.push(["+", b[j++]]);
    } else ops.push(["-", a[i++]]);
  }
  /* a change whose letters run the same either side is spacing alone: to ’t, to’t */
  for (let k = 0; k < ops.length; k++) {
    if (ops[k][0] === "=") continue;
    let e = k;
    while (e < ops.length && ops[e][0] !== "=") e++;
    const out = ops.slice(k, e).filter(([o]) => o === "-").map(([, w]) => norm(w)).join(""), put = ops.slice(k, e).filter(([o]) => o === "+");
    if (out === put.map(([, w]) => norm(w)).join("")) { ops.splice(k, e - k, ...put.map(([, w]): WordOp => ["=", w])); k += put.length - 1; }
    else k = e - 1;
  }
  if (ops.every(([o]) => o === "=")) return { kind: "same", ops };
  /* each change, its words run together, a letter or two from the passage's */
  let spelling = true;
  for (let k = 0; k < ops.length && spelling; k++) {
    if (ops[k][0] === "=") continue;
    let e = k;
    while (e < ops.length && ops[e][0] !== "=") e++;
    const out = ops.slice(k, e).filter(([o]) => o === "-").map(([, w]) => norm(w)).join(""), put = ops.slice(k, e).filter(([o]) => o === "+").map(([, w]) => norm(w)).join("");
    if (!out || !put || distance(out, put) > 2) spelling = false;
    k = e - 1;
  }
  return { kind: spelling ? "spelling" : "wording", ops };
}
