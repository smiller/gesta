/* An Old English text with its translation as early-medieval-england.net
   gives it — a table per stanza, a row per half-line, the text and its
   translation side by side — made one bookshelf page: a verse block of
   pairs, a whole line each, the text's half-lines two spaces apart */

export interface Numbered { n: number; at: number }

const ENTITIES: Record<string, string> = { aelig: "æ", AElig: "Æ", thorn: "þ", THORN: "Þ", eth: "ð", ETH: "Ð", amp: "&", nbsp: " ", quot: "\"", lt: "<", gt: ">", ouml: "ö", uacute: "ú", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", yacute: "ý", oslash: "ø", oelig: "œ",
  Ouml: "Ö", Oacute: "Ó", Aacute: "Á", Iacute: "Í", OElig: "Œ" };
/* an entity the table does not hold is an error, not a letter lost */
const decode = (s: string): string => s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (whole, hex, dec, name: string) => {
  if (hex) return String.fromCodePoint(parseInt(hex, 16));
  if (dec) return String.fromCodePoint(+dec);
  if (!(name in ENTITIES)) throw new Error("an entity not read: " + whole);
  return ENTITIES[name];
});
const cell = (raw: string): string => decode(raw
  .replace(/\[<a href="#note[^"]*">#<\/a>\]/g, "").replace(/<a name="[^"]*"><\/a>/g, "")
  .replace(/\[&nbsp;<a href="#line[^"]*">Back to text<\/a>&nbsp;\]/g, "")
  .replace(/<i>([\s\S]*?)<\/i>/g, (_, t: string) => "*" + t.trim() + "*")
  .replace(/<[^>]+>/g, ""))
  .replace(/\s+/g, " ").trim();
type Half = { text: string; tr: string; n: string; note?: string };

/* each stanza's half-lines, an empty row a half-line the poem has lost; a
   table's first row only sets its widths */
function halfOf(tr: string): Half[] {
  const cells = [...tr.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
  if (cells.length !== 3 || /width=/.test(cells[0][1])) return [];
  const note = /href="#note([\d.]+)"/.exec(cells[1][2])?.[1];
  return [{ n: cell(cells[0][2]), text: cell(cells[1][2]), tr: cell(cells[2][2]), ...(note ? { note } : {}) }];
}
export function hwaetStanzas(html: string): Half[][] {
  const main = html.slice(html.indexOf('<div class="main">'));
  return (main.match(/<table[\s\S]*?<\/table>/g) || [])
    .map((table) => (table.match(/<tr>[\s\S]*?<\/tr>/g) || []).flatMap(halfOf))
    .filter((rows) => rows.length);
}

/* the notes under the poem by the place they belong to ("7.2", line 7's
   second half), each a run of paragraphs until the next */
export function hwaetNotes(html: string): Record<string, string> {
  const at = html.indexOf("<h3>Notes</h3>");
  if (at === -1) return {};
  const notes: Record<string, string> = {};
  let id = "";
  for (const [, p] of html.slice(at).matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const head = /^<a name="note([\d.]+)"><b>[^<]*<\/b><\/a>:/.exec(p);
    if (head) id = head[1];
    if (!id) continue;
    const text = cell(head ? p.slice(head[0].length) : p);
    notes[id] = notes[id] ? notes[id] + "\n\n" + text : text;
  }
  return notes;
}
const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const mark = (k: number): string => String(k).split("").map((d) => SUPERSCRIPT[+d]).join("");
/* a row's text with its note's mark after it, the note kept in `said`, its
   stanza's, numbered in the order the stanza gives them */
function marked(h: Half, notes: Record<string, string>, said: string[]): string {
  if (!h.note) return h.text;
  if (!(h.note in notes)) throw new Error("no note " + h.note);
  said.push(notes[h.note]);
  return h.text + " " + mark(said.length);
}
const noteLines = (said: string[]): string[] => ["::: note", ...said.map((t, k) => `[${k + 1}] ${t}`).join("\n\n").split("\n"), ":::"];
const pageHead = (title: string, note: string): string => `# ${title}\n\n::: reference\nno author\n:::\n\n::: note\n${note}\n:::\n\n`;

const NO_HALF: Half = { text: "", tr: "", n: "" };
const joinedText = (a: Half, b: Half): string => (a.text && b.text ? a.text + "  " + b.text : a.text || b.text);
/* the line's numbers: the site's "16a" where a line starts, and -1 where its second half is numbered */
function numberLine(a: Half, b: Half, line: number, numbered: Numbered[]): void {
  const m = /^(\d+)a$/.exec(a.n);
  if (m) numbered.push({ n: +m[1], at: line });
  if (b.n) numbered.push({ n: -1, at: line });
}
/* two half-lines a line: the text's two spaces apart, the translation one;
   the site's numbers ("16a") are where a line starts, checked by the caller */
export function wholeLines(stanzas: Half[][], notes: Record<string, string> = {}): { stanzas: string[][]; numbered: Numbered[]; odd: number[] } {
  const numbered: Numbered[] = [], odd: number[] = [];
  let line = 0;
  const out = stanzas.map((rows, s) => {
    if (rows.length % 2) odd.push(s + 1);
    /* a mark after its half-line in the text, the stanza's notes after its last line */
    const lines: string[] = [], said: string[] = [];
    const withMark = (h: Half | undefined): Half => (h ? { ...h, text: marked(h, notes, said) } : NO_HALF);
    for (let i = 0; i < rows.length; i += 2) {
      line++;
      const a = withMark(rows[i]), b = withMark(rows[i + 1]);
      numberLine(a, b, line, numbered);
      lines.push(joinedText(a, b) + " | " + [a.tr, b.tr].filter(Boolean).join(" "));
    }
    if (said.length) lines.push(...noteLines(said));
    return lines;
  });
  return { stanzas: out, numbered, odd };
}

/* a poem in stanzas (Hávamál): a row a line, referred to stanza and line, so
   each stanza keeps its own fence and number; the site heads a stanza "76."
   and numbers a line within it ("4"), both checked against their place */
const misnumberedRow = (r: Half, i: number): boolean => i > 0 && !!r.n && +r.n !== i + 1;
export function stanzaLines(stanzas: Half[][], notes: Record<string, string>): { stanzas: { n: number; lines: string[] }[]; off: string[] } {
  const off: string[] = [];
  const out = stanzas.map((rows, s) => {
    if (rows[0].n !== `${s + 1}.`) off.push(`stanza ${s + 1} headed ${rows[0].n}`);
    const said: string[] = [];
    const lines = rows.map((r, i) => {
      if (misnumberedRow(r, i)) off.push(`stanza ${s + 1} row ${i + 1} numbered ${r.n}`);
      const text = marked(r, notes, said);
      return r.tr ? text + " | " + r.tr : text + " |";
    });
    if (said.length) lines.push(...noteLines(said));
    return { n: s + 1, lines };
  });
  return { stanzas: out, off };
}

export function hwaetStanzaEntry(key: string, title: string, stanzas: { n: number; lines: string[] }[], note: string): Record<string, string> {
  return { [`bookshelf/${key}.md`]: pageHead(title, note) + stanzas.map((s) => `::: stanza ${s.n}\n${s.lines.join("\n")}\n:::`).join("\n\n") };
}

export function hwaetEntry(key: string, title: string, stanzas: string[][], note: string): Record<string, string> {
  return { [`bookshelf/${key}.md`]: pageHead(title, note) + `::: verse\n${stanzas.map((s) => s.join("\n")).join("\n\n")}\n:::` };
}
