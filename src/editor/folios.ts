import { Plugin, PluginKey } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";

const N = schema.nodes;

export function hasFolios(doc: Node): boolean {
  let found = false;
  const walk = (node: Node): void => {
    node.forEach((child) => {
      if (found || child.type === N.note) return;
      if (child.type === N.folio) found = true;
      else walk(child);
    });
  };
  walk(doc);
  return found;
}

export const foliosKey = new PluginKey("folios");
export function folios(): Plugin {
  return new Plugin({
    key: foliosKey,
    props: {
      attributes: (state): Record<string, string> => (hasFolios(state.doc) ? { class: "foliopage" } : {}),
    },
  });
}
