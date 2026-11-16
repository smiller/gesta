# ⌃⌘G asks a work of prose and verse for a Verse Line or a Prose Paragraph

## Why

Vita Nuova holds prose and verse in one entry; its bar asked a single Line
box that counted the prose's sentences as lines, while a reference names
the prose by paragraph.

## Decisions (asked)

- Under `prose by paragraph, verse by line`: "Verse Line ____, or Prose
  Paragraph ____" where a chapter holds both; "Paragraph" alone where it
  has no verse; "Line" alone where it has no prose.
- The Line box counts verse lines only; the Paragraph box the paragraph a
  reference names (the numbering ⌃⌘R reads). The model is the Line-or-Page
  bar already on Charles Williams's books.
- The references (B5.1, asked): the prose by its paragraph alone, "3, para
  4"; a poem by its first line, the original where paired, a closing
  comma, semicolon or colon dropped: "3, A ciascun’alma presa e gentil
  core, 1-4". Of the backup's 31 poems one opens on a guillemet (37,
  «L’amaro…, MEASURED), so a worded range opens on any letter or opening
  quotation mark.

## Record

- Built test-first in goto.ts (the bar's labels, the paragraph box, verse
  lines alone) and carried to the bar; the Help says so. Played in Helium:
  "Verse Line, or Prose Paragraph" shown, Paragraph 1 and Line 2 each
  landing in its own form; the approved run's one change.
- Seen by hand, both boxes filled and the last typed obeyed: in a bar
  joined by "or" (here, and Line-or-Page while it stands), typing in one
  box empties the other (asked). Played: Line 2 typed, Paragraph empty.
- B5.1 built test-first; played: Vita Nuova 12's second verse line
  "…, 12, Ballata, i’ voi che tu ritrovi Amore, 2", its prose "…, 12, para
  1"; the approved run's one change.

## The batch's review (16c19cd..131ae73: A3.1, A3.3, B5, B5.1)

`/code-review` at high: 122,183 tokens (MEASURED: the last usage line of
subagents/agent-a0f371b808d3523bd.jsonl, input 2 + cache creation 1,642
+ cache read 116,335 + output 4,204). Eight findings, all acted on:

1. Fold records written before fold memory held both lists, one empty;
   the empty `open` won and a day's closed sections were lost, and the
   next write saved the loss (READ, foldState.ts:27 at 4d8328b^): the
   list that holds sections is read. Closings lost between the two
   commits stay lost.
2. A poem named by its first row, a direction (Vita Nuova 34's *Primo
   cominciamento*) or a gap: by its first numbered line.
3. A link to a line stopped reaching a chapter of prose (none in the
   backup, MEASURED): only the bar's Verse Line box counts verse alone.
4. Stanzas and printed pages lost their bar under the directive: kept.
5. A worded range guessed from its first character: the reference says
   it is worded.
6. An opening guillemet never closed kept in a poem's name: dropped.
7. Three parallel chains of the bar's words: one table.
8. A comment naming another module's output: says its own code's rule.
