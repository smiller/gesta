/* An Old English text with its translation as early-medieval-england.net
   gives it — a table per stanza, a row per half-line, the text and its
   translation side by side — made one bookshelf page: a verse block of
   pairs, a whole line each, the text's half-lines two spaces apart */

export interface Numbered { n: number; at: number }

const cell = (raw: string): string => raw
  .replace(/\[<a href="#note[^"]*">#<\/a>\]/g, "").replace(/<a name="[^"]*"><\/a>/g, "")
  .replace(/<i>([\s\S]*?)<\/i>/g, (_, t: string) => "*" + t.trim() + "*")
  .replace(/<[^>]+>/g, "")
  .replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (whole, hex, dec, name: string) =>
    hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(+dec) : ENTITIES[name] ?? whole)
  .replace(/\s+/g, " ").trim();
const ENTITIES: Record<string, string> = { aelig: "æ", AElig: "Æ", thorn: "þ", THORN: "Þ", eth: "ð", ETH: "Ð", amp: "&", nbsp: " ", quot: "\"", lt: "<", gt: ">" };

/* each stanza's half-lines, an empty row a half-line the poem has lost; a
   table's first row only sets its widths */
export function hwaetStanzas(html: string): { text: string; tr: string; n: string }[][] {
  const main = html.slice(html.indexOf('<div class="main">'));
  const stanzas: { text: string; tr: string; n: string }[][] = [];
  for (const table of main.match(/<table[\s\S]*?<\/table>/g) || []) {
    const rows: { text: string; tr: string; n: string }[] = [];
    for (const tr of table.match(/<tr>[\s\S]*?<\/tr>/g) || []) {
      const cells = [...tr.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
      if (cells.length !== 3 || /width=/.test(cells[0][1])) continue;
      rows.push({ n: cell(cells[0][2]), text: cell(cells[1][2]), tr: cell(cells[2][2]) });
    }
    if (rows.length) stanzas.push(rows);
  }
  return stanzas;
}

/* two half-lines a line: the text's two spaces apart, the translation one;
   the site's numbers ("16a") are where a line starts, checked by the caller */
export function wholeLines(stanzas: { text: string; tr: string; n: string }[][]): { stanzas: string[][]; numbered: Numbered[]; odd: number[] } {
  const numbered: Numbered[] = [], odd: number[] = [];
  let line = 0;
  const out = stanzas.map((rows, s) => {
    if (rows.length % 2) odd.push(s + 1);
    const lines: string[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      line++;
      const a = rows[i], b = rows[i + 1] ?? { text: "", tr: "", n: "" };
      const m = /^(\d+)a$/.exec(a.n);
      if (m) numbered.push({ n: +m[1], at: line });
      if (b.n) numbered.push({ n: -1, at: line });
      const text = a.text && b.text ? a.text + "  " + b.text : a.text || b.text;
      const tr = [a.tr, b.tr].filter(Boolean).join(" ");
      lines.push(text + " | " + tr);
    }
    return lines;
  });
  return { stanzas: out, numbered, odd };
}

export function hwaetEntry(key: string, title: string, stanzas: string[][], note: string): Record<string, string> {
  return { [`bookshelf/${key}.md`]: `# ${title}\n\n::: reference\nno author\n:::\n\n::: note\n${note}\n:::\n\n::: verse\n${stanzas.map((s) => s.join("\n")).join("\n\n")}\n:::` };
}
