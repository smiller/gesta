import type { Node, ResolvedPos } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { schema } from "../model/schema.ts";
import { sentenceRange } from "./dualLanguage.ts";
import { wholeRows } from "./reference.ts";

const N = schema.nodes;

/* the paired block a position stands in: a verse or prose block with a pair
   in it and one count, null elsewhere */
function pairedBlock($p: ResolvedPos): number | null {
  for (let d = $p.depth; d > 0; d--) {
    const n = $p.node(d);
    if (n.type !== N.verse && n.type !== N.prose) continue;
    let paired = false;
    n.forEach((row) => { if (row.type === N.pair) paired = true; });
    return paired && n.attrs.facing == null ? $p.before(d) : null;
  }
  return null;
}

/* the rows the selection's ends widen to, less the selection itself: a
   range per text; nothing outside one paired block, nor in a block
   numbered on both sides (pin: pairMarks.test › a block numbered on both
   sides) */
export function coveredMarks(doc: Node, from: number, to: number): [number, number][] {
  if (from >= to) return [];
  const block = pairedBlock(doc.resolve(from));
  if (block == null || block !== pairedBlock(doc.resolve(to))) return [];
  const [a, b] = wholeRows(doc, ...sentenceRange(doc, from, to));
  const out: [number, number][] = [];
  const add = (x: number, y: number) => { if (y > x && doc.textBetween(x, y).trim()) out.push([x, y]); };
  doc.nodesBetween(a, b, (n, pos) => {
    if (n.type === N.note || n.type === N.margin_note) return false;
    if (!n.isTextblock) return true;
    const s = Math.max(pos + 1, a), e = Math.min(pos + 1 + n.content.size, b);
    add(s, Math.min(e, from));
    add(Math.max(s, to), e);
    return false;
  });
  return out;
}

/* (pin: pairMarks.test › a selection in one sentence's original marks its translation) */
export function pairMarks(): Plugin {
  return new Plugin({
    props: {
      decorations: (s) => {
        const covered = s.selection.empty ? [] : coveredMarks(s.doc, s.selection.from, s.selection.to);
        return covered.length ? DecorationSet.create(s.doc, covered.map(([a, b]) => Decoration.inline(a, b, { class: "dl-covered" }))) : null;
      },
    },
  });
}
