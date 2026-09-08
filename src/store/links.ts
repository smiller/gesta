/* The links in a stored entry, rewritten: the host of a renamed or
   deleted sub-entry retargets or drops the links that pointed at it, and
   a parent keeps its index link reading as a sub-page's TITLE when the
   heading changes. Ported 2026-09-07 from rewriteHostLinks,
   retargetMainLinks and relabelSubLinks (15-tagged-sub-entries…js),
   re-asked of the document model: the markdown is parsed, every link run
   (adjacent text under one link mark) is judged and changed, and the
   document is serialized back — null when nothing changed, so the caller
   writes nothing. A dropped link that leaves its paragraph empty takes
   the paragraph with it. */
import type { Node } from "prosemirror-model";
import { Transform } from "prosemirror-transform";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { schema } from "../model/schema.ts";
import { mdLabel } from "./reference.ts";

export interface LinkRun { href: string; text: string; from: number; to: number }
/* the link runs of a document, in order */
export function linkRuns(doc: Node): LinkRun[] {
  const runs: LinkRun[] = [];
  const link = schema.marks.link;
  let open: LinkRun | null = null;
  doc.descendants((n, pos) => {
    if (!n.isText) { if (!n.isInline) open = null; return true; }
    const m = link.isInSet(n.marks);
    if (m && open && open.href === m.attrs.href && open.to === pos) { open.text += n.text!; open.to = pos + n.nodeSize; return true; }
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
  const runs = linkRuns(doc);
  const tr = new Transform(doc);
  let changed = false;
  /* in reverse, so an edit never moves a run still to be visited */
  for (const run of runs.slice().reverse()) {
    const change = visit(run);
    if (!change) continue;
    changed = true;
    if (change.remove) {
      const $from = tr.doc.resolve(run.from);
      const emptied = $from.parent.type === schema.nodes.paragraph && $from.parent.textContent === run.text;
      if (emptied) tr.delete($from.before(), $from.after());
      else tr.delete(run.from, run.to);
      continue;
    }
    const href = change.href ?? run.href;
    const text = change.text ?? run.text;
    const mark = schema.marks.link.create({ href });
    const other = tr.doc.resolve(run.from).nodeAfter?.marks.filter((m) => m.type !== schema.marks.link) || [];
    tr.replaceWith(run.from, run.to, schema.text(text, [...other, mark]));
  }
  return changed ? serializeMarkdown(tr.doc) : null;
}
/* the host's links to a renamed (newHref) or deleted (null) sub-entry:
   the href moves, and a label that was the bare name follows it — a
   hand-written label stays, the accepted dangling-label class */
export function retargetLinks(md: string, oldHref: string, newHref: string | null, oldLabel: string, newLabel: string | null): string | null {
  return rewriteLinks(md, (run) => {
    if (run.href !== oldHref) return null;
    if (!newHref) return { remove: true };
    return { href: newHref, text: run.text === oldLabel ? newLabel! : run.text };
  });
}
/* the parent's index link re-labelled to the sub-page's new heading —
   only a label the app itself minted, the bare name or the previous
   heading; a removed heading relabels back to the bare name */
export function relabelLinks(md: string, href: string, sub: string, oldHeading: string, heading: string): string | null {
  if (oldHeading === heading) return null;
  const bare = mdLabel(sub, "entry");
  const minted = [bare, mdLabel(oldHeading, bare)];
  const label = mdLabel(heading, bare);
  return rewriteLinks(md, (run) => (run.href !== href || run.text === label || minted.indexOf(run.text) === -1) ? null : { text: label });
}
