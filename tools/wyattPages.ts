/* Wyatt's Beowulf (1894) as Wikisource transcribes it, pages first..last,
   fetched fifty at a time and cached under tools/out/wyatt */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const CACHE = new URL("out/wyatt/", import.meta.url).pathname;

export async function wyattPages(first: number, last: number): Promise<string[]> {
  mkdirSync(CACHE, { recursive: true });
  const all = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const want = all.filter((n) => !existsSync(join(CACHE, n + ".txt")));
  for (let i = 0; i < want.length; i += 50) {
    const titles = want.slice(i, i + 50).map((n) => `Page:Beowulf (Wyatt).djvu/${n}`).join("|");
    const q = new URLSearchParams({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", format: "json", formatversion: "2", titles });
    const res = await fetch("https://en.wikisource.org/w/api.php?" + q, { headers: { "User-Agent": "GestaBeowulfImport/1.0 (a personal bookshelf import)" } });
    if (!res.ok) throw new Error(`Wikisource answered ${res.status} for pages ${want[i]}…`);
    const r = await res.json();
    if (!r.query?.pages) throw new Error("Wikisource answered with no pages: " + JSON.stringify(r).slice(0, 200));
    for (const pg of r.query.pages) {
      if (pg.missing || !pg.revisions?.[0]) throw new Error("Wikisource has no text for " + pg.title);
      writeFileSync(join(CACHE, pg.title.split("/").pop() + ".txt"), pg.revisions[0].slots.main.content);
    }
  }
  return all.map((n) => readFileSync(join(CACHE, n + ".txt"), "utf8"));
}
