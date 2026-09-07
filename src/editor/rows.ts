/* The row node views: a line, a pair and a gap under a verse or prose
   fence. Today each draws exactly what its toDOM would, and that is the
   point of having them now — the row is the seat of everything phase 1
   adds to it (the pipe that splits a line into a pair, Enter and Tab under
   the fence, the row's copy), and the line number is NOT drawn here: it is
   a node decoration (lineNumbers.ts) the view applies to this DOM, so the
   row never has to know its own number. */
import type { NodeView } from "prosemirror-view";
import type { Node } from "prosemirror-model";

class RowView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private readonly name: string;
  constructor(node: Node) {
    this.name = node.type.name;
    this.dom = this.contentDOM = document.createElement("div");
    this.dom.className = this.name === "pair" ? "vrow vpair" : "vrow";
    this.kind(node);
  }
  /* the declared kind rides on the DOM as data, where the stylesheet and a
     clipboard serialization can both read it */
  private kind(node: Node): void {
    if (node.attrs.kind) this.dom.dataset.kind = String(node.attrs.kind);
    else delete this.dom.dataset.kind;
  }
  update(node: Node): boolean {
    if (node.type.name !== this.name) return false;
    this.kind(node);
    return true;
  }
}

/* a stanza gap draws the blank line's height and nothing else; it holds no
   content, so nothing inside it can ever change */
class GapView implements NodeView {
  dom: HTMLElement;
  constructor() {
    this.dom = document.createElement("div");
    this.dom.className = "vgap";
  }
  update(node: Node): boolean { return node.type.name === "gap"; }
  ignoreMutation(): boolean { return true; }
}

export const rowNodeViews = {
  line: (node: Node): NodeView => new RowView(node),
  pair: (node: Node): NodeView => new RowView(node),
  gap: (): NodeView => new GapView(),
};
