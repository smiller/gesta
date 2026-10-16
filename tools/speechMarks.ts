/* QUOTATION MARKS SET BY READING: a speech in single marks where its book
   speaks in doubles, a quotation inside a quotation, a mark doubled by a
   slip. Each mark is named by the words around it, the text to replace
   between ⟦ and ⟧; every place is found in the text as it was before any
   is replaced, so marks sharing their words do not move each other. */

export interface Reading { find: string; to: string }

export function speechMarks(md: string, readings: Reading[]): { out: string; marks: number[] } {
  const spots = readings.map(({ find, to }) => {
    const m = /^([^]*)⟦([^]*)⟧([^]*)$/.exec(find);
    if (!m) throw new Error(`no ⟦ ⟧ in “${find}”`);
    const plain = m[1] + m[2] + m[3];
    const places: number[] = [];
    for (let i = md.indexOf(plain); i >= 0; i = md.indexOf(plain, i + 1)) places.push(i);
    if (places.length !== 1) throw new Error(`“${find}” found in ${places.length} places`);
    return { at: places[0] + m[1].length, len: m[2].length, to };
  }).sort((a, b) => a.at - b.at);
  let out = "", from = 0;
  const marks: number[] = [];
  for (const s of spots) {
    if (s.at < from) throw new Error("two readings replace the same text");
    out += md.slice(from, s.at);
    marks.push(out.length);
    out += s.to;
    from = s.at + s.len;
  }
  return { out: out + md.slice(from), marks };
}
