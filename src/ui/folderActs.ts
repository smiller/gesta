import type { Session } from "../session.ts";
import type { EntryLayer } from "../store/entries.ts";
import type { ImageStore } from "../store/store.ts";
import type { Dir } from "../store/fsa.ts";
import type { Alerts, Progress } from "./alertLedger.svelte.ts";
import { exportEntries, missingPictures } from "../store/exportEntries.ts";
import { writeFilesTo } from "../store/io.ts";
import { pickImportFiles } from "../store/pick.ts";
import { importFiles, importKeys } from "../store/importFiles.ts";
import { entryDocs, isDoc, failWhy, errText, filePath, type Merged } from "../store/files.ts";
import { counted } from "./counted.ts";
import { said, alertWords } from "../model/alertText.ts";

export interface FolderDeps {
  session: Pick<Session, "save" | "focusText" | "lockEntries" | "refresh">;
  layer: Pick<EntryLayer, "cache" | "setEntry" | "writeError">;
  images: ImageStore;
  alerts: Pick<Alerts, "progress" | "raise">;
  picker(): ((opts?: { mode?: "read" | "readwrite" }) => Promise<Dir>) | undefined;
  warmBlock(): boolean;
  count(): void;
  refreshMasthead(): void;
}
export function folderActs(d: FolderDeps): { exportAll(): void; importFolder(): void } {
  const { session, layer, images, alerts, picker, warmBlock, count, refreshMasthead } = d;
  /* the manual export: a folder the user picks, filled with the journal as
     it stands. The picker opens FIRST, in the click, and so does the
     progress line; the flush and the walk run alongside. Nothing here
     deletes. A dismissed picker cancels the line silently. */
  /* one export or import at a time: a second one's progress line retired
     the first's, and its report was lost
     (pin: losing nothing › export pressed again while one runs) */
  let longRun: "exportRunning" | "importRunning" | null = null;
  const stillRunning = (): boolean => { if (longRun) alerts.raise(longRun); return !!longRun; };
  type ExportTally = { docs: number; missing: number; lostList: string };
  const lostListOf = (files: Awaited<ReturnType<typeof exportEntries>>): string =>
    files.filter((f) => f.picsMissing).map((f) => filePath(f) + ": " + f.picsMissing + " missing").join("\n");
  const exportTally = (files: Awaited<ReturnType<typeof exportEntries>>): ExportTally => {
    const missing = missingPictures(files);
    return { docs: files.filter(isDoc).length, missing, lostList: lostListOf(files) };
  };
  const exportClean = (p: Progress, t: ExportTally): void => {
    if (t.missing) p.fail(said("exportedPicturesMissing", { n: t.docs, missing: t.missing }), t.lostList);
    else p.ok(said("exported", { n: t.docs }));
  };
  const reportExport = (p: Progress, t: ExportTally, failures: Awaited<ReturnType<typeof writeFilesTo>>): void => {
    if (!failures.length) { exportClean(p, t); return; }
    const lostDocs = failures.filter((x) => x.doc).length;
    console.error("export: " + failures.length + " file(s) failed", failures);
    p.fail(said("exportedSomeFailed", { n: t.docs - lostDocs, failed: failures.length, missing: t.missing }), failures.map((x) => x.name + ": " + (errText(x.error) || String(x.error))).join("\n") + (t.lostList ? "\n" + t.lostList : ""));
  };
  const exportFailed = (p: Progress, err: unknown): void => {
    if ((err as Error)?.name === "AbortError") { p.cancel(); return; }
    console.error("export failed", err);
    const s = said("exportFailed", { why: (err as { collision?: boolean })?.collision ? (err as Error).message : failWhy(err) });
    p.fail(s, alertWords(s));
  };
  const exportAll = (): void => {
    /* the keys go back to the text: left on the button, a space pressed it
       again (pin: losing nothing › export pressed again while one runs) */
    session.focusText();
    const pick = picker();
    if (!pick) { alerts.raise("exportNeedsPicker"); return; }
    if (warmBlock()) return;
    if (stillRunning()) return;
    longRun = "exportRunning";
    const dirPicked = pick({ mode: "readwrite" });
    dirPicked.catch(() => {});
    const p = alerts.progress("exporting");
    session.save.flush().then(() => exportEntries(layer.cache, images)).then((files) => {
      if (!files.length) { p.ok(said("nothingToExport")); return; }
      const tally = exportTally(files);
      return dirPicked.then((dir) => writeFilesTo(dir, files, p.step)).then((failures) => reportExport(p, tally, failures));
    }).catch((err: unknown) => exportFailed(p, err)).finally(() => { longRun = null; });
  };
  /* the picker opens synchronously in the click, then: names, the refusal,
     the read, the count-then-confirm gate, the progress line, the
     sequential import, the tally. The import NEVER clears — it overwrites
     entry by entry and deletes nothing, so a subset folder lands only its
     own entries. */
  const importAsked = (files: Awaited<ReturnType<typeof pickImportFiles>>): boolean => {
    const n = entryDocs(files).length;
    const refused = files.filter(isDoc).length - n;
    const refusedNote = refused ? counted(refused, " .md file", " .md files") + " will NOT be imported." : "";
    /* a folder whose every page is refused says so until clicked (pin:
       alerts and surfaces › an import of refused
       files only) */
    if (!n && refused) { alerts.raise("nothingToImportHere", { refused }, { caught: null }); return false; }
    if (!n) { alerts.raise("nothingToImport"); return false; }
    return confirm((refusedNote ? refusedNote + "\n\n" : "") + "Import " + counted(n, " entry", " entries") +
      " from this folder? Each one overwrites that entry in this journal, and there is no undo.");
  };
  const importTold = (p: Progress, tally: Awaited<ReturnType<typeof importFiles>>): void => {
    const failures = tally.failures.map((x) => x.path + ": " + x.error).join("\n");
    if (tally.full) {
      console.error("import stopped, storage full", tally.failures);
      p.fail(said("importStorageFull", { imported: tally.imported, attempted: tally.attempted }), failures);
    } else if (tally.failed) {
      console.error("import failures", tally.failures);
      p.fail(said("importSomeFailed", { imported: tally.imported, failed: tally.failed }), failures);
    } else p.ok(said("imported", { n: tally.imported }));
  };
  const imported = (p: Progress, tally: Awaited<ReturnType<typeof importFiles>>): Promise<void> => {
    session.lockEntries(null);
    count();
    importTold(p, tally);
    /* the open entry may have been overwritten */
    /* a locked entry let its focus go: given back where nothing holds it
       (pin: losing nothing › typed into an entry an import overwrites) */
    return session.refresh().then(() => { refreshMasthead(); if (document.activeElement === document.body) session.focusText(); });   /* the key list moved under the tag bar */
  };
  const importFailed = (p: Progress | null, err: unknown): void => {
    session.lockEntries(null);
    if ((err as Error)?.name === "AbortError") { p?.cancel(); return; }   /* the picker dismissed */
    const s = said("importFailed", { why: failWhy(err) });
    /* two files spelling one entry say which, on screen; any other
       failure names its error there too (pin: alerts and surfaces › an
       import of two files for one entry) */
    const merged = (err as Partial<Merged>)?.merged;
    if (p) { console.error("import failed", err); p.fail(s, alertWords(s)); }
    else if (merged) alerts.raise((err as Merged).said, { caught: null, copy: merged });
    else alerts.raise(s, { caught: err });
  };
  const importFolder = (): void => {
    session.focusText();
    const pick = picker();
    if (!pick) { alerts.raise("importNeedsPicker"); return; }
    if (stillRunning()) return;
    longRun = "importRunning";
    session.save.flush();
    let p: Progress | null = null;
    pick().then(pickImportFiles).then((files) => {
      if (!importAsked(files)) return;
      const progress = alerts.progress("importing");
      p = progress;
      session.lockEntries(importKeys(files));
      return importFiles(files, { setEntry: layer.setEntry, setImage: images.set, writeError: layer.writeError }, progress.step).then((tally) => imported(progress, tally));
    }).catch((err: unknown) => importFailed(p, err)).finally(() => { longRun = null; });
  };
  return { exportAll, importFolder };
}
