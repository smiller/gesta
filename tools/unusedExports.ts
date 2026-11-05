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
function takenFrom(file: string, text: string, known: Set<string>): Map<string, Taken> {
  const taken = new Map<string, Taken>();
  const of = (target: string): Taken => { let t = taken.get(target); if (!t) { t = { names: new Set(), whole: false }; taken.set(target, t); } return t; };
  for (const m of text.matchAll(NAMED)) {
    const target = resolved(file, m[2], known);
    if (target) for (const part of m[1].split(",")) { const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]; if (name) of(target).names.add(name); }
  }
  for (const m of text.matchAll(NAMESPACE)) {
    const target = resolved(file, m[2], known);
    if (target) for (const use of text.matchAll(new RegExp("(?<![\\w$.])" + m[1].replace(/\$/g, "\\$") + "\\.([A-Za-z_$][\\w$]*)", "g"))) of(target).names.add(use[1]);
  }
  for (const m of text.matchAll(STAR)) { const target = resolved(file, m[1], known); if (target) of(target).whole = true; }
  return taken;
}
const withoutComments = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|\s)\/\/[^\n]*/g, "$1");
const isTest = (file: string): boolean => /\.test\.[a-z]+$/.test(file);
export interface Unused { file: string; name: string; how: "nowhere" | "tests only" }
export function unusedExports(files: Record<string, string>): Unused[] {
  const known = new Set(Object.keys(files));
  const taken = Object.entries(files).map(([file, text]) => ({ file, map: takenFrom(file, text, known) }));
  const out: Unused[] = [];
  for (const [file, text] of Object.entries(files)) {
    if (isTest(file)) continue;
    const code = withoutComments(text);
    for (const name of exportsOf(text)) {
      const takers = taken.filter((t) => { const got = t.map.get(file); return got && (got.whole || got.names.has(name)); });
      if (takers.some((t) => !isTest(t.file))) continue;
      const uses = code.match(new RegExp("(?<![\\w$.])" + name.replace(/\$/g, "\\$") + "(?![\\w$])", "g"))?.length ?? 0;
      if (uses > 1) continue;
      out.push({ file, name, how: takers.length ? "tests only" : "nowhere" });
    }
  }
  return out;
}
