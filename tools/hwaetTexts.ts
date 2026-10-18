/* An Old English text with its translation as early-medieval-england.net
   gives it — a table per stanza, a row per half-line, the text and its
   translation side by side — made one bookshelf page: a verse block of
   pairs, a whole line each, the text's half-lines two spaces apart */

export interface Numbered { n: number; at: number }

const ENTITIES: Record<string, string> = { aelig: "æ", AElig: "Æ", thorn: "þ", THORN: "Þ", eth: "ð", ETH: "Ð", amp: "&", nbsp: " ", quot: "\"", lt: "<", gt: ">", ouml: "ö", uacute: "ú", aacute: "á", eacute: "é", iacute: "í", oacute: "ó" };
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
export function hwaetStanzas(html: string): Half[][] {
  const main = html.slice(html.indexOf('<div class="main">'));
  const stanzas: Half[][] = [];
  for (const table of main.match(/<table[\s\S]*?<\/table>/g) || []) {
    const rows: Half[] = [];
    for (const tr of table.match(/<tr>[\s\S]*?<\/tr>/g) || []) {
      const cells = [...tr.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
      if (cells.length !== 3 || /width=/.test(cells[0][1])) continue;
      const note = /href="#note([\d.]+)"/.exec(cells[1][2])?.[1];
      rows.push({ n: cell(cells[0][2]), text: cell(cells[1][2]), tr: cell(cells[2][2]), ...(note ? { note } : {}) });
    }
    if (rows.length) stanzas.push(rows);
  }
  return stanzas;
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

/* two half-lines a line: the text's two spaces apart, the translation one;
   the site's numbers ("16a") are where a line starts, checked by the caller */
export function wholeLines(stanzas: Half[][], notes: Record<string, string> = {}): { stanzas: string[][]; numbered: Numbered[]; odd: number[] } {
  const numbered: Numbered[] = [], odd: number[] = [];
  let line = 0;
  const out = stanzas.map((rows, s) => {
    if (rows.length % 2) odd.push(s + 1);
    const lines: string[] = [], said: string[] = [];
    /* a mark after its half-line in the text, the stanza's notes after its last line */
    const marked = (h: Half): string => {
      if (!h.note) return h.text;
      if (!(h.note in notes)) throw new Error("no note " + h.note);
      said.push(notes[h.note]);
      return h.text + " " + mark(said.length);
    };
    for (let i = 0; i < rows.length; i += 2) {
      line++;
      const a = { ...rows[i], text: marked(rows[i]) }, b = rows[i + 1] ? { ...rows[i + 1], text: marked(rows[i + 1]) } : { text: "", tr: "", n: "" };
      const m = /^(\d+)a$/.exec(a.n);
      if (m) numbered.push({ n: +m[1], at: line });
      if (b.n) numbered.push({ n: -1, at: line });
      const text = a.text && b.text ? a.text + "  " + b.text : a.text || b.text;
      const tr = [a.tr, b.tr].filter(Boolean).join(" ");
      lines.push(text + " | " + tr);
    }
    if (said.length) lines.push("::: note", ...said.map((t, k) => `[${k + 1}] ${t}`).join("\n\n").split("\n"), ":::");
    return lines;
  });
  return { stanzas: out, numbered, odd };
}

export function hwaetEntry(key: string, title: string, stanzas: string[][], note: string): Record<string, string> {
  return { [`bookshelf/${key}.md`]: `# ${title}\n\n::: reference\nno author\n:::\n\n::: note\n${note}\n:::\n\n::: verse\n${stanzas.map((s) => s.join("\n")).join("\n\n")}\n:::` };
}
