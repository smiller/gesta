/* after the selection, never replacing it, and NOTHING IS APPENDED AT THE
   END. A code block or inline code refuses, where a link is bare text
   (pin: insertLink.test › linkRefusal: inline code refuses), and an existing
   link, where a link in a link re-parses split (pin: insertLink.test ›
   linkRefusal: a code block and a link refuse) */
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { schema } from "../model/schema.ts";
import { serializeMarkdown } from "../model/serialize.ts";

export function linkRefusal(state: EditorState): string {
  const $to = state.selection.$to;
  if ($to.parent.type === schema.nodes.code_block || schema.marks.code.isInSet($to.marks())) return "no link inside a code block";
  if (schema.marks.link.isInSet($to.marks())) return "no link inside a link";
  return "";
}
/* the same link as markdown, for the markdown view: spelled by the
   serializer, so both views write one text (pin: insertLink.test ›
   linkMarkdown) */
export function linkMarkdown(href: string, label: string): string {
  const doc = schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, schema.text(label, [schema.marks.link.create({ href })])));
  return serializeMarkdown(doc).replace(/\n+$/, "");
}
export function insertLinkAfter(view: Pick<EditorView, "state" | "dispatch">, href: string, label: string): void {
  const { $to } = view.state.selection;
  const text = schema.text(label, [schema.marks.link.create({ href })]);
  view.dispatch(view.state.tr.insert($to.pos, text).scrollIntoView());
}
