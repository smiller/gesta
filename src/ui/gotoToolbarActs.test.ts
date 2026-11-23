import { test, expect } from "vitest";
import { gotoToolbarActs, type GotoToolbarDeps } from "./gotoToolbarActs.ts";
import type { Screen } from "./screen.svelte.ts";

function barOf(kind: Screen["gotoToolbar"]["kind"]) {
  const lb: Screen["gotoToolbar"] = { open: true, kind, line: "", page: "", stanza: "", lineLabel: "Line", pageLabel: "Page" };
  const landing = { answer: () => false, forgetAsked: () => {}, caretBack: () => {}, unmark: () => {}, followSoon: () => {}, centreSoon: () => {}, replayOwed: () => {} };
  const deps: GotoToolbarDeps = { lb, session: { current: { date: "bookshelf", tag: "A/W" }, view: null, mdView: false }, journal: {} as never, raise: () => {}, opened: () => {}, focusBar: () => {}, landing, listen: () => {} };
  return { lb, acts: gotoToolbarActs(deps) };
}

test("in a toolbar that asks one number or the other, typing in one box empties the other", () => {
  const { lb, acts } = barOf("both");
  acts.input("line", "1");
  acts.input("page", "4");
  expect([lb.line, lb.page]).toEqual(["", "4"]);
  acts.input("line", "12");
  expect([lb.line, lb.page]).toEqual(["12", ""]);
});

test("a toolbar that asks for both together, a stanza and its line, keeps each box as typed", () => {
  const { lb, acts } = barOf("stanza");
  acts.input("stanza", "2");
  acts.input("line", "3");
  expect([lb.stanza, lb.line]).toEqual(["2", "3"]);
});
