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
export function thurberItems(lines: string[], directions: string[]): Item[] {
  const out: Item[] = [];
  let song = false, gap = false;
  for (let k = 0; k < lines.length; k++) {
    const raw = lines[k];
    const m = /^(.*?\S)\s{3,}(\d+)$/.exec(raw);
    const text = (m ? m[1] : raw).replace(/\s+$/, "");
    if (!text.trim()) { gap = true; continue; }
    const head = /^\s*((?:[IVX]+\.\s*)?)_(Song|The Measure)\._\s*$/.exec(text);
    if (head) { out.push({ kind: "heading", text: head[1] + head[2] }); song = head[2] === "Song"; gap = false; continue; }
    if (directions.some((d) => text.trim().startsWith(d))) {
      let t = text.trim();
      while (lines[k + 1]?.trim()) t += " " + lines[++k].trim();
      out.push({ kind: "direction", text: t });
      /* a direction that has its speaker sing begins a song */
      song = /\bsings\.$/.test(t); gap = false;
      continue;
    }
    const sp = /^\s*_([^_]+)_(\s*)(.*)$/.exec(text);
    let body = text, rest = false;
    if (sp) {
      const name = SPEAKERS[sp[1]];
      if (!name) throw new Error("a speaker not known: " + sp[1]);
      out.push({ kind: "speaker", name });
      body = sp[3];
      rest = sp[2].length >= 4;
      if (out[out.length - 2]?.kind !== "direction" || !song) song = false;
    }
    const indent = sp ? 0 : /^ */.exec(text)![0].length;
    const opens = !sp && !rest && out[out.length - 1]?.kind === "line" && ((song && gap) || (!song && indent === 6));
    out.push({ kind: "line", text: body.trim(), rest, opens, ...(m ? { n: +m[2] } : {}) });
    gap = false;
  }
  return out;
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
export function maskPage(heading: string, notes: string[], items: Item[]): string {
  const rows: string[] = [];
  const gap = () => { if (rows.length && rows[rows.length - 1] !== "") rows.push(""); };
  for (const i of items) {
    if (i.kind === "speaker") { gap(); rows.push(`**${i.name}**`); }
    else if (i.kind === "direction" || i.kind === "heading") { gap(); rows.push(`*${i.text}*`, ""); }
    else { if (i.opens) gap(); rows.push((i.rest ? "⟨…⟩" : "") + i.text); }
  }
  while (rows[rows.length - 1] === "") rows.pop();
  return `# ${heading}\n\n` + notes.map((n) => `::: note\n${n}\n:::\n\n`).join("") + `::: verse\n${rows.join("\n")}\n:::`;
}
