import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import { linkRuns } from "./links.ts";
import { namesEntry, hashParts } from "./nav.ts";
import { NS_BOOK } from "./keys.ts";

export const SHELVES = "Shelves";
export interface Shelf { name: string; roots: string[] }
export interface ShelfGroup { shelf: string | null; roots: string[] }

/* read as the page renders: a top-level ## is a shelf, the links in the
   blocks after it name its authors; a name given twice is one shelf, or
   its authors were drawn under both (pin: shelves.test › read as the page
   renders) */
function bookRoot(href: string): string | null {
  const raw = href.startsWith("#") ? href.slice(1) : "";
  if (!raw || !namesEntry(raw)) return null;
  const at = hashParts(raw);
  return at.date === NS_BOOK.key && at.tag ? at.tag.split("/")[0] : null;
}
function shelfNamed(out: Shelf[], name: string): Shelf {
  let shelf = out.find((s) => s.name === name);
  if (!shelf) out.push(shelf = { name, roots: [] });
  return shelf;
}
function addRoots(shelf: Shelf, block: Node): void {
  for (const r of linkRuns(block)) {
    const root = bookRoot(r.href);
    if (root && !shelf.roots.includes(root)) shelf.roots.push(root);
  }
}
const isShelfHeading = (block: Node): boolean => block.type === schema.nodes.heading && block.attrs.level === 2;
export function parseShelves(md: string): Shelf[] {
  let doc: Node;
  try { doc = parseMarkdown(md || ""); } catch { return []; }
  const out: Shelf[] = [];
  let shelf: Shelf | null = null;
  doc.forEach((block) => {
    const name = isShelfHeading(block) ? block.textContent.trim() : null;
    if (name) shelf = shelfNamed(out, name);
    else if (name === null && shelf) addRoots(shelf, block);
  });
  return out;
}

function placements(shelves: Shelf[]): Map<string, string> {
  const placed = new Map<string, string>();
  for (const s of shelves) for (const r of s.roots) if (!placed.has(r)) placed.set(r, s.name);
  return placed;
}
/* `roots` in the order the list shows them; the shelf with no authors of its
   own gathers the rest, and with none to gather them they stand last,
   under no heading */
export function shelved(roots: string[], shelves: Shelf[]): ShelfGroup[] {
  const authors = roots.filter((r) => r !== SHELVES);
  if (!shelves.length) return [{ shelf: null, roots: authors }];
  const placed = placements(shelves);
  const rest = shelves.find((s) => !s.roots.length)?.name ?? null;
  const groups: ShelfGroup[] = shelves.map((s) => ({ shelf: s.name, roots: authors.filter((r) => (placed.get(r) ?? rest) === s.name) }));
  if (rest === null) groups.push({ shelf: null, roots: authors.filter((r) => !placed.has(r)) });
  return groups.filter((g) => g.roots.length);
}

/* one namespace's roots, in the list's order, as the list, the go-to box
   and search group them: the shelves entry among them only while it is
   the open root (pin: shelves.test › the groups every list draws) */
export function rootGroups(ns: string, roots: string[], shelvesMd: string, openRoot: string | null): ShelfGroup[] {
  if (ns !== NS_BOOK.key) return [{ shelf: null, roots }];
  const groups = shelved(roots, parseShelves(shelvesMd));
  if (openRoot === SHELVES) groups.push({ shelf: null, roots: [SHELVES] });
  return groups;
}
