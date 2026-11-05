import { createHash } from "node:crypto";

const START = /^([ \t]*)(?:test|it)\((?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\\n]|\\.)*)`)\s*,/gm;
export function testsOf(text: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const m of text.matchAll(START)) {
    const from = m.index + m[0].length, lineEnd = text.indexOf("\n", from);
    const first = text.slice(from, lineEnd < 0 ? undefined : lineEnd);
    const title = m[2] ?? m[3] ?? m[4];
    if (/\)\s*;?\s*$/.test(first) && !/\{\s*$/.test(first)) { found.set(title, first); continue; }
    const close = new RegExp("^" + m[1] + "\\}(?:\\s*,\\s*\\d+)?\\s*\\)", "m").exec(text.slice(from));
    found.set(title, close ? text.slice(from, from + close.index) : first);
  }
  return found;
}
const spaced = (body: string): string => body.replace(/\s+/g, "");
export function changedUnderSameTitle(before: string, after: string): string[] {
  const was = testsOf(before);
  return [...testsOf(after)].filter(([title, body]) => was.has(title) && spaced(was.get(title)!) !== spaced(body)).map(([title]) => title);
}
export interface Listed { file: string; title: string; body: string }
export const fingerprint = (listed: Listed[]): string => createHash("sha256").update(JSON.stringify(listed.map((l) => [l.file, l.title, spaced(l.body)]))).digest("hex");
