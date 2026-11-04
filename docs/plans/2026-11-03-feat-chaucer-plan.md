# feat: Chaucer — Skeat's Middle English, and `parts in roman`

REVIEW CYCLES: 0

## The ask (2026-11-03)

"What about adding Chaucer's Canterbury Tales? And any other Chaucer
(Troilus and Criseyde, Boece, etc) that's available and open-source?" Ruled
the same day: "Middle English alone, everything in 1–4; go ahead; citations
`Chaucer, *Canterbury Tales*, The Knight's Take, 859-62`".

## The rule

A work whose page carries `::: reference` / `parts in roman` / `:::` names
its parts in roman after its italic title: "Chaucer, *Canterbury Tales*, The
Knight’s Tale, 859-62". The work is the second level, as `prosimetrum` reads
it. Every other work cites as before ("Chaucer, *Troilus and Criseyde*,
1.1-7").

- `src/store/headings.ts` (the directive), `reference.ts`
  (`Journal.partsInRoman`, the parts below the work made plain), help.html.
- Tests: reference.test (the directive; the labels). `npm run verify` passes.

## The text (tools/out/chaucer, git-ignored)

- Skeat, *The Complete Works of Geoffrey Chaucer* (Oxford, 1894–7), from
  Gutenberg: vol. 1 #43089, vol. 2 #44833, vol. 3 #45027, vol. 4 #22120.
  The Canterbury Tales first, for the reader's look.
- tools/cth.py reads Gutenberg's HTML of vol. 4: his notes
  (blockquote.b1s), page numbers and Tyrwhitt's references dropped; a wholly
  bold or small-capital line a rubric; a wholly italic line a rubric where it
  ends a sentence and a verse line where it runs on (marked `⟨line⟩`); an
  editor's direction (it names a page or says see) dropped; the prose tales'
  `/` units each a line, Skeat's number after its `/`; three `/`s the
  transcription lost in the Parson's Tale restored (I 336, 951, 1066); the
  text after the Retraction (the Tale of Gamelyn, Skeat's end notes) left out.
- tools/check.py: per Group, every line counted against Skeat's margin
  numbers. 19,336 lines; every number agrees but seven lone misprints of the
  transcription (A 1548 printed 690, …) (MEASURED).
- tools/build_ct.py: 53 pages under Chaucer, Geoffrey/Canterbury Tales, a
  page per prologue, tale or link, each `::: verse N` from Skeat's Group
  number; his rubrics italic rows; his two bracketed lines numbered apart
  (A 252 b–c) a note; stanza breaks counted for the tales in a fixed stanza
  (rime royal, the Monk's eight, the Clerk's envoy), Sir Thopas's by its
  tails, the couplet tales' at Skeat's paragraph indents.
- tools/numcheck.ts: every page numbered by Gesta's own walk: 19,336 of
  19,336 lines carry Skeat's number (MEASURED). importCorpus 55/55; corpus
  55 clean. Headless Helium: "Chaucer, *Canterbury Tales*, The Knight’s Tale,
  859-62".
- The Canterbury Tales imported (the backup holds all 53 pages).

## Volume 2: Troilus and Criseyde, Boece

- tools/v2.py reads Gutenberg's HTML of vol. 2 (#44833): his notes
  (p.sp5, outside the poem's divs) and margin numbers dropped; Troilus's
  stanza numbers dropped, its stanzas kept; the Cantus Troili headings and
  the letters' signatures italic rows; Book V's Latin argument with its head.
- tools/build_v2.py writes `~/Desktop/gesta-chaucer-2`: Troilus a page a
  book ("Troilus and Criseyde/1" … "/5", headed "Troilus and Criseyde, Book
  I"), Boece a page a prose or metre ("Boece/1m1", 78 pages), in Skeat's
  paragraphs; a contents page each. The transcription's straight quotation
  marks curled; an italic run's edge spaces and punctuation set outside it,
  its asterisks taken in pairs (0 literal asterisks on the 140 Chaucer pages,
  MEASURED). Boece's two unbalanced double marks are Fortune's speech running
  from 2pr2 into 2m2, as printed.
- Troilus's books 1,092 / 1,757 / 1,820 / 1,701 / 1,869 lines; tools/numcheck2.ts:
  8,239 of 8,239 numbered as Skeat (MEASURED). importCorpus 85/85; corpus 85
  clean. Headless Helium: "Chaucer, *Troilus and Criseyde*, 1.1-7", numbers
  drawn at 5, 10, 15, 20; "Chaucer, *Boece*, 1m1"; 0 asterisks on 1m1's page.
- Imported, Troilus and Boece linked from the Chaucer page (2026-11-03).

## Volume 3: the House of Fame, the Legend of Good Women, the Astrolabe

- tools/v3.py reads Gutenberg's HTML of vol. 3 (#45027); tools/check3.py counts
  each run against Skeat's margin numbers, a mark the next one contradicts
  being a lone misprint: the House of Fame 2,158 lines (two lone misprints,
  10 and 735), Prologue A 545, Prologue B 579, the legends 580–2723, no other
  disagreement (MEASURED). The Prologue's † and * marks (Skeat's: a line the
  same in both texts, a line in one only) dropped, and the passages he prints
  again in small type where the other text has them; a wholly bold or
  small-capital line (Balade, Part I. The Legend of Hypsipyle) an italic row.
- tools/build_v3.py writes `~/Desktop/gesta-chaucer-3`: the House of Fame one
  page, a `## Book` and a fence from its first number for each book; the
  Legend's contents page (`parts in roman`), Prologue B, Prologue A, and a
  page for each legend, its Incipit and Explicit italic rows.
- tools/astr3.py: the Astrolabe's Prologue in paragraphs; Part I and Part II
  `::: verse numbered`, a row a section, a conclusion's English and Latin
  headings italic rows, so a reference cites "2.3" (a numbered prose block
  cites the page alone); the six supplementary propositions as 41–46 on Part
  II's page, the five Skeat calls spurious left out; his six plates on the
  contents page (made 1,600 px on the long side).
- tools/numcheck3.ts: 5,426 of 5,426 verse lines numbered as Skeat; the
  Astrolabe's rows 1–23 and 1–46 (MEASURED). importCorpus 17/17, 6 pictures
  filed; corpus 17 clean; 0 literal asterisks on the 157 Chaucer pages.
  Headless Helium: "Chaucer, *House of Fame*, 509-11"; "Chaucer, *Legend of
  Good Women*, The Legend of Cleopatra, 580-82"; "…, Prologue B, 1-3";
  "Chaucer, *Treatise on the Astrolabe*, 2.3".

## Volume 1: the Romaunt of the Rose, the minor poems

- tools/v1.py reads Gutenberg's HTML of vol. 1 (#43089), the English column
  alone where Skeat prints the French beside it (the Romaunt's Fragment A, the
  ABC, the Compleynt of Venus). tools/check1.py: a lone line in its stanza, or
  a wholly bold one, a heading; a row the transcription sets off with a gap
  after a speaker's name, and two it does not (B 4659, C 6689, by the rhyme),
  the rest of a line split between speakers. The Romaunt 7,698 lines through
  its three fragments, every poem to Skeat's last number, one lone misprint
  (Mars 25 printed 35), one line Skeat numbers and leaves empty (Book of the
  Duchess 480, a `⟨skipped line number⟩` row) (MEASURED).
- tools/build_v1.py writes `~/Desktop/gesta-chaucer-1`: the Romaunt's contents
  page (`parts in roman`) and a page a fragment, Skeat's side-notes (Hate,
  Felonye, The Garden…) as margin-notes, a split line's rest a `⟨…⟩` row; the
  23 minor poems a page each under the author, the three of his appendix
  saying so; couplet paragraphs at Skeat's indents, stanzas at his breaks (the
  ABC's and Venus's, in a table, counted by eights); the italic refrains of
  the Parliament's roundel and Merciles Beaute `⟨line⟩`.
- tools/numcheck1.ts: 11,441 of 11,441 lines numbered as Skeat (MEASURED).
  importCorpus 27/27; corpus 27 clean; 0 literal asterisks on the 184 Chaucer
  pages. Double marks unbalanced in Fragments B and C as printed (B 742
  `'"Alas`, C 6665 closed twice). Headless Helium: "Chaucer, *Romaunt of the
  Rose*, Fragment A, 1-4"; "…, Fragment B, 4659" over the split line; "Chaucer,
  *Book of the Duchess*, 479-82" across the empty 480; "Chaucer, *Truth*, 1-7";
  Merciles Beaute numbered 5–35 through its italic refrains; the side-notes
  drawn in the margin.

- Volumes 3 and 1 imported (2026-11-04): the backup holds all 44 pages as written, and the six plates.
