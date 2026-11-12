/* Milton's masques, Arcades and Comus, made pages: Thurber's edition read for
   their outline — who speaks, the stage directions and the song headings, a
   line split between speakers, a verse paragraph, a song's stanza — and the
   page laid out as the bookshelf lays out a play, a speaker a bold row, a
   direction or a heading an italic row */

export type Item =
  | { kind: "speaker"; name: string }
  | { kind: "direction"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "line"; text: string; rest: boolean; opens: boolean; n?: number };

/* a speaker's prefix in Thurber, given the name it abbreviates */
export const SPEAKERS: Record<string, string> = {
  "Spirit.": "Attendant Spirit", "Spir.": "Attendant Spirit", "Comus.": "Comus", "Lady.": "Lady",
  "Eld. Bro.": "Elder Brother", "Sec. Bro.": "Second Brother", "Sabr.": "Sabrina", "Gen.": "Genius",
};

/* Thurber's text from its first verse line or direction to `end`: a line at
   four spaces is verse, one at six a verse paragraph's first (in a song, its
   measure), a speaker's prefix in underscores with a run of spaces after it
   the rest of a split line, a line opening one of `directions` a direction
   (run on to its blank line), `_Song._` and `_The Measure._` headings, a
   blank line inside a song a stanza's gap; the margin's numbers kept */
interface Reading { lines: string[]; k: number; out: Item[]; song: boolean; gap: boolean; directions: string[] }
function heading(r: Reading, text: string): boolean {
  const head = /^\s*((?:[IVX]+\.\s*)?)_(Song|The Measure)\._\s*$/.exec(text);
  if (!head) return false;
  r.out.push({ kind: "heading", text: head[1] + head[2] });
  r.song = head[2] === "Song";
  r.gap = false;
  return true;
}
function direction(r: Reading, text: string): boolean {
  if (!r.directions.some((d) => text.trim().startsWith(d))) return false;
  let t = text.trim();
  while (r.lines[r.k + 1]?.trim()) t += " " + r.lines[++r.k].trim();
  r.out.push({ kind: "direction", text: t });
  /* a direction that has its speaker sing begins a song */
  r.song = /\bsings\.$/.test(t);
  r.gap = false;
  return true;
}
/* a speaker's prefix pushed as the speaker; the line's body and whether it is a rest */
function speaker(r: Reading, sp: RegExpExecArray): { body: string; rest: boolean } {
  const name = SPEAKERS[sp[1]];
  if (!name) throw new Error("a speaker not known: " + sp[1]);
  r.out.push({ kind: "speaker", name });
  if (r.out[r.out.length - 2]?.kind !== "direction" || !r.song) r.song = false;
  return { body: sp[3], rest: sp[2].length >= 4 };
}
/* a verse paragraph's or a stanza's first line */
const opensBlock = (r: Reading, indent: number): boolean =>
  r.out[r.out.length - 1]?.kind === "line" && ((r.song && r.gap) || (!r.song && indent === 6));
function verseLine(r: Reading, text: string, n: number | undefined): void {
  const sp = /^\s*_([^_]+)_(\s*)(.*)$/.exec(text);
  const { body, rest } = sp ? speaker(r, sp) : { body: text, rest: false };
  const opens = !sp && opensBlock(r, /^ */.exec(text)![0].length);
  r.out.push({ kind: "line", text: body.trim(), rest, opens, ...(n !== undefined ? { n } : {}) });
  r.gap = false;
}
export function thurberItems(lines: string[], directions: string[]): Item[] {
  const r: Reading = { lines, k: 0, out: [], song: false, gap: false, directions };
  for (; r.k < lines.length; r.k++) {
    const m = /^(.*?\S)\s{3,}(\d+)$/.exec(lines[r.k]);
    const text = (m ? m[1] : lines[r.k]).replace(/\s+$/, "");
    if (!text.trim()) r.gap = true;
    else if (!heading(r, text) && !direction(r, text)) verseLine(r, text, m ? +m[2] : undefined);
  }
  return r.out;
}

/* each line's number as the page will count it, a rest taking its line's;
   the margin's numbers that disagree */
export function misnumbered(items: Item[], start = 1): string[] {
  let n = start - 1;
  const bad: string[] = [];
  for (const i of items) {
    if (i.kind !== "line") continue;
    if (!i.rest) n++;
    if (i.n !== undefined && i.n !== n) bad.push(`${i.n} counted ${n}: ${i.text}`);
  }
  return bad;
}

/* the page: a speaker a bold row after a gap, a direction or a heading an
   italic row with a gap either side, a rest marked ⟨…⟩, a verse paragraph or
   a stanza a gap */
type Rows = { rows: string[]; gap(): void };
const ROW: { [K in Item["kind"]]: (i: Extract<Item, { kind: K }>, r: Rows) => void } = {
  speaker: (i, r) => { r.gap(); r.rows.push(`**${i.name}**`); },
  direction: (i, r) => { r.gap(); r.rows.push(`*${i.text}*`, ""); },
  heading: (i, r) => { r.gap(); r.rows.push(`*${i.text}*`, ""); },
  line: (i, r) => { if (i.opens) r.gap(); r.rows.push((i.rest ? "⟨…⟩" : "") + i.text); },
};
export function maskPage(heading: string, notes: string[], items: Item[]): string {
  const rows: string[] = [];
  const r: Rows = { rows, gap: () => { if (rows.length && rows[rows.length - 1] !== "") rows.push(""); } };
  for (const i of items) (ROW[i.kind] as (i: Item, r: Rows) => void)(i, r);
  while (rows[rows.length - 1] === "") rows.pop();
  return `# ${heading}\n\n` + notes.map((n) => `::: note\n${n}\n:::\n\n`).join("") + `::: verse\n${rows.join("\n")}\n:::`;
}
