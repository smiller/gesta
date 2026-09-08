import { test, expect } from "vitest";
import { parseMarkdown } from "../model/parse.ts";
import { codeDecorations } from "./codeHighlight.ts";

test("a fenced block with a language gets a decoration per token at document positions; one without gets none", () => {
  const doc = parseMarkdown("```js\nconst x = 1\n```\n\n```\nconst y\n```");
  const decos = codeDecorations(doc);
  expect(decos.map((d) => doc.textBetween(d.from, d.to))).toEqual(["const", "1"]);
  expect((decos[0].spec as { class?: string }).class ?? (decos[0] as unknown as { type: { attrs: { class: string } } }).type.attrs.class).toContain("tok-k");
});
