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
import { idbEntryStore, idbImageStore } from "./store/store.ts";
import { entryLayer } from "./store/entries.ts";
import { pickImportFiles, type DirHandle } from "./store/pick.ts";
import { importFiles } from "./store/importFiles.ts";
import { entryDocs, isDoc, failMsg } from "./store/files.ts";
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
/* PHASE 2's STORAGE, ahead of the chrome: the entry layer over Dexie, the
   import of an export folder, and a clear — each reporting into the bar's
   status span, the notices into the console. The root carries `data-store`
   (the entry count) and `data-probe` (the stages reached) for a headless
   run to read; `?store=write` writes one probe row. */
const status = document.getElementById("status") as HTMLElement;
const root = document.documentElement;
const stage = (s: string): void => { root.dataset.probe = (root.dataset.probe || "") + s + ";"; };
const say = (text: string): void => { status.textContent = text; };
const layer = entryLayer(idbEntryStore(), {
  landed: () => {},
  removed: () => {},
  stuck: (text, err, ekey, rescue) => { console.error(text, ekey, err, rescue); say(text + " (" + ekey + ")"); },
  stuckIdle: (text, err) => { console.error(text, err); say(text); },
});
const images = idbImageStore();
const count = (): void => { root.dataset.store = String(Object.keys(layer.cache).length); };
stage("start");
const wrote = q.get("store") === "write" ? layer.setEntry("probe/" + Date.now(), "probe").then(() => stage("set")) : Promise.resolve();
wrote.then(() => layer.warm()).then(() => {
  if (layer.storeReadFailed) { stage("fail"); root.dataset.store = "failed: " + layer.storeReadError; say("the store could not be read — reload"); return; }
  stage("all"); count();
  say(Object.keys(layer.cache).length + " entries stored");
});
/* the picker opens synchronously in the click, then: names, the refusal,
   the read, the count-then-confirm gate, the sequential import, the tally.
   A refused .md is one whose name and path spell no entry — a README, a
   pick aimed one folder too low — counted and named in the consent. */
const win = window as unknown as { showDirectoryPicker?: () => Promise<DirHandle> };
document.getElementById("import")!.addEventListener("click", () => {
  if (!win.showDirectoryPicker) { say("import needs a folder picker"); return; }
  win.showDirectoryPicker().then(pickImportFiles).then((files) => {
    const docs = entryDocs(files);
    const n = docs.length;
    const refused = files.filter(isDoc).length - n;
    const refusedNote = refused ? refused + " .md file" + (refused === 1 ? "" : "s") + " will NOT be imported." : "";
    if (!n) { say(refused ? "nothing to import here — " + refusedNote : "nothing to import"); return; }
    const entries = n + (n === 1 ? " entry" : " entries");
    if (!confirm((refusedNote ? refusedNote + "\n\n" : "") + "Import " + entries +
        " from this folder? Each one overwrites that entry in this journal, and there is no undo.")) return;
    say("importing…");
    return importFiles(files, { setEntry: layer.setEntry, setImage: images.set },
      (done, total) => say("importing… " + done + " / " + total)).then((tally) => {
      count();
      let msg = "imported " + tally.imported;
      if (tally.failed) { msg += ", " + tally.failed + " failed"; console.error("import failures", tally.failures); }
      else msg += " entries";
      say(msg);
    });
  }).catch((err: unknown) => {
    if ((err as Error)?.name === "AbortError") return;   /* the picker dismissed */
    console.error("import failed", err);
    say(failMsg("import failed", err));
  });
});
/* its own gesture, never the import's: an import overwrites entry by entry
   and deletes nothing, so a subset folder lands only its own entries */
document.getElementById("clear")!.addEventListener("click", () => {
  const n = Object.keys(layer.cache).length;
  if (!confirm("Delete all " + n + " stored entries and every picture? There is no undo.")) return;
  Promise.all([layer.clear(), images.clear()]).then(() => { count(); say("cleared"); },
    (err: unknown) => { console.error("clear failed", err); say(failMsg("clear failed", err)); });
});
