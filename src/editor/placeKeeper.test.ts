import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { placeKeeper, type PlaceSurface } from "./placeKeeper.ts";
import { parsePlaces, placeOf, withPlace } from "../store/placeState.ts";
import { NS } from "../store/keys.ts";

const KEY = NS + "places";
interface Fake extends PlaceSurface { at: number | null; size: number; throws: boolean }

interface World {
  log: string[]; box: Record<string, string>; win: { at: number; y(): number; scrollTo(y: number): void; under(): number };
  surf: Fake | null; readonly sets: number; fire(e: string): void; place(k: string): { pos: number; y: number } | null;
  seed(k: string, pos: number, y: number): void; rendered(at?: number | null, size?: number): Fake; source(): Fake;
  keeper: ReturnType<typeof placeKeeper>; show(f: Fake | null): () => void;
}
function world(): World {
  const log: string[] = [];
  const handlers: Record<string, (() => void)[]> = {};
  const box: Record<string, string> = {};
  let sets = 0;
  const win = { at: 0, y: () => win.at, scrollTo: (y: number) => { win.at = y; log.push("scroll " + y); }, under: () => 10 };
  const w: World = {
    log, box, win,
    surf: null as Fake | null,
    get sets() { return sets; },
    fire: (e: string) => { for (const f of handlers[e] || []) f(); },
    place: (k: string) => placeOf(parsePlaces(box[KEY] ?? null), k),
    seed: (k: string, pos: number, y: number) => { box[KEY] = JSON.stringify(withPlace(parsePlaces(box[KEY] ?? null), k, { pos, y })); },
    rendered: (at: number | null = 5, size = 100): Fake => {
      const f: Fake = {
        source: false, at, size, throws: false,
        placeAt: () => f.at,
        reveal: (p) => { log.push("reveal " + p); },
        scrollToPos: (p) => { if (f.throws) throw new Error("no box"); win.at = p * 10; log.push("to " + p); },
        end: () => f.size,
      };
      return f;
    },
    source: (): Fake => ({ source: true, at: null, size: 100, throws: false, placeAt: () => null, reveal: () => {}, scrollToPos: () => {}, end: () => 100 }),
    keeper: placeKeeper({
      surface: (): PlaceSurface | null => w.surf,
      window: win,
      page: { on: (e, fn) => { (handlers[e] ||= []).push(fn); }, anchoring: (on) => { log.push("anchoring " + on); } },
      storage: () => ({ getItem: (k) => k in box ? box[k] : null, setItem: (k, v) => { sets++; box[k] = v; } }),
    }),
    show: (f: Fake | null) => () => { w.surf = f; },
  };
  return w;
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("arriving", () => {
  it("an arrival holds its stored place, anchoring off, revealed before it is scrolled to; a first visit goes to the top; keep moves nothing", () => {
    const w = world();
    w.seed("page/A", 40, 400);
    w.keeper.open("page/A", "arrive", w.show(w.rendered()));
    expect(w.log).toEqual(["anchoring false", "reveal 40", "to 40"]);
    const first = world();
    first.keeper.open("page/B", "arrive", first.show(first.rendered()));
    expect(first.log).toEqual(["anchoring true", "scroll 0"]);
    const keep = world();
    keep.seed("page/A", 40, 400);
    keep.keeper.open("page/A", "keep", keep.show(keep.rendered()));
    expect(keep.log).toEqual([]);
  });
  it("a highlight owed goes to the top, holds nothing, and leaves the stored place", () => {
    const w = world();
    w.seed("page/A", 40, 400);
    w.keeper.open("page/A", "owed", w.show(w.rendered()));
    expect(w.log).toEqual(["anchoring true", "scroll 0"]);
    w.fire("resize");
    expect(w.log).toHaveLength(2);
    expect(w.place("page/A")).toEqual({ pos: 40, y: 400 });
  });
});

describe("the hold", () => {
  it("is set again on every resize until a hand moves, which turns anchoring back on", () => {
    const w = world();
    w.seed("page/A", 40, 400);
    w.keeper.open("page/A", "arrive", w.show(w.rendered()));
    w.log.length = 0;
    w.fire("resize");
    expect(w.log).toEqual(["reveal 40", "to 40"]);
    w.fire("hand");
    w.fire("resize");
    expect(w.log).toEqual(["reveal 40", "to 40", "anchoring true"]);
  });
  it("survives a scroll landing 1px from where it put the window, and lets go at 2px", () => {
    const w = world();
    w.seed("page/A", 40, 400);
    w.keeper.open("page/A", "arrive", w.show(w.rendered()));
    w.win.at = 401;
    w.fire("scroll");
    w.log.length = 0;
    w.fire("resize");
    expect(w.log).toEqual(["reveal 40", "to 40"]);
    w.win.at = 402;
    w.fire("scroll");
    expect(w.log[w.log.length - 1]).toBe("anchoring true");
  });
  it("is dropped by opening another entry, and kept by opening the same one", () => {
    const w = world();
    w.seed("page/A", 40, 400);
    w.keeper.open("page/A", "arrive", w.show(w.rendered()));
    w.keeper.open("page/A", "keep", w.show(w.rendered()));
    w.log.length = 0;
    w.fire("resize");
    expect(w.log).toEqual(["reveal 40", "to 40"]);
    w.keeper.open("page/B", "keep", w.show(w.rendered()));
    w.fire("resize");
    expect(w.log).toEqual(["reveal 40", "to 40", "anchoring true"]);
  });
  it("reapply sets it again at once, and nothing once let go", () => {
    const w = world();
    w.seed("page/A", 40, 400);
    w.keeper.open("page/A", "arrive", w.show(w.rendered()));
    w.log.length = 0;
    w.keeper.reapply();
    expect(w.log).toEqual(["reveal 40", "to 40"]);
    w.fire("hand");
    w.keeper.reapply();
    expect(w.log).toEqual(["reveal 40", "to 40", "anchoring true"]);
  });
});

describe("recording", () => {
  it("is skipped while held; the source view records the window's offset, the rendered view the position at the masthead, or 0; no view, nothing", () => {
    const w = world();
    w.seed("page/A", 40, 400);
    w.keeper.open("page/A", "arrive", w.show(w.rendered()));
    w.win.at = 999;
    w.fire("leave");
    expect(w.place("page/A")).toEqual({ pos: 40, y: 400 });
    const src = world();
    src.keeper.open("page/A", "keep", src.show(src.source()));
    src.win.at = 250;
    src.fire("leave");
    expect(src.place("page/A")).toEqual({ pos: -1, y: 250 });
    const r = world();
    r.keeper.open("page/A", "keep", r.show(r.rendered(7)));
    r.win.at = 300;
    r.fire("leave");
    expect(r.place("page/A")).toEqual({ pos: 7, y: 300 });
    r.surf!.at = null;
    r.fire("leave");
    expect(r.place("page/A")).toEqual({ pos: 0, y: 300 });
    const none = world();
    none.keeper.open("page/A", "keep", none.show(null));
    none.fire("leave");
    expect(none.sets).toBe(0);
  });
  it("waits 400ms after the last scroll", () => {
    const w = world();
    w.keeper.open("page/A", "keep", w.show(w.rendered(7)));
    w.win.at = 300;
    w.fire("scroll");
    vi.advanceTimersByTime(300);
    w.fire("scroll");
    vi.advanceTimersByTime(300);
    expect(w.sets).toBe(0);
    vi.advanceTimersByTime(100);
    expect(w.place("page/A")).toEqual({ pos: 7, y: 300 });
  });
  it("records the entry left, under its own key and from its own view, before the next is shown", () => {
    const w = world();
    w.keeper.open("page/A", "keep", w.show(w.source()));
    w.win.at = 120;
    let seen: unknown = "unread";
    w.keeper.open("page/B", "keep", () => { seen = w.place("page/A"); w.surf = w.rendered(); });
    expect(seen).toEqual({ pos: -1, y: 120 });
    expect(w.place("page/B")).toBeNull();
  });
  it("skips a write the same as the last; a move forgets the last", () => {
    const w = world();
    w.keeper.open("page/A", "keep", w.show(w.rendered(7)));
    w.win.at = 300;
    w.fire("leave");
    w.fire("leave");
    expect(w.sets).toBe(1);
    w.keeper.move("page/A", "page/Z");
    w.fire("leave");
    expect(w.sets).toBe(3);
  });
});

describe("applying", () => {
  const arrive = (seed: [number, number], f: (w: ReturnType<typeof world>) => Fake | null) => {
    const w = world();
    w.seed("page/A", seed[0], seed[1]);
    w.keeper.open("page/A", "arrive", w.show(f(w)));
    return w.log.slice(1);
  };
  it("by the window's offset where there is no position to go to: none stored, at the top, the source view, no view", () => {
    expect(arrive([-1, 250], (w) => w.rendered())).toEqual(["scroll 250"]);
    expect(arrive([40, 0], (w) => w.rendered())).toEqual(["scroll 0"]);
    expect(arrive([40, 250], (w) => w.source())).toEqual(["scroll 250"]);
    expect(arrive([40, 250], () => null)).toEqual(["scroll 250"]);
  });
  it("clamps the position to the text's end, reveals it, and falls back to the offset when it has no box", () => {
    expect(arrive([999, 250], (w) => w.rendered(5, 50))).toEqual(["reveal 50", "to 50"]);
    expect(arrive([40, 250], (w) => { const f = w.rendered(); f.throws = true; return f; })).toEqual(["reveal 40", "scroll 250"]);
  });
});

describe("moves", () => {
  it("a rename carries the place to the new key; a delete drops it", () => {
    const w = world();
    w.seed("page/A", 40, 400);
    w.keeper.move("page/A", "page/Z");
    expect(w.place("page/Z")).toEqual({ pos: 40, y: 400 });
    expect(w.place("page/A")).toBeNull();
    w.keeper.move("page/Z", null);
    expect(w.place("page/Z")).toBeNull();
  });
});

describe("carry, the switch's place", () => {
  it("holds the position, applies it, and remembers the window's offset after, at least 1; the hold sees that offset", () => {
    const w = world();
    w.keeper.open("page/A", "keep", w.show(w.rendered()));
    w.keeper.carry(30);
    expect(w.log).toEqual(["anchoring false", "reveal 30", "to 30"]);
    expect(w.place("page/A")).toEqual({ pos: 30, y: 300 });
    w.surf!.throws = true;
    w.log.length = 0;
    w.fire("resize");
    expect(w.log).toEqual(["reveal 30", "scroll 300"]);
    const top = world();
    top.keeper.open("page/A", "keep", top.show(top.rendered()));
    top.surf!.scrollToPos = () => {};
    top.keeper.carry(30);
    expect(top.place("page/A")).toEqual({ pos: 30, y: 1 });
  });
});
