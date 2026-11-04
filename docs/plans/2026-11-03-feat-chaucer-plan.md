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
