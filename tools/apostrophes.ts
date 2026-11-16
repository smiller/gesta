import { spans, only } from "./sourceSpans.ts";

const STRAIGHT = /[A-Za-z]'[A-Za-z]/;

export function straightInStrings(source: string): string[] {
  return spans(source).filter((s) => s.kind === "string" || s.kind === "template").map((s) => source.slice(s.at, s.to)).filter((t) => STRAIGHT.test(t));
}
/* markup's text outside its script, its style and its code samples */
export function straightInMarkup(source: string): string[] {
  const text = only(source, "markup").replace(/<code>[\s\S]*?<\/code>/g, " ").replace(/<[^>]*>/g, " ");
  return text.split("\n").filter((l) => STRAIGHT.test(l)).map((l) => l.trim());
}
