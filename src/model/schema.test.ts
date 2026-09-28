import { test, expect } from "vitest";
import { Schema, type NodeSpec, type TagParseRule } from "prosemirror-model";
import { schema } from "./schema.ts";

const el = (attrs: Record<string, string>, cls = "") => ({
  className: cls,
  dataset: Object.fromEntries(Object.entries(attrs).filter(([k]) => k.startsWith("data-")).map(([k, v]) => [k.slice(5), v])),
  hasAttribute: (k: string) => k in attrs,
  getAttribute: (k: string) => attrs[k] ?? null,
}) as unknown as HTMLElement;
const rule = (name: string): TagParseRule => schema.nodes[name].spec.parseDOM![0] as TagParseRule;

test("every node that draws itself reads itself back", () => {
  const drawn = Object.values(schema.nodes).filter((t) => t.spec.toDOM);
  expect(drawn.length).toBeGreaterThan(20);
  for (const t of drawn) expect(t.spec.parseDOM?.length, t.name).toBeGreaterThan(0);
});

test("a card is read back only from the editor's own copy, which carries data-card", () => {
  expect(rule("card").tag).toBe("div[class^='card-'][data-card]");
  expect(schema.nodes.card.spec.toDOM!(schema.nodes.card.create({ colour: "card-red" }, schema.nodes.paragraph.create()))).toEqual(["div", { class: "card-red", "data-card": "" }, 0]);
});

test("a grid is read back only when it carries data-n; a foreign div.grid is declined", () => {
  const getAttrs = rule("grid").getAttrs!;
  expect(getAttrs(el({}, "grid"))).toBe(false);
  expect(getAttrs(el({ "data-n": "" }, "grid"))).toEqual({ n: null });
  expect(getAttrs(el({ "data-n": "2" }, "grid"))).toEqual({ n: 2 });
});

test("a grid cannot require a card: a card's colour has no default, so the schema refuses card+", () => {
  const nodes = schema.spec.nodes.update("grid", { ...(schema.spec.nodes.get("grid") as NodeSpec), content: "card+" });
  expect(() => new Schema({ nodes, marks: schema.spec.marks })).toThrow(/non-generatable nodes \(card\)/);
});
