import { test, expect, vi, beforeEach } from "vitest";
import { searchActs } from "./searchActs.ts";
import { screenState } from "./screen.svelte.ts";
import { journalOf } from "../store/headings.ts";

vi.mock("../store/indexStore.ts", () => ({ dexieIndexKeeper: () => ({ load: () => Promise.resolve([]), save: () => Promise.resolve(), drop: () => Promise.resolve() }) }));
const GLOBALS = { document: { addEventListener() {}, visibilityState: "visible" }, window: {}, __PARSER__: "test" };
beforeEach(() => {
  vi.useFakeTimers();
  for (const [k, v] of Object.entries(GLOBALS)) vi.stubGlobal(k, v);
  return () => { vi.useRealTimers(); vi.unstubAllGlobals(); };
});

function rig(o: { warmed?: boolean } = {}) {
  const cache = { "commonplace/Links": "A link to [Horace](#commonplace/Horace) and one [outside](https://example.org/).\n", "commonplace/Horace": "Maecenas atavis edite regibus.\n" };
  const sr = screenState(5).search;
  const layer = { cache, warmed: o.warmed ?? true, storeReadFailed: false };
  const row = searchActs({
    sr, layer, journal: journalOf(cache), reader: false, opened() {}, focusRow() {},
    session: { current: { date: "commonplace", tag: "Links" }, save: { flush: () => Promise.resolve(true) }, focusText() {}, jump() {} } as never,
    alerts: { progress: () => ({ step() {}, ok() {}, fail() {}, cancel() {} }), state: { busy: false } } as never,
  });
  return { sr, layer, row };
}

async function asked(q: string, o: { warmed?: boolean } = {}) {
  const r = rig(o);
  r.row.toggle(true);
  r.row.query(q);
  const pending = r.sr.answered;
  await vi.advanceTimersByTimeAsync(150);
  return { ...r, pending };
}

test("a typed query stands unanswered until its scan has run, then the rows and the query they answer are published together", async () => {
  const { sr, row, pending } = await asked("outside");
  expect([pending, sr.answered, sr.rows.map((r) => r.result.tag)]).toEqual([null, "outside", ["Links"]]);
  row.query("outside l");
  expect(sr.answered).toBe(null);
});

test("a query with no hit is answered by the no-matches line", async () => {
  const { sr } = await asked("zzz");
  expect(sr).toMatchObject({ answered: "zzz", rows: [], empty: "No matches." });
});

test("while the journal loads a query stands unanswered; the load's reanswer answers it", async () => {
  const { sr, layer, row } = await asked("outside", { warmed: false });
  expect(sr).toMatchObject({ answered: null, empty: "Still loading…" });
  layer.warmed = true;
  row.reanswer();
  await vi.advanceTimersByTimeAsync(0);
  expect(sr.answered).toBe("outside");
});

test("a closed search answers nothing", async () => {
  const { sr, row } = await asked("outside");
  row.toggle(false);
  expect(sr.answered).toBe(null);
});
