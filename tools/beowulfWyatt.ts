/* Wyatt's Beowulf (1894) as Wikisource transcribes it, page by page, made
   one bookshelf page: the poem as one verse block, a gap between fitts */

export interface Numbered { n: number; at: number }

/* the text from an opener to its matching close, braces counted */
function balanced(text: string, from: number): number {
  let depth = 0;
  for (let i = from; i < text.length - 1; i++) {
    if (text[i] === "{" && text[i + 1] === "{") { depth++; i++; }
    else if (text[i] === "}" && text[i + 1] === "}") { depth--; i++; if (!depth) return i + 1; }
  }
  throw new Error("unclosed template at " + text.slice(from, from + 40));
}
function replaceTemplates(text: string, opener: RegExp, by: (whole: string) => string): string {
  let out = "", at = 0, m: RegExpExecArray | null;
  const re = new RegExp(opener.source, "g");
  while ((m = re.exec(text))) {
    if (m.index < at) continue;
    const end = balanced(text, m.index);
    out += text.slice(at, m.index) + by(text.slice(m.index, end));
    at = end;
    re.lastIndex = end;
  }
  return out + text.slice(at);
}
const ENTITY = /&(?:#x([0-9a-f]+)|#(\d+)|(nbsp|amp));/gi;
const decode = (s: string): string => s.replace(ENTITY, (_, hex, dec, name) =>
  hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(+dec) : name.toLowerCase() === "amp" ? "&" : " ");
const FITT = "\u0001";
const CAESURA = "\u0002";

/* a line keeps its words and the gap between its half-lines; the edition's
   apparatus goes: its notes, the folio a line starts on and the asterisk
   marking where in the line, its brackets round letters supplied, its
   italics for a departure from the manuscript */
function cleanLine(raw: string, numbered: Numbered[], at: number): string {
  let line = raw.replace(/\s>>>\s*\{\{sm\|[^}]*\}\}/g, "").replace(/\{\{pline\|Fol[^}]*\}\}/g, "");
  line = line.replace(/^\s*:\s*/, "");
  line = line.replace(/^\s*(\d+)\s*<<<\s*/, (_, n) => { numbered.push({ n: +n, at }); return ""; });
  line = line.replace(/\{\{pline\|(\d+)\|l\}\}/g, (_, n) => { numbered.push({ n: +n, at }); return ""; });
  line = line.replace(/\s*\{\{(?:gap|cesura|ces)\}\}\s*/g, CAESURA);
  /* a page's header can open a block its body closes: the close alone is left */
  if (!line.includes("{{")) line = line.replace(/\}\}/g, "");
  line = decode(line).replace(/''+|[*[\]]/g, "");
  line = line.replace(/[\s ]+/g, " ").trim().replace(new RegExp(` ?${CAESURA} ?`, "g"), "  ");
  if (/[{}<>|]/.test(line)) throw new Error("markup left in a line: " + line);
  return line;
}

export function wyattFitts(pages: string[]): { fitts: string[][]; numbered: Numbered[] } {
  const fitts: string[][] = [[]];
  const numbered: Numbered[] = [];
  let count = 0;
  pages.forEach((page, p) => {
    let body = page.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, "").replace(/<ref[^>]*\/>/g, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "");
    body = body.replace(/<!--[\s\S]*?-->/g, "").replace(/<section[^>]*\/>/g, "");
    body = replaceTemplates(body, /\{\{(?:c|center)\|/, () => `<br>${FITT}<br>`);
    body = replaceTemplates(body, /\{\{ppoem\|/, (whole) => whole.slice(2, -2).replace(/^ppoem\|(?:(?:start|end)=follow\|)*/, "").replace(/\n/g, "<br>"));
    body = body.replace(/\{\{(?:[Ll]ang block\/[se]|[Bb]lock center\/[se]|smallrefs|rh|right|lang\|ang\|font=Junicode)(?:\|[^{}]*)?\}\}/g, "");
    for (const piece of (body + "<br>").split(/<br\s*\/?>/)) {
      if (piece.trim() === FITT) { if (fitts[fitts.length - 1].length) fitts.push([]); continue; }
      if (!piece.trim()) continue;
      let line: string;
      try { line = cleanLine(piece, numbered, count + 1); } catch (e) { throw new Error(`page ${p + 1}: ${(e as Error).message}`); }
      if (!line) continue;
      count++;
      fitts[fitts.length - 1].push(line);
    }
  });
  return { fitts: fitts.filter((f) => f.length), numbered };
}

/* as he writes it: no length marks, and a compound's hyphen closed up with
   the next part lower-cased (Gār-Dena, Gardena) */
export function plainSpelling(line: string): string {
  return line.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC")
    .replace(/(\p{L})[-‐](\p{L})/gu, (_, a: string, b: string) => a + b.toLowerCase());
}

export function beowulfEntries(fitts: string[][], note: string): Record<string, string> {
  return {
    "bookshelf/Old English.md": "# Old English\n\n::: reference\nno author\n:::\n\n- [Beowulf](#bookshelf/Old%20English/Beowulf)",
    "bookshelf/Old English/Beowulf.md": `# Beowulf\n\n::: note\n${note}\n:::\n\n::: verse\n${fitts.map((f) => f.join("\n")).join("\n\n")}\n:::`,
  };
}
