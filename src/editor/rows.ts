/* each view draws exactly what its toDOM would: a copy travels as this DOM
   and must read back as rows (pin: schema.test › every node that draws
   itself reads itself back) */
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

class GapView implements NodeView {
  dom: HTMLElement;
  constructor() {
    this.dom = document.createElement("div");
    this.dom.className = "vgap";
  }
  update(node: Node): boolean { return node.type.name === "gap"; }
  ignoreMutation(): boolean { return true; }
}

/* one view for a note as a block and as a ROW of a verse or prose fence: the
   row shape is the block's own */
class NoteView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  constructor() {
    this.dom = this.contentDOM = document.createElement("div");
    this.dom.className = "note";
  }
  update(node: Node): boolean { return node.type.name === "note"; }
}

export const rowNodeViews = {
  line: (node: Node): NodeView => new RowView(node),
  pair: (node: Node): NodeView => new RowView(node),
  gap: (): NodeView => new GapView(),
  note: (): NodeView => new NoteView(),
};
