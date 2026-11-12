/* node tools/hwaetTextsRun.ts [id ...] — texts with their translations from
   early-medieval-england.net (pages cached under one-offs/out/hwaet): Deor, The
   Wanderer and The Seafarer (Deor, Wdr, Sfr) as whole lines, Hávamál (Hav)
   in stanzas; written under OUT (default ~/Desktop/gesta-imports/gesta-hwaet)
   for an import, a review page beside it, the counts printed */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { hwaetStanzas, hwaetNotes, wholeLines, hwaetEntry, stanzaLines, hwaetStanzaEntry } from "./hwaetTexts.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const BACKUP = join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.env.OUT ?? join(HOME, "Desktop/gesta-imports/gesta-hwaet");
const CACHE = new URL("out/hwaet/", import.meta.url).pathname;
/* `lines` the poem's count of lines, `stanzas` its count of stanzas where it is in stanzas */
const POEMS: { id: string; key: string; title: string; lines?: number; stanzas?: number }[] = [
  { id: "Deor", key: "Deor", title: "Deor", lines: 42 },
  { id: "Wdr", key: "Wanderer", title: "The Wanderer", lines: 115 },
  { id: "Sfr", key: "Seafarer", title: "The Seafarer", lines: 124 },
  { id: "Hav", key: "Havamal", title: "Hávamál", stanzas: 164 },
];
const ASKED = process.argv.slice(2);
const unknown = ASKED.filter((id) => !POEMS.some((p) => p.id === id));
if (unknown.length) throw new Error(`no such text: ${unknown} (one of ${POEMS.map((p) => p.id)})`);
const NOTE_LINES = "Text and translation: early-medieval-england.net, the half-lines set as whole lines.";
const NOTE_STANZAS = "Text and translation: early-medieval-england.net.";

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
const row = (n: string, l: string): string => { const [t, tr] = l.split(/ \|(?: |$)/); return `<tr><td class="n">${n}</td><td>${esc(t).replace(/  /g, "&emsp;")}</td><td class="w">${esc(tr ?? "")}</td></tr>`; };
const noteRow = (lines: string[]): string => `<tr><td></td><td colspan="2" class="note">${lines.map(esc).join("<br>")}</td></tr>`;
/* the lines before a stanza's notes, and the notes */
const split = (s: string[]): [string[], string[]] => { const at = s.indexOf("::: note"); return at === -1 ? [s, []] : [s.slice(0, at), s.slice(at + 1, -1)]; };

/* the backup's bookshelf roots by their heading, so a poem filed under another name is still found */
const shelf = join(BACKUP, "bookshelf");
const headed = new Map(readdirSync(shelf).filter((f) => f.endsWith(".md")).map((f) => [/^# (.+)/.exec(readFileSync(join(shelf, f), "utf8"))?.[1] ?? "", f]));
for (const p of POEMS.filter((p) => !ASKED.length || ASKED.includes(p.id))) {
  /* a poem the backup has already is left out, under its key or its heading: an edit made there would be lost */
  const had = existsSync(join(shelf, p.key)) || existsSync(join(shelf, p.key + ".md")) ? p.key : headed.get(p.title);
  if (had) { console.log(`${p.title}: the backup has it already (bookshelf/${had}), left out`); continue; }
  const html = await page(p.id);
  const half = hwaetStanzas(html), notes = hwaetNotes(html);
  const marks = half.flat().flatMap((h) => (h.note ? [h.note] : []));
  const unmarked = Object.keys(notes).filter((id) => !marks.includes(id));
  if (unmarked.length) throw new Error(`${p.key}: notes with no mark in the text: ${unmarked}`);
  if (half.flat().some((r) => (r.text + r.tr).includes("|"))) throw new Error(`${p.key}: a row holds a pipe`);
  if (p.stanzas) {
    const { stanzas, off } = stanzaLines(half, notes);
    if (stanzas.length !== p.stanzas || off.length) throw new Error(`${p.key}: ${stanzas.length} stanzas, not ${p.stanzas}; ${off.slice(0, 3)}`);
    Object.assign(entries, hwaetStanzaEntry(p.key, p.title, stanzas, NOTE_STANZAS));
    const lines = stanzas.reduce((a, s) => a + split(s.lines)[0].length, 0);
    report.push(`<h2>${esc(p.title)}</h2><p>${stanzas.length} stanzas, ${lines} lines, every stanza number and line number the site prints at its place, ${marks.length} notes.</p><table>` +
      stanzas.map((s) => { const [ls, ns] = split(s.lines); return ls.map((l, i) => row(i ? String(i + 1) : `<b>${s.n}</b>`, l)).join("") + (ns.length ? noteRow(ns) : ""); }).join(`<tr class="gap"><td colspan="3"></td></tr>`) + "</table>");
    console.log(`${p.title}: ${stanzas.length} stanzas, ${lines} lines, ${marks.length} notes`);
    continue;
  }
  const { stanzas, numbered, odd } = wholeLines(half, notes);
  const count = stanzas.reduce((a, s) => a + split(s)[0].length, 0);
  const off = numbered.filter((x) => x.n !== x.at);
  if (count !== p.lines || off.length || odd.length) throw new Error(`${p.key}: ${count} lines, not ${p.lines}; numbers off ${JSON.stringify(off.slice(0, 3))}; odd stanzas ${odd}`);
  Object.assign(entries, hwaetEntry(p.key, p.title, stanzas, NOTE_LINES));
  let n = 0;
  report.push(`<h2>${esc(p.title)}</h2><p>${count} lines in ${stanzas.length} stanzas, ${numbered.length} of the site's line numbers checked, ${marks.length} notes.</p><table>` +
    stanzas.map((s) => { const [ls, ns] = split(s); return ls.map((l) => { n++; return row(n % 5 ? "" : String(n), l); }).join("") + (ns.length ? noteRow(ns) : ""); }).join(`<tr class="gap"><td colspan="3"></td></tr>`) + "</table>");
  console.log(`${p.title}: ${count} lines, ${stanzas.length} stanzas, ${numbered.length} line numbers checked, ${marks.length} notes`);
}
for (const md of Object.values(entries)) if (serializeMarkdown(parseMarkdown(md)) !== md) throw new Error("an entry does not survive its round trip");
if (!Object.keys(entries).length) { console.log("nothing to write"); process.exit(0); }

rmSync(OUT, { recursive: true, force: true });
for (const [path, md] of Object.entries(entries)) {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), md);
}
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Texts with translations</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:64em;padding:0 1em}td{padding:0 1em 0 0;vertical-align:top}.n{color:#999;text-align:right;font-size:.8em}.w{color:#555}.gap td{height:1em}.note{font-size:.85em;color:#333;border:1px solid #ccc;padding:.4em .6em}</style>
<h1>Texts with translations, from early-medieval-england.net</h1>
<p>Each entry is one bookshelf page with its reference setting <code>no author</code>, the text and its translation side by side as pairs. A poem in half-lines there is set in whole lines here, the half-lines two spaces apart; a poem in stanzas keeps a row a line, each stanza its own <code>::: stanza N</code> fence, referred to stanza and line (76.1-3). The site's notes are footnotes: a mark after the line or half-line, the stanza's notes after its last line.</p>
${report.join("\n")}`);
console.log(`written to ${OUT}`);
