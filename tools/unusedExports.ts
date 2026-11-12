import { dirname, join, normalize } from "node:path";

export function exportsOf(text: string): string[] {
  const names: string[] = [];
  for (const m of text.matchAll(/^export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm)) names.push(m[1]);
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}\s*(from\b)?/gm)) {
    if (!m[2]) for (const part of m[1].split(",")) { const name = part.trim().split(/\s+as\s+/).pop(); if (name) names.push(name); }
  }
  return names;
}
interface Taken { names: Set<string>; whole: boolean }
const NAMED = /^\s*(?:import|export)\s+(?:type\s+)?(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/gm;
const NAMESPACE = /^\s*import\s+(?:type\s+)?\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*["']([^"']+)["']/gm;
const STAR = /^\s*export\s+\*\s+from\s*["']([^"']+)["']/gm;
function resolved(from: string, spec: string, known: Set<string>): string | null {
  if (!spec.startsWith(".")) return null;
  const base = normalize(join(dirname(from), spec.replace(/\?.*$/, "")));
  return [base, base + ".ts", base + ".mjs"].find((p) => known.has(p)) ?? null;
}
interface Reading { file: string; text: string; known: Set<string>; of(target: string): Taken }
const namedIn = (list: string): string[] => list.split(",").map((part) => part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]).filter(Boolean);
function takeNamed(r: Reading): void {
  for (const m of r.text.matchAll(NAMED)) {
    const target = resolved(r.file, m[2], r.known);
    if (target) for (const name of namedIn(m[1])) r.of(target).names.add(name);
  }
}
const membersOf = (text: string, ns: string) => text.matchAll(new RegExp("(?<![\\w$.])" + ns.replace(/\$/g, "\\$") + "\\.([A-Za-z_$][\\w$]*)", "g"));
function takeNamespaces(r: Reading): void {
  for (const m of r.text.matchAll(NAMESPACE)) {
    const target = resolved(r.file, m[2], r.known);
    if (target) for (const use of membersOf(r.text, m[1])) r.of(target).names.add(use[1]);
  }
}
function takeStars(r: Reading): void {
  for (const m of r.text.matchAll(STAR)) {
    const target = resolved(r.file, m[1], r.known);
    if (target) r.of(target).whole = true;
  }
}
function takenFrom(file: string, text: string, known: Set<string>): Map<string, Taken> {
  const taken = new Map<string, Taken>();
  const of = (target: string): Taken => {
    const t = taken.get(target) ?? { names: new Set<string>(), whole: false };
    taken.set(target, t);
    return t;
  };
  const r: Reading = { file, text, known, of };
  takeNamed(r);
  takeNamespaces(r);
  takeStars(r);
  return taken;
}
const withoutComments = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|\s)\/\/[^\n]*/g, "$1");
const isTest = (file: string): boolean => /\.test\.[a-z]+$/.test(file);
export interface Unused { file: string; name: string; how: "nowhere" | "tests only" }
type Takers = { file: string; map: Map<string, Taken> }[];
const takersOf = (taken: Takers, file: string, name: string): Takers => taken.filter((t) => {
  const got = t.map.get(file);
  return !!got && (got.whole || got.names.has(name));
});
const usesIn = (code: string, name: string): number => code.match(new RegExp("(?<![\\w$.])" + name.replace(/\$/g, "\\$") + "(?![\\w$])", "g"))?.length ?? 0;
function unusedIn(file: string, text: string, taken: Takers): Unused[] {
  const code = withoutComments(text);
  const out: Unused[] = [];
  for (const name of exportsOf(text)) {
    const takers = takersOf(taken, file, name);
    if (takers.some((t) => !isTest(t.file)) || usesIn(code, name) > 1) continue;
    out.push({ file, name, how: takers.length ? "tests only" : "nowhere" });
  }
  return out;
}
export function unusedExports(files: Record<string, string>): Unused[] {
  const known = new Set(Object.keys(files));
  const taken = Object.entries(files).map(([file, text]) => ({ file, map: takenFrom(file, text, known) }));
  return Object.entries(files).filter(([file]) => !isTest(file)).flatMap(([file, text]) => unusedIn(file, text, taken));
}
