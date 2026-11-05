const RETIRED = [/\bcit(?:ation|ations|e|es|ed|ing)\b/i, /\bre-cited\b/i, /\bcit(?:ation|es|ed|ing)[A-Z]/, /[a-z]Cit(?:ation|e|es|ed|ing)(?:[A-Z]|\b)/, /\bCITATION/];
export const retiredWord = (line: string): boolean => RETIRED.some((re) => re.test(line));
export function retiredLines(text: string): { line: number; text: string }[] {
  return text.split("\n").flatMap((t, i) => (retiredWord(t) ? [{ line: i + 1, text: t.trim().slice(0, 100) }] : []));
}
