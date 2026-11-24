import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/* "Mod" is Ctrl off macOS: a ⌃⌘ key spelled "Ctrl-Mod-" is Ctrl alone
   there, so a ⌃⌘ key says "Ctrl-Meta-" */
const looseChords = (text: string): string[] => [...text.matchAll(/["'`](?:Ctrl-Mod|Mod-Ctrl)-[^"'`]+["'`]/g)].map((m) => m[0]);
const looseChordsUnder = (dir: string): string[] => readdirSync(dir, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
  .flatMap((f) => looseChords(readFileSync(join(dir, f), "utf8")).map((hit) => f + ": " + hit));

describe("a ⌃⌘ key's spelling", () => {
  it("is loose when it says Mod beside Ctrl, in either order; Ctrl-Meta and a plain Mod key are not", () => {
    expect(looseChords(`{ "Ctrl-Mod-i": a, 'Mod-Ctrl-Enter': b, "Ctrl-Meta-i": c, "Mod-z": d }`)).toEqual([`"Ctrl-Mod-i"`, `'Mod-Ctrl-Enter'`]);
  });
  it("is never loose under src/", () => {
    expect(looseChordsUnder("src")).toEqual([]);
  });
});
