/* Phase 1's screen: the editor over a fixture, the line numbers in the
   gutter, and the markdown the document serializes to underneath — enough
   to type into a poem from file:// and watch the count follow. Storage is
   phase 2; the chrome is phase 3. */
import "./editor/editor.css";
import type { EditorView } from "prosemirror-view";
import { parseMarkdown } from "./model/parse.ts";
import { serializeMarkdown } from "./model/serialize.ts";
import { createEditor } from "./editor/editor.ts";
import { setLineInterval } from "./editor/lineNumbers.ts";
import { idbEntryStore } from "./store/store.ts";
import horace from "../fixtures/horace-odes-1.1.md?raw";
import pippa from "../fixtures/pippa-passes-intro.md?raw";
import twelfth from "../fixtures/twelfth-night-1.1.md?raw";
import williams from "../fixtures/williams-witchcraft-3.md?raw";

const fixtures: Record<string, string> = { horace, pippa, twelfth, williams };
const mount = document.getElementById("editor") as HTMLElement;
const out = document.getElementById("out") as HTMLElement;
const same = document.getElementById("same") as HTMLElement;
const fixture = document.getElementById("fixture") as HTMLSelectElement;
const interval = document.getElementById("interval") as HTMLSelectElement;
const file = document.getElementById("file") as HTMLInputElement;

let source = "";
let view: EditorView | null = null;

function show(v: EditorView): void {
  const md = serializeMarkdown(v.state.doc);
  out.textContent = md;
  const ok = md === source;
  same.textContent = ok ? "(byte-identical to what was opened)" : "(differs from what was opened)";
  same.className = ok ? "" : "no";
}

function open(md: string): void {
  source = md;
  view?.destroy();
  mount.replaceChildren();
  view = createEditor(mount, parseMarkdown(md), { interval: +interval.value, onChange: show });
  show(view);
}

fixture.addEventListener("change", () => open(fixtures[fixture.value]));
interval.addEventListener("change", () => {
  if (view) setLineInterval(+interval.value)(view.state, view.dispatch);
});
file.addEventListener("change", async () => {
  const f = file.files?.[0];
  if (!f) return;
  open(await f.text());
});
/* ?fixture=pippa&interval=1 — the page opened at a fixture, for a headless
   look as much as for a hand */
const q = new URLSearchParams(location.search);
if (q.get("fixture") && fixtures[q.get("fixture")!]) fixture.value = q.get("fixture")!;
if (q.get("interval") !== null) interval.value = q.get("interval")!;
open(fixtures[fixture.value]);
/* PHASE 2's PROBE, until the bridge replaces it: does a row written from
   file:// survive a relaunch? `?store=write` writes one row keyed by the
   moment; every load then writes the row count on the root as data-store,
   for a headless dump to read. */
const root = document.documentElement;
const stage = (s: string): void => { root.dataset.probe = (root.dataset.probe || "") + s + ";"; console.log("probe", s); };
stage("start");
const store = idbEntryStore();
const wrote = q.get("store") === "write" ? store.set("probe/" + Date.now(), "probe").then(() => stage("set")) : Promise.resolve();
wrote.then(() => store.all()).then(
  (rows) => { stage("all"); root.dataset.store = String(rows.length); },
  (err) => { stage("fail"); root.dataset.store = "failed: " + err; },
);
