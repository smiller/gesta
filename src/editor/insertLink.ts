/* after the selection, never replacing it, and NOTHING IS APPENDED AT THE
   END. A code block refuses, where a link is bare text, and an existing
   link, where a link in a link re-parses split (pin: insertLink.test ›
   linkRefusal: a code block and a link refuse) */
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { schema } from "../model/schema.ts";

export function linkRefusal(state: EditorState): string {
  const $to = state.selection.$to;
  if ($to.parent.type === schema.nodes.code_block) return "no link inside a code block";
  if (schema.marks.link.isInSet($to.marks())) return "no link inside a link";
  return "";
}
export function insertLinkAfter(view: EditorView, href: string, label: string): void {
  const { $to } = view.state.selection;
  const text = schema.text(label, [schema.marks.link.create({ href })]);
  view.dispatch(view.state.tr.insert($to.pos, text).scrollIntoView());
}
