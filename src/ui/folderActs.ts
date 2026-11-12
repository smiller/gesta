import type { Session } from "../session.ts";
import type { EntryLayer } from "../store/entries.ts";
import type { ImageStore } from "../store/store.ts";
import type { Dir } from "../store/fsa.ts";
import type { Notices, Progress } from "./notices.svelte.ts";
import { exportEntries, missingPictures } from "../store/exportEntries.ts";
import { writeFilesTo } from "../store/io.ts";
import { pickImportFiles } from "../store/pick.ts";
import { importFiles, importKeys } from "../store/importFiles.ts";
import { entryDocs, isDoc, failMsg, errText, filePath, type Merged } from "../store/files.ts";
import { counted } from "./counted.ts";

export interface FolderDeps {
  session: Pick<Session, "flushSave" | "focusText" | "lockEntries" | "refresh">;
  layer: Pick<EntryLayer, "cache" | "setEntry" | "writeError">;
  images: ImageStore;
  notices: Pick<Notices, "progress" | "stickErrIdle">;
  say(text: string, ms?: number): void;
  picker(): ((opts?: { mode?: "read" | "readwrite" }) => Promise<Dir>) | undefined;
  warmBlock(): boolean;
  count(): void;
  refreshMasthead(): void;
}
export function folderActs(d: FolderDeps): { exportAll(): void; importFolder(): void } {
  const { session, layer, images, notices, say, picker, warmBlock, count, refreshMasthead } = d;
  /* the manual export: a folder the user picks, filled with the journal as
     it stands. The picker opens FIRST, in the click, and so does the
     progress line; the flush and the walk run alongside. Nothing here
     deletes. A dismissed picker cancels the line silently. */
  /* one export or import at a time: a second one's progress line retired
     the first's, and its report was lost
     (pin: losing nothing › export pressed again while one runs) */
  let longRun: "an export" | "an import" | null = null;
  const stillRunning = (): boolean => { if (longRun) say(longRun + " is still running", 2000); return !!longRun; };
  type ExportTally = { docs: number; missing: number; lostNote: string; lostList: string };
  const lostNoteOf = (missing: number): string => (missing ? " — " + counted(missing, " picture", " pictures") + " missing" : "");
  const lostListOf = (files: Awaited<ReturnType<typeof exportEntries>>): string =>
    files.filter((f) => f.picsMissing).map((f) => filePath(f) + ": " + f.picsMissing + " missing").join("\n");
  const exportTally = (files: Awaited<ReturnType<typeof exportEntries>>): ExportTally => {
    const missing = missingPictures(files);
    return { docs: files.filter(isDoc).length, missing, lostNote: lostNoteOf(missing), lostList: lostListOf(files) };
  };
  const exportClean = (p: Progress, t: ExportTally): void => {
    if (t.missing) p.fail("exported " + t.docs + " entries" + t.lostNote, t.lostList);
    else p.ok("exported " + t.docs + " entries");
  };
  const reportExport = (p: Progress, t: ExportTally, failures: Awaited<ReturnType<typeof writeFilesTo>>): void => {
    if (!failures.length) { exportClean(p, t); return; }
    const lostDocs = failures.filter((x) => x.doc).length;
    console.error("export: " + failures.length + " file(s) failed", failures);
    const msg = "exported " + (t.docs - lostDocs) + " entries; " + failures.length + " file(s) failed" + t.lostNote;
    p.fail(msg, failures.map((x) => x.name + ": " + (errText(x.error) || String(x.error))).join("\n") + (t.lostList ? "\n" + t.lostList : ""));
  };
  const exportFailed = (p: Progress, err: unknown): void => {
    if ((err as Error)?.name === "AbortError") { p.cancel(); return; }
    console.error("export failed", err);
    const msg = (err as { collision?: boolean })?.collision ? "export failed — " + (err as Error).message : failMsg("export failed", err);
    p.fail(msg, msg);
  };
  const exportAll = (): void => {
    /* the keys go back to the text: left on the button, a space pressed it
       again (pin: losing nothing › export pressed again while one runs) */
    session.focusText();
    const pick = picker();
    if (!pick) { say("export needs a browser that can open a folder to write into"); return; }
    if (warmBlock()) return;
    if (stillRunning()) return;
    longRun = "an export";
    const dirPicked = pick({ mode: "readwrite" });
    dirPicked.catch(() => {});
    const p = notices.progress("exporting…");
    session.flushSave().then(() => exportEntries(layer.cache, images)).then((files) => {
      if (!files.length) { p.ok("nothing to export"); return; }
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
       notices and surfaces › an import of refused
       files only) */
    if (!n && refused) { notices.stickErrIdle("nothing to import here — " + refusedNote, null); return false; }
    if (!n) { say("nothing to import"); return false; }
    return confirm((refusedNote ? refusedNote + "\n\n" : "") + "Import " + counted(n, " entry", " entries") +
      " from this folder? Each one overwrites that entry in this journal, and there is no undo.");
  };
  const importTold = (p: Progress, tally: Awaited<ReturnType<typeof importFiles>>): void => {
    const failures = tally.failures.map((x) => x.path + ": " + x.error).join("\n");
    if (tally.full) {
      console.error("import stopped, storage full", tally.failures);
      p.fail("storage full — imported " + tally.imported + " of " + tally.attempted, failures);
    } else if (tally.failed) {
      console.error("import failures", tally.failures);
      p.fail("imported " + tally.imported + ", " + tally.failed + " failed", failures);
    } else p.ok("imported " + tally.imported + " entries");
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
    const msg = failMsg("import failed", err);
    /* two files spelling one entry say which, on screen; any other
       failure names its error there too (pin: notices and surfaces › an
       import of two files for one entry) */
    const merged = (err as Partial<Merged>)?.merged;
    if (p) { console.error("import failed", err); p.fail(msg, msg); }
    else if (merged) notices.stickErrIdle((err as Error).message, null, merged);
    else notices.stickErrIdle(msg, err);
  };
  const importFolder = (): void => {
    session.focusText();
    const pick = picker();
    if (!pick) { say("import needs a folder picker"); return; }
    if (stillRunning()) return;
    longRun = "an import";
    session.flushSave();
    let p: Progress | null = null;
    pick().then(pickImportFiles).then((files) => {
      if (!importAsked(files)) return;
      const progress = notices.progress("importing…");
      p = progress;
      session.lockEntries(importKeys(files));
      return importFiles(files, { setEntry: layer.setEntry, setImage: images.set, writeError: layer.writeError }, progress.step).then((tally) => imported(progress, tally));
    }).catch((err: unknown) => importFailed(p, err)).finally(() => { longRun = null; });
  };
  return { exportAll, importFolder };
}
