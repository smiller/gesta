/* node tools/shelfLinesRun.ts [author-prefix] [backup-dir] [out-dir] — every
   entry outside the bookshelf read, its runs of an author's verse quoted
   line for line made the references ⌃⌘R makes for them, the changed
   entries written under out-dir at their own paths for an import, a review
   page beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { quotedRuns, referRuns, type Run } from "./shelfLines.ts";
import { shelfIndex, referenceAt } from "./bookshelfQuotes.ts";
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
const index = shelfIndex(Object.fromEntries(Object.entries(cache).filter(([k]) => k === AUTHOR || k.startsWith(AUTHOR + "/"))));

/* entries that quote the bookshelf as the reference feature's test data, left */
const LEAVE = /gesta-wrangl|verity cards/i;
const left: string[] = [];

rmSync(OUT, { recursive: true, force: true });
const counts = { entries: 0, changed: 0, runs: 0, lines: 0 };
const shown: { file: string; r: Run; label: string; before: string[]; after: string[] }[] = [];
for (const path of walk(SRC).sort()) {
  const file = relative(SRC, path);
  if (file.startsWith("bookshelf/")) continue;
  counts.entries++;
  const md = readFileSync(path, "utf8");
  const runs = quotedRuns(md, index);
  if (!runs.length) continue;
  if (LEAVE.test(file)) { left.push(file); continue; }
  const minted = new Map<Run, ReturnType<typeof referenceAt>>(runs.map((r) => [r, referenceAt(index, r.key, r.from, r.to, r)]));
  const ok = runs.filter((r) => "url" in minted.get(r)!);
  const out = referRuns(md, ok, (r) => minted.get(r) as { text: string; url: string; passage: string });
  const src = md.split("\n");
  for (const r of ok) {
    counts.runs++; counts.lines += r.end - r.start + 1;
    const m = minted.get(r) as { text: string; url: string; passage: string };
    const alone = referRuns(md, [r], () => m).split("\n"), grew = alone.length - src.length;
    shown.push({ file, r, label: m.text.split("\n")[0].replace(/\]\(.*$/, "]").slice(1, -1), before: src.slice(Math.max(0, r.start - 1), r.end + 2), after: alone.slice(Math.max(0, r.start - 1), r.end + grew + 2) });
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
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Quoted lines review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}
.e{margin:1.4em 0}.e>span{font:12px ui-monospace,Menlo,monospace;color:#6b7568}
pre{white-space:pre-wrap;font:13px/1.45 ui-monospace,Menlo,monospace;margin:.3em 0;padding:6px 8px}
.before{background:#fbeee8}.after{background:#e6f0dc}</style>
<h1>${esc(AUTHOR.replace(/^bookshelf\//, ""))}: ${counts.runs} quotations made references, ${counts.lines} lines, in ${counts.changed} entries</h1>
<p>${counts.entries} entries outside the bookshelf read. A run of lines that are the bookshelf's own, one after another, becomes the reference ⌃⌘R makes for them: after a short citation ending in a colon, that citation becomes the link in its own words; otherwise the whole reference stands in the run's place. A quotation already under a link to the bookshelf is left. Red is the text as it stands, with a line either side; green the same place as it will read, the reference in the run's stead.</p>
<h2>Left: the reference feature's own test data (${left.length})</h2>
<ul>${left.map((f) => `<li><code>${esc(f)}</code></li>`).join("")}</ul>
<h2>Made references (${shown.length})</h2>
${shown.map(({ file, r, label, before, after }) => `<div class="e"><span>${esc(file)}:${r.start + 1}–${r.end + 1} — ${esc(label)}</span><pre class="before">${esc(before.join("\n"))}</pre><pre class="after">${esc(after.join("\n").replace(/\?h=[^)]*/g, "?h=…"))}</pre></div>`).join("")}`);
console.log(`${counts.entries} entries read; ${counts.runs} runs (${counts.lines} lines) made references in ${counts.changed} entries; written to ${OUT}, the review beside it`);
