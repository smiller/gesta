/* node one-offs/miltonCapsRun.ts — the capitals of the Milton pages made from
   the Harvard Classics matched to the bookshelf's Paradise Lost: the pages
   read from the backup as they stand now (their own edits kept), Arcades and
   Comus from their import folder; the changed pages written under OUT
   (default ~/Desktop/gesta-imports/gesta-milton-caps) for an import, Arcades
   and Comus rewritten in their own folder, a review page beside it */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { usage, recasings, applied, type Change } from "./miltonCaps.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { lineUnits } from "../src/editor/numbering.ts";

const HOME = process.env.HOME!;
const BACKUP = join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.env.OUT ?? join(HOME, "Desktop/gesta-imports/gesta-milton-caps");
const MASKS = join(HOME, "Desktop/gesta-imports/gesta-milton-masks");
const SAMSON = join(HOME, "Desktop/gesta-imports/gesta-milton-samson");
const MILTON = "bookshelf/Milton, John";

/* the verse rows of a page that are lines: not a speaker, a direction or a
   heading, not a pair (an original beside a translation) */
const isLine = (row: string): boolean => !!row.trim() && !/^\*.*\*$/.test(row.trim()) && !row.includes(" | ");
function verseRows(md: string, each: (row: string, i: number, rows: string[]) => string): string {
  return md.replace(/(::: verse[^\n]*\n)([\s\S]*?)(\n:::)/g, (_, open, body, close) => {
    const rows = body.split("\n");
    return open + rows.map((r: string, i: number) => (isLine(r) ? each(r, i, rows) : r)).join("\n") + close;
  });
}

const PL: string[] = [];
for (let b = 1; b <= 12; b++) verseRows(readFileSync(join(BACKUP, MILTON, `Paradise Lost/Book ${b}.md`), "utf8"), (r) => (PL.push(r), r));
const TABLE = usage(PL);

/* the pages made from the Harvard Classics; the Italian sonnets and the
   Canzone, beside Cowper, and the Fifth Ode, from the Oxford edition, left out */
const ITALIAN = ["2", "3", "4", "5", "6"];
const pages: { key: string; from: string }[] = [];
const shelf = (rel: string) => pages.push({ key: `${MILTON}/${rel}`, from: join(BACKUP, MILTON, rel) });
for (const f of readdirSync(join(BACKUP, MILTON, "Sonnets"))) if (f.endsWith(".md") && !ITALIAN.includes(f.replace(/\.md$/, ""))) shelf(`Sonnets/${f}`);
shelf("On the New Forcers of Conscience.md");
for (let b = 1; b <= 4; b++) shelf(`Paradise Regained/Book ${b}.md`);
for (const f of ["On the Morning of Christ’s Nativity", "A Paraphrase on Psalm CXIV", "Psalm CXXXVI", "On the Death of a Fair Infant Dying of a Cough",
  "At a Vacation Exercise in the College, Part Latin, Part English", "The Passion", "On Shakespeare", "On the University Carrier", "Another on the Same",
  "An Epitaph on the Marchioness of Winchester", "L’Allegro", "Il Penseroso", "Song on May Morning", "On Time", "At a Solemn Music", "Upon the Circumcision"]) shelf(`${f}.md`);
for (const f of ["Arcades", "Comus"]) pages.push({ key: `${MILTON}/${f}.md`, from: join(MASKS, MILTON, `${f}.md`) });
pages.push({ key: `${MILTON}/Samson Agonistes.md`, from: join(SAMSON, MILTON, "Samson Agonistes.md") });
/* ONLY=page,… runs the pass over those pages alone: the others imported, their pass done */
const only = process.env.ONLY?.split(",");
if (only) pages.splice(0, pages.length, ...pages.filter((p) => only.includes(p.key.slice(MILTON.length + 1).replace(/\.md$/, ""))));

/* a word kept as the page has it, read in its line: a personification or a
   character, a name that is also a common word, a word in another sense
   than Paradise Lost's; by page, line text and word */
const KEPT: { page: string; line: string; word: string; why: string }[] = [
  /* personification */
  { page: "Sonnets/1", line: "eye of Day", word: "Day", why: "personification" },
  { page: "Sonnets/1", line: "Muse or Love", word: "Love", why: "personification" },
  { page: "Sonnets/13", line: "for Envy", word: "Envy", why: "personification" },
  { page: "Sonnets/13", line: "honour’st Verse", word: "Verse", why: "personification" },
  { page: "Sonnets/13", line: "give Fame", word: "Fame", why: "personification" },
  { page: "Sonnets/14", line: "When Faith and Love", word: "Faith", why: "personification" },
  { page: "Sonnets/14", line: "When Faith and Love", word: "Love", why: "personification" },
  { page: "Sonnets/14", line: "as Faith pointed", word: "Faith", why: "personification" },
  { page: "Sonnets/14", line: "and Faith, who knew", word: "Faith", why: "personification" },
  { page: "Sonnets/15", line: "doth Valour", word: "Valour", why: "personification" },
  { page: "Sonnets/15", line: "and Rapine", word: "Rapine", why: "personification" },
  { page: "Sonnets/16", line: "Peace hath", word: "Peace", why: "personification" },
  { page: "Sonnets/16", line: "than War", word: "War", why: "personification" },
  { page: "Sonnets/17", line: "Religion leans", word: "Religion", why: "personification" },
  { page: "Sonnets/19", line: "But Patience", word: "Patience", why: "personification" },
  { page: "Sonnets/9", line: "And Hope that", word: "Hope", why: "personification" },
  { page: "Paradise Regained/Book 2", line: "on Beauty’s throne", word: "Beauty’s", why: "personification" },
  { page: "Paradise Regained/Book 2", line: "For Beauty stands", word: "Beauty", why: "personification" },
  { page: "Paradise Regained/Book 2", line: "Nature taught Art", word: "Art", why: "personification" },
  { page: "Paradise Regained/Book 4", line: "sage Philosophy", word: "Philosophy", why: "personification" },
  { page: "Paradise Regained/Book 4", line: "till Morning fair", word: "Morning", why: "personification" },
  { page: "On the Morning of Christ’s Nativity", line: "meek-eyed Peace", word: "Peace", why: "personification" },
  { page: "On the Morning of Christ’s Nativity", line: "speckled Vanity", word: "Vanity", why: "personification" },
  { page: "On the Death of a Fair Infant Dying of a Cough", line: "Winter had no power", word: "Winter", why: "personification" },
  { page: "At a Vacation Exercise in the College, Part Latin, Part English", line: "Native Language", word: "Native", why: "personification" },
  { page: "At a Vacation Exercise in the College, Part Latin, Part English", line: "Native Language", word: "Language", why: "personification" },
  { page: "At a Vacation Exercise in the College, Part Latin, Part English", line: "dumb Silence", word: "Silence", why: "personification" },
  { page: "The Passion", line: "best Patroness", word: "Patroness", why: "personification" },
  { page: "On Shakespeare", line: "son of Memory", word: "Memory", why: "personification" },
  { page: "On Shakespeare", line: "heir of Fame", word: "Fame", why: "personification" },
  { page: "Another on the Same", line: "Time numbers Motion", word: "Motion", why: "personification" },
  { page: "Another on the Same", line: "truth) Motion", word: "Motion", why: "personification" },
  { page: "L’Allegro", line: "loathed Melancholy", word: "Melancholy", why: "personification" },
  { page: "L’Allegro", line: "blackest Midnight", word: "Midnight", why: "personification" },
  { page: "L’Allegro", line: "heart-easing Mirth", word: "Mirth", why: "personification" },
  { page: "L’Allegro", line: "frolic Wind", word: "Wind", why: "personification" },
  { page: "L’Allegro", line: "youthful Jollity", word: "Jollity", why: "personification" },
  { page: "L’Allegro", line: "wanton Wiles", word: "Wiles", why: "personification" },
  { page: "L’Allegro", line: "wreathed Smiles", word: "Smiles", why: "personification" },
  { page: "L’Allegro", line: "wrinkled Care", word: "Care", why: "personification" },
  { page: "L’Allegro", line: "And Laughter", word: "Laughter", why: "personification" },
  { page: "Il Penseroso", line: "deluding Joys", word: "Joys", why: "personification" },
  { page: "Il Penseroso", line: "divinest Melancholy", word: "Melancholy", why: "personification" },
  { page: "Il Penseroso", line: "calm Peace and Quiet", word: "Peace", why: "personification" },
  { page: "Il Penseroso", line: "calm Peace and Quiet", word: "Quiet", why: "personification" },
  { page: "Il Penseroso", line: "Spare Fast", word: "Fast", why: "personification" },
  { page: "Il Penseroso", line: "retired Leisure", word: "Leisure", why: "personification" },
  { page: "Il Penseroso", line: "Cherub Contemplation", word: "Contemplation", why: "personification" },
  { page: "Il Penseroso", line: "mute Silence", word: "Silence", why: "personification" },
  { page: "Il Penseroso", line: "what Love did seek", word: "Love", why: "personification" },
  { page: "Il Penseroso", line: "from Day’s garish", word: "Day’s", why: "personification" },
  { page: "Il Penseroso", line: "dewy-feathered Sleep", word: "Sleep", why: "personification" },
  { page: "Il Penseroso", line: "pleasures, Melancholy", word: "Melancholy", why: "personification" },
  { page: "Song on May Morning", line: "Day’s harbinger", word: "Day’s", why: "personification" },
  { page: "On Time", line: "With Truth, and Peace", word: "Peace", why: "personification" },
  { page: "On Time", line: "With Truth, and Peace", word: "Love", why: "personification" },
  { page: "At a Solemn Music", line: "Voice and Verse", word: "Voice", why: "personification" },
  { page: "At a Solemn Music", line: "Voice and Verse", word: "Verse", why: "personification" },
  { page: "Arcades", line: "shallow-searching Fame", word: "Fame", why: "personification" },
  { page: "Comus", line: "crown that Virtue", word: "Virtue", why: "personification" },
  { page: "Comus", line: "gilded car of Day", word: "Day", why: "personification" },
  { page: "Comus", line: "And Advice", word: "Advice", why: "personification" },
  { page: "Comus", line: "Strict Age", word: "Age", why: "personification" },
  { page: "Comus", line: "wakens Love", word: "Love", why: "personification" },
  { page: "Comus", line: "grey-hooded Even", word: "Even", why: "personification" },
  { page: "Comus", line: "pure-eyed Faith", word: "Faith", why: "personification" },
  { page: "Comus", line: "white-handed Hope", word: "Hope", why: "personification" },
  { page: "Comus", line: "Virtue could see to do what Virtue would", word: "Virtue", why: "personification" },
  { page: "Comus", line: "nurse, Contemplation", word: "Contemplation", why: "personification" },
  { page: "Comus", line: "musing Meditation", word: "Meditation", why: "personification" },
  { page: "Comus", line: "But Beauty, like", word: "Beauty", why: "personification" },
  { page: "Comus", line: "divine Philosophy", word: "Philosophy", why: "personification" },
  { page: "Comus", line: "close-curtained Sleep", word: "Sleep", why: "personification" },
  { page: "Comus", line: "even Silence", word: "Silence", why: "personification" },
  { page: "Comus", line: "which Mischief", word: "Mischief", why: "personification" },
  { page: "Comus", line: "sallow Abstinence", word: "Abstinence", why: "personification" },
  { page: "Comus", line: "when Vice", word: "Vice", why: "personification" },
  { page: "Comus", line: "And Virtue has", word: "Virtue", why: "personification" },
  { page: "Comus", line: "spare Temperance", word: "Temperance", why: "personification" },
  { page: "Comus", line: "lewdly-pampered Luxury", word: "Luxury", why: "personification" },
  { page: "Comus", line: "dear Wit", word: "Wit", why: "personification" },
  { page: "Comus", line: "Folly and Intemperance", word: "Intemperance", why: "personification" },
  { page: "Comus", line: "Love Virtue", word: "Virtue", why: "personification" },
  { page: "Comus", line: "if Virtue feeble", word: "Virtue", why: "personification" },
  /* a name */
  { page: "Sonnets/1", line: "propitious May", word: "May", why: "a name" },
  { page: "Sonnets/11", line: "End Green", word: "Green", why: "a name" },
  { page: "Sonnets/11", line: "Sir John Cheek", word: "Cheek", why: "a name" },
  { page: "On the New Forcers of Conscience", line: "A. S.", word: "A", why: "a name" },
  { page: "On the Death of a Fair Infant Dying of a Cough", line: "Young Hyacinth, born", word: "Hyacinth", why: "a name" },
  { page: "On the Death of a Fair Infant Dying of a Cough", line: "Young Hyacinth, the pride", word: "Hyacinth", why: "a name" },
  { page: "At a Vacation Exercise in the College, Part Latin, Part English", line: "gulfy Dun", word: "Dun", why: "a name" },
  { page: "At a Vacation Exercise in the College, Part Latin, Part English", line: "sullen Mole", word: "Mole", why: "a name" },
  { page: "On the University Carrier", line: "The Bull", word: "The", why: "a name" },
  { page: "An Epitaph on the Marchioness of Winchester", line: "banks of Came", word: "Came", why: "a name" },
  { page: "Il Penseroso", line: "outwatch the Bear", word: "Bear", why: "a name" },
  { page: "Il Penseroso", line: "that Sylvan loves", word: "Sylvan", why: "a name" },
  { page: "Song on May Morning", line: "flowery May", word: "May", why: "a name" },
  { page: "Song on May Morning", line: "bounteous May", word: "May", why: "a name" },
  { page: "Comus", line: "Pan or Sylvan", word: "Sylvan", why: "a name" },
  { page: "Comus", line: "Sweet Echo", word: "Echo", why: "a name" },
  { page: "Comus", line: "courteous Echo", word: "Echo", why: "a name" },
  { page: "Comus", line: "father Brute", word: "Brute", why: "a name" },
  { page: "Comus", line: "Youth and Joy", word: "Joy", why: "a name" },
  { page: "Il Penseroso", line: "Ethiop Queen", word: "Queen", why: "a name" },
  { page: "Comus", line: "silver-shafted Queen", word: "Queen", why: "a name" },
  /* a title */
  { page: "Sonnets/10", line: "England’s Council", word: "Council", why: "a title" },
  { page: "Sonnets/18", line: "triple Tyrant", word: "Tyrant", why: "a title" },
  { page: "Sonnets/23", line: "the Old Law", word: "Old", why: "a title" },
  { page: "Sonnets/9", line: "Hill of Heavenly Truth", word: "Hill", why: "a title" },
  { page: "Paradise Regained/Book 1", line: "the Most High", word: "High", why: "a title" },
  { page: "Paradise Regained/Book 1", line: "Wise Men", word: "Wise", why: "a title" },
  { page: "Paradise Regained/Book 1", line: "Wise Men", word: "Men", why: "a title" },
  { page: "Paradise Regained/Book 1", line: "our Morning Star", word: "Morning", why: "a title" },
  { page: "Paradise Regained/Book 1", line: "our Morning Star", word: "Star", why: "a title" },
  { page: "Paradise Regained/Book 1", line: "living Oracle", word: "Oracle", why: "a title" },
  { page: "Paradise Regained/Book 2", line: "Before the Flood", word: "Flood", why: "a title" },
  { page: "Paradise Regained/Book 3", line: "Promised Land", word: "Land", why: "a title" },
  { page: "Paradise Regained/Book 3", line: "Prophetic Writ", word: "Prophetic", why: "a title" },
  { page: "Paradise Regained/Book 3", line: "Ten Tribes", word: "Ten", why: "a title" },
  { page: "Paradise Regained/Book 3", line: "Ten Tribes", word: "Tribes", why: "a title" },
  { page: "Paradise Regained/Book 3", line: "Red Sea", word: "Red", why: "a title" },
  { page: "Paradise Regained/Book 3", line: "Red Sea", word: "Sea", why: "a title" },
  { page: "Paradise Regained/Book 4", line: "Golden Chersonese", word: "Golden", why: "a title" },
  { page: "Paradise Regained/Book 4", line: "Evil One", word: "Evil", why: "a title" },
  { page: "Paradise Regained/Book 4", line: "Evil One", word: "One", why: "a title" },
  { page: "Paradise Regained/Book 4", line: "the Oracle pronounced", word: "Oracle", why: "a title" },
  { page: "Paradise Regained/Book 4", line: "Fountain of Light", word: "Fountain", why: "a title" },
  { page: "Paradise Regained/Book 4", line: "Holy City", word: "City", why: "a title" },
  { page: "Paradise Regained/Book 4", line: "True Image", word: "Image", why: "a title" },
  { page: "Paradise Regained/Book 4", line: "the Most High", word: "High", why: "a title" },
  { page: "Paradise Regained/Book 4", line: "Queen of the Earth", word: "Queen", why: "a title" },
  { page: "On the Morning of Christ’s Nativity", line: "Trinal Unity", word: "Unity", why: "a title" },
  { page: "On the Morning of Christ’s Nativity", line: "Courts of everlasting Day", word: "Courts", why: "a title" },
  { page: "On the Morning of Christ’s Nativity", line: "Courts of everlasting Day", word: "Day", why: "a title" },
  { page: "On the Morning of Christ’s Nativity", line: "Infant God", word: "Infant", why: "a title" },
  { page: "On the Morning of Christ’s Nativity", line: "Sons of Morning", word: "Morning", why: "a title" },
  { page: "On the Morning of Christ’s Nativity", line: "Age of Gold", word: "Age", why: "a title" },
  { page: "On the Morning of Christ’s Nativity", line: "Age of Gold", word: "Gold", why: "a title" },
  { page: "On the Morning of Christ’s Nativity", line: "Old Dragon", word: "Old", why: "a title" },
  { page: "On the Morning of Christ’s Nativity", line: "Heaven’s Queen", word: "Queen", why: "a title" },
  { page: "A Paraphrase on Psalm CXIV", line: "Canaan Land", word: "Land", why: "a title" },
  { page: "The Passion", line: "sovran Priest", word: "Priest", why: "a title" },
  { page: "An Epitaph on the Marchioness of Winchester", line: "blazing Majesty", word: "Majesty", why: "a title" },
  { page: "Comus", line: "Palace of Eternity", word: "Palace", why: "a title" },
  { page: "Comus", line: "Supreme Good", word: "Good", why: "a title" },
  { page: "Comus", line: "Queen of Parley", word: "Queen", why: "a title" },
  { page: "Comus", line: "Daughter of the Sphere", word: "Daughter", why: "a title" },
  { page: "Comus", line: "Daughter of the Sphere", word: "Sphere", why: "a title" },
  { page: "Comus", line: "Golden Tree", word: "Golden", why: "a title" },
  { page: "On the Death of a Fair Infant Dying of a Cough", line: "just Maid", word: "Maid", why: "a title" },
  { page: "On the Death of a Fair Infant Dying of a Cough", line: "smiling Youth", word: "Youth", why: "a title" },
  { page: "On the Death of a Fair Infant Dying of a Cough", line: "crowned Matron", word: "Matron", why: "a title" },
  { page: "At a Vacation Exercise in the College, Part Latin, Part English", line: "all his Brethren", word: "Brethren", why: "a title" },
  /* another sense than Paradise Lost’s */
  { page: "Sonnets/1", line: "at eve", word: "eve", why: "another sense than Paradise Lost’s" },
  { page: "Paradise Regained/Book 1", line: "field at eve", word: "eve", why: "another sense than Paradise Lost’s" },
  { page: "Comus", line: "oft at eve", word: "eve", why: "another sense than Paradise Lost’s" },
  { page: "On the Morning of Christ’s Nativity", line: "twice-battered god", word: "god", why: "another sense than Paradise Lost’s" },
  { page: "An Epitaph on the Marchioness of Winchester", line: "The god that sits", word: "god", why: "another sense than Paradise Lost’s" },
  { page: "An Epitaph on the Marchioness of Winchester", line: "earl’s heir", word: "heir", why: "another sense than Paradise Lost’s" },
  { page: "On Shakespeare", line: "great heir of Fame", word: "heir", why: "another sense than Paradise Lost’s" },
  { page: "Comus", line: "master’s heir", word: "heir", why: "another sense than Paradise Lost’s" },
  { page: "Paradise Regained/Book 4", line: "our victor’s ear", word: "victor’s", why: "another sense than Paradise Lost’s" },
  { page: "L’Allegro", line: "lubber fiend", word: "fiend", why: "another sense than Paradise Lost’s" },
  { page: "On the Morning of Christ’s Nativity", line: "Fate says No", word: "No", why: "another sense than Paradise Lost’s" },
  /* an address */
  { page: "Sonnets/1", line: "O Nightingale", word: "Nightingale", why: "an address" },
  { page: "On the Death of a Fair Infant Dying of a Cough", line: "fairest Flower", word: "Flower", why: "an address" },
  { page: "On the Death of a Fair Infant Dying of a Cough", line: "O Soul", word: "Soul", why: "an address" },
  { page: "Comus", line: "hapless Nightingale", word: "Nightingale", why: "an address" },
  { page: "Upon the Circumcision", line: "exceeding Love", word: "Love", why: "an address, and its echo a line on" },
  /* kept with its fellow */
  { page: "Paradise Regained/Book 2", line: "Fire, Air, Water", word: "Fire", why: "kept with its fellow" },
  { page: "Paradise Regained/Book 2", line: "Fire, Air, Water", word: "Water", why: "kept with its fellow" },
  { page: "Paradise Regained/Book 4", line: "Fire, Air, Flood", word: "Fire", why: "kept with its fellow" },
  { page: "Paradise Regained/Book 4", line: "Fire, Air, Flood", word: "Flood", why: "kept with its fellow" },
  { page: "Paradise Regained/Book 3", line: "Barbarous, nor", word: "Barbarous", why: "kept with its fellow" },
  { page: "Paradise Regained/Book 4", line: "Law and Story", word: "Story", why: "kept with its fellow" },
  { page: "On the Morning of Christ’s Nativity", line: "glorious Form", word: "Form", why: "kept with its fellow" },
  { page: "At a Vacation Exercise in the College, Part Latin, Part English", line: "Kings and Queens and Heroes", word: "Kings", why: "kept with its fellow" },
  { page: "At a Vacation Exercise in the College, Part Latin, Part English", line: "Kings and Queens and Heroes", word: "Heroes", why: "kept with its fellow" },
  { page: "Arcades", line: "Look, Nymphs and Shepherds", word: "Shepherds", why: "kept with its fellow" },
  { page: "Arcades", line: "Nymphs and Shepherds, dance", word: "Shepherds", why: "kept with its fellow" },
  { page: "Comus", line: "dapper Elves", word: "Elves", why: "kept with its fellow" },
  /* as the Oxford edition has it (asked) */
  { page: "Sonnets/19", line: "lest He returning", word: "He", why: "as the Oxford edition has it" },
  { page: "On the New Forcers of Conscience", line: "old Priest writ", word: "Priest", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 1", line: "The Prophet do him", word: "Prophet", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 1", line: "what will He not do", word: "He", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 1", line: "him in the Wilderness", word: "Wilderness", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 1", line: "our great Feast", word: "Feast", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 1", line: "went into the Temple", word: "Temple", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 1", line: "found thee in the Temple", word: "Temple", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 1", line: "baptizing Prophet", word: "Prophet", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 2", line: "his great Prophet", word: "Prophet", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 2", line: "the wide Wilderness", word: "Wilderness", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 2", line: "that Prophet bold", word: "Prophet", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 2", line: "Among the Heathen", word: "Heathen", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 3", line: "The Temple, oft the Law", word: "Temple", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 3", line: "everlasting Kingdom", word: "Kingdom", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 3", line: "By Prophet or by Angel", word: "Prophet", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 4", line: "both Angels are and Men", word: "Men", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 4", line: "from Men and Angels", word: "Men", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 4", line: "Alone into the Temple", word: "Temple", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 4", line: "Much of the Soul", word: "Soul", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 4", line: "The Wilderness", word: "Wilderness", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 4", line: "to the Wilderness", word: "Wilderness", why: "as the Oxford edition has it" },
  { page: "Paradise Regained/Book 4", line: "both ends of heaven", word: "heaven", why: "as the Oxford edition has it: the sky of a storm" },
  { page: "Paradise Regained/Book 4", line: "with Godlike force", word: "Godlike", why: "as the Oxford edition has it" },
  { page: "A Paraphrase on Psalm CXIV", line: "Of Him that ever was", word: "Him", why: "as the Oxford edition has it" },
  { page: "On the Death of a Fair Infant Dying of a Cough", line: "in earth’s dark womb", word: "earth’s", why: "as the Oxford edition has it" },
  { page: "On the Death of a Fair Infant Dying of a Cough", line: "in nature’s true behoof", word: "nature’s", why: "as the Oxford edition has it" },
  { page: "L’Allegro", line: "In heaven yclep’d", word: "heaven", why: "as the Oxford edition has it" },
  { page: "Il Penseroso", line: "the heaven’s wide pathless way", word: "heaven’s", why: "as the Oxford edition has it" },
  { page: "At a Solemn Music", line: "To Him that sits", word: "Him", why: "as the Oxford edition has it" },
  { page: "At a Solemn Music", line: "To live with Him", word: "Him", why: "as the Oxford edition has it" },
  { page: "Upon the Circumcision", line: "till He, that dwelt", word: "He", why: "as the Oxford edition has it" },
  { page: "Arcades", line: "Such a rural Queen", word: "Queen", why: "as the Oxford edition has it" },
  { page: "Comus", line: "But this Isle", word: "Isle", why: "as the Oxford edition has it" },
  { page: "Comus", line: "I shoot from heaven", word: "heaven", why: "as the Oxford edition has it" },
  { page: "Comus", line: "top of heaven", word: "heaven", why: "as the Oxford edition has it" },
  { page: "Comus", line: "hung in heaven", word: "heaven", why: "as the Oxford edition has it" },
  { page: "Comus", line: "hovering angel", word: "angel", why: "as the Oxford edition has it" },
  { page: "Comus", line: "That He, the Supreme Good", word: "He", why: "as the Oxford edition has it" },
  { page: "Comus", line: "liveried angels", word: "angels", why: "as the Oxford edition has it" },
  { page: "Comus", line: "sadly, Shepherd", word: "Shepherd", why: "as the Oxford edition has it: addressed" },
  { page: "Comus", line: "joined with hell", word: "hell", why: "as the Oxford edition has it" },
  { page: "Comus", line: "prithee Shepherd", word: "Shepherd", why: "as the Oxford edition has it: addressed" },
  { page: "Comus", line: "some good angel", word: "angel", why: "as the Oxford edition has it" },
  { page: "At a Solemn Music", line: "uplifted angel trumpets", word: "angel", why: "as the Oxford edition has it, angel-trumpets" },
  /* earth's in Comus, as the Oxford edition has it in the Fair Infant */
  { page: "Comus", line: "mixture of earth’s mould", word: "earth’s", why: "as the Oxford edition has earth’s in the Fair Infant 30" },
  { page: "Comus", line: "And earth’s base", word: "earth’s", why: "as the Oxford edition has earth’s in the Fair Infant 30" },
  { page: "Comus", line: "green earth’s end", word: "earth’s", why: "as the Oxford edition has earth’s in the Fair Infant 30" },
  /* as the Oxford edition has the same word in the same sense elsewhere in the poem */
  { page: "Paradise Regained/Book 4", line: "glorious Temple", word: "Temple", why: "the Temple, as the Oxford edition has it at 1.211, 1.256, 3.161, 4.217" },
  /* Samson Agonistes, read against the Oxford edition's pages where they were to hand */
  { page: "Samson Agonistes", line: "O first-created Beam", word: "Beam", why: "an address" },
  { page: "Samson Agonistes", line: "Treason against me", word: "Treason", why: "personification" },
  { page: "Samson Agonistes", line: "To Honour and Religion", word: "Honour", why: "personification" },
  { page: "Samson Agonistes", line: "To Honour and Religion", word: "Religion", why: "personification" },
  { page: "Samson Agonistes", line: "as their god who hath", word: "god", why: "another sense than Paradise Lost’s" },
  { page: "Samson Agonistes", line: "no god, compared", word: "god", why: "another sense than Paradise Lost’s" },
  { page: "Samson Agonistes", line: "Among the Heathen round; to God", word: "Heathen", why: "as the Oxford edition has Heathen in Paradise Regained" },
  { page: "Samson Agonistes", line: "like a petty god", word: "god", why: "another sense than Paradise Lost’s" },
  { page: "Samson Agonistes", line: "the Living God", word: "Living", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "if Dagon be thy god", word: "god", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "his godhead seconded", word: "godhead", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "whose god is God", word: "god", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "Of saints, the trial", word: "saints", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "their god—", word: "god", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "the Holy One", word: "One", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "Great among the Heathen", word: "Heathen", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "both God and State", word: "State", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "clamouring their god", word: "god", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "Living Dread", word: "Dread", why: "as the Oxford edition has it" },
  { page: "Samson Agonistes", line: "So Virtue, given", word: "Virtue", why: "as the Oxford edition has it" },
];

/* a capital, a mark or a spelling the Oxford edition has otherwise than either (asked) */
const OXFORD: { page: string; line: string; from: string; to: string }[] = [
  { page: "Paradise Regained/Book 4", line: "an Imperial City stood", from: "Imperial", to: "imperial" },
  { page: "Psalm CXXXVI", line: "blaze his Name", from: "his", to: "His" },
  { page: "Psalm CXXXVI", line: "Praise the Lord for", from: "Lord for", to: "Lord, for" },
  { page: "Psalm CXXXVI", line: "mercies aye endure", from: "aye", to: "ay" },
  { page: "L’Allegro", line: "Knights and Barons bold", from: "Barons", to: "barons" },
  { page: "At a Solemn Music", line: "uplifted angel trumpets", from: "angel trumpets", to: "angel-trumpets" },
  /* God's pronouns through the psalm, as the Oxford edition has them at 2, 3 and 5 (asked); the Sun's, the King's, Sihon's and Og's left */
  { page: "Psalm CXXXVI", line: "Praise the Lord for he is kind", from: "he", to: "He" },
  { page: "Psalm CXXXVI", line: "For his mercies aye endure", from: "his", to: "His" },
  { page: "Psalm CXXXVI", line: "For of gods he is", from: "he", to: "He" },
  { page: "Psalm CXXXVI", line: "O let us his praises", from: "his", to: "His" },
  { page: "Psalm CXXXVI", line: "That with his miracles", from: "his", to: "His" },
  { page: "Psalm CXXXVI", line: "That by his wisdom", from: "his", to: "His" },
  { page: "Psalm CXXXVI", line: "That by his all-commanding", from: "his", to: "His" },
  { page: "Psalm CXXXVI", line: "with his thunder-clasping", from: "his", to: "His" },
  { page: "Psalm CXXXVI", line: "from thence his Israel", from: "his", to: "His" },
  { page: "Psalm CXXXVI", line: "waves he cleft", from: "he", to: "He" },
  { page: "Psalm CXXXVI", line: "chosen people he did", from: "he", to: "He" },
  { page: "Psalm CXXXVI", line: "battle he brought", from: "he", to: "He" },
  { page: "Psalm CXXXVI", line: "Og he did", from: "he", to: "He" },
  { page: "Psalm CXXXVI", line: "to his servant Israel", from: "his", to: "His" },
  { page: "Psalm CXXXVI", line: "creatures he doth", from: "he", to: "He" },
  { page: "Psalm CXXXVI", line: "That his mansion", from: "his", to: "His" },
];
const label = (key: string): string => key.slice(MILTON.length + 1).replace(/\.md$/, "");
const all: { page: string; n: number; line: string; c: Change; kept?: string; after?: string }[] = [];
const met = new Set<(typeof KEPT)[number]>(), oxford = new Set<(typeof OXFORD)[number]>();
const out: Record<string, string> = {};
for (const p of pages) {
  const md = readFileSync(p.from, "utf8");
  /* each line row's number as the page counts it */
  const numbers = lineUnits(parseMarkdown(md), 0).filter((u) => u.line && u.node.type.name === "line" && !/^\*.*\*$/.test(u.node.textContent)).map((u) => u.line);
  let k = 0, n = 0;
  const next = verseRows(md, (row) => {
    n = numbers[k++];
    const body = row.replace(/^⟨(?:line|…)⟩/, ""), head = row.slice(0, row.length - body.length);
    const changes = recasings(body, TABLE).filter((c) => {
      const k = KEPT.find((k) => k.page === label(p.key) && body.includes(k.line) && k.word === c.from);
      if (k) met.add(k);
      all.push({ page: label(p.key), n, line: body, c, kept: k?.why });
      return !k;
    });
    for (const o of OXFORD.filter((o) => o.page === label(p.key) && body.includes(o.line))) {
      const at = body.slice(body.indexOf(o.line)).search(new RegExp(`\\b${o.from}\\b`)) + body.indexOf(o.line);
      const c = { at, from: o.from, to: o.to, usage: TABLE.get(o.from.toLowerCase()) ?? { cap: 0, low: 0 } };
      changes.push(c);
      all.push({ page: label(p.key), n, line: body, c });
      oxford.add(o);
    }
    changes.sort((a, b) => a.at - b.at);
    const after = applied(body, changes);
    for (const a of all) if (a.page === label(p.key) && a.line === body && a.after === undefined) a.after = after;
    return head + after;
  });
  if (next !== md) out[p.key] = next;
}
const ran = new Set(pages.map((p) => p.key.slice(MILTON.length + 1).replace(/\.md$/, "")));
const unmet = KEPT.filter((k) => ran.has(k.page) && !met.has(k));
if (oxford.size !== OXFORD.filter((o) => ran.has(o.page)).length) throw new Error("an Oxford reading that matches nothing");
if (unmet.length) throw new Error("kept words that match nothing: " + unmet.map((k) => `${k.page}: ${k.word} in “${k.line}”`).join("; "));
if (process.env.LIST) for (const a of all) console.log(`${a.kept ? "KEPT " : ""}${a.page} ${a.n}: ${a.c.from}→${a.c.to} (PL ${a.c.usage.cap}/${a.c.usage.low}) | ${a.line}`);
const made = all.filter((a) => !a.kept), kept = all.filter((a) => a.kept);

const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
for (const md of Object.values(out)) if (serializeMarkdown(parseMarkdown(md)) !== md) throw new Error("a page does not survive its round trip: " + md.slice(0, 80));
rmSync(OUT, { recursive: true, force: true });
for (const p of pages) {
  const md = out[p.key];
  if (!md) continue;
  /* Arcades and Comus, not yet on the shelf, rewritten where they wait */
  const to = p.from.startsWith(MASKS) || p.from.startsWith(SAMSON) ? p.from : join(OUT, p.key);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, md);
}
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const mark = (line: string, c: Change, word: string): string => esc(line.slice(0, c.at)) + `<b>${esc(word)}</b>` + esc(line.slice(c.at + c.from.length));
const row = (a: (typeof all)[number], to: boolean) => `<tr><td class="n">${esc(a.page)} ${a.n}</td><td>${mark(a.line, a.c, a.c.from)}</td><td>${to ? mark(a.after!, a.c, a.c.to) : esc(a.kept!)}</td><td class="n">Paradise Lost ${a.c.usage.cap} capital, ${a.c.usage.low} lower</td></tr>`;
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Milton's capitals</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:72em;padding:0 1em}td{padding:.1em 1em .1em 0;vertical-align:top}.n{color:#888;font-size:.8em;white-space:nowrap}b{background:#fff3b0}</style>
<h1>Milton's capitals, matched to Paradise Lost</h1>
<p>The pages made from the Harvard Classics — the English sonnets and On the New Forcers of Conscience, Paradise Regained, the sixteen shorter poems, Arcades and Comus — given the capitals the bookshelf's Paradise Lost uses: a word it writes in lower case nine times in ten or more, mid-sentence, made lower case; one it capitalises nine times in ten or more, and at least three times, made capital. A line's or a sentence's first word, and a word Paradise Lost never uses (mostly names), are left as they are. The Italian sonnets and the Canzone (beside Cowper), the Fifth Ode (from the Oxford edition), and Paradise Lost, Lycidas and Areopagitica themselves are not touched.</p>
<p>The pages already on the shelf are changed from the backup as it stands, so their own edits are kept: ${Object.keys(out).filter((k) => !pages.find((p) => p.key === k)!.from.startsWith(MASKS)).length} pages in <code>${esc(basename(OUT))}</code>. Arcades and Comus are rewritten in <code>gesta-milton-masks</code>, still to be imported.</p>
<h2>Changed (${made.length})</h2>
<table>${made.map((a) => row(a, true)).join("")}</table>
<h2>Kept as they are, read in their line (${kept.length})</h2>
<table>${kept.map((a) => row(a, false)).join("")}</table>`);
console.log(`${all.length} recasings found: ${made.length} made, ${kept.length} kept by reading; ${Object.keys(out).length} pages change`);
console.log(`written to ${OUT}`);
