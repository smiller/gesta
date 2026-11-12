import { test, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

/* a module's top-level function declarations, each with its body's text */
function topFunctions(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/^(?:export )?(?:async )?function (\w+)\(/gm)) {
    const end = text.indexOf("\n}", m.index);
    out.set(m[1], text.slice(m.index, end < 0 ? undefined : end));
  }
  return out;
}
const sources = ["tools/helium-bridge.ts", ...["tools/steps", "tools/adapters"].flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => d + "/" + f))];

/* the module's functions a function's body calls, itself aside */
const callsOf = (fns: Map<string, string>, name: string): string[] =>
  [...(fns.get(name) ?? "").slice(name.length + 10).matchAll(/(?<![\w$.])(\w+)\(/g)].map((c) => c[1]).filter((c) => fns.has(c) && c !== name);
/* for each in-page reading in a file, the calls its parts make to functions not listed with them */
function unlisted(file: string): string[] {
  const text = readFileSync(file, "utf8"), fns = topFunctions(text);
  return [...text.matchAll(/inPage(?:With)?\(([^()]*)\)/g)].flatMap((m) => {
    const listed = new Set(m[1].split(",").map((s) => s.trim()).filter((s) => fns.has(s)));
    return [...listed].flatMap((name) => callsOf(fns, name).filter((c) => !listed.has(c)).map((c) => file + ": " + name + " calls " + c));
  });
}

test("every function a part of an in-page reading calls, among its module's own, travels with it", () => {
  expect(sources.flatMap(unlisted)).toEqual([]);
});
