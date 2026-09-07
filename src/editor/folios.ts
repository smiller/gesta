/* The folio gutter's switch: `foliopage` on the editor root exactly where
   the document holds a leaf marker that is THE TEXT'S — a marker inside a
   note draws no page number and turns no page (README, the note block).
   The label and the tick themselves are the marker's own DOM (schema.ts,
   the folio node) drawn by the stylesheet at the marker's static position,
   so nothing here measures: a row is a block and a line number can ride a
   ::before on it; a leaf turns mid-paragraph, and what rides the marker's
   own inline box lands on the visual line it sits in (MEASURED in Helium,
   2026-09-07, editor.css carries the rule). */
import { Plugin, PluginKey } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";

const N = schema.nodes;

/* has this document leaves: a folio outside every note */
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
