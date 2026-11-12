import type { Node, ResolvedPos } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { schema } from "../model/schema.ts";
import { passageAt, marked } from "./passage.ts";

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

/* what the passage's rows hold beyond the selection, inside one paired
   block; nothing where the passage is refused, nor in a block numbered on both sides
   (pin: pairMarks.test › a block numbered on both sides) */
export function coveredMarks(doc: Node, from: number, to: number): [number, number][] {
  const p = passageAt(doc, from, to);
  if ("refused" in p) return [];
  const block = pairedBlock(doc.resolve(p.from));
  if (block == null || block !== pairedBlock(doc.resolve(p.to))) return [];
  return marked(p, from, to);
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
