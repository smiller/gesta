/* The bookshelf's shelves: an entry of their own under the bookshelf,
   `Shelves`, whose ## headings are the shelves in order and whose links
   name the authors on each — links, so an author's rename carries them */

export const SHELVES = "Shelves";
export interface Shelf { name: string; roots: string[] }
export interface ShelfGroup { shelf: string | null; roots: string[] }

const HEADING = /^##\s+(.+?)\s*#*\s*$/;
const LINK = /\]\(#bookshelf\/([^/)?\s]+)/g;

export function parseShelves(md: string): Shelf[] {
  const out: Shelf[] = [];
  for (const line of (md || "").split("\n")) {
    const h = HEADING.exec(line);
    if (h) { out.push({ name: h[1], roots: [] }); continue; }
    const shelf = out[out.length - 1];
    if (!shelf) continue;
    for (const m of line.matchAll(LINK)) {
      let root: string;
      try { root = decodeURIComponent(m[1]); } catch { continue; }
      if (shelf.roots.indexOf(root) === -1) shelf.roots.push(root);
    }
  }
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
