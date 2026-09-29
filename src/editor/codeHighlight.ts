/* never in the document, never stored (pin: codeHighlight.test › a fenced
   block with a language gets a decoration per token) */
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { tokenize } from "../model/tokens.ts";

export function codeDecorations(doc: Node): Decoration[] {
  const out: Decoration[] = [];
  doc.descendants((n, pos) => {
    if (n.type !== schema.nodes.code_block) return true;
    const lang = n.attrs.lang as string;
    if (lang) for (const t of tokenize(n.textContent, lang)) out.push(Decoration.inline(pos + 1 + t.from, pos + 1 + t.to, { class: "tok-" + t.cls }));
    return false;
  });
  return out;
}
export const codeHighlightKey = new PluginKey<DecorationSet>("codeHighlight");
export function codeHighlight(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: codeHighlightKey,
    state: {
      init: (_c, state) => DecorationSet.create(state.doc, codeDecorations(state.doc)),
      apply: (tr, set) => tr.docChanged ? DecorationSet.create(tr.doc, codeDecorations(tr.doc)) : set,
    },
    props: { decorations: (state) => codeHighlightKey.getState(state) },
  });
}
