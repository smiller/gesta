/* node tools/fencedProseRun.ts [backup-dir] [out-dir] — every entry in the
   backup read, its prose fences made quotations, the changed entries
   written under out-dir at their own paths for an import, a review page
   beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { quoteFencedProse, type Fence } from "./fencedProse.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-fenced-prose");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-fenced-prose/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-fenced-prose…`);

/* left as they stand, asked: the sessions' wrangling entries and every
   entry of 2026, whose fences record what was typed to and from a
   terminal, or are code; and fences read and kept */
const LEAVE_ENTRY = /gesta[- ]wrangl|^journal\/2026\//i;
const LEAVE_FENCE = new Set(["journal/1996/1996-02-08.md:13", "journal/2011/2011-12-01.md:18"]);
const LEAVE_FILE = new Set(["journal/2018/2018-12-29.md"]);
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

rmSync(OUT, { recursive: true, force: true });
const counts = { entries: 0, skipped: 0, changed: 0, prose: 0, aligned: 0, code: 0, unsafe: 0, left: 0 };
const shown: { file: string; f: Fence }[] = [], kept: { file: string; f: Fence }[] = [];
for (const path of walk(SRC).sort()) {
  counts.entries++;
  const md = readFileSync(path, "utf8"), file = relative(SRC, path);
  if (LEAVE_ENTRY.test(file) || LEAVE_FILE.has(file)) { counts.skipped++; continue; }
  const r = quoteFencedProse(md, (line) => LEAVE_FENCE.has(file + ":" + line));
  for (const f of r.fences) {
    counts[f.kind]++;
    if (f.kind === "prose") shown.push({ file, f });
    else if (f.kind === "aligned" || f.kind === "unsafe") kept.push({ file, f });
  }
  if (r.md === md) continue;
  const doc = parseMarkdown(r.md);
  if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error(`${file}: not a fixed point`);
  counts.changed++;
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, r.md);
}
/* a synced Desktop can leave an empty "journal 2" beside a folder cleared
   and written again at once: empty folders are swept */
const sweep = (dir: string): boolean => {
  const kids = readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory() ? !sweep(join(dir, n)) : n !== ".DS_Store");
  if (kids.length || dir === OUT) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
};
sweep(OUT);
const block = (lines: string[]): string => `<pre>${esc(lines.join("\n"))}</pre>`;
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Fenced prose review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:900px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}
.e{margin:1.4em 0}.e>span{font:12px ui-monospace,Menlo,monospace;color:#6b7568}
pre{white-space:pre-wrap;font:13px/1.45 ui-monospace,Menlo,monospace;margin:.3em 0;padding:6px 8px}
.before{background:#fbeee8}.after{background:#e6f0dc}.kept{background:#eef1f6}</style>
<h1>Fenced prose: ${counts.prose} fences made quotations in ${counts.changed} entries</h1>
<p>${counts.entries - counts.skipped} entries read. Of the fences that name no language, ${counts.prose} read as prose and become quotations; ${counts.aligned} are laid out in columns or indented apart and keep their fence; ${counts.code} read as commands or code and keep theirs; ${counts.unsafe} would read as other words in a quotation and keep theirs; ${counts.left} read as prose and are left as you asked (1996-02-08:13, 2011-12-01:18). The ${counts.skipped - LEAVE_FILE.size} entries of 2026, the gesta-wrangling entries among them, and 2018-12-29 are not read at all. Red is the fence as it stands, green the quotation the import would make. The fences kept for their layout are listed last.</p>
<h2>Made quotations (${shown.length})</h2>
${shown.map(({ file, f }) => `<div class="e"><span>${esc(file)}:${f.line}</span><pre class="before">${esc(f.body.join("\n"))}</pre><pre class="after">${esc(f.quoted!)}</pre></div>`).join("")}
<h2>Kept for their layout, or because a quotation would change their words (${kept.length})</h2>
${kept.map(({ file, f }) => `<div class="e"><span>${esc(file)}:${f.line}</span>${block(f.body).replace("<pre>", '<pre class="kept">')}</div>`).join("")}`);
console.log(`${counts.entries} entries read; fences: ${counts.prose} prose → quotations, ${counts.aligned} kept for their layout, ${counts.code} kept as code, ${counts.unsafe} kept as a quotation would change them, ${counts.left} left as asked; ${counts.changed} entries changed, written to ${OUT}, the review beside it`);
