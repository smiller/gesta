/* The Harvard Classics' Milton (vol. 4, 1909) from two scans' OCR, read
   against each other a poem at a time: each poem cut from each scan by its
   first line, the page furniture dropped, a line the page ran over joined
   back, the two read word by word, and a disagreement settled by a witness
   (another edition's line) or the words the edition prints elsewhere, or
   left for a hand */

export const letters = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

function distance(a: string, b: string): number {
  if (!a.length) return b.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}
export const similar = (a: string, b: string): number => (!a.length && !b.length ? 1 : 1 - distance(a, b) / Math.max(a.length, b.length));

/* a scan's lines with the page's furniture gone: a running head or a
   poem's title and date (no lower-case letter), a page or line number, the
   specks the OCR reads at a line's edge */
export function scanLines(text: string): string[] {
  return text.split("\n")
    .map((l) => l.replace(/[\s ]+/g, " ").trim().replace(/^[-|‘'•.,] (?=\S)/, "").replace(/ \d+$/, "").trim())
    .filter((l) => l && /[a-z]/.test(l) && !/^\d+$/.test(l));
}

/* a printed edition's lines, its margin's line numbers gone */
export const editionLines = (text: string): string[] => text.split("\n").map((l) => l.replace(/\s{2,}\d+\s*$/, "").trim());

const tail = (s: string): string => { const w = s.split(/\s+/); return letters(w.slice(w.length > 4 ? 2 : 1).join(" ")); };

/* where a poem starts: the line most like its first, its first words
   aside (small capitals, which the OCR reads worst); null below 0.75 */
export function findStart(lines: string[], first: string, from = 0): number | null {
  let best = -1, at: number | null = null;
  const want = tail(first);
  for (let i = from; i < lines.length; i++) {
    const s = similar(tail(lines[i]), want);
    if (s > best) { best = s; at = i; }
  }
  return best >= 0.75 ? at : null;
}

/* a witness's lines from a first line on, `count` of them, blank lines skipped */
export function witnessPoem(lines: string[], first: string, count: number): string[] | null {
  const at = findStart(lines.map((l) => l || "\u0000"), first);
  if (at == null) return null;
  return lines.slice(at).filter((l) => l).slice(0, count);
}

/* a poem cut from a scan's lines at `start`, a line for each of the
   witness's: a scan line joins the one before when that brings the two
   nearer the witness's line and it is not itself like the witness's next */
export function cutPoem(lines: string[], start: number, witness: string[]): { lines: string[]; joins: number } {
  const out = [lines[start]];
  let joins = 0;
  for (let k = start + 1; k < lines.length; k++) {
    const j = out.length, prev = out[j - 1];
    const joined = prev + " " + lines[k];
    const nearer = similar(letters(joined), letters(witness[j - 1])) > similar(letters(prev), letters(witness[j - 1]));
    const next = j < witness.length ? similar(letters(lines[k]), letters(witness[j])) : 0;
    if (nearer && next < 0.6) { out[j - 1] = joined.replace(/(\w)- (\w)/, "$1-$2"); joins++; continue; }
    if (j === witness.length) break;
    out.push(lines[k]);
  }
  return { lines: out, joins };
}

export interface Decision { line: number; a: string; b: string; chose: string; why: string }

/* a line's words, punctuation held to the word it follows or, an opening
   mark, precedes; the OCR's straight marks made the edition's curled ones */
export function words(line: string): string[] {
  const s = line.replace(/\s+([;:,.!?)])/g, "$1").replace(/(^|\s)"\s+/g, "$1\"").replace(/\s+"(\s|$)/g, "\"$1")
    .replace(/[*[\]{}|^_~<>]/g, "").replace(/(\w)'(\w)/g, "$1’$2").replace(/(^|\s)"/g, "$1“").replace(/"/g, "”").replace(/(^|\s)'/g, "$1‘").replace(/'/g, "’");
  return s.split(/\s+/).filter(Boolean);
}
const marks = (w: string): string => w.normalize("NFD").replace(/[\p{L}̀-ͯ]/gu, "");
const accented = (w: string): boolean => /[̀-ͯ]/.test(w.normalize("NFD"));

/* the two scans' words aligned, a pair either side's word or a gap */
function align(a: string[], b: string[]): [string | null, string | null][] {
  const cost = (x: string, y: string): number => (x === y ? 0 : letters(x) === letters(y) ? 1 : similar(letters(x), letters(y)) >= 0.5 ? 2 : 4);
  const n = a.length, m = b.length;
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i ? (j ? 0 : i * 3) : j * 3)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 3, d[i][j - 1] + 3, d[i - 1][j - 1] + cost(a[i - 1], b[j - 1]));
  const out: [string | null, string | null][] = [];
  for (let i = n, j = m; i || j;) {
    if (i && j && d[i][j] === d[i - 1][j - 1] + cost(a[i - 1], b[j - 1])) { out.unshift([a[--i], b[--j]]); }
    else if (i && d[i][j] === d[i - 1][j] + 3) out.unshift([a[--i], null]);
    else out.unshift([null, b[--j]]);
  }
  return out;
}

/* the poem's first words, set in small capitals, are read as capitals or
   misread: a word with a capital after its first letter is given the
   witness's case, or a capital first letter at the head of the line */
function recase(w: string, at: number, witness: string[]): string {
  if (w.length < 2 || !/^.\p{L}*\p{Lu}/u.test(w.replace(/^\P{L}+/u, ""))) return w;
  const same = witness.find((v) => letters(v) === letters(w));
  const lead = w.match(/^\P{L}*/u)![0], body = w.slice(lead.length);
  if (same) { const sl = same.replace(/^\P{L}+/u, ""); return lead + [...body].map((c, i) => (/\p{L}/u.test(c) && sl[i] && sl[i].toLowerCase() === c.toLowerCase() ? sl[i] : c.toLowerCase())).join(""); }
  return lead + (at ? body.toLowerCase() : body[0] + body.slice(1).toLowerCase());
}

/* the edition prints æ and œ, which neither scan reads: æ comes out as
   ae, se, z, e or a, œ as oe, ce, ee, e or o; a word's spellings with one
   such reading made the ligature */
export function ligatures(w: string): string[] {
  const out: string[] = [];
  for (const [re, lig] of [[/ae|se|z|e|a/g, "æ"], [/oe|ce|ee|e|o/g, "œ"]] as const)
    for (const m of w.matchAll(re)) if (m.index) out.push(w.slice(0, m.index) + lig + w.slice(m.index + m[0].length));
  return out;
}
const keyed = (w: string): string => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-zæœ]/g, "");

/* one line read from both scans: their agreement taken, a mark one of
   them dropped kept, a word settled by the witness's line or by the words
   the edition prints elsewhere (`known`), the rest left for a hand */
export function readLine(a: string, b: string, witness: string, known: Set<string>, n: number): { text: string; decisions: Decision[] } {
  const wit = words(witness);
  const witKeys = new Set(wit.map(letters));
  const witMarks = new Map(wit.map((w) => [letters(w), marks(w)]));
  const decisions: Decision[] = [];
  const out: string[] = [];
  const pairs = align(words(a), words(b));
  pairs.forEach(([x, y], i) => {
    const first = n === 1 && i < 3;
    const put = (w: string) => out.push(first ? recase(w, i, wit) : w);
    const say = (chose: string | null, why: string) => {
      if (chose) put(chose);
      decisions.push({ line: n, a: x ?? "", b: y ?? "", chose: chose ? out[out.length - 1] : "", why });
    };
    if (x != null && y != null && x === y) {
      const k = letters(x);
      const parts = x.split(/[-—]/).map(letters).filter(Boolean);
      if (!k || k.length < 3 || witKeys.has(k) || knows(known, k) || (parts.length > 1 && parts.every((p) => knows(known, p)))) return void put(x);
      const lig = ligatures(x).find((v) => known.has(keyed(v)));
      return void say(lig ?? x, lig ? "the edition's ligature, a word it prints elsewhere" : "UNCONFIRMED: both scans, a word printed nowhere else");
    }
    if (x == null || y == null) {
      const only = (x ?? y)!;
      if (!letters(only)) return void say(null, "a speck in one scan");
      return void say(witKeys.has(letters(only)) ? only : null, witKeys.has(letters(only)) ? "in one scan and the witness" : "in one scan only, left out");
    }
    if (letters(x) === letters(y)) {
      const mx = marks(x), my = marks(y);
      if (mx === my) return void put(accented(x) ? x : accented(y) ? y : x);
      if (mx.startsWith(my) || mx.endsWith(my) || (my === "" && mx)) return void say(x, "a mark the other scan dropped");
      if (my.startsWith(mx) || my.endsWith(mx) || (mx === "" && my)) return void say(y, "a mark the other scan dropped");
      const wm = witMarks.get(letters(x));
      if (wm === mx) return void say(x, "the witness's mark");
      if (wm === my) return void say(y, "the witness's mark");
      return void say(x, "UNSETTLED: the marks differ");
    }
    const kx = letters(x), ky = letters(y);
    const both = ligatures(x).find((v) => ligatures(y).includes(v));
    if (both) return void say(both, "the edition's ligature, read two ways");
    if (witKeys.has(kx) !== witKeys.has(ky)) return void say(witKeys.has(kx) ? x : y, "the witness's word");
    if (known.has(kx) !== known.has(ky)) return void say(known.has(kx) ? x : y, "the word the edition prints elsewhere");
    say(x, "UNSETTLED: the words differ");
  });
  return { text: out.join(" "), decisions };
}

/* a word known as it stands or once an ending is taken off */
export const knows = (known: Set<string>, k: string): boolean => known.has(k) || [/s$/, /es$/, /d$/, /ed$/, /ing$/, /st$/, /est$/, /th$/, /eth$/, /ly$/].some((e) => e.test(k) && known.has(k.replace(e, "")));

/* every word the edition prints in a text already clean, by its letters */
export const vocabulary = (...texts: string[]): Set<string> => new Set(texts.flatMap((t) => t.split(/[^\p{L}’']+/u).flatMap((w) => [letters(w), keyed(w)])).filter(Boolean));
