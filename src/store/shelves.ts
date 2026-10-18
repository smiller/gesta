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
export function parseShelves(md: string): Shelf[] {
  let doc: Node;
  try { doc = parseMarkdown(md || ""); } catch { return []; }
  const out: Shelf[] = [];
  let shelf: Shelf | null = null;
  doc.forEach((block) => {
    if (block.type === schema.nodes.heading && block.attrs.level === 2) {
      const name = block.textContent.trim();
      if (!name) return;
      shelf = out.find((s) => s.name === name) || null;
      if (!shelf) out.push(shelf = { name, roots: [] });
      return;
    }
    if (!shelf) return;
    for (const r of linkRuns(block)) {
      const raw = r.href.startsWith("#") ? r.href.slice(1) : "";
      if (!raw || !namesEntry(raw)) continue;
      const at = hashParts(raw);
      if (at.date !== NS_BOOK.key || !at.tag) continue;
      const root = at.tag.split("/")[0];
      if (shelf.roots.indexOf(root) === -1) shelf.roots.push(root);
    }
  });
  return out;
}

/* `roots` in the order the list shows them; the shelf with no authors of its
   own gathers the rest, and with none to gather them they stand last,
   under no heading */
export function shelved(roots: string[], shelves: Shelf[]): ShelfGroup[] {
  const authors = roots.filter((r) => r !== SHELVES);
  if (!shelves.length) return [{ shelf: null, roots: authors }];
  const placed = new Map<string, string>();
  for (const s of shelves) for (const r of s.roots) if (!placed.has(r)) placed.set(r, s.name);
  const rest = shelves.find((s) => !s.roots.length)?.name ?? null;
  const groups: ShelfGroup[] = shelves.map((s) => ({ shelf: s.name, roots: authors.filter((r) => placed.get(r) === s.name || (s.name === rest && !placed.has(r))) }));
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
