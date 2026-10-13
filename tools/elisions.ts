/* AN ELISION'S APOSTROPHE TURNED THE RIGHT WAY: ‘tis, ‘scape, ‘orse typed
   with an opening quotation mark become ’tis, ’scape, ’orse. A clip that is
   no word of its own always turns; a clip that is also a word, and a
   dropped h (the word without it none, the word with it one), turn only
   where no closing mark follows in the paragraph (pin: elisions.test ›
   elisions: a clip that is also) (pin: elisions.test › elisions: a
   dropped h). A mark between letters
   always turns. Code is left. */

/* clips that are no English word of their own, from the bookshelf's own
   unpaired marks */
const CLIPS = new Set(("tis twas twere twill twould twixt tween tisn twasn tweren twouldn " +
  "scape scapes scaped scapeth mongst mong gainst gan gins zounds sblood sdeath swounds sfoot ods neath " +
  "bove pon prentice prentices prenticed pothecary larum larums cos til scuse tec em uns ee oman omans " +
  "adn im stroy havior nointed tother taters smorning scutcheon stablish paritors casion").split(" "));
/* clips that are also words, here or in Latin or French, or letters, or open a quotation as often as they clip */
const WORDS = new Set(("t s d ll n m ad ave un and andy is e er ere ow old ear eat art arm ell alf course morning afternoon faith fore long " +
  "longs plane phone phoned bus buses flu varsity cause bout tide lack las gree shun").split(" "));
/* words a dialect ends with an apostrophe, which close nothing */
const CLIPPED_END = /(?:in|^(?:o|th|an|wi|wiv|ha|i|t|e|gi|ne|wo|tha|fro|ol))$/;

const LETTER = /\p{L}/u;
const OPENS = /^$|[\s“"(\[—–\-*_]/;

/* a word and the stems a plural or a verb's ending leave: the word list holds only the stem */
const stems = (w: string): string[] => [w, ...[/s$/, /es$/, /ed$/, /d$/, /ing$/, /ied$/].flatMap((e) => e.test(w) ? [w.replace(e, e.source === "ied$" ? "y" : "")] : [])];

export interface Elision { at: number; word: string; turn: boolean }

export function elisions(md: string, dict: Set<string>): Elision[] {
  const found: Elision[] = [];
  const code = new Array(md.length).fill(false);
  let fence = false, pos = 0;
  for (const line of md.split("\n")) {
    const edge = /^\s*(?:>\s*)*(```|~~~)/.test(line);
    if (fence || edge) code.fill(true, pos, pos + line.length);
    if (edge) fence = !fence;
    pos += line.length + 1;
  }
  const paragraphEnd = (at: number): number => { const m = /\n\s*\n/.exec(md.slice(at)); return m ? at + m.index : md.length; };
  const closes = (i: number): boolean => {
    if (md[i] !== "’" || LETTER.test(md[i + 1] ?? "") || /\s/.test(md[i - 1] ?? " ")) return false;
    const word = /\p{L}*$/u.exec(md.slice(Math.max(0, i - 12), i))![0].toLowerCase();
    return !word || !CLIPPED_END.test(word);
  };
  /* a closing mark after at, before the paragraph ends or another opening mark */
  const closed = (at: number): boolean => {
    const end = paragraphEnd(at);
    for (let i = at + 1; i < end; i++) {
      if (md[i] === "‘" && !LETTER.test(md[i - 1] ?? "")) return false;
      if (closes(i)) return true;
    }
    return false;
  };
  /* a quotation open in the paragraph: no single quotation opens inside
     another, so a clip met inside one is an elision (pin: elisions.test ›
     elisions: inside a quotation already open) */
  let open = false;
  for (const m of md.matchAll(/‘|’|\n\s*\n/g)) {
    const at = m.index!;
    if (m[0] !== "‘" && m[0] !== "’") { open = false; continue; }
    if (code[at]) continue;
    if (m[0] === "’") { if (closes(at)) open = false; continue; }
    const before = md[at - 1] ?? "", after = /^\p{L}+/u.exec(md.slice(at + 1))?.[0] ?? "";
    if (!after) { open = true; continue; }
    if (LETTER.test(before)) { found.push({ at, word: after, turn: true }); continue; }
    if (!OPENS.test(before)) continue;
    const w = after.toLowerCase();
    /* ‘D’you, ‘e’: a quotation opening on a word with its own apostrophe */
    if (md[at + 1 + after.length] === "’" && after.length < 3) { open = true; continue; }
    if (CLIPS.has(w)) { found.push({ at, word: after, turn: true }); continue; }
    if (WORDS.has(w) || w.length > 1 && !dict.has(w) && stems(w).some((t) => !dict.has(t) && dict.has("h" + t))) {
      const turn = open || !closed(at);
      found.push({ at, word: after, turn });
      if (!turn) open = true;
      continue;
    }
    open = true;
  }
  return found;
}

export function respell(md: string, turned: Elision[]): string {
  const chars = md.split("");
  for (const e of turned) chars[e.at] = "’";
  return chars.join("");
}
