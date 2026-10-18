/* node tools/shelfLinesRun.ts [author-prefix,…] [backup-dir] [out-dir] — every
   entry outside the bookshelf read, its runs of an author's verse quoted
   line for line made the references ⌃⌘R makes for them, the changed
   entries written under out-dir at their own paths for an import, a review
   page beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { quotedRuns, quotedPassages, sameQuoted, referRuns, wordDiff, type Run } from "./shelfLines.ts";
import { shelfIndex, referenceOf, norm } from "./bookshelfQuotes.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { importTarget } from "../src/store/names.ts";
import { entryKey } from "../src/store/keys.ts";

const HOME = process.env.HOME!;
const AUTHOR = process.argv[2] ?? "bookshelf/Milton, John";
const SRC = process.argv[3] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[4] ?? join(HOME, "Desktop/gesta-imports/gesta-shelf-lines");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-shelf-lines/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-shelf-lines…`);

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const cache: Record<string, string> = Object.create(null);
for (const path of walk(SRC)) { const t = importTarget(relative(SRC, path)); if (t) cache[entryKey(t.date, t.tag)] = readFileSync(path, "utf8"); }
/* a comma and a space is inside a filed name (Spenser, Edmund); a bare comma parts two */
const PREFIXES = AUTHOR.split(/,(?! )/);
const index = shelfIndex(Object.fromEntries(Object.entries(cache).filter(([k]) => PREFIXES.some((p) => k === p || k.startsWith(p + "/")))));

/* entries that quote the bookshelf as the reference feature's test data, left */
const LEAVE = /gesta-wrangl|verity cards|journal\/2016\/2016-03-14\.md/i;
const left: string[] = [];
/* quotations left as written, by entry and the passage's first line, and where
   the entry repeats it, by the quotation's first line in the entry */
const KEEP: { file: string; key: string; from: number; at?: number; why: string }[] = [
  { file: "journal/2023/2023-04-25.md", key: "bookshelf/Beowulf", from: 1, at: 9, why: "recited from memory, its slips and their corrections kept" },
  { file: "journal/2002/2002-02-03.md", key: "bookshelf/Shakespeare, William/Twelfth Night/1.5", from: 255, why: "a deliberate variant: “Cry out Ors… – Olivia!”" },
  { file: "journal/2006/2006-06-28.md", key: "bookshelf/Shakespeare, William/Hamlet/5.2", from: 376, why: "a deliberate variant: “Good night, dear heart”, the quotation itself beneath it" },
];
const kept: string[] = [];
const partial: string[] = [];
const QUOTED = /^\s*>/;
/* a book on the shelf whose quotation is made a reference too, asked */
const ALSO = ["bookshelf/Lewis, C. S/The Allegory of Love/1. Courtly Love.md"];
/* quotations too short for the run to place, placed by hand: the entry's
   lines (from 1), the passage's lines, and a half-line at either end */
const PLACED: { file: string; at: number; end?: number; key: string; from: number; to?: number; half?: { from?: "b"; to?: "a" } }[] = [
  { file: "journal/1992/1992-02-25.md", at: 66, key: "bookshelf/Seafarer", from: 97 },
  { file: "journal/1992/1992-04-16.md", at: 17, key: "bookshelf/Seafarer", from: 9, half: { from: "b" } },
  { file: "journal/1992/1992-04-16.md", at: 21, key: "bookshelf/Seafarer", from: 32, half: { to: "a" } },
  { file: "journal/1992/1992-04-16.md", at: 52, key: "bookshelf/Beowulf", from: 1557 },
  { file: "journal/1993/1993-06-07.md", at: 18, end: 19, key: "bookshelf/Beowulf", from: 726, to: 727, half: { from: "b" } },
  { file: "journal/2017/2017-09-29.md", at: 29, end: 30, key: "bookshelf/Wanderer", from: 104, to: 105, half: { from: "b" } },
  { file: "journal/2020/2020-01-12.md", at: 7, key: "bookshelf/Beowulf", from: 432, half: { from: "b" } },
  { file: "journal/2022/2022-08-31.md", at: 60, key: "bookshelf/Beowulf", from: 3052 },
  /* Deor's refrain alone, six lines of the poem: cited at its first, asked; 2025-06-01's card title joined to Dante is left */
  { file: "journal/1990/1990-09-15.md", at: 41, key: "bookshelf/Deor", from: 7 },
  { file: "journal/1995/1995-08-28.md", at: 10, key: "bookshelf/Deor", from: 7 },
  { file: "journal/2025/2025-06-01.md", at: 9, key: "bookshelf/Deor", from: 7 },
];
/* a line of verse in one's own sentence or list: its words made the link, no passage quoted */
const LINKED: { file: string; at: number; key: string; from: number }[] = [
  { file: "journal/2016/2016-03-29.md", at: 24, key: "bookshelf/Beowulf", from: 311 },
  { file: "page/Sean’s Books/39b.md", at: 23, key: "bookshelf/Beowulf", from: 311 },
];
/* the hand's places belong to the works this run reads */
const read = (key: string): boolean => index.entries.some((e) => e.key === key);
const placed = (file: string): Run[] => PLACED.filter((x) => x.file === file && read(x.key)).map((x) => {
  const sh = index.entries.find((e) => e.key === x.key)!;
  const first = sh.units.findIndex((u) => u.line === x.from), last = sh.units.findIndex((u) => u.line === (x.to ?? x.from));
  /* a half-line's letters, the original's halves two spaces apart */
  const halves = (u: number): string[] => (sh.units[u].node.type.name === "pair" ? sh.units[u].node.child(0) : sh.units[u].node).textContent.split(/ {2,}/).map(norm);
  if (first < 0 || last < 0) throw new Error(`${file}: ${x.key} has no line ${x.from}`);
  return { start: x.at - 1, end: (x.end ?? x.at) - 1, key: x.key, first, last, from: x.from, to: x.to ?? x.from,
    ...(x.half?.from && { head: halves(first)[1].length }), ...(x.half?.to && { tail: halves(last)[0].length }) };
});

rmSync(OUT, { recursive: true, force: true });
const counts = { entries: 0, changed: 0, runs: 0, lines: 0 };
const shown: { file: string; r: Run; label: string; before: string[]; after: string[]; diff: ReturnType<typeof wordDiff> }[] = [];
/* the words a quotation says, its marks, indents, speakers' names and
   stage directions aside: the passage's directions are its italic rows,
   the names its bold ones, and a quotation's own names are those */
const SPEAKER_ROW = /^\*\*([^*]+)\*\*$/;
const names = (passage: string[]): Set<string> => new Set(passage.map((l) => l.replace(/^\s*(?:>\s?)*/, "").trim().match(SPEAKER_ROW)?.[1]).filter((n): n is string => !!n).map((n) => n.toLowerCase().replace(/[^\p{L}]+/gu, "")));
/* a pair's translation is the bookshelf's, not words of the quotation: the original alone is compared */
const spoken = (ls: string[], passage: boolean, called: Set<string>): string => ls.map((l) => l.replace(/^\s*(?:>\s?)*/, "").replace(/(?<!\\)\s\|(?:\s.*)?$/, "").trim())
  .filter((l) => !/^:::/.test(l) && !SPEAKER_ROW.test(l) && !(passage && /^\*[^*]+\*$/.test(l)) && !/^\[[^\]]*\]?$/.test(l) && !/^[A-Z][A-Z .'’-]*[.:]?$/.test(l) && !called.has(l.toLowerCase().replace(/[^\p{L}]+/gu, "")))
  .map((l) => l.replace(/^[A-Z][\w .'’-]*?\t/, "").replace(/^[A-Z][A-Z .'’-]+:\s+/, "").replace(/\*/g, "")).join(" ");
for (const path of walk(SRC).sort()) {
  const file = relative(SRC, path);
  if (file.startsWith("bookshelf/") && !ALSO.includes(file)) continue;
  counts.entries++;
  const original = readFileSync(path, "utf8");
  let md = original;
  for (const x of LINKED.filter((x) => x.file === file && read(x.key))) {
    const ls = md.split("\n"), m = referenceOf(index, { key: x.key, first: index.entries.find((e) => e.key === x.key)!.units.findIndex((u) => u.line === x.from), last: index.entries.find((e) => e.key === x.key)!.units.findIndex((u) => u.line === x.from) });
    const it = ls[x.at - 1].match(/\*[^*]+\*/);
    if (!("url" in m) || !it) throw new Error(`${file}:${x.at}: no italic line of verse to link`);
    const label = m.text.split("\n")[0].replace(/\]\(.*$/, "]").slice(1, -1);
    shown.push({ file, r: { start: x.at - 1, end: x.at - 1, key: x.key, first: 0, last: 0, from: x.from, to: x.from }, label, before: [ls[x.at - 1]], after: [ls[x.at - 1].replace(it[0], `[${it[0]}](${m.url})`)], diff: { kind: "same", ops: [] } });
    ls[x.at - 1] = ls[x.at - 1].replace(it[0], `[${it[0]}](${m.url})`);
    md = ls.join("\n");
    counts.runs++; counts.lines++;
  }
  const verse = [...quotedRuns(md, index), ...placed(file)].sort((a, b) => a.start - b.start).filter((r) => {
    const k = KEEP.find((x) => x.file === file && x.key === r.key && x.from === r.from && (x.at === undefined || x.at === r.start + 1));
    if (k) kept.push(`${file} — ${r.key.split("/").slice(-2).join(" ")}.${r.from}-${r.to}: ${k.why}`);
    return !k;
  });
  const prose = quotedPassages(md, index, PREFIXES, verse);
  const runs = [...verse, ...prose.map((p) => p.run)].sort((a, b) => a.start - b.start);
  if (!runs.length && md === original) continue;
  if (LEAVE.test(file)) { left.push(file); continue; }
  const minted = new Map<Run, ReturnType<typeof referenceOf>>([...verse.map((r): [Run, ReturnType<typeof referenceOf>] => [r, referenceOf(index, r)]), ...prose.map((p): [Run, ReturnType<typeof referenceOf>] => [p.run, p.ref])]);
  const each = runs.filter((r) => "url" in minted.get(r)!);
  /* a quoted line beside a verse run that no run takes stays as written beside the reference: listed for a hand */
  const src0 = md.split("\n");
  const lone = (i: number): boolean => i >= 0 && i < src0.length && QUOTED.test(src0[i]) && /\p{L}/u.test(src0[i]) && !runs.some((x) => i >= x.start && i <= x.end);
  for (const r of verse) if (QUOTED.test(src0[r.start]) && (lone(r.start - 1) || lone(r.end + 1))) partial.push(`${file}:${r.start + 1}–${r.end + 1} — ${r.key.split("/").slice(1).join(" ")} — beside it: ${(lone(r.start - 1) ? src0[r.start - 1] : src0[r.end + 1]).trim()}`);
  const passage = (r: Run): string => { if (!minted.has(r)) minted.set(r, referenceOf(index, r)); const m = minted.get(r)!; return "passage" in m ? m.passage : ""; };
  const ok = sameQuoted(md, each, passage, index).map(({ run, as }) => { passage(as); minted.set(run, minted.get(as)!); return run; }).filter((r) => "url" in minted.get(r)!);
  const out = referRuns(md, ok, (r) => minted.get(r) as { text: string; url: string; passage: string });
  const src = md.split("\n");
  for (const r of ok) {
    counts.runs++; counts.lines += r.end - r.start + 1;
    const m = minted.get(r) as { text: string; url: string; passage: string };
    const alone = referRuns(md, [r], () => m).split("\n");
    /* the card shows every line the reference changes, a line either side: a citation it replaced a blank line above was out of sight, and the link with it */
    let first = 0, same = 0;
    while (first < src.length && src[first] === alone[first]) first++;
    while (same < src.length - first && same < alone.length - first && src[src.length - 1 - same] === alone[alone.length - 1 - same]) same++;
    shown.push({ file, r, label: m.text.split("\n")[0].replace(/\]\(.*$/, "]").slice(1, -1), before: src.slice(Math.max(0, first - 1), src.length - same + 1), after: alone.slice(Math.max(0, first - 1), alone.length - same + 1), diff: wordDiff(spoken(src.slice(r.start, r.end + 1), false, names(m.passage.split("\n"))), spoken(m.passage.split("\n"), true, new Set())) });
  }
  const doc = parseMarkdown(out);
  if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error(`${file}: not a fixed point`);
  counts.changed++;
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, out);
}
/* a synced Desktop can leave an empty "journal 2" beside a folder cleared
   and written again at once: empty folders are swept */
const sweep = (dir: string): boolean => {
  const kids = readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory() ? !sweep(join(dir, n)) : n !== ".DS_Store");
  if (kids.length || dir === OUT) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
};
mkdirSync(OUT, { recursive: true });
sweep(OUT);
const group = (kind: string) => shown.filter((x) => x.diff.kind === kind);
const words = (d: ReturnType<typeof wordDiff>): string => d.ops.map(([o, w]) => o === "=" ? esc(w) : o === "-" ? `<del>${esc(w)}</del>` : `<ins>${esc(w)}</ins>`).join(" ");
const card = ({ file, r, label, before, after, diff }: (typeof shown)[number]): string => `<div class="e"><span>${esc(file)}:${r.start + 1}–${r.end + 1} — ${esc(label)}${r.parts ? ` — one reference for ${r.parts} runs of your quotation` : ""}</span>${diff.kind === "same" ? "" : `<p class="d">${words(diff)}</p>`}<pre class="before">${esc(before.join("\n"))}</pre><pre class="after">${esc(after.join("\n").replace(/\?h=[^)]*/g, "?h=…"))}</pre></div>`;
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Quoted lines review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}
.e{margin:1.4em 0}.e>span{font:12px ui-monospace,Menlo,monospace;color:#6b7568}
pre{white-space:pre-wrap;font:13px/1.45 ui-monospace,Menlo,monospace;margin:.3em 0;padding:6px 8px}
.before{background:#fbeee8}.after{background:#e6f0dc}
.d{background:#fffbe6;padding:6px 8px;margin:.3em 0}del{color:#a3201a;text-decoration:line-through}ins{color:#17632a;text-decoration:none;border-bottom:2px solid #17632a}</style>
<h1>${esc(PREFIXES.map((p) => p.replace(/^bookshelf\//, "")).join(", "))}: ${counts.runs} quotations made references, ${counts.lines} lines, in ${counts.changed} entries</h1>
<p>${counts.entries} entries outside the bookshelf read. A run of lines that are the bookshelf's own, one after another, becomes the reference ⌃⌘R makes for them, starting and ending where your quotation does: after a short citation ending in a colon that gives the lines, that citation becomes the link in its own words; otherwise the whole reference stands in the run's place, a citation of the act and scene alone included. Runs of one scene in one quotation of yours, with nothing of the scene left out between them, are one reference. A quotation already under a link to the bookshelf is left. Red is the text as it stands, with a line either side; green the same place as it will read.</p>
<p>Where your words and the bookshelf's differ, a yellow line sets them side by side: <del>struck through in red</del> your words the reference drops, <ins>underlined in green</ins> the bookshelf's words it puts in. Speakers' names, stage directions and marks are left out of the comparison.</p>
<p><a href="#wording">Wording differs: ${group("wording").length}</a> · <a href="#spelling">Spelling only: ${group("spelling").length}</a> · <a href="#same">Same words: ${group("same").length}</a></p>
<h2>Left: the reference feature's own test data (${left.length})</h2>
<ul>${left.map((f) => `<li><code>${esc(f)}</code></li>`).join("")}</ul>
<h2>Left as you wrote them (${kept.length})</h2>
<ul>${kept.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
<h2>Part of a quotation left beside its reference (${partial.length})</h2>
<ul>${partial.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
<h2 id="wording">Wording differs (${group("wording").length})</h2>
${group("wording").map(card).join("")}
<h2 id="spelling">Spelling only (${group("spelling").length})</h2>
${group("spelling").map(card).join("")}
<h2 id="same">Same words (${group("same").length})</h2>
${group("same").map(card).join("")}`);
console.log(`${counts.entries} entries read; ${counts.runs} runs (${counts.lines} lines) made references in ${counts.changed} entries; written to ${OUT}, the review beside it`);
