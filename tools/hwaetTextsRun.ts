/* node tools/hwaetTextsRun.ts [out-dir] — Deor, The Wanderer and The
   Seafarer with their translations from early-medieval-england.net (pages
   cached under tools/out/hwaet), written under out-dir/bookshelf/ for an
   import, a review page beside out-dir, the counts printed */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { hwaetStanzas, hwaetNotes, wholeLines, hwaetEntry } from "./hwaetTexts.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const BACKUP = join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[2] ?? join(HOME, "Desktop/gesta-imports/gesta-old-english");
const CACHE = new URL("out/hwaet/", import.meta.url).pathname;
const POEMS = [
  { id: "Deor", key: "Deor", title: "Deor", lines: 42 },
  { id: "Wdr", key: "Wanderer", title: "The Wanderer", lines: 115 },
  { id: "Sfr", key: "Seafarer", title: "The Seafarer", lines: 124 },
];
const NOTE = "Text and translation: early-medieval-england.net, the half-lines set as whole lines.";

async function page(id: string): Promise<string> {
  mkdirSync(CACHE, { recursive: true });
  const path = join(CACHE, id + ".html");
  if (!existsSync(path)) {
    const res = await fetch(`http://www.early-medieval-england.net/hwaet/?do=get&type=text&id=${id}`, { headers: { "User-Agent": "GestaOldEnglishImport/1.0 (a personal bookshelf import)" } });
    if (!res.ok) throw new Error(`the site answered ${res.status} for ${id}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return readFileSync(path, "latin1");
}

const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
const entries: Record<string, string> = {};
const report: string[] = [];
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
for (const p of POEMS) {
  const html = await page(p.id);
  const half = hwaetStanzas(html), notes = hwaetNotes(html);
  /* an entry already there is replaced only as this run first wrote it, without the notes: an edit made since would be lost */
  if (existsSync(join(BACKUP, "bookshelf", p.key))) throw new Error(`the backup has entries under ${p.key}: this folder would not replace them`);
  const stored = join(BACKUP, "bookshelf", p.key + ".md");
  const first = hwaetEntry(p.key, p.title, wholeLines(half.map((s) => s.map(({ note: _, ...h }) => h))).stanzas, NOTE)[`bookshelf/${p.key}.md`];
  if (existsSync(stored) && readFileSync(stored, "utf8") !== first) throw new Error(`the backup's ${p.key} has changed since it was imported: this folder would overwrite it`);
  const marks = half.flat().flatMap((h) => (h.note ? [h.note] : []));
  const unmarked = Object.keys(notes).filter((id) => !marks.includes(id));
  if (unmarked.length) throw new Error(`${p.key}: notes with no mark in the text: ${unmarked}`);
  if (half.flat().some((r) => (r.text + r.tr).includes("|"))) throw new Error(`${p.key}: a half-line holds a pipe`);
  const { stanzas, numbered, odd } = wholeLines(half, notes);
  const count = stanzas.reduce((a, s) => a + (s.includes("::: note") ? s.indexOf("::: note") : s.length), 0);
  const off = numbered.filter((x) => x.n !== x.at);
  if (count !== p.lines || off.length || odd.length) throw new Error(`${p.key}: ${count} lines, not ${p.lines}; numbers off ${JSON.stringify(off.slice(0, 3))}; odd stanzas ${odd}`);
  Object.assign(entries, hwaetEntry(p.key, p.title, stanzas, NOTE));
  let n = 0;
  report.push(`<h2>${esc(p.title)}</h2><p>${count} lines in ${stanzas.length} stanzas, ${numbered.length} of the site's line numbers checked, ${marks.length} notes.</p><table>` +
    stanzas.map((s) => {
      const at = s.indexOf("::: note");
      const lines = (at === -1 ? s : s.slice(0, at)).map((l) => { n++; const [t, tr] = l.split(" | "); return `<tr><td class="n">${n % 5 ? "" : n}</td><td>${esc(t).replace(/  /g, "&emsp;")}</td><td class="w">${esc(tr)}</td></tr>`; }).join("");
      return lines + (at === -1 ? "" : `<tr><td></td><td colspan="2" class="note">${s.slice(at + 1, -1).map(esc).join("<br>")}</td></tr>`);
    }).join(`<tr class="gap"><td colspan="3"></td></tr>`) + "</table>");
  console.log(`${p.title}: ${count} lines, ${stanzas.length} stanzas, ${numbered.length} line numbers checked, ${marks.length} notes`);
}
for (const md of Object.values(entries)) if (serializeMarkdown(parseMarkdown(md)) !== md) throw new Error("an entry does not survive its round trip");

rmSync(OUT, { recursive: true, force: true });
/* an entry the backup already holds as it stands is left out */
for (const [path, md] of Object.entries(entries)) {
  if (existsSync(join(BACKUP, path)) && readFileSync(join(BACKUP, path), "utf8") === md) { console.log(`${path}: as the backup has it, left out`); continue; }
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), md);
}
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Old English import</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:64em;padding:0 1em}td{padding:0 1em 0 0;vertical-align:top}.n{color:#999;text-align:right;font-size:.8em}.w{color:#555}.gap td{height:1em}.note{font-size:.85em;color:#333;border:1px solid #ccc;padding:.4em .6em}</style>
<h1>Deor, The Wanderer, The Seafarer</h1>
<p>From early-medieval-england.net, a row a half-line there, made a whole line here: the Old English half-lines two spaces apart, the translation's joined by one. Three entries, <code>bookshelf/Deor</code>, <code>bookshelf/Wanderer</code>, <code>bookshelf/Seafarer</code>, each with its reference setting <code>no author</code> and one verse block of pairs, a gap between stanzas. The site's notes as footnotes: a mark after the half-line in the text, numbered within the stanza, the stanza's notes after its last line.</p>
${report.join("\n")}`);
console.log(`written to ${OUT}`);
