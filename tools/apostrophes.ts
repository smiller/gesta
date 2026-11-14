const STRAIGHT = /[A-Za-z]'[A-Za-z]/;

const endOf = (source: string, mark: string, from: number, past: number): number => {
  const at = source.indexOf(mark, from);
  return at === -1 ? source.length : at + past;
};
function stringEnd(source: string, at: number): number {
  let i = at + 1;
  while (i < source.length && source[i] !== source[at]) i += source[i] === "\\" ? 2 : 1;
  return i + 1;
}
/* where a run of text closes: a string at its own quote, a comment at its end */
function closing(source: string, at: number): { end: number; isString: boolean } {
  if (source.startsWith("//", at)) return { end: endOf(source, "\n", at, 0), isString: false };
  if (source.startsWith("/*", at)) return { end: endOf(source, "*/", at + 2, 2), isString: false };
  return { end: stringEnd(source, at), isString: true };
}
const opens = (source: string, at: number): boolean => /["'`]/.test(source[at]) || (source[at] === "/" && /[/*]/.test(source[at + 1]));
/* a slash after an operator, a bracket or `return` opens a regex, whose
   quotes are no string's; after a value it divides */
function opensRegex(source: string, at: number): boolean {
  if (source[at] !== "/" || /[/*]/.test(source[at + 1])) return false;
  const before = source.slice(Math.max(0, at - 8), at).trimEnd();
  return !before || /[(,=:[!&|?{};+\-*%<>~^]$/.test(before) || /\breturn$/.test(before);
}
function regexEnd(source: string, at: number): number {
  let i = at + 1, inClass = false;
  const closes = (): boolean => !inClass && source[i] === "/";
  while (i < source.length && !closes()) {
    if (source[i] === "\\") i++;
    else if (source[i] === "[") inClass = true;
    else if (source[i] === "]") inClass = false;
    i++;
  }
  return i + 1;
}

/* the strings a module holds, its comments and code skipped; a template's
   substitutions are read as its text, which no message carries */
export function straightInStrings(source: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < source.length; i++) {
    if (opensRegex(source, i)) { i = regexEnd(source, i) - 1; continue; }
    if (!opens(source, i)) continue;
    const { end, isString } = closing(source, i);
    const text = source.slice(i, end);
    if (isString && STRAIGHT.test(text)) out.push(text);
    i = end - 1;
  }
  return out;
}
/* markup's text outside its script, its style and its code samples */
export function straightInMarkup(source: string): string[] {
  const text = source.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<code>[\s\S]*?<\/code>/g, " ").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]*>/g, " ");
  return text.split("\n").filter((l) => STRAIGHT.test(l)).map((l) => l.trim());
}
