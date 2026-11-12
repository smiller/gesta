/* Milton's sonnets made bookshelf pages: a sonnet a page under Sonnets,
   keyed by its number, the Italian ones as pairs with Cowper's translation
   beside each line; the Italian from the 1645 Poems as Italian Wikisource
   transcribes it, the translations from Gutenberg's Poemata (#6929) */

/* the poem's lines from its section of the transcription's pages: the
   indent, the line numbers, the italics and the drop capital gone */
function plainLine(raw: string): string {
  const l = raw.replace(/\{\{R\|\d+\}\}/g, "").replace(/\{\{Capolettera\|(\p{L})\}\}/u, "$1").replace(/''/g, "").replace(/\s+/g, " ").trim();
  if (/[{}<>|]/.test(l)) throw new Error("markup left in a line: " + l);
  return l;
}
function poemsIn(page: string, section: string): string[] {
  const re = new RegExp(`<section begin="${section}" />([\\s\\S]*?)<section end="${section}" />`, "g");
  return [...page.matchAll(re)].flatMap((m) => {
    const poem = /<poem>([\s\S]*?)<\/poem>/.exec(m[1]);
    return poem ? [poem[1]] : [];
  });
}
export function italianPoem(pages: string[], section: string): string[] {
  return pages.flatMap((page) => poemsIn(page, section)).flatMap((poem) => poem.split("\n").map(plainLine)).filter(Boolean);
}

/* Cowper's translations of the Italian poems, by their numeral there (I to
   VI, the Canzone III), each a list of lines: the margin's numbers, the
   note marks and the notes gone, the dashes and quotation marks the
   printed ones */
export function cowperItalian(text: string): Map<string, string[]> {
  const start = text.indexOf("3. TRANSLATIONS OF THE ITALIAN POEMS");
  const end = text.indexOf("Appendix", start);
  if (start < 0 || end < 0) throw new Error("the translations of the Italian poems not found");
  const out = new Map<string, string[]>();
  const s = { at: null as string | null, inNote: false };
  for (const raw of text.slice(start, end).split("\n").slice(1)) {
    const head = /^\s{10,}([IVX]+)\.?\d?\s*$/.exec(raw);
    if (head) { s.at = head[1]; s.inNote = false; out.set(s.at, []); continue; }
    if (translated(s, raw)) out.get(s.at!)!.push(curl(raw.replace(/\s+\d{1,2}\s*$/, "").trim()));
  }
  return out;
}
/* a line of a translation: under a numeral, not set in as a heading, not in or after a note's mark */
function translated(s: { at: string | null; inNote: boolean }, raw: string): boolean {
  if (!s.at || /^\s{10,}\S/.test(raw)) return false;
  if (/^\d \S/.test(raw)) s.inNote = true;
  return !s.inNote && !!raw.trim();
}

export const curl = (s: string): string => s.replace(/--/g, "—").replace(/(\w)'(\w)/g, "$1’$2").replace(/(^|[\s(—])'/g, "$1‘").replace(/'/g, "’")
  .replace(/(^|[\s(—])"/g, "$1“").replace(/"/g, "”");

export interface Sonnet { n: string; title: string; lines: string[]; translation?: string[]; note?: string }

const AUTHOR = "bookshelf/Milton, John";
const href = (path: string): string => "#" + path.split("/").map(encodeURIComponent).join("/");
const verse = (s: Sonnet): string => {
  if (s.translation && s.translation.length !== s.lines.length) throw new Error(`${s.n}: ${s.lines.length} lines, ${s.translation.length} translated`);
  return "::: verse\n" + s.lines.map((l, i) => (s.translation ? `${l} | ${s.translation[i]}` : l)).join("\n") + "\n:::";
};

/* the numbered sonnets under a contents page that carries the note on the
   text; a poem with no number a work of its own beside them */
export function sonnetEntries(numbered: Sonnet[], apart: Sonnet[], note: string): Record<string, string> {
  const entries: Record<string, string> = {};
  const head = (s: Sonnet): string => `Sonnet ${s.n}${s.title ? ": " + s.title : ""}`;
  const contents = numbered.map((s) => `- [${head(s)}](${href(`${AUTHOR}/Sonnets/${s.n}`)})`);
  entries[`${AUTHOR}/Sonnets.md`] = `# Sonnets\n\n::: note\n${note}\n:::\n\n${contents.join("\n")}`;
  for (const s of numbered) entries[`${AUTHOR}/Sonnets/${s.n}.md`] = `# ${head(s)}\n\n${verse(s)}`;
  for (const s of apart) entries[`${AUTHOR}/${s.title}.md`] = `# ${s.title}\n\n${s.note ? `::: note\n${s.note}\n:::\n\n` : ""}${verse(s)}`;
  return entries;
}
