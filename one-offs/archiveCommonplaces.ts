import { importTarget, utf8 } from "../src/store/names.ts";
import { asCommonplace, commonplaceLinks } from "../src/store/toCommonplaces.ts";

export interface Member { path: string; bytes: Uint8Array }
const OLD = "page/", NEW = "commonplace/";
const decoder = new TextDecoder();
const moved = (path: string): string => (path.startsWith(OLD) ? NEW + path.slice(OLD.length) : path);
export const commonplaceArchivePath = (path: string): string =>
  path.startsWith("archive/" + OLD) ? "archive/" + moved(path.slice("archive/".length)) : path;

/* the tag a page's text is filed under, read as the import reads the
   commonplace it became */
const pageTag = (path: string): string | null =>
  (path.startsWith(OLD) ? importTarget(moved(path))?.tag ?? null : null);
interface Rewrites { texts: Map<string, string>; pictures: Map<string, string> }
function rewrites(members: Member[]): Rewrites {
  const r: Rewrites = { texts: new Map(), pictures: new Map() };
  for (const m of members.filter((x) => /\.md$/i.test(x.path))) {
    const md = decoder.decode(m.bytes), tag = pageTag(m.path);
    const next = tag === null ? { md: commonplaceLinks(md), pictures: [] } : asCommonplace(tag, md);
    if (next.md !== md) r.texts.set(m.path, next.md);
    for (const [from, to] of next.pictures) r.pictures.set(from, to);
  }
  return r;
}
/* an archive's members as the commonplaces' backup would hold them, in
   their order, bytes kept wherever nothing changed; null when nothing does */
export function commonplaceArchive(members: Member[]): Member[] | null {
  const r = rewrites(members);
  const out = members.map((m) => {
    const md = r.texts.get(m.path);
    return { path: r.pictures.get(m.path) ?? moved(m.path), bytes: md === undefined ? m.bytes : utf8.encode(md) };
  });
  return out.some((m, i) => m.path !== members[i].path || m.bytes !== members[i].bytes) ? out : null;
}
/* a line a root, sorted: a tab sorts below any character a root holds, so
   sorting the lines sorts the roots */
export function commonplaceManifest(text: string): string {
  const lines = text.split("\n").filter(Boolean).map((line) => {
    const [root, at] = line.split("\t");
    return at === undefined ? moved(root) : moved(root) + "\t" + commonplaceArchivePath(at);
  });
  return lines.length ? lines.sort().join("\n") + "\n" : "";
}
