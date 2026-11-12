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
export const CLIPS = new Set(("tis twas twere twill twould twixt tween tisn twasn tweren twouldn " +
  "scape scapes scaped scapeth mongst mong gainst gan gins zounds sblood sdeath swounds sfoot ods neath " +
  "bove pon prentice prentices prenticed pothecary larum larums cos til scuse tec em uns ee oman omans " +
  "adn im stroy havior nointed tother taters smorning scutcheon stablish paritors casion").split(" "));
/* clips that are also words, here or in Latin or French, or letters, or open a quotation as often as they clip */
const WORDS = new Set(("t s d ll n m ad ave un and andy is e er ere ow old ear eat art arm ell alf course morning afternoon faith fore long " +
  "longs plane phone phoned bus buses flu varsity cause bout tide lack las gree shun").split(" "));
/* words a dialect ends with an apostrophe, which close nothing */
export const CLIPPED_END = /(?:in|^(?:o|th|an|wi|wiv|ha|i|t|e|gi|ne|wo|tha|fro|ol))$/;

const LETTER = /\p{L}/u;
const OPENS = /^$|[\s“"(\[—–\-*_]/;

/* a word and the stems a plural or a verb's ending leave: the word list holds only the stem */
const stems = (w: string): string[] => [w, ...[/s$/, /es$/, /ed$/, /d$/, /ing$/, /ied$/].flatMap((e) => e.test(w) ? [w.replace(e, e.source === "ied$" ? "y" : "")] : [])];

export interface Elision { at: number; word: string; turn: boolean; sure: boolean; read: boolean }

/* a mark's place in its text, for a judgement made reading it: the words either side */
export const readKey = (md: string, at: number): string => md.slice(Math.max(0, at - 24), at) + "‘" + md.slice(at + 1, at + 25);
/* a word clipped at both ends, ‘avin’, and the words it may stand for without the h */
const gDropped = (w: string): string[] => /in$/.test(w) ? [w + "g", w.slice(0, -2), w.slice(0, -2) + "e"] : [];

function codeMask(md: string): boolean[] {
  const code = new Array(md.length).fill(false);
  let fence = false, pos = 0;
  for (const line of md.split("\n")) {
    const edge = /^\s*(?:>\s*)*(```|~~~)/.test(line);
    if (fence || edge) code.fill(true, pos, pos + line.length);
    if (edge) fence = !fence;
    pos += line.length + 1;
  }
  return code;
}
const paragraphEnd = (md: string, at: number): number => { const m = /\n\s*\n/.exec(md.slice(at)); return m ? at + m.index : md.length; };
const closingMark = (md: string, i: number): boolean => md[i] === "’" && !LETTER.test(md[i + 1] ?? "") && !/\s/.test(md[i - 1] ?? " ");
function closes(md: string, i: number): boolean {
  if (!closingMark(md, i)) return false;
  const word = /\p{L}*$/u.exec(md.slice(Math.max(0, i - 12), i))![0].toLowerCase();
  return !word || !CLIPPED_END.test(word);
}
/* a closing mark after at, before the paragraph ends or another opening mark */
function closed(md: string, at: number): boolean {
  const end = paragraphEnd(md, at);
  for (let i = at + 1; i < end; i++) {
    if (md[i] === "‘" && !LETTER.test(md[i - 1] ?? "")) return false;
    if (closes(md, i)) return true;
  }
  return false;
}

interface Scan { md: string; dict: Set<string>; read: Record<string, boolean>; found: Elision[]; open: boolean }
interface Mark { s: Scan; at: number; before: string; after: string; w: string }
const markAt = (s: Scan, at: number): Mark => {
  const after = /^\p{L}*/u.exec(s.md.slice(at + 1))![0];
  return { s, at, before: s.md[at - 1] ?? "", after, w: after.toLowerCase() };
};
const opens = (m: Mark): boolean => { m.s.open = true; return true; };
const sure = (m: Mark): boolean => { m.s.found.push({ at: m.at, word: m.after, turn: true, sure: true, read: false }); return true; };
const apostropheAfter = (m: Mark): boolean => m.s.md[m.at + 1 + m.after.length] === "’";
/* a judgement made reading the mark in its sentence stands over the rules below */
function judged(m: Mark): boolean {
  const key = readKey(m.s.md, m.at);
  if (!(key in m.s.read)) return false;
  m.s.found.push({ at: m.at, word: m.after, turn: m.s.read[key], sure: false, read: true });
  if (!m.s.read[key]) m.s.open = true;
  return true;
}
const hDropped = (w: string, dict: Set<string>): boolean => w.length > 1 && !dict.has(w) && stems(w).some((t) => !dict.has(t) && dict.has("h" + t));
const gClipped = (m: Mark): boolean => apostropheAfter(m) && gDropped(m.w).some((t) => m.s.dict.has("h" + t));
const doubtfulWord = (m: Mark): boolean => WORDS.has(m.w) || gClipped(m) || hDropped(m.w, m.s.dict);
/* a clip that is also a word, or a dropped h: turned unless a closing mark follows */
function doubtful(m: Mark): boolean {
  if (!doubtfulWord(m)) return false;
  const turn = m.s.open || !closed(m.s.md, m.at);
  m.s.found.push({ at: m.at, word: m.after, turn, sure: false, read: false });
  if (!turn) m.s.open = true;
  return true;
}
/* the rules for an opening mark, in order, the first that answers deciding */
const RULES: ((m: Mark) => boolean)[] = [
  (m) => !!m.after && LETTER.test(m.before) && sure(m),
  (m) => !!m.after && OPENS.test(m.before) && CLIPS.has(m.w) && sure(m),
  judged,
  (m) => !m.after && opens(m),
  (m) => !OPENS.test(m.before),
  /* ‘D’you, ‘e’: a quotation opening on a word with its own apostrophe */
  (m) => apostropheAfter(m) && m.after.length < 3 && opens(m),
  doubtful,
  opens,
];

export function elisions(md: string, dict: Set<string>, read: Record<string, boolean> = {}): Elision[] {
  const code = codeMask(md);
  const s: Scan = { md, dict, read, found: [], open: false };
  /* a quotation open in the paragraph: no single quotation opens inside
     another, so a clip met inside one is an elision (pin: elisions.test ›
     elisions: inside a quotation already open) */
  for (const m of md.matchAll(/‘|’|\n\s*\n/g)) {
    const at = m.index!;
    if (m[0] !== "‘" && m[0] !== "’") s.open = false;
    else if (code[at]) continue;
    else if (m[0] === "’") s.open = s.open && !closes(md, at);
    else RULES.some((rule) => rule(markAt(s, at)));
  }
  return s.found;
}

export function respell(md: string, turned: Elision[]): string {
  const chars = md.split("");
  /* ’‘Ens: the quotation's mark and the elision's typed in each other's places (pin: elisions.test › respell: an elision's mark) */
  for (const e of turned) if (chars[e.at - 1] === "’") { chars[e.at - 1] = "‘"; chars[e.at] = "’"; } else chars[e.at] = "’";
  return chars.join("");
}
