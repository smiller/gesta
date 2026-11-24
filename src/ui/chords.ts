export type ChordAct =
  | "previous" | "next" | "round" | "search" | "lines" | "gotoToolbar" | "today" | "create"
  | "bookmarks" | "wordCount" | "shortcuts" | "reference" | "entryLink" | "view" | "replace" | "help";
/* `act` "editor": swallowed by the page and acted on by nothing here */
export interface Chord { key: string; label: string; help: string; act: ChordAct | "editor"; inReader: boolean }

const chord = (key: string, act: Chord["act"], help: string, inReader = true): Chord => ({ key, label: "⌃⌘" + (key === "enter" ? "Enter" : key.toUpperCase()), help, act, inReader });
/* ⌃⌘N is "new": a tagged entry, a sub-entry, a book; ⌃⌘L toggles the Line
   numbering row — L for lines, every masthead row having a chord here
   since Tab indents in the text; ⌃⌘R is the reference, so replace is ⌃⌘E,
   for exchange; the menus share ⌃⌘J with the Go to row, B being
   bookmarks. Each chord here is one Helium lets through
   (pin: walk › ⌃⌘. from 3pr1 over an index of 3pr1, 3m1, 3pr2)
   (pin: source view › ⌃⌘W rendered)
   (pin: launch, menus, the corner, links › ⌃⌘Enter inside a link) */
export const CHORDS: readonly Chord[] = [
  chord(",", "previous", "go to the previous entry"),
  chord(".", "next", "go to the next entry"),
  chord("j", "round", "go to entry — the bookshelf menu; again, the commonplace menu; a third time, the masthead’s “Go to” row"),
  chord("k", "search", "search — open the masthead’s “Search” row"),
  chord("l", "lines", "line numbering — open the masthead’s “Line numbering” row (on an entry with verse)"),
  chord("i", "editor", "add ⟨line⟩ so the line counts as a numbered line and not a stage direction"),
  chord("g", "gotoToolbar", "go to a line, or a page number (on an entry with a gutter)"),
  chord("t", "today", "go to today’s entry"),
  chord("n", "create", "new — a tagged entry for the day, a sub-entry of the commonplace, a book under the author", false),
  chord("b", "bookmarks", "bookmarks — open a panel with links to the entries you have bookmarked", false),
  chord("w", "wordCount", "word count — of the selection, or the whole entry"),
  chord("s", "shortcuts", "insert a custom shortcut", false),
  chord("r", "reference", "copy a reference to the selected passage"),
  chord("c", "entryLink", "copy a link to this entry"),
  chord("enter", "editor", "follow the link your cursor is on"),
  chord("m", "view", "switch between rendered text and markdown source"),
  chord("e", "replace", "find and replace in this entry’s markdown", false),
  chord("h", "help", "help — open this panel", false),
];
const BY_KEY = new Map(CHORDS.map((c) => [c.key, c]));
/* a letter is matched in either case: Caps Lock leaves the chord a chord
   (pin: alerts and surfaces › ⌃⌘K with Caps Lock) */
export function chordAct(key: string, reader: boolean): Chord["act"] | null {
  const c = BY_KEY.get(key.toLowerCase());
  if (!c) return null;
  return reader && !c.inReader ? null : c.act;
}
