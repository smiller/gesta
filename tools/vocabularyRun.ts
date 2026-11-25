import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { retiredLines } from "./vocabulary.ts";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "out" || name === "node_modules") return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = [...walk("src"), ...walk("tools"), ...walk("one-offs"), "CLAUDE.md", "docs/LAYOUT.md", "docs/REVIEWS.md", "GLOSSARY.md", "index.html"].filter((f) => /\.(ts|mjs|svelte|html|css|sh|txt|md)$/.test(f));
const found = files.flatMap((f) => retiredLines(f, readFileSync(f, "utf8")));
for (const l of found) console.log(l);
console.log("vocabulary: " + (found.length ? found.length + " lines use a retired word" : "no retired word anywhere"));
process.exit(found.length ? 1 : 0);
