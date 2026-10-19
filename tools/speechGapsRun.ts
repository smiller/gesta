/* node tools/speechGapsRun.ts [backup-dir] [out-dir] — Cyrano's scenes and
   the journal entries that quote them read, a speech's lines closed up, the
   changed entries written under out-dir at their own paths for an import, a
   review page beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { closeSpeeches, type Change } from "./speechGaps.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { lineUnits } from "../src/editor/numbering.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-speech-gaps");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-speech-gaps/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-speech-gaps…`);
const BOOK = "bookshelf/Rostand, Edmond/Cyrano de Bergerac";
/* the ballade's stanza break with no direction in it */
const APART: Record<string, string[]> = { [`${BOOK}/1.4.md`]: ["*Qu’à la fin de l’envoi, je touche.*"] };

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const ink = (md: string): string => parseMarkdown(md).textContent.replace(/\s+/g, "");
const numbered = (md: string): string => lineUnits(parseMarkdown(md), 1).filter((u) => u.line).map((u) => `${u.line}:${u.node.textContent}`).join("\n");

const quoting = walk(join(SRC, "journal")).filter((p) => readFileSync(p, "utf8").includes("](#bookshelf/Rostand%2C%20Edmond/Cyrano%20de%20Bergerac/"));
const files = [...walk(join(SRC, BOOK)).sort((a, b) => a.localeCompare(b, "en", { numeric: true })), ...quoting.sort()];

rmSync(OUT, { recursive: true, force: true });
const done: { file: string; changes: Change[] }[] = [], refused: { file: string; why: string }[] = [], kept: { file: string; line: string }[] = [];
for (const path of files) {
  const file = relative(SRC, path), md = readFileSync(path, "utf8");
  const apart = APART[file] ?? [];
  const { text, changes } = closeSpeeches(md, apart);
  for (const line of apart) if (md.includes(line + "\n\n")) kept.push({ file, line });
  if (!changes.length) continue;
  const doc = parseMarkdown(text);
  const why = serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc) ? "not a fixed point"
    : ink(text) !== ink(md) ? "its words read differently"
    : numbered(text) !== numbered(md) ? "its numbered lines read differently" : "";
  if (why) { refused.push({ file, why }); continue; }
  done.push({ file, changes });
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, text);
}
mkdirSync(OUT, { recursive: true });

const joined = done.flatMap((d) => d.changes.filter((c) => c.kind === "joined")).length;
const collapsed = done.flatMap(({ file, changes }) => changes.filter((c) => c.kind === "collapsed").map((c) => ({ file, c })));
const shown = (c: Change): string => `<div class="j"><span class="ln">line ${c.line + 1}</span><div class="q">${esc(c.above)}</div><div class="q">${esc(c.below)}</div></div>`;
const name = (f: string): string => f.replace(`${BOOK}/`, "Cyrano ").replace(/\.md$/, "");
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Speech gaps review</title><style>
:root{--bg:#f6f4ee;--fg:#1f1f1f;--mut:#777;--line:#dcd8cc;--q:#2b4a6f;--card:#fff;--keep:#8a3b2a}
@media (prefers-color-scheme:dark){:root{--bg:#1b1b1d;--fg:#e6e6e6;--mut:#999;--line:#3a3a3e;--q:#9cc3ef;--card:#242427;--keep:#e59a87}}
body{font:15px/1.45 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:var(--bg);color:var(--fg)}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid var(--line)}
details{margin:.15em 0}summary{font:13px ui-monospace,Menlo,monospace;cursor:pointer}
.j{background:var(--card);border:1px solid var(--line);border-radius:5px;padding:.3em .6em;margin:.35em 0 .35em 1em}
.q{font:13px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word;color:var(--q)}
.ln{font:11px ui-monospace,Menlo,monospace;color:var(--mut)}.keep{color:var(--keep)}</style>
<h1>Speech gaps: ${joined} blank lines closed up in ${done.length} entries</h1>
<p>${files.length} entries read: Cyrano's scenes and the journal entries that quote them. Each closed gap is shown as the line above it and the line below, which now sit together. Blank lines before a speaker and round a bracketed direction stay. Every entry written reads the same words and the same numbered lines as before.</p>
<h2>Refused: not written — ${refused.length}</h2>
${refused.map((r) => `<p>${esc(r.file)} — ${r.why}</p>`).join("") || "<p>None.</p>"}
<h2>Kept apart — ${kept.length}</h2>
${kept.map((k) => `<p class="keep">${esc(name(k.file))} — the gap after ${esc(k.line)}</p>`).join("")}
<h2>Blank lines in a run made one — ${collapsed.length}</h2>
${collapsed.map(({ file, c }) => `<h3>${esc(name(file))}</h3>` + shown(c)).join("")}
<h2>Closed up, by entry — ${joined}</h2>
${done.map(({ file, changes }) => {
  const js = changes.filter((c) => c.kind === "joined");
  return js.length ? `<details><summary>${esc(name(file))} — ${js.length}</summary>${js.map(shown).join("")}</details>` : "";
}).join("")}`);
console.log(`${files.length} entries read (${quoting.length} journal); ${joined} gaps closed and ${collapsed.length} runs made one in ${done.length} entries, ${refused.length} refused, ${kept.length} kept apart; written to ${OUT}, the review beside it`);
for (const r of refused) console.log(`refused: ${r.file} — ${r.why}`);
