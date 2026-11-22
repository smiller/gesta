export type Kind = "error" | "warning" | "info" | "success";
type Words = string | ((p: never) => string);
interface Entry<W extends Words = Words> { kind: Kind; words: W; when: string; ms?: number }
/* `ms`: how long an info or a success stays, for one with a time of its own */
const entry = <W extends Words>(kind: Kind, words: W, when: string, ms?: number): Entry<W> =>
  (ms === undefined ? { kind, words, when } : { kind, words, when, ms });
const error = <W extends Words>(words: W, when: string): Entry<W> => entry("error", words, when);
const warning = <W extends Words>(words: W, when: string): Entry<W> => entry("warning", words, when);
const info = <W extends Words>(words: W, when: string, ms?: number): Entry<W> => entry("info", words, when, ms);
const success = <W extends Words>(words: W, when: string, ms?: number): Entry<W> => entry("success", words, when, ms);

const count = (n: number, one: string, many: string): string => n + (n === 1 ? one : many);
export interface FenceRefusal { line: string; reason: string }
const refusedText = (r: FenceRefusal[]): string => {
  const lines = r.map((x) => x.line + " — " + x.reason);
  return r.length === 1 ? lines[0] + ", so it stayed a paragraph" : lines.join("\n") + "\n" + r.length + " fences stayed paragraphs";
};
const missing = (n: number): string => (n ? " — " + count(n, " picture", " pictures") + " missing" : "");

export interface MoveOutcome { moved: number; updated: number; left: string[]; stayed?: string[]; lost?: number; twins?: number }
type Mode = "move" | "rename" | "refile";
const COULDNT: Record<Mode, string> = { move: "couldn’t move", rename: "couldn’t rename", refile: "couldn’t re-file" };
const entriesText = (n: number): string => count(n, " entry", " entries");
const lostText = (lost: number): string => (lost ? ", " + count(lost, " picture", " pictures") + " not found" : "");
function leftText(left: string[]): string {
  if (left.length === 1) return "; 1 link not updated: " + left[0];
  return left.length ? "; links not updated in " + left.length + " entries: " + left.join(", ") : "";
}
function outcome(text: string, o: MoveOutcome): string {
  const stayed = o.stayed ?? [];
  const updated = o.updated ? ", links updated in " + count(o.updated, " other", " others") : "";
  const kept = stayed.length ? "; old " + (stayed.length === 1 ? "copy" : "copies") + " kept: " + stayed.join(", ") : "";
  return text + updated + leftText(o.left) + kept;
}
const moved = (p: { to: string; verb: "moved" | "renamed"; o: MoveOutcome }): string =>
  outcome(p.verb + " to " + p.to + " — " + entriesText(p.o.moved) + (p.o.twins ? ", " + p.o.twins + " there already deleted" : "") + lostText(p.o.lost ?? 0), p.o);
const refiled = (p: { root: string; o: MoveOutcome }): string =>
  outcome("filed under " + p.root + " — " + entriesText(p.o.moved) + " moved" + lostText(p.o.lost ?? 0), p.o);

/* words that stand inside alerts, never alone */
export const PHRASES = {
  noUnit: (p: { unit: string; n: number | string }) => "no " + p.unit + " " + p.n,
  noUnitLast: (p: { unit: string; n: number | string; last: number | string }) => "no " + p.unit + " " + p.n + ", the last " + p.unit + " is " + p.last,
  noUnitLongest: (p: { unit: string; n: number | string; form: string; ends: boolean; last: number | string }) => "no " + p.unit + " " + p.n + " — the longest " + p.form + (p.ends ? " ends at " : " has ") + p.last,
  noUnitHere: (p: { unit: string; n: number | string }) => "no " + p.unit + " " + p.n + " here",
  noNumbered: (p: { unit: string }) => "no numbered " + p.unit + "s here",
  onlyUnit: (p: { unit: string; last: number | string }) => "the only " + p.unit + " here is " + p.last,
  unitsRange: (p: { unit: string; first: number | string; last: number | string }) => "the " + p.unit + "s here are " + p.first + "–" + p.last,
  noNumberedParagraphs: () => "no numbered paragraphs here",
  noParagraph: (p: { n: number; low: number; high: number }) => "no paragraph " + p.n + " — the paragraphs here are " + p.low + "–" + p.high,
  omitted: (p: { unit: string; n: number | string }) => p.unit + " " + p.n + " is omitted in this edition",
  ofBlocks: (p: { form: string; nth: number; of: number }) => " — " + p.form + " " + p.nth + " of " + p.of,
  unitAt: (p: { unit: string; n: number | string }) => p.unit + " " + p.n,
  noPageNumbers: () => "no page numbers here",
  noPage: (p: { page: string }) => "no page " + p.page + " here",
  typeNumber: (p: { noun: string }) => "type a " + p.noun + " number",
  romanOrArabic: () => "use roman or arabic characters, not both",
  notANumber: (p: { typed: string; noun: string }) => p.typed + " is not a " + p.noun + " number",
  noStanzas: () => "no stanzas here",
  noStanza: (p: { s: number; last: number }) => "no stanza " + p.s + " here — the last is " + p.last,
  noLineInStanza: (p: { l: number | undefined; s: number; count: number }) => "no line " + p.l + " in stanza " + p.s + " — it has " + count(p.count, " line", " lines"),
  typeStanzaFor: (p: { line: string }) => "type a stanza for line " + p.line,
  typeStanza: () => "type a stanza number",
  typeStanzaOrLine: () => "type a stanza, or stanza.line",
  notStanzaOrLine: (p: { typed: string }) => p.typed + " is not a stanza or stanza.line, like 2.1",
  nothingNumbered: (p: { what: string }) => "no " + p.what + " numbers here",
  switchToGo: (p: { what: string }) => "Switch to the rendered view to go to " + p.what,
  noNumberedTaken: (p: { word: string }) => p.word + " takes no numbered: the word is verse’s and prose’s",
  numberedAfter: (p: { kind: string; numbers: string }) => "numbered goes after the number, like ::: " + p.kind + " " + p.numbers + " numbered",
  oneNumberOnly: (p: { kind: string }) => p.kind + " takes one number; a second, for the right column, is verse’s alone",
  notRightStart: (p: { n: string }) => p.n + " is not a starting line for the right column",
  twoNumbersAtMost: () => "verse takes two numbers at most: its first line, and its right column’s",
  notStarting: (p: { n: string; unit: string }) => p.n + " is not a starting " + p.unit,
  stanzaNeedsNumber: () => "stanza needs its number, like ::: stanza 2",
  takesNothing: (p: { word: string }) => p.word + " takes nothing after it",
  notACount: (p: { n: string }) => p.n + " is not a count",
  cardNeedsColour: () => "card blocks must include a colour, like card-light-green",
  unknownBlock: () => "not a block Gesta knows",
  notADirective: (p: { line: string }) => "“" + p.line + "” is not a reference directive",
  readOnAuthorPage: (p: { line: string }) => "“" + p.line + "” is read on an author’s page",
  readOnWorkPage: (p: { line: string }) => "“" + p.line + "” is read on a work’s page",
  readOnAnyPage: (p: { line: string }) => "“" + p.line + "” is read on any page",
  filenameClash: (p: { name: string; keys: string[] }) => "two entries would write one file — " + p.name + " is claimed by " + p.keys.join(" and ") + ". Rename one of them.",
};

export const ALERTS = {
  notSaved: error("not saved", "A save of an entry did not reach storage. It stays until every entry owed lands; a click copies the error."),
  notSavedChangedElsewhere: error("not saved — changed in another tab, copy your text then reload", "Another tab saved the entry first, so this tab’s typing was refused. A click copies the text this tab was holding."),
  notSavedDeletedElsewhere: error("not saved — deleted in another tab, copy your text", "Typing into an entry another tab deleted. A click copies what was typed."),
  notDeletedChangedElsewhere: error("not deleted — changed in another tab, reload", "A delete refused because another tab saved the entry since."),
  couldntDelete: error("couldn’t delete — reload", "A delete failed for a reason other than another tab."),
  deletedElsewhere: error("deleted in another tab", "The entry on screen was deleted in another tab, with nothing unsaved."),
  couldntLoad: error("couldn’t load entries — reload", "The journal has not loaded eight seconds after launch. Resolved when it does."),
  storeUnreadable: error("the store could not be read — reload", "The browser’s storage could not be read at launch; a click copies the error."),
  pictureNotSavedFull: error("picture not saved — storage full", "A pasted picture could not be stored: the browser’s storage is full."),
  pictureNotSaved: error("picture not saved", "A pasted picture could not be stored, for another reason; a click copies the error."),
  pictureNowhere: error("the picture had nowhere to land — paste it again", "Another entry or the other view was opened while a pasted picture was being read."),
  pictureUnreadable: error("that picture couldn’t be read — try copying it as a PNG", "A pasted picture’s data could not be decoded."),
  lineNumbersNotSaved: error("line numbers not saved — storage full", "The choice in the Line numbering row (⌃⌘L opens it) could not be kept."),
  shortcutsNotSaved: error("shortcuts not saved — storage full", "Save in the shortcuts panel could not write. Resolved by the next save that works."),
  bookmarksNotSaved: error("bookmarks not saved", "A bookmark change could not be written: storage full, or the list kept is damaged. Resolved by the next write that lands."),
  copyButtonFailed: error("Copy failed", "The copy button over a block: the block went, or the clipboard refused."),
  copyFailed: error("copy failed — see console", "A click on an alert whose words the clipboard refused. A click on it only closes it."),
  picturesUnreadable: error("couldn’t read the pictures", "The backups panel’s sweep of unused pictures could not read the pictures stored."),
  bundleNotWritten: error("backed up, but gesta.zip for the reader couldn’t be written", "A backup ran, but the reader’s bundle could not be written."),
  couldntRenameTag: error("couldn’t rename — nothing was moved", "Renaming a tagged entry failed; it is left as it was."),
  exportFailed: error((p: { why: string }) => "export failed — " + p.why, "An export that failed outright; a click copies the error."),
  importFailed: error((p: { why: string }) => "import failed — " + p.why, "An import that failed outright; a click copies the error."),
  couldntSetUpBackups: error((p: { why: string }) => "couldn’t set up backups — " + p.why, "Choosing the backup folder failed."),
  couldntBuildIndex: error((p: { why: string }) => "couldn’t build the search index — " + p.why, "Search’s index could not be built."),
  couldntKeepBackup: error((p: { why: string }) => "couldn’t keep the backup — " + p.why, "The reader: a backup picked could not be kept in this browser."),
  couldntReadBackup: error((p: { why: string }) => "couldn’t read the backup — " + p.why, "The reader: the backup kept could not be read."),
  exportedPicturesMissing: error((p: { n: number; missing: number }) => "exported " + p.n + " entries" + missing(p.missing), "An export wrote every entry, but pictures were missing; a click copies which."),
  exportedSomeFailed: error((p: { n: number; failed: number; missing: number }) => "exported " + p.n + " entries; " + p.failed + " file(s) failed" + missing(p.missing), "An export in which some files failed; a click copies the files and errors."),
  nothingToImportHere: error((p: { refused: number }) => "nothing to import here — " + count(p.refused, " .md file", " .md files") + " will NOT be imported.", "Every file picked for import was refused."),
  importStorageFull: error((p: { imported: number; attempted: number }) => "storage full — imported " + p.imported + " of " + p.attempted, "An import stopped when storage filled."),
  importSomeFailed: error((p: { imported: number; failed: number }) => "imported " + p.imported + ", " + p.failed + " failed", "An import in which some files failed; a click copies which."),
  twoFilesOneEntry: error((p: { first: string; second: string }) => "two files here are the same entry (" + p.first + " and " + p.second + ") — remove one and import again", "An import with two files spelling one entry; a click copies the second."),
  referenceNotCopied: error("Couldn’t copy the reference", "⌃⌘R the clipboard refused. A click copies the reference; the next copy that lands resolves it."),
  linkNotCopied: error("Couldn’t copy the link", "A link copy the clipboard refused. A click copies the link; the next copy that lands resolves it."),
  cannotRender: error((p: { key: string; why: string }) => "cannot render " + p.key + " — " + p.why + "; shown as source", "An entry the editor cannot draw (a grid holding a stray line, say): its key and why. It opens in the markdown view, and goes once it parses on the switch back."),
  toldOnOpen: error((p: { refused: FenceRefusal[]; trouble: string[] }) => [...(p.refused.length ? [refusedText(p.refused)] : []), ...p.trouble].join("\n"), "An entry opened, or switched back to from the markdown view, with fences Gesta does not know or reference directives it cannot read: one line each. An error, so the block’s form can still be copied after ten seconds."),
  moveRefused: error((p: { mode: Mode; why: string }) => COULDNT[p.mode] + " — " + p.why, "A move, rename or re-file refused once under way, or failed: why. The old entry is opened again."),
  moveCopiesLeft: error((p: { mode: Mode; left: string[] }) => COULDNT[p.mode] + " — copies left: " + p.left.join(", "), "A move whose copies failed and could not all be taken back: the copies left."),
  moveNothingMoved: error((p: { mode: Mode }) => COULDNT[p.mode] + " — nothing was moved", "A move whose copies failed and were all taken back."),
  movedPartly: error(moved, "A move or rename that landed but left links not updated or old copies standing."),
  refiledPartly: error(refiled, "A re-file that landed but left links not updated or old copies standing."),
  backupLeftovers: error((p: { n: number }) => "backup couldn’t remove " + p.n + " old file(s)", "A backup ran, but old files in its folder would not go; a click copies their names."),
  backupBlocked: error((p: { why: string }) => "backup blocked — " + p.why, "Two entries share a filename in the backup folder; the paused pill shows too."),
  noBackupKept: error("open backup: gesta.zip in Dropbox › gesta-backups › reader", "The reader opened with no backup kept in it."),

  refSelect: warning("Select a passage to reference first", "⌃⌘R with nothing selected."),
  refCode: warning("A code block can’t be referenced", "⌃⌘R in a code block."),
  refMarginNote: warning("A margin-note can’t be referenced — select the text beside it", "⌃⌘R in a margin-note."),
  refTwoBlocks: warning("That spans two verse blocks — reference them one at a time", "⌃⌘R over two verse blocks that are not one run."),
  refNumberedApart: warning("Those verse blocks aren’t numbered straight on — reference them one at a time", "⌃⌘R over verse blocks numbered apart."),
  refNoTranslation: warning("No translation lines selected — Ref (all) quotes the Latin too", "Ref over a dual-language block with no English selected."),
  alreadyHere: warning("already here", "A link or a go-to row to the entry already open."),
  alreadyOn: warning((p: { label: string }) => "already on " + p.label, "A bookmark’s link, or a contents link to an author or a book, pressed on the entry it goes to."),
  alreadyOnToday: warning("already on today", "⌃⌘T on today’s entry."),
  noSuch: warning((p: { noun: string }) => "no such " + p.noun, "An address naming an entry that does not exist: “no such book”, “no such commonplace”, or a sub-entry’s noun."),
  fencesPasted: warning((p: { refused: FenceRefusal[] }) => refusedText(p.refused), "A paste holding fences Gesta does not know: one line each, with why."),
  noSpacesToRemove: warning("no spaces to remove", "Shift+Tab in a code block or the markdown view over lines with no spaces to remove."),
  nothingToIndent: warning("nothing to indent — those lines are empty", "Tab in a code block or the markdown view over empty lines."),
  listFirstItem: warning("can’t indent the first item in a list", "Tab on a list’s first item."),
  listTooDeep: warning("can’t indent an item more than one deeper than its parent", "Tab on an item already one deeper than the one above."),
  outerLevel: warning("at the outer level: switch to markdown (⌃⌘M) to remove", "Shift+Tab at a list’s or a quote’s outer level."),
  gridJoin: warning("a grid’s cards are joined in the source view (⌃⌘M)", "Backspace at a card’s start or Delete at its end."),
  referenceHere: warning("Reference style is edited in the markdown view (⌃⌘M)", "A click on a reference in the rendered view."),
  noCodeBlockHere: warning("can’t make a code block from that", "The code button over a picture or a page label."),
  moveUnderItself: warning("an entry can’t move under itself", "A move or rename into a place under the entry itself."),
  nothingToMoveUnder: warning((p: { at: string }) => "nothing at " + p.at + " to move it under", "A move or rename under an entry that does not exist."),
  thereAlreadyWithSubs: warning((p: { name: string }) => "“" + p.name + "” is there already and has sub-entries of its own", "A move into an entry holding a sub-entry of the same title that has its own."),
  thereAlready: warning((p: { at: string }) => p.at + " is there already", "A move onto an entry that already exists."),
  shelvesKeep: warning("the shelves keep their name", "Renaming the Shelves entry."),
  shelvesEmpty: warning("the shelves hold no books", "A book made, or a tag placed, on the Shelves entry."),
  shelvesTaken: warning((p: { name: string }) => "“" + p.name + "” is the shelves’ own name", "An author named, filed or moved to the Shelves entry’s name."),
  nameFromLink: warning("that link’s title can’t be a name — type one instead", "A new entry named from a link whose title gives no name."),
  nameEmpty: warning("that name leaves nothing a filename can keep", "A name typed that leaves no letters a filename keeps."),
  addressEmptyPart: warning("an address can’t have an empty part", "A rename typed as an address with an empty part."),
  deleteSubsFirst: warning((p: { plural: string }) => "delete the " + p.plural + " first", "Deleting an entry whose sub-entries hold text."),
  taggedHostsNothing: warning("a tagged entry holds no entries of its own", "⌃⌘N on a day’s tagged entry."),
  noLinkInCode: warning("no link inside a code block", "A link placed with the cursor in code."),
  noLinkInLink: warning("no link inside a link", "A link placed with the cursor in a link."),
  noLinkInHeading: warning("no link inside a heading — place your cursor below it", "A new entry’s link placed with the cursor in, or a selection cutting into, a heading."),
  keyShape: warning("a letter b to z, then letters or digits — a adds, a leading digit jumps", "A bookmark key given in a shape keys do not take."),
  keyTaken: warning((p: { key: string; label: string }) => "“" + p.key + "” already goes to " + p.label, "A bookmark key given that another bookmark has."),
  proseTab: warning("⌃⌘M toggles markdown", "Tab in prose with nothing selected, or in an empty quote."),
  tabOneBlock: warning("Tab indents one list, quote, or code block at a time", "Tab with text selected in prose, or over a selection that spills out of a quote."),
  noLineNumbers: warning("no line numbers here", "⌃⌘L on an entry with no numbered lines."),
  noEarlier: warning("no earlier entry", "⌃⌘, at the first entry."),
  noLater: warning("no later entry", "⌃⌘. at the last entry."),
  stillLoading: warning("still loading — try that again in a moment", "An act tried before the journal is read, or ⌃⌘R before the entry is drawn."),
  loadFailedFirst: warning("couldn’t load entries — reload first", "An act tried once the journal’s read has failed."),
  referenceInSource: warning("switch to the rendered view (⌃⌘M) to copy a reference", "⌃⌘R in the markdown view."),
  noMarkdownView: warning("no markdown view here", "⌃⌘M in the reader."),
  pictureOneAtATime: warning("picture not pasted — one at a time; paste it again", "A picture pasted while the last one is still being read."),
  placeCursor: warning("place your cursor in the entry", "A shortcut, or a bookmark’s link, chosen with no cursor in the entry."),
  noShortcut: warning("no shortcut to insert", "Enter in the shortcuts panel with no row matching."),
  alreadyBookmarked: warning("already bookmarked", "A in the bookmarks panel on an entry already there."),
  bookmarksFull: warning("bookmarks full — delete one, or give one its own key", "A with nine numbered bookmarks."),
  nothingToBookmark: warning("nothing to bookmark here yet", "A on an entry not yet saved anywhere."),
  lineBar: warning((p: { text: string }) => p.text, "⌃⌘G with a number mistyped or not in the entry, on an entry with nothing numbered, or in the markdown view; its words are the line bar’s phrases."),
  finishKey: warning("finish the key", "Enter on a bookmark key typed part-way that more than one key starts with."),
  noBookmark: warning((p: { n: string }) => "no bookmark " + p.n, "A number typed in the bookmarks panel with no row, or a key typed that no bookmark has."),
  nothingToCopy: warning("Nothing to copy", "The copy button over a block that has gone."),
  nothingToChange: warning("nothing to change there", "A toolbar button that would change nothing."),
  exportRunning: warning("an export is still running", "Export or import pressed while an export runs."),
  importRunning: warning("an import is still running", "Export or import pressed while an import runs."),
  exportNeedsPicker: warning("export needs a browser that can open a folder to write into", "Export in a browser without a folder picker."),
  importNeedsPicker: warning("import needs a folder picker", "Import in a browser without a folder picker."),
  nothingToImport: warning("nothing to import", "An import folder with no files to import."),
  backupsNeedChromium: warning("automatic backups need a Chromium browser", "Setting up backups in a browser without a folder picker."),
  entryNotCreated: warning("couldn’t create the entry — see the error above", "A new entry made from a selection did not land."),
  linkNotPlaced: warning("the entry was made — the link was not placed", "A new entry made from a selection landed, but the entry or view on screen changed before its link could be placed."),
  textMoved: warning("the text moved while the entry was made — the link was not placed", "A new entry made from a selection landed, but the selected text changed meanwhile."),

  oneWord: info("1 word", "Word count: from the Words button or ⌃⌘W: one word, in the selection or the entry.", 2000),
  words: info((p: { n: number }) => p.n + " words", "Word count: from the Words button or ⌃⌘W: the selection’s, or the entry’s with nothing selected.", 2000),
  lineBarLanding: info((p: { text: string }) => p.text, "⌃⌘G landing on a number found in more than one block, or on a line the edition omits; its words are the line bar’s phrases.", 2500),
  entriesStored: info((p: { n: number }) => p.n + " entries stored", "The journal read at launch."),
  toReplace: info("Source view, to replace", "⌃⌘E in the rendered view, switching to the markdown view.", 3000),
  indexing: info("indexing…", "Search before its index is built."),
  exporting: info("exporting…", "An export running."),
  importing: info("importing…", "An import running."),
  backingUp: info("backing up…", "A backup starting."),
  backingUpCount: info((p: { done: number; total: number }) => "backing up… " + p.done + " / " + p.total, "A backup running: files written of all."),
  keepingBackup: info("keeping the backup…", "The reader keeping a backup picked."),
  openingBackup: info("opening the backup…", "The reader opening the backup kept."),

  saved: success("saved", "An entry’s save landed.", 1400),
  copied: success("copied", "A click on an alert copied its words.", 1200),
  referenceCopied: success("Reference copied to clipboard", "⌃⌘R copied a reference."),
  linkCopied: success("Link copied", "A link to the entry copied."),
  movedDone: success(moved, "A move or rename that landed whole."),
  refiledDone: success(refiled, "A re-file that landed whole."),
  picturesRemoved: success((p: { n: number }) => "removed " + count(p.n, " unused picture", " unused pictures"), "The backups panel’s sweep removed every unused picture.", 3000),
  picturesPartlyRemoved: success((p: { removed: number; n: number }) => "removed " + p.removed + " of " + p.n + " unused pictures — the rest would not go", "The backups panel’s sweep removed some unused pictures; the rest would not go.", 3000),
  shortcutsSaved: success("shortcuts saved", "Save in the shortcuts panel.", 2000),
  backedUp: success("backed up", "A backup ran with nothing left over."),
  nothingToExport: success("nothing to export", "An export with no entries."),
  exported: success((p: { n: number }) => "exported " + p.n + " entries", "An export wrote every entry and picture."),
  imported: success((p: { n: number }) => "imported " + p.n + " entries", "An import with nothing failed."),
  indexed: success((p: { n: number }) => "indexed " + p.n + " entries", "Search’s index built.", 1400),
  bundleOpened: success((p: { n: number }) => p.n + " entries", "The reader: the backup opened, its entries counted."),
};

export type AlertId = keyof typeof ALERTS;
export type ParamsOf<I extends AlertId> = (typeof ALERTS)[I]["words"] extends (p: infer P) => string ? P : never;
type Bare<I extends AlertId> = [ParamsOf<I>] extends [never] ? true : false;
/* an alert chosen by one module for another to raise: its id, and its parameters where it has any */
export type Said = { [I in AlertId]: Bare<I> extends true ? { id: I } : { id: I; p: ParamsOf<I> } }[AlertId];
export type ParamsArg<I extends AlertId> = Bare<I> extends true ? [] : [p: ParamsOf<I>];
export function said<I extends AlertId>(id: I, ...p: ParamsArg<I>): Said {
  return (p.length ? { id, p: p[0] } : { id }) as Said;
}
export function alertWords(s: Said): string {
  const words = ALERTS[s.id].words as Words;
  return typeof words === "string" ? words : (words as (p: unknown) => string)("p" in s ? s.p : undefined);
}
/* a raise's arguments as one Said: the parameters follow the id only where its words take any */
export function asSaid(a: AlertId | Said, b?: unknown, c?: unknown): [Said, RaiseOpts] {
  if (typeof a !== "string") return [a, (b ?? {}) as RaiseOpts];
  if (typeof ALERTS[a].words === "function") return [{ id: a, p: b } as Said, (c ?? {}) as RaiseOpts];
  return [{ id: a } as Said, (b ?? {}) as RaiseOpts];
}
export const alertKind = (id: AlertId): Kind => ALERTS[id].kind;
export const alertMs = (id: AlertId): number | undefined => (ALERTS[id] as Entry).ms;

/* what comes with an error: the exception caught, and the text a click on it
   copies */
export interface RaiseOpts { caught?: unknown; copy?: string }
/* raise by id, its parameters after it where it has any, or a Said a module chose */
export interface Raise {
  <I extends AlertId>(id: I, ...rest: [...ParamsArg<I>, RaiseOpts?]): number;
  (s: Said, opts?: RaiseOpts): number;
}
