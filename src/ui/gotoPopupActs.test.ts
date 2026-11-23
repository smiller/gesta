import { test, expect } from "vitest";
import { gotoPopupActs, type GotoPopupDeps } from "./gotoPopupActs.ts";
import type { Screen } from "./screen.svelte.ts";

/* node has no document to listen on */
(globalThis as { document?: unknown }).document ??= { addEventListener: () => {} };

function barOf(kind: Screen["gotoPopup"]["kind"]) {
  const lb: Screen["gotoPopup"] = { open: true, kind, line: "", page: "", stanza: "", lineLabel: "Line", pageLabel: "Page" };
  const deps = { lb, session: { current: { date: "bookshelf", tag: "A/W" }, view: null, mdView: false }, journal: {} as never, info: () => {}, opened: () => {}, focusBar: () => {}, warmed: () => true } as unknown as GotoPopupDeps;
  return { lb, acts: gotoPopupActs(deps) };
}

test("in a popup that asks one number or the other, typing in one box empties the other", () => {
  const { lb, acts } = barOf("both");
  acts.input("line", "1");
  acts.input("page", "4");
  expect([lb.line, lb.page]).toEqual(["", "4"]);
  acts.input("line", "12");
  expect([lb.line, lb.page]).toEqual(["12", ""]);
});

test("a popup that asks for both together, a stanza and its line, keeps each box as typed", () => {
  const { lb, acts } = barOf("stanza");
  acts.input("stanza", "2");
  acts.input("line", "3");
  expect([lb.stanza, lb.line]).toEqual(["2", "3"]);
});
