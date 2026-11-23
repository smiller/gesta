import { test, expect } from "vitest";
import { EditorState, type Transaction } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { landing as landingMark, landingPos } from "../editor/landing.ts";
import { landingActs } from "./landingActs.ts";

const VERSE = "::: verse\nOne\nTwo\nThree\n:::";

function world(md = VERSE) {
  let state = EditorState.create({ doc: parseMarkdown(md), plugins: [landingMark()] });
  const view = { get state() { return state; }, dispatch(tr: Transaction) { state = state.apply(tr); }, coordsAtPos: () => ({ top: 500, bottom: 520, left: 0, right: 0 }), focus() {} };
  const session = { current: { date: "commonplace", tag: "Verse" as string | null }, view, mdView: false };
  const scrolled: number[] = [], said: unknown[] = [];
  let warm = true, click: (() => void) | null = null, key: ((e: { key: string; metaKey: boolean }) => void) | null = null;
  const acts = landingActs({
    session: session as never,
    conventions: () => ({}) as never,
    raise: ((s: unknown) => { said.push(s); }) as never,
    warmed: () => warm,
    page: { scrollBy: (dy) => { scrolled.push(dy); }, top: () => 148, height: () => 900, nextFrame: (f) => f() },
    hand: { listen: (onClick, onKey) => { click = onClick; key = onKey; return () => { click = key = null; }; } },
  });
  const landedText = (): string | null => { const p = landingPos(view.state); return p === null ? null : view.state.doc.nodeAt(p)!.textContent; };
  return { acts, session, scrolled, said, landedText, setWarm: (w: boolean) => { warm = w; }, click: () => click?.(), key: (k: string) => key?.({ key: k, metaKey: false }) };
}

test("a link to a line lands on it, centred in the band under the masthead, and the next click ends its mark", () => {
  const w = world();
  w.acts.followSoon("2");
  expect(w.landedText()).toBe("Two");
  expect(w.scrolled).toEqual([510 - (148 + (900 - 148) / 2)]);
  w.click();
  expect(w.landedText()).toBeNull();
});

test("a key that moves ends a link's mark; a bare modifier does not", () => {
  const w = world();
  w.acts.followSoon("3");
  w.key("Shift");
  expect(w.landedText()).toBe("Three");
  w.key("ArrowDown");
  expect(w.landedText()).toBeNull();
});

test("a link followed before the warm lands once warmed, on the same entry; a click meanwhile, or another entry, drops it", () => {
  const w = world();
  w.setWarm(false);
  w.acts.followSoon("2");
  expect(w.landedText()).toBeNull();
  w.setWarm(true);
  w.acts.replayOwed();
  expect(w.landedText()).toBe("Two");

  const clicked = world();
  clicked.setWarm(false);
  clicked.acts.followSoon("2");
  clicked.click();
  clicked.setWarm(true);
  clicked.acts.replayOwed();
  expect(clicked.landedText()).toBeNull();

  const moved = world();
  moved.setWarm(false);
  moved.acts.followSoon("2");
  moved.session.current = { date: "commonplace", tag: "Other" };
  moved.setWarm(true);
  moved.acts.replayOwed();
  expect(moved.landedText()).toBeNull();
});

test("a number the entry does not hold is said, and lands nowhere", () => {
  const w = world();
  w.acts.followSoon("9");
  expect(w.landedText()).toBeNull();
  expect(w.said).toHaveLength(1);
});
