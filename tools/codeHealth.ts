import { createHash } from "node:crypto";

export interface Changed { path: string; was: string | null }
export interface Scored { path: string; before: number | null; after: number; findings: string[] }
interface Fn { title: string; details?: string; "start-line"?: number }
interface Smell { category: string; functions?: Fn[] }

const SCORED = [/^src\/.*\.ts$/, /^tools\/(?!out\/).*\.(ts|mjs)$/];
export const inScope = (path: string): boolean => SCORED.some((re) => re.test(path)) && !path.endsWith(".d.ts");

function fromStatus(line: string): Changed | null {
  const [code = "", first = "", second] = line.split("\t");
  if (code.startsWith("R")) return { path: second!, was: first };
  if (code.startsWith("D") || !first) return null;
  return { path: second ?? first, was: code.startsWith("M") ? first : null };
}

export function changedFiles(nameStatus: string, untracked: string[]): Changed[] {
  const tracked = nameStatus.split("\n").map(fromStatus).filter((c): c is Changed => c !== null);
  const fresh = untracked.map((path) => ({ path, was: null }));
  return [...tracked, ...fresh].filter((c) => inScope(c.path));
}

export const refusals = (rows: Scored[]): Scored[] => rows.filter((r) => r.after < (r.before ?? 10));

export const scoreOf = (result: { score?: number | null }): number => result.score ?? 10;

const fnLine = (category: string) => (f: Fn): string =>
  [category, f.title + (f["start-line"] ? " (line " + f["start-line"] + ")" : ""), f.details].filter(Boolean).join(" · ");

export const findingLines = (review: Smell[]): string[] =>
  review.flatMap((s) => (s.functions?.length ? s.functions.map(fnLine(s.category)) : [s.category]));

export const cacheKey = (...parts: string[]): string =>
  createHash("sha256").update(JSON.stringify(parts)).digest("hex");
