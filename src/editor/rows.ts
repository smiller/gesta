/* each view draws exactly what its toDOM would: a copy travels as this DOM
   and must read back as rows (pin: schema.test › every node that draws
   itself reads itself back) */
import type { NodeView, ViewMutationRecord } from "prosemirror-view";
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
    if (node.attrs.label) this.dom.dataset.label = String(node.attrs.label);
    else delete this.dom.dataset.label;
  }
  update(node: Node): boolean {
    if (node.type.name !== this.name) return false;
    this.kind(node);
    return true;
  }
  /* a style on this row is never the document's: read back as a change,
     it redrew the row without it (pin: split lines › split lines in Samson) */
  ignoreMutation(m: ViewMutationRecord): boolean { return m.type === "attributes" && m.target === this.dom && m.attributeName === "style"; }
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

class SkipView implements NodeView {
  dom: HTMLElement;
  constructor() {
    this.dom = document.createElement("div");
    this.dom.className = "vskip";
  }
  update(node: Node): boolean { return node.type.name === "skip"; }
  ignoreMutation(): boolean { return true; }
}

class NoteView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  constructor() {
    this.dom = this.contentDOM = document.createElement("div");
    this.dom.className = "note";
  }
  update(node: Node): boolean { return node.type.name === "note"; }
  ignoreMutation(m: ViewMutationRecord): boolean { return m.type === "attributes" && m.target === this.dom && m.attributeName === "style"; }
}

/* an attribute of this node is never the document's: read back as a
   change, a class written on it would redraw it */
class MarginNoteView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  constructor() {
    this.dom = this.contentDOM = document.createElement("div");
    this.dom.className = "margin-note";
  }
  update(node: Node): boolean { return node.type.name === "margin_note"; }
  ignoreMutation(m: ViewMutationRecord): boolean { return m.type === "attributes" && m.target === this.dom; }
}

export const rowNodeViews = {
  line: (node: Node): NodeView => new RowView(node),
  pair: (node: Node): NodeView => new RowView(node),
  gap: (): NodeView => new GapView(),
  skip: (): NodeView => new SkipView(),
  note: (): NodeView => new NoteView(),
  margin_note: (): NodeView => new MarginNoteView(),
};
