/* node tools/oldSpellingsRun.ts [backup-dir] [out-dir] — every entry in the
   backup read, its Emacs links and slash italics respelled as markdown,
   the changed entries written under out-dir at their own paths for an
   import, a review page beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { respell, unslashed, ORG, type Respelled } from "./oldSpellings.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-old-spellings");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-old-spellings/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-old-spellings…`);

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
/* the words an entry reads as, the old spellings read the new way: an
   Emacs link its label, slashes around italics gone */
/* the marks of emphasis aside, which the respelling moves and markdown
   reads: every other character must stand */
const reads = (md: string): string => parseMarkdown(md).textContent.replace(/[\s*_/]+/g, "");
const readsAsNew = (md: string): string => unslashed(parseMarkdown(md).textContent.replace(ORG, (_, href: string, label?: string) => label ?? href), (b) => b).replace(/[\s*_/]+/g, "");
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

rmSync(OUT, { recursive: true, force: true });
const counts = { entries: 0, changed: 0, links: 0, italics: 0, held: 0 };
const shown: { file: string; c: Respelled }[] = [], held: { file: string; why: string; c: Respelled[] }[] = [];
for (const path of walk(SRC).sort()) {
  counts.entries++;
  const md = readFileSync(path, "utf8"), file = relative(SRC, path);
  const r = respell(md);
  if (!r.changes.length) continue;
  const doc = parseMarkdown(r.md);
  const why = reads(r.md) !== readsAsNew(md) ? "the words would read differently"
    : serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc) ? "not a fixed point" : "";
  if (why) { counts.held++; held.push({ file, why, c: r.changes }); continue; }
  counts.changed++;
  for (const c of r.changes) {
    counts.links += (c.before.match(ORG) || []).length;
    counts.italics += (c.after.match(/\*/g) || []).length / 2 - (c.before.match(/\*/g) || []).length / 2;
    shown.push({ file, c });
  }
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
mkdirSync(OUT, { recursive: true });
sweep(OUT);
const pair = (c: Respelled): string => `<pre class="before">${esc(c.before)}</pre><pre class="after">${esc(c.after)}</pre>`;
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Old spellings review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:900px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}
.e{margin:1.2em 0}.e>span{font:12px ui-monospace,Menlo,monospace;color:#6b7568}
pre{white-space:pre-wrap;font:13px/1.45 ui-monospace,Menlo,monospace;margin:.3em 0;padding:6px 8px}
.before{background:#fbeee8}.after{background:#e6f0dc}</style>
<h1>Old spellings: ${counts.links} Emacs links and ${counts.italics} italics in ${counts.changed} entries</h1>
<p>${counts.entries} entries read. Each line is shown as it stands in red and as the import would make it in green. ${counts.held} entries whose change would not read back as the same words are left as they are, and listed last.</p>
<h2>Respelled (${shown.length} lines)</h2>
${shown.map(({ file, c }) => `<div class="e"><span>${esc(file)}:${c.line}</span>${pair(c)}</div>`).join("")}
<h2>Left as they are (${held.length} entries)</h2>
${held.map(({ file, why, c }) => `<div class="e"><span>${esc(file)} — ${esc(why)}</span>${c.map(pair).join("")}</div>`).join("")}`);
console.log(`${counts.entries} entries read; ${counts.links} Emacs links and ${counts.italics} italics respelled in ${counts.changed} entries, ${counts.held} entries left; written to ${OUT}, the review beside it`);
