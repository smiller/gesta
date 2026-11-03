import type { Node, ResolvedPos } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { schema } from "../model/schema.ts";

const N = schema.nodes;

/* the pair a position stands in, the cell's side and the block holding it;
   null outside a paired row, and in a dual-language block, which marks its
   own Latin */
function cellAt($p: ResolvedPos): { block: Node; blockPos: number; row: number; side: number } | null {
  for (let d = $p.depth; d > 0; d--) {
    if ($p.node(d).type !== N.pair) continue;
    const block = $p.node(d - 1);
    if (block.type !== N.prose && (block.type !== N.verse || block.attrs.dual)) return null;
    return { block, blockPos: $p.before(d - 1), row: $p.index(d - 1), side: $p.index(d) };
  }
  return null;
}

/* a selection in one column of paired rows: the other column of every row
   it covers, a range per cell; none where it reaches both columns (pin:
   pairMarks.test › a selection across both columns marks nothing) */
export function otherColumn(doc: Node, from: number, to: number): [number, number][] {
  if (from >= to) return [];
  const a = cellAt(doc.resolve(from)), b = cellAt(doc.resolve(to));
  if (!a || !b || a.blockPos !== b.blockPos || a.side !== b.side) return [];
  const out: [number, number][] = [];
  let pos = a.blockPos + 1;
  a.block.forEach((row, _offset, i) => {
    const at = pos;
    pos += row.nodeSize;
    if (i < a.row || i > b.row || row.type !== N.pair || row.childCount < 2) return;
    let cell = at + 1;
    for (let k = 0; k < 1 - a.side; k++) cell += row.child(k).nodeSize;
    const other = row.child(1 - a.side);
    if (other.content.size) out.push([cell + 1, cell + 1 + other.content.size]);
  });
  return out;
}

/* the other column marked as selected: a reference quotes the whole rows
   (pin: pairMarks.test › a selection in one sentence's original marks its
   translation) */
export function pairMarks(): Plugin {
  return new Plugin({
    props: {
      decorations: (s) => {
        const covered = s.selection.empty ? [] : otherColumn(s.doc, s.selection.from, s.selection.to);
        return covered.length ? DecorationSet.create(s.doc, covered.map(([a, b]) => Decoration.inline(a, b, { class: "dl-covered" }))) : null;
      },
    },
  });
}
