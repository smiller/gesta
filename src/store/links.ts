/* null when nothing changed, so nothing is written (pin: links.test ›
   returns null for an unparseable text, and keeps the surrounding markdown
   byte for byte). A dropped link that leaves its paragraph empty takes the
   paragraph with it (pin: links.test › drops the links of a deleted entry,
   and an emptied paragraph with them) */
import type { Mark, Node } from "prosemirror-model";
import { Transform } from "prosemirror-transform";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { schema } from "../model/schema.ts";
import { hashTarget, asAddress } from "./keys.ts";
import { mdLabel } from "./reference.ts";

export interface LinkRun { href: string; text: string; from: number; to: number }
const extends_ = (open: LinkRun | null, m: Mark | undefined | null, pos: number): boolean => !!m && !!open && open.href === m.attrs.href && open.to === pos;
export function linkRuns(doc: Node): LinkRun[] {
  const runs: LinkRun[] = [];
  const link = schema.marks.link;
  let open: LinkRun | null = null;
  doc.descendants((n, pos) => {
    if (!n.isText) { if (!n.isInline) open = null; return true; }
    const m = link.isInSet(n.marks);
    if (extends_(open, m, pos)) { open!.text += n.text!; open!.to = pos + n.nodeSize; return true; }
    open = m ? { href: m.attrs.href as string, text: n.text!, from: pos, to: pos + n.nodeSize } : null;
    if (open) runs.push(open);
    return true;
  });
  return runs;
}
export type Visit = (run: LinkRun) => { href?: string; text?: string; remove?: true } | null;
export function rewriteLinks(md: string, visit: Visit): string | null {
  let doc: Node;
  try { doc = parseMarkdown(md); } catch { return null; }
  const tr = new Transform(doc);
  let changed = false;
  /* in reverse, so an edit never moves a run still to be visited */
  for (const run of linkRuns(doc).slice().reverse()) {
    const change = visit(run);
    if (!change) continue;
    changed = true;
    if (change.remove) removeRun(tr, run);
    else relink(tr, run, change);
  }
  return changed ? serializeMarkdown(tr.doc) : null;
}
function removeRun(tr: Transform, run: LinkRun): void {
  const $from = tr.doc.resolve(run.from);
  const emptied = $from.parent.type === schema.nodes.paragraph && $from.parent.textContent === run.text;
  if (emptied) tr.delete($from.before(), $from.after());
  else tr.delete(run.from, run.to);
}
function relink(tr: Transform, run: LinkRun, change: { href?: string; text?: string }): void {
  const text = change.text ?? run.text;
  const mark = schema.marks.link.create({ href: change.href ?? run.href });
  /* the words kept, the link's mark alone moved: rebuilt, a label part
     italic took its first piece's marks throughout (pin: links.test ›
     keeps the marks inside a hand-written label) */
  if (text === run.text) { tr.removeMark(run.from, run.to, schema.marks.link).addMark(run.from, run.to, mark); return; }
  const other = tr.doc.resolve(run.from).nodeAfter?.marks.filter((m) => m.type !== schema.marks.link) || [];
  tr.replaceWith(run.from, run.to, schema.text(text, [...other, mark]));
}
/* the host's links to a renamed (newHref) or deleted (null) sub-entry:
   the href moves, and a label that was the bare name follows it — a
   hand-written label stays, the accepted dangling-label class (pin:
   links.test › moves the href and a bare-name label) */
export const followedLabel = (text: string, oldLabel: string, newLabel: string): string => text === oldLabel ? newLabel : text;
export interface LinkTarget { href: string; label: string }
export function retargetLinks(md: string, from: LinkTarget, to: LinkTarget | null): string | null {
  return rewriteLinks(md, (run) => {
    if (hashTarget(asAddress(run.href)) !== from.href) return null;
    if (!to) return { remove: true };
    return { href: to.href + run.href.slice(from.href.length), text: followedLabel(run.text, from.label, to.label) };
  });
}
export interface Retitle { was: string; now: string }
export function relabelLinks(md: string, href: string, sub: string, { was, now }: Retitle): string | null {
  if (was === now) return null;
  const bare = mdLabel(sub, "entry");
  const minted = [bare, mdLabel(was, bare)];
  const label = mdLabel(now, bare);
  const relabels = (run: LinkRun): boolean => run.href === href && run.text !== label && minted.includes(run.text);
  return rewriteLinks(md, (run) => (relabels(run) ? { text: label } : null));
}
