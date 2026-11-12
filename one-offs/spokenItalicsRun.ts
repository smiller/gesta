/* node one-offs/spokenItalicsRun.ts [backup-dir] [out-dir] — Cyrano's scenes
   read, their spoken rows wholly italic declared lines, the changed entries
   written under out-dir at their own paths for an import, a review page
   beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { declareLines, type Mark } from "./spokenItalics.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { lineUnits } from "../src/editor/numbering.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-spoken-italics");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-spoken-italics/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-spoken-italics…`);
const BOOK = "bookshelf/Rostand, Edmond/Cyrano de Bergerac";
/* a direction that lost its brackets */
const DIRECTIONS = ["*Les violons commencent à jouer.*"];

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const ink = (md: string): string => parseMarkdown(md).textContent.replace(/\s+/g, "");
const numbered = (md: string) => lineUnits(parseMarkdown(md), 1).filter((u) => u.line);

rmSync(OUT, { recursive: true, force: true });
const files = readdirSync(join(SRC, BOOK)).filter((f) => f.endsWith(".md")).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
const done: { file: string; marks: (Mark & { n: number; speaker: string })[]; before: number; after: number }[] = [], refused: { file: string; why: string }[] = [];
for (const f of files) {
  const file = `${BOOK}/${f}`, md = readFileSync(join(SRC, file), "utf8");
  const { text, marks } = declareLines(md, DIRECTIONS);
  if (!marks.length) continue;
  const doc = parseMarkdown(text), before = numbered(md), after = numbered(text);
  const rows = new Map(after.map((u) => [u.node.textContent, u.line]));
  const why = serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc) ? "not a fixed point"
    : ink(text) !== ink(md) ? "its words read differently"
    : after.length !== before.length + marks.length ? `numbered lines ${before.length} → ${after.length}, not +${marks.length}` : "";
  if (why) { refused.push({ file, why }); continue; }
  const src = md.split("\n");
  const speakerOf = (i: number): string => src.slice(0, i).reverse().find((l) => /^\*\*.*\*\*$/.test(l.trim())) ?? "";
  done.push({ file, before: before.length, after: after.length, marks: marks.map((m) => ({ ...m, n: rows.get(parseMarkdown(m.row).textContent) ?? 0, speaker: speakerOf(m.line) })) });
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, text);
}
mkdirSync(OUT, { recursive: true });

const total = done.reduce((s, d) => s + d.marks.length, 0);
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Spoken italics review</title><style>
:root{--bg:#f6f4ee;--fg:#1f1f1f;--mut:#777;--line:#dcd8cc;--q:#2b4a6f;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#1b1b1d;--fg:#e6e6e6;--mut:#999;--line:#3a3a3e;--q:#9cc3ef;--card:#242427}}
body{font:15px/1.45 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:var(--bg);color:var(--fg)}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid var(--line)}
.r{display:flex;gap:.8em;align-items:baseline;margin:.2em 0}.n{font:12px ui-monospace,Menlo,monospace;color:var(--mut);min-width:3.5em;text-align:right}
.s{font-size:13px;color:var(--mut)}.t{font-style:italic;color:var(--q)}</style>
<h1>Spoken italics: ${total} rows declared lines in ${done.length} scenes</h1>
<p>${files.length} scenes of <i>Cyrano de Bergerac</i> read. Each row wholly italic and not in brackets, the scene's cast aside, now counts as a line: shown with the number it is given and its speaker. Left as a direction: ${DIRECTIONS.map(esc).join(", ")}.</p>
<h2>Refused: not written — ${refused.length}</h2>
${refused.map((r) => `<p>${esc(r.file)} — ${r.why}</p>`).join("") || "<p>None.</p>"}
${done.map(({ file, marks, before, after }) => `<h2>${esc(basename(file, ".md"))} — ${marks.length} (numbered lines ${before} → ${after})</h2>` +
  marks.map((m) => `<div class="r"><span class="n">${m.n}</span><span class="t">${esc(m.row.replace(/^\*|\*$/g, ""))}</span><span class="s">${esc(m.speaker.replace(/\*/g, ""))}</span></div>`).join("")).join("")}`);
console.log(`${files.length} scenes read; ${total} rows declared lines in ${done.length} scenes, ${refused.length} refused; written to ${OUT}, the review beside it`);
for (const d of done) console.log(`  ${basename(d.file, ".md").padEnd(5)} ${String(d.marks.length).padStart(3)}  numbered ${d.before} → ${d.after}`);
for (const r of refused) console.log(`refused: ${r.file} — ${r.why}`);
