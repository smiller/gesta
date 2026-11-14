import type { Session } from "../session.ts";
import type { EntryLayer } from "../store/entries.ts";
import type { Journal } from "../store/reference.ts";
import type { Screen } from "./screen.svelte.ts";
import type { Notices, Progress } from "./notices.svelte.ts";
import { parseMarkdown } from "../model/parse.ts";
import { flattenDocText } from "../model/flatten.ts";
import { dexieIndexKeeper } from "../store/indexStore.ts";
import { searchIndex } from "../store/searchIndex.ts";
import { searchEntries, snippetRuns, SEARCH_CAP } from "../store/search.ts";
import { failMsg, errText } from "../store/files.ts";
import { entryKey, NS, NS_BOOK } from "../store/keys.ts";
import { SHELVES } from "../store/shelves.ts";
import { READER_DB } from "../store/bundle.ts";
import { scopeOptions, defaultScope, sameScope, resultLabel } from "./searchModel.ts";

export interface SearchDeps {
  sr: Screen["search"];
  session: Pick<Session, "current" | "save" | "focusText" | "jump">;
  layer: Pick<EntryLayer, "cache" | "warmed" | "storeReadFailed">;
  journal: Journal;
  notices: Pick<Notices, "progress" | "state">;
  reader: boolean;
  opened(): void;
  focusRow(): void;
}
export interface SearchRow {
  toggle(open: boolean): void; query(q: string): void; scope(at: number): void; walk(dir: 1 | -1): void; pick(i: number): void; enter(): void;
  buildIndex(): void; reanswer(): void;
}
export function searchActs(d: SearchDeps): SearchRow {
  const { sr, session, layer, journal, notices, reader: READER, opened, focusRow } = d;
  /* SEARCH. The index is built from the parsed text, once per session:
     MEASURED 4.4 s over the whole mirror under node, so it is built in
     chunks that yield, in idle time, and finished on demand under a progress
     line when a search comes first. After that every scan is a walk over
     the memo. The scan runs 150 ms after the last keystroke, off the query
     as TYPED; Enter and the arrows flush a pending scan first, so
     type-then-Enter opens the top row. */
  const index = searchIndex(layer.cache, (md) => flattenDocText(parseMarkdown(md)), undefined, __PARSER__);
  let indexing: Progress | null = null;
  const CHUNK_MS = 12;
  /* a reader waiting on a search: longer slices, the progress line still
     repainting between them */
  const WAITED_MS = 50;
  /* the texts an earlier launch parsed, read once before the build's first
     step; a failed read is an empty one, the build parsing everything as
     before (pin: searchIndex.test › an entry whose fingerprint is known) */
  const keeper = dexieIndexKeeper(READER ? READER_DB + ".index" : NS + "index");
  let knownRead: Promise<void> | null = null;
  const keepIndex = (): void => {
    const made = index.made(), stale = index.stale();
    if (!made.length && !stale.length) return;
    keeper.save(made).then(() => keeper.drop(stale)).catch((err: unknown) => console.error("the search index could not be kept", err));
  };
  /* texts parsed after the build, an edited entry's, kept as the window goes */
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && index.complete) keepIndex(); });
  /* ONE build, whoever asks: each search waiting on it is answered once when
     it completes */
  const waiting = new Set<() => void>();
  let building = false;
  const answer = (): void => { const w = [...waiting]; waiting.clear(); for (const f of w) f(); };
  const indexFailed = (err: unknown): void => {
    building = false;
    waiting.clear();
    console.error("the search index could not be built", err);
    indexing?.fail(failMsg("couldn't build the search index", err), errText(err));
    indexing = null;
  };
  /* a throw ends this build and says so; the next search starts another */
  const indexStep = (): { done: number; total: number } | null => {
    try { return index.step(performance.now() + (waiting.size ? WAITED_MS : CHUNK_MS)); }
    catch (err) { indexFailed(err); return null; }
  };
  const indexBuilt = (total: number): void => {
    building = false;
    indexing?.ok("indexed " + total + " entries", 1400);
    indexing = null;
    keepIndex();
    answer();
  };
  const nextIndexRun = (run: () => void): void => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (waiting.size) setTimeout(run, 0);   /* wanted now: keep going, yielding only to paint */
    else if (idle) idle(run);
    else setTimeout(run, 50);
  };
  const buildIndex = (then?: () => void): void => {
    if (then) waiting.add(then);
    if (index.complete) { answer(); return; }
    if (building) return;
    building = true;
    const run = (): void => {
      const step = indexStep();
      if (!step) return;
      indexing?.step(step.done, step.total);
      if (index.complete) indexBuilt(step.total);
      else nextIndexRun(run);
    };
    knownRead ??= keeper.load().then((k) => index.know(k)).catch((err: unknown) => console.error("the kept search index could not be read", err));
    knownRead.then(run);
  };
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  const scopeNow = () => sr.options[sr.scopeAt]?.scope || defaultScope(session.current.date, session.current.tag);
  /* the query the rows on screen were built for: a row clicked after the
     query was typed on highlights what it was found for (pin: notices and
     surfaces › a result clicked after more typing) */
  let builtFor = "";
  const notReady = (): boolean => {
    if (!layer.warmed) { sr.empty = layer.storeReadFailed ? "Couldn’t load entries." : "Still loading…"; return true; }
    if (index.complete) return false;
    /* not while an op holds the line: its report would be lost
       (pin: notices.test › a newer progress retires the older handle) */
    if (!indexing && !notices.state.busy) indexing = notices.progress("indexing…");
    buildIndex(renderSearch);
    return true;
  };
  const showResults = (q: string): void => {
    const scope = scopeNow();
    const results = searchEntries(index.rows(), q, scope);
    if (!results.length) { sr.empty = "No matches."; return; }
    sr.capped = results.length > SEARCH_CAP;
    sr.rows = results.slice(0, SEARCH_CAP).map((result) => ({ result, where: resultLabel(result, scope, journal), runs: snippetRuns(result.snippet, q) }));
    builtFor = q;
    sr.active = 0;
  };
  const renderSearch = (): void => {
    if (!sr.open) return;
    const q = sr.query.trim();
    sr.rows = []; sr.capped = false; sr.active = -1; sr.empty = "";
    if (!q || notReady()) return;
    showResults(q);
  };
  const cancelScan = (): void => { if (searchTimer) clearTimeout(searchTimer); searchTimer = null; };
  const flushScan = (): void => { if (searchTimer) { cancelScan(); renderSearch(); } };
  const openRow = (open: boolean): void => {
    if (sr.open === open) return;
    cancelScan();
    sr.open = open;
    if (!open) { session.focusText(); return; }
    opened();
    session.save.flush();
    const c = session.current;
    sr.options = scopeOptions(c.date, c.tag, { keys: Object.keys(layer.cache), journal: journal, shelvesMd: layer.cache[entryKey(NS_BOOK.key, SHELVES)] || "" });
    const pre = defaultScope(c.date, c.tag);
    sr.scopeAt = Math.max(0, sr.options.findIndex((o) => sameScope(o.scope, pre)));
    setTimeout(() => focusRow(), 0);
    renderSearch();
  };
  const toggleSearch = openRow;
  const querySearch = (q: string): void => { sr.query = q; cancelScan(); searchTimer = setTimeout(() => { searchTimer = null; renderSearch(); }, 150); };
  const scopeSearch = (at: number): void => { sr.scopeAt = at; cancelScan(); renderSearch(); };
  const walkSearch = (dir: 1 | -1): void => {
    flushScan();
    if (!sr.rows.length) return;
    sr.active = (sr.active + dir + sr.rows.length) % sr.rows.length;
    document.querySelectorAll(".search-results li.hit")[sr.active]?.scrollIntoView({ block: "nearest" });
  };
  const pickSearch = (i: number): void => {
    const row = sr.rows[i];
    if (!row) return;
    const q = builtFor;
    openRow(false);
    session.jump(row.result.date, row.result.tag, { q, nth: row.result.nth }, true);
  };
  const enterSearch = (): void => { flushScan(); if (sr.active >= 0) pickSearch(sr.active); };
  return {
    toggle: toggleSearch, query: querySearch, scope: scopeSearch, walk: walkSearch, pick: pickSearch, enter: enterSearch,
    buildIndex: () => buildIndex(), reanswer: () => { if (sr.open) renderSearch(); },
  };
}
