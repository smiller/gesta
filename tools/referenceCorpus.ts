/* The citation label for entry keys, over the export mirror read into
   memory: the cutover criterion's citation half. Prints one line per key,
   the label the successor mints; the current app's ⌃⌘C on the same entry
   is the other side of the comparison. Usage:
   node tools/referenceCorpus.ts [dir] [key ...] — with no keys, a fixed
   list drawn from the shelves the current app's rule was derived on. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { importTarget } from "../src/store/names.ts";
import { entryKey } from "../src/store/keys.ts";
import { journalOf } from "../src/store/headings.ts";
import { referenceLabel } from "../src/store/reference.ts";
import { splitKey } from "../src/store/exportEntries.ts";

const args = process.argv.slice(2);
const dir = args[0] && !args[0].includes("/") || !args[0] ? join(process.env.HOME!, "Library/CloudStorage/Dropbox/gesta-snapshots/current") : args.shift()!;
const cache: Record<string, string> = Object.create(null);
function walk(d: string): void {
  for (const name of readdirSync(d).sort()) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.md$/i.test(name)) continue;
    const t = importTarget(relative(dir, p));
    if (t) cache[entryKey(t.date, t.tag)] = readFileSync(p, "utf8");
  }
}
walk(dir);
const journal = journalOf(cache);
const keys = args.length ? args : [
  "bookshelf/Milton, John/Paradise Lost/Book 1",
  "bookshelf/Shakespeare, William/King John/3.1",
  "bookshelf/Rostand, Edmond/Cyrano de Bergerac/1.2",
  "bookshelf/Boethius/Consolatio/1m2",
  "bookshelf/Housman, A. E/Last Poems/25. The Oracles",
  "bookshelf/Blake, William/Songs of Innocence/A Cradle Song",
  "bookshelf/Dante/Commedia/Inferno/7",
  "bookshelf/Doctor Who/Tenth Doctor/28-1 New Earth",
  "bookshelf/Lewis, C. S/The Screwtape Letters/Letter 12",
  "bookshelf/Williams, Charles/Witchcraft/3. The Dark Ages",
  "bookshelf/Horace/Odes/1.1",
  "page/Marginalian/2026-07-15-nick-cave-loss",
  "page/Books",
  "2021-06-22",
];
for (const key of keys) {
  const [date, tag] = splitKey(key);
  console.log((key in cache ? "  " : "? ") + key + "\n    " + referenceLabel(date, tag, "", null, journal));
}
