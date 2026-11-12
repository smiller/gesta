/* node tools/quoteMarksRun.ts [backup-dir] [out-dir] — every bookshelf entry
   read, its single quotation marks turned and closed up, the changed entries
   written under out-dir at their own paths for an import, a review page
   beside out-dir, the highlighted links into them checked, the counts
   printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { quoteMarks, respellMarks, type Kind } from "./quoteMarks.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { findHit } from "../src/editor/highlight.ts";
import { hashParts } from "../src/store/nav.ts";
import { entryHash, asAddress } from "../src/store/keys.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-quote-marks");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-quote-marks/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-quote-marks…`);

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
/* a line as it will read, each fix's mark coloured, a long line cut to its marks */
function shown(out: string, from: number, to: number, kinds: Map<number, Kind>): string {
  const ats = [...kinds.keys()];
  const a = to - from > 700 ? Math.max(from, Math.min(...ats) - 120) : from;
  const b = to - from > 700 ? Math.min(to, Math.max(...ats) + 120) : to;
  let html = a > from ? "…" : "";
  for (let i = a; i < b; i++) html += kinds.has(i) ? `<b class="${kinds.get(i)}">${esc(out[i])}</b>` : esc(out[i]);
  return html + (b < to ? "…" : "");
}

rmSync(OUT, { recursive: true, force: true });
const counts: Record<Kind, number> = { closing: 0, opening: 0, spacedOpen: 0, spacedClose: 0, possessive: 0, left: 0 };
let entries = 0, changed = 0;
const byFile: { file: string; lines: string[] }[] = [];
for (const path of walk(join(SRC, "bookshelf")).sort()) {
  const file = relative(SRC, path);
  entries++;
  const md = readFileSync(path, "utf8");
  const fixes = quoteMarks(md);
  if (!fixes.length) continue;
  const { out, marks } = respellMarks(md, fixes);
  for (const f of fixes) counts[f.kind]++;
  const kinds = new Map(marks.map((m) => [m.at, m.kind]));
  const lines: string[] = [];
  let from = 0;
  for (const l of out.split("\n")) {
    const to = from + l.length, mine = new Map([...kinds].filter(([at]) => at >= from && at < to));
    if (mine.size) lines.push(shown(out, from, to, mine));
    from = to + 1;
  }
  byFile.push({ file, lines });
  if (out === md) continue;
  const doc = parseMarkdown(out);
  if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error(`${file}: not a fixed point`);
  changed++;
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, out);
}
/* a synced Desktop can leave an empty "bookshelf 2" beside a folder cleared
   and written again at once: empty folders are swept */
const sweep = (dir: string): boolean => {
  const kids = readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory() ? !sweep(join(dir, n)) : n !== ".DS_Store");
  if (kids.length || dir === OUT) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
};
mkdirSync(OUT, { recursive: true });
sweep(OUT);

/* every highlighted link into a changed entry, found before, found after;
   one lost follows the passage: its highlight and the quotation after it
   set right the same way, its entry written beside the bookshelf's */
let found = 0, kept = 0;
const lost: string[] = [];
const followed: { file: string; lines: string[] }[] = [];
for (const f of walk(SRC)) {
  const file = relative(SRC, f), mine = join(OUT, file);
  const text = existsSync(mine) ? readFileSync(mine, "utf8") : readFileSync(f, "utf8");
  let next = text;
  const kinds = new Map<number, Kind>();
  for (const m of text.matchAll(/\]\((#bookshelf\/[^)\s]+\?h=[^)\s]+)\)/g)) {
    const h = hashParts(asAddress(m[1]));
    if (!h.hl?.q) continue;
    const target = join(OUT, h.date + "/" + h.tag + ".md");
    if (!existsSync(target)) continue;
    if (!findHit(parseMarkdown(readFileSync(join(SRC, h.date + "/" + h.tag + ".md"), "utf8")), h.hl.q, h.hl.nth || 0, false)) continue;
    found++;
    const now = parseMarkdown(readFileSync(target, "utf8"));
    if (findHit(now, h.hl.q, h.hl.nth || 0, false)) { kept++; continue; }
    const q = respellMarks(h.hl.q, quoteMarks(h.hl.q)).out;
    if (entryHash(h.date, h.tag, h.hl) !== m[1] || !findHit(now, q, h.hl.nth || 0, false)) { lost.push(`${file} → ${h.tag}: “${h.hl.q}”`); continue; }
    const at = next.indexOf(m[1]);
    const end = next.indexOf("\n\n", at) < 0 ? next.length : next.indexOf("\n\n", at);
    const block = next.slice(at + m[1].length, end), set = respellMarks(block, quoteMarks(block));
    const hash = entryHash(h.date, h.tag, { q, nth: h.hl.nth });
    next = next.slice(0, at) + hash + set.out + next.slice(end);
    for (const k of set.marks) kinds.set(at + hash.length + k.at, k.kind);
    kept++;
  }
  if (next === text) continue;
  mkdirSync(dirname(mine), { recursive: true });
  writeFileSync(mine, next);
  const lines: string[] = [];
  let from = 0;
  for (const l of next.split("\n")) {
    const to = from + l.length, at = new Map([...kinds].filter(([a]) => a >= from && a < to));
    if (at.size) lines.push(shown(next, from, to, at));
    from = to + 1;
  }
  followed.push({ file, lines });
}

const where = (f: string): string => f.replace(/^bookshelf\//, "").replace(/\.md$/, "");
const turned = counts.closing + counts.opening + counts.spacedOpen + counts.spacedClose + counts.possessive;
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Quotation marks review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}h3{font:12px ui-monospace,Menlo,monospace;color:#6b7568;margin:1.1em 0 .2em}
p.l{margin:.25em 0 .25em 1em;white-space:pre-wrap}b{font-weight:normal;padding:0 3px;border-radius:2px}
.closing{background:#bfe0a8}.opening{background:#b9d4f2}.spacedOpen{background:#e3d2f2}.spacedClose{background:#f6e3a1}.possessive{background:#c9ece6}.left{background:#f4c1b4}
.key b{margin:0 .2em}.lost{color:#a4321c}</style>
<h1>Quotation marks: ${turned} marks set right in ${changed} bookshelf entries</h1>
<p>${entries} bookshelf entries read. Every line holding a mark the pass set right or left, as it will read:</p>
<p class="key"><b class="closing">’</b> a closing mark typed as an opening one, turned (${counts.closing}) — <b class="opening">‘</b> an opening mark typed as a closing one before italics, turned (${counts.opening}) — <b class="spacedOpen">‘</b> a spaced opening mark closed up (${counts.spacedOpen}) — <b class="spacedClose">’</b> a spaced closing mark turned and closed up (${counts.spacedClose}) — <b class="possessive">’</b> a spaced mark after a plural made its possessive (${counts.possessive}) — <b class="left">‘</b> a spaced mark left for a hand (${counts.left}).</p>
<p>Highlighted links into the changed entries: ${found} found before, ${kept} found after, ${followed.length} of their entries set right to follow.${lost.length ? " Lost:" : ""}</p>
${lost.map((l) => `<p class="lost">${esc(l)}</p>`).join("")}
${followed.length ? `<h2>Following the passage</h2><p>An entry whose highlighted link and quotation carried the marks as they were, set right the same way:</p>` + followed.map(({ file, lines }) => `<h3>${esc(file.replace(/\.md$/, ""))}</h3>` + lines.map((l) => `<p class="l">${l}</p>`).join("")).join("") : ""}
${byFile.map(({ file, lines }, k) => {
  const a = where(file).split("/")[0], first = k === 0 || where(byFile[k - 1].file).split("/")[0] !== a;
  return (first ? `<h2>${esc(a)}</h2>` : "") + `<h3>${esc(where(file))}</h3>` + lines.map((l) => `<p class="l">${l}</p>`).join("");
}).join("")}`);
console.log(`${entries} bookshelf entries read; ${turned} marks set right in ${changed} entries (${counts.closing} closing turned, ${counts.opening} opening turned, ${counts.spacedOpen} spaced opening, ${counts.spacedClose} spaced closing, ${counts.possessive} possessive), ${counts.left} left; written to ${OUT}, the review beside it`);
console.log(`links into changed entries: ${found} found before, ${kept} after, ${followed.length} entries following the passage${lost.length ? "; lost:\n" + lost.join("\n") : ""}`);
