# The old app's behaviour, inventoried against this one

Asked 2026-10-08, after a page opened with no caret: why did that survive an
earlier ask (2026-09-12) to make the old app's behaviour the approved one?
The answer is in the main plan's record under that date. Its step 2, owed
since phase 0, is this inventory: every behaviour the old app's code shows a
reader, and the triage of its tests.html, each checked against this app.

## How it was made, and what it cost

Three research agents, 2026-10-08/09, research only:

| Run | Read | Rows | Cost (tokens, MEASURED from the transcripts) |
|---|---|---|---|
| Code, files 00–13f | 22 files in full | 111 | 410,008 |
| Code, files 14–37 | 24 files in full | 110 | 377,116 |
| tests.html | 214 test functions, lines 1–28875 | 438 | 156,427 + 2,098,767 (it split itself into eight agents, unasked) = 2,255,194 |
| **Total** | | | **3,042,318** |

The estimate given beforehand was "about one research agent's run". The
tests.html agent fanned out on its own; the prompt set no limit.

The full tables are beside this file, in `2026-10-09-old-app-inventory/`.
Tags there: READ = the agent read the code; MEASURED = run under node
against this app's modules; INFERRED = the on-screen effect worked out from
code. Nothing in them was played in Helium. Every item below is to be
played there before it is fixed or ruled on.

Counts (the agents', READ from their tables): the code, 221 behaviours —
143 the same, 44 different, 31 missing, 3 obsolete. tests.html, 438 rows —
184 pinned here, 99 present but pinned by nothing, 48 different, 37 missing,
70 old-engine quirks.

## The list, merged, by what a reader would notice

Sources: A = code 00–13f, B = code 14–37, T = tests.html (row numbers).

### 1. Loses words, pictures or a report

1. A code fence typed as "```not code" saves as "```not" — the word after
   the first is dropped. MEASURED here 2026-10-09 (node, parse then
   serialize). T (outside rows).
2. The toolbar's code button over a paragraph holding a picture deletes the
   picture. MEASURED here 2026-10-09: "cap ![](x.png) tion" → "```\ncap  tion\n```". T286.
3. Pasting only blank lines over a selection deletes the selection. A111,
   T216 (MEASURED by the agents).
4. Copies carry page markers out: ⌘C, the hover copy and ⌃⌘R's passage all
   write "⟨15⟩", which pasted into a journal entry makes a page number with
   no book. A79, T198, T209, T224, T120 (MEASURED by the agents).
5. A second export or import while one runs retires the first's progress
   line, and its report is lost. B92, T303.
6. Storage filling mid-import: no "storage full" — every file after is
   tried and counted failed. B97, T311.
7. Typing on an entry while it is being imported can land over the
   imported text. B98 (INFERRED).
8. A store that hangs on load leaves a blank page and says nothing (the old
   app pinned "couldn't load entries — reload" after 8 s). B104.
9. `navigator.storage.persist()` is never asked, so the browser may evict
   the store under pressure. B110.

### 2. The caret or the focus goes nowhere (the class that started this)

10. ⌃⌘S or ⌃⌘B pressed again closes the card but keys typed then go
    nowhere. B71.
11. Closing Line numbering by clicking its own label: keys go nowhere. B51, T69.
12. The bookmark card's link button inserts the link and leaves no caret. B79.
13. Tab on plain prose, or over a selection spilling out of a list, walks
    the focus out of the entry (the old app kept it and whispered). A102, T248.
14. Tab and Shift-Tab in a rendered code block walk the focus out; help.html
    promises two spaces. A99, T250. ⌘A in a code block selects the whole
    page; help.html promises the block. A101, T249.
15. Escape after a search jump selects the whole paragraph and raises the
    format bar (the old app cleared the jump's selection). B4, T71, T405.
16. ⌃⌘M, and a route to the entry already open, leave the search results,
    the shortcuts popup or a panel standing over the entry. B14, A10, T233, T239.
17. Tabbing out of the bookmarks or shortcuts card leaves it open. B72, T20, T320.
18. Held keys repeat: a held ⌃⌘. walks entry after entry; a held Enter after
    choosing a search result or a shortcut splits or overwrites; a held Tab
    re-whispers its refusal or nests on every repeat. B11, A107, T228, T241,
    T258, T324, T400, T419.
19. A caret scrolled into view can stop under the masthead. A67, T295.
20. An entry ending in a table has no line below it to click into. A48, T276.
21. A picture that finishes preparing while you type in Search takes the
    focus. A88, T58.

### 3. Editing that differs — help.html promises the old way

22. ⌘C of verse lines 2–3 writes a bare "::: verse", so they renumber from 1
    when pasted. A95, T110.
23. Enter in a countdown list (5, 4) repeats 4. A64, T292; T245 (help.html
    describes the old exception).
24. Enter in a paragraph under a list item makes a new item. A65, T282.
25. A heading or table inside a quote does not move with Tab. T256.
26. Line numbers stay while typing — help.html says they step aside. A18
    (help only).

### 4. Editing that differs — nothing promises either way

27. Enter inside a quote makes a paragraph break, saved as a blank quote
    line. A97.
28. The code button over two paragraphs makes two code blocks. A70, T62, T285.
29. The quote button with a caret in a three-paragraph quote lifts only that
    paragraph, splitting the quote. T422.
30. Shift-Tab on one run of a nested quote lifts the whole inner quote. T255.
31. `_italic_` typed at the start of a Shift-Enter line, or a quote's later
    line, stays literal. T268.
32. "- " typed on a middle line takes the line below into the item; "> " on a
    quote's later line nests a quote. T290, T291.
33. Copying items 4–5 of a list starting at 3 copies "3. / 4.". A94, T208.
34. A selection inside a code block copies wrapped in ``` fences. A96, T210.
35. Pastes: two lines inside an emphasised run split the paragraph; "> inner"
    inside a quote nests; a one-line "> ![](…)" pastes as text; a bare URL
    is not linked until a space. T214, T215, T217, A90.
36. A link can be inserted inside inline code. T10.
37. A refused ::: fence pasted in the rendered view says nothing. A81, T109.
38. " -- " and quote curling do not work in the markdown view. A59.
39. A wholly bold-italic row reads as a stage direction, not a speaker. T45.
40. A sub-page titled only by "##" gets no title; a heading inside a quote
    does not count. T155.
41. A quotation inside a note gets the quote's fill and rule. T125.
42. A ::: reference block is editable in the rendered view. A51, T195.
43. A page label sits on the marker's line, one line high where the line
    wraps before the page's first word. A24, T171.
44. A near-miss entry link ("#pagex") becomes a dead link, not text. T176.

### 5. The markdown view refuses what it used to do

45. The bookmark link button, "+ sub-page" and ⌃⌘N say "place your cursor in
    the entry" in the markdown view; the old app typed the link at the
    caret. B20, T8, T30.
46. With no caret in the entry, the link button and a shortcut insert at the
    last caret instead of refusing (help.html promises the refusal). B19,
    B68, T11.

### 6. Surfaces that do not catch up

47. An open Search ("Still loading…"), Go to list, bookshelf panel or
    backups status opened before the journal loaded keeps its first answer
    until reopened. B49, T145, T181, T394.
48. The line bar's boxes (Line, Page) are not re-asked when the entry
    changes under it. B64, T82.
49. A search result clicked after the query was edited further highlights
    the newer text. T388.
50. The format bar is not re-placed when a header row opens or closes. B15.
51. The hover copy button stands after a navigation until the next
    mouseover. A43.

### 7. Notices, labels, small things

52. The Line numbering choice is forgotten at every launch (it was kept on
    this device). A16, B54, T70.
53. A failed copy's pin copies its own failure text, not the markdown; it
    pins even after you have moved on. B88, B89.
54. Import: "nothing to import here" fades (it stuck); "import failed" no
    longer names the error or the doubled entry on screen. B95, B96, T313,
    T315, T317.
55. Export on a store that failed to read says "still loading" for the whole
    session. B93.
56. A picture whose write fails says "couldn't be read". T377. A lost
    picture copies or exports with no "missing image" mark. T211, T376.
    A hover-copied block's pictures do not survive outside this tab. A77.
57. The Tag button's tooltip is always "new sub-entry" (it named book,
    sub-page or tagged entry). A45, B45, T192.
58. Links have no "⌘-click to open" tooltip. A55, T272.
59. No favicon. T297.
60. A page number the layout cannot show scrolls anyway (it said "page X is
    not shown here"). B59, T83.
61. A bare launch leaves the address bar without today's #date. B101.
62. Chord letters are matched case-sensitively (Caps Lock unmeasured). B12.
63. A drag out of the line bar's box closes the bar. B63, T79.

### 8. Decided already, or no longer arising (no action)

B13, B103, B39, B41, B48, B100, B109, A5, A7, T43, T78, T238, T269, T281,
T300, T325, T395, T165 — each says where it is decided (corner.differences,
help.html, or a module comment) in its table row. Those decided only in a
comment (B39, B100, T165, T395) are owed a line in corner.differences.txt.

## help.html out of step with the app

Rows 14, 22, 23, 24, 25, 26, 46 above, and help.html:70 (the legacy
`<a name="#p…">` conversion, absent: T87 — no file in the corpus needs it,
MEASURED 2026-10-12: 0 of 13,939; the sentence taken out, asked
2026-10-12). Group 8's four comment-only decisions are listed as comment
lines in corner.differences.txt, no step reading them. Either the app or the sentence changes, item by item.

## Group 1, done (2026-10-09)

Each item played before its fix — under node against this app's modules, or
in headless Helium — and pinned after, the readings in the section "losing
nothing" of the shared steps failing on the code before (MEASURED, one run of
that section against the committed tree):

1. A fence's words after its language are kept (`rest` on the code block;
   roundtrip.test). Before: "```not code" saved as "```not".
2. The code button refuses a paragraph holding a picture or a page marker,
   "can't make a code block from that" (asked, the old app's words).
   Before: the picture deleted.
3. A paste of line breaks alone is nothing (paste.test). Before: the
   selection replaced by an empty paragraph.
4. No page marker leaves in any copy — ⌘C and ⌘X in both flavours, the hover
   copy, ⌃⌘R's passage (asked: always, as the old app did; cutting a
   paragraph within a book loses its marker too).
5. One export or import at a time. The whisper "an export is still running"
   cannot show while the export's own progress line holds the corner, by
   the ledger's rule; the second press opens no second picker (pickers 1,
   before 2 — INFERRED from the old code). An import pressed again while the
   first is at its picker or confirm does whisper.
6. A full store stops an import at the first refusal, "storage full —
   imported N of M" (asked), the layer now keeping each key's last write
   error (`writeError`, entries.test; importFiles.test).
7. Typing during an import: MEASURED before, the typing won and the open
   entry's imported text was lost, the tally whispered over by "saved".
   DECIDED (asked, option 1): an entry the import writes takes no typing
   until it ends (`Surface.lock`), then shows the imported text; other
   entries stay typeable. The import's keys from `importKeys` (tested).
8. A store that never answers pins "couldn't load entries — reload" after
   8 seconds, released if it answers after all (`?warm=hang` drives it).
9. Persistent storage is asked for at launch (watched in the step).

Found alongside: after "import" or "export" the focus stayed on the button,
so a space typed next pressed it again — the keys go back to the text
(asked), and after an import over the open entry the text has the focus
back. A reading that raced the save in the grid section ("the line made a
card, switched back") now waits for it.

### Review cycle 1 over `6021553..6ad3260` (c1509f5 and group 1), 2026-10-09

COST 114,218 tokens (2 input + 3,617 cache creation + 107,613 cache read +
2,986 output). Ten findings. FIXED, each test-first: ⌃⌘R's passage dropped
its page markers before building, so a page-turn row was quoted as a blank
line — now dropped as rows are written (reference.test); the code button's
refusal looked inside the selection only, while the button changes the
whole paragraph (format.test); the import lock stopped keys only — the
toolbar, the expander, Tab and Replace in the source still wrote — now a
lock plugin refuses every change (editor.test) and the source view's own
writes check it; a full store met on a picture write did not stop the
import (importFiles.test); a paste of line breaks alone was dropped in
code and over the editor's own HTML too (paste.test); a rename in the
markdown view left it — only an arrival opens rendered (surface.test);
three comments misplaced or speaking of another module. ASKED: page
markers on ⌘X and drag — KEPT "always removed", as decided. ASKED: the
8-second "couldn't load entries — reload" on a slow but live store — KEPT:
MEASURED, the whole backup (13,933 entries, 129 MB) imported into a
headless store loads in 565–638 ms over three reloads, so eight seconds is
a store that is not answering. REVIEW CYCLES: 1.

### Review cycle 2 over `6ad3260..e75a652`, the confirmation pass, 2026-10-09

COST 103,516 tokens (2 input + 2,178 cache creation + 93,849 cache read +
7,487 output). Seven findings, all taken. The serious one: a change the
lock refused still told the session it had changed — `tr.docChanged`, not
the state — so a toolbar command or an expander insert during an import
asked for a save of the old text over the imported one; now only a change
that landed is told (`landed`, editor.test; a headless step could not hold
a command inside a 0.3 s import, and its ⌘B over a locked view changed no
document, so it read the same on the code before — dropped). A paste of
line breaks alone carrying another app's HTML skipped the guard; the guard
now spares only the editor's own copy, `data-pm-slice` (paste.test). A
page-turn row in a quote that starts in prose kept a blank line
(`dropTurns`, reference.test). The code button's refusal looked at a range
cut at the shared ancestor, so a picture in a box's unselected paragraph
refused it; now every textblock the change reaches, whole (format.test;
the first test written was wrong — a quote's lines are one paragraph with
breaks here, so a picture there IS in the paragraph). A locked entry
refuses a pasted picture before storing it, and Replace does nothing on
it. A full store met on a later picture names the pictures already
written (importFiles.test). The rendered view's editable flag reads the
lock's own state. REVIEW CYCLES: 2.

## Group 2, done (2026-10-09)

Each item played first in headless Helium, over the build before the fix and
over the old app, in the shared steps' new section "where the keys go"; every
reading but one differs between the code before and after (MEASURED, one run
of the section on each), and the old app's run of the same section is in
corner.writer.txt. Rulings asked item by item, all as recommended:

10. ⌃⌘S, ⌃⌘B or ⌃⌘H pressed again closes the card with the keys back in the
    text. Before: no focus at all. An opener CLICKED again keeps the focus on
    the button, as the old app and the approved copy have it.
11. "Line numbering" clicked to close the row hands the keys back as ⌃⌘L
    does. Before: the focus stayed on the label.
12. NO CHANGE NEEDED. The inventory's B79 (INFERRED: no caret after the
    bookmark card's link) and this record's first reading ("in the link", a
    DOM boundary read) were both wrong: MEASURED, Z typed after the press
    lands after the link, outside it, before and after the group's changes
    (`[Links](#page/Links)Z`); insertLink.test pins it, a test that passed on
    the code before.
13. Tab in prose stays in the entry: a bare caret whispers "⌃⌘M toggles
    markdown", a selection "Tab indents one list, quote, or code block at a
    time" (asked, the old app's words). Shift-Tab there is left to the
    browser, as it was in the old app. Before: the focus walked to a
    masthead button.
14. In a rendered code block Tab inserts two spaces, Shift-Tab takes up to
    two back, a selection's lines shift and stay selected — the source
    view's rules, over the block's text (`codeTab`); ⌘A selects the block,
    a second ⌘A the page (`selectCodeBlock`). As help.html promised. Before:
    the focus walked out; ⌘A took the page (151 characters).
15. Escape after a search jump leaves the caret just after the match
    (asked); a selection the reader made, or any change since the jump, is
    not the jump's (`jump` plugin, `escapeJump`). Before: the match stayed
    selected. The old app removed the selection, no caret.
16. ⌃⌘M (either way) and an arrival at the entry already open close the
    panels, Search and the line bar; Go to and Line numbering stay (the
    old app's closeMastheadPanels). Openings `view` and `here`; `sourceView`
    retired. Before: Search and the shortcuts popup stood over the entry.
17. Focus leaving the bookmarks card or the shortcuts popup closes it; a
    focus going nowhere (a deleted row's button) does not. Before: both
    stayed open.
18. A held key acts once: the ⌃⌘ chords ignore auto-repeat (MEASURED by
    counting hash changes: 2 walks before, 1 after); the Enter that chose a
    search result or a shortcut is swallowed until its keyup or the
    window's blur; a repeated Tab in the rendered view is swallowed and a
    refusal is said once per press, while a held Shift-Tab still unwinds.
    Before: a held Enter split "defixo" out of 3pr2 and split the line
    after a shortcut; a held Tab nested a quote three deep.
19. A caret scrolled into view stops 24px below the masthead (the old
    app's margin; MEASURED 24 on both apps). Before: 5px from the window's
    top, under a 113px masthead.
20. An entry ending in a table is given an empty line below it, which
    serializes away (editor.test); a click there takes the caret. Before:
    "z" typed there was lost.
21. A picture that finishes preparing while the keys are elsewhere lands
    without taking the focus or scrolling (asked: land it, unlike the old
    app's refusal, whose insert needed the focus). The step holds the
    decode 800ms so the picture lands after the keys are in Search.
    Before: the picture took the focus.

help.html gains Tab in prose and Escape after a jump.

### Review cycle 1 over `0267d8c..8c3beff` (group 2), 2026-10-10

COST 141,479 tokens (2 input + 920 cache creation + 138,237 cache read +
2,320 output). Eight findings, seven taken, each test-first or pinned by a
step that reads differently on the code before (MEASURED, one run each):
a code block inside a quote never reached its own Tab or ⌘A — the quote's
keymap took the key and refused it — so the code keymap now runs first
(editor.test); Tab in a code block replaced the whole block's text, so every
position in it collapsed to the block's end and the undo step was the
block — each changed line's own span is replaced now (editor.test); a
refused entry redrawn by another tab's write closed Search under the reader,
the surface telling its forced view on every show — only the ⌃⌘M chord
closes what stands over the entry now (`onSwitch`; the surface's own
switches close the line bar, as before; step "a refused entry redrawn under
Search": closed before, open after); a digit or Enter held on the bookmarks
card typed into the entry it opened (3 characters before, 0 after) — and
the five held-key guards (two chord lists, the Enter flag) are one capture
listener: a repeat is swallowed when ⌃⌘ is held, or when the press moved
the focus elsewhere (a held Tab walking the masthead's controls now walks
once, INFERRED from the rule); the masthead's bottom was read with a forced
layout at every keystroke's scroll — its height is cached by a
ResizeObserver (the 24px reading unchanged); the two focus-out handlers
are one. NOT TAKEN: the editor's once-per-press flag duplicating the
notices' refuse — the keymap's commands see no event, so the press is
known only where the flag is. REVIEW CYCLES: 1.
Accepted 2026-10-11 (1e50310); the held Tab in the masthead was put to
him as a question and not answered before the accept. A confirmation pass
(cycle 2) offered, runs only on his word.

A HELD TAB MOVES ONE CONTROL, asked 2026-10-12. Separate presses of Tab
are the same in both apps: each press moves the focus one control. They
differ only while Tab is HELD DOWN: the old app keeps moving, the
keyboard's auto-repeat carrying the focus on — from the bookshelf button
through ten more controls to Go to in about a second (MEASURED headless,
11 keydowns) — while here the focus moves once, to the pages button, and
stays there until Tab is let go and pressed again (MEASURED). Shown that
example, he preferred held Tab not to repeat. A decided difference from
the old app, pinned by the step "Tab held from the bookshelf button".

Group 2 CLOSED at 1 cycle: offered the confirmation pass, he started
group 3 instead (2026-10-12).

## Group 3, done (2026-10-12)

Each item played first in headless Helium over both apps, in the shared
steps' new section "editing as the help says", seeded by a store write (a
countdown typed into the old app's source view came back split into one
list per line, MEASURED). Asked: "22-25 should definitely go back to doing
what the old app did"; 26, the help sentence deleted. MEASURED before →
after, the old app's reading the after's in every row:

22. Lines 2–3 of a verse copied with ⌘C: `::: verse` → `::: verse 2`. The
    copy is numbered from its first copied line by the stamp the Ref
    button's passage already used, moved to numbering.ts so the copy and
    the reference share it (paste.test).
23. Enter after 5, 4: `4.` → `3.`. The old app's rule, READ in
    ../writer/src/js/08-markdown-as-you-type.js:654: the new item's number
    is the previous one plus the step between the two above it; a step of
    one writes no number (listKeys.test).
24. Enter at the end of an item's second paragraph: a new item `2. next`
    → a new paragraph in the same item. And, found while checking the help
    text (help.html:78, "Enter again on the empty block steps out to a new
    item"): Enter on that empty paragraph made another empty one → steps
    out to a new item (old app: `next\n2. out`, MEASURED) (listKeys.test).
25. Tab in a quote with the caret on a heading: nothing → the heading
    nested alone (`>> ## Quoted head`); in a table: nothing → the table
    nested whole; Shift-Tab lifts either back (quoteKeys.test). The
    module's own header already promised it.
26. help.html's "While you are typing the numbers step aside … when the
    entry saves" deleted. MEASURED: the old app's numbers vanish while
    typing (none drawn 60ms after a keystroke) and return on the save;
    here they stay and renumber at once — a decided difference, listed.

### Review cycle 1 over `3bcc9f7..33dfdc2` (group 3), 2026-10-12

COST 120,954 tokens (2 input + 3,467 cache creation + 115,031 cache read +
2,454 output). Ten findings. TAKEN, five: a copy opening at the end of a
line carried an empty first row that read back as a gap, every line under
it numbered one too low — it starts at the next line now (paste.test,
failing first as the review MEASURED it); the clipboard's text was made
from a slice already transformed, the renumber and the closing run twice —
the text serializer takes the transformed slice as it is (READ in
prosemirror-view, `transformCopied` then `clipboardTextSerializer`);
numbering.ts's header said nothing writes a number into the document, and
a copy now writes a fence's start — it says the start is the one number
held; the step "a line typed into verse" read only the labels, `5 10`
either way — it reads the line beside each (`5:four line` after a line
typed above it, here while typing, the old app none until the save); the
item count was spelled twice, Enter's and the serializer's — one
`itemNumbers`. NOT TAKEN, two: a copy from inside `::: stanza 12` comes
out `::: verse 3` — help.html says a passage copied from the middle of a
stanza is written as plain verse numbered from where it starts; a card in
a grid in a quote nests the grid — help.html names the grid as moving
whole, a card directly in a quote moving alone. PUT TO HIM, three, the
old app's rule ported under his ruling and MEASURED the same in both apps
by three new steps: Enter after the first item of 5, 4, 3 makes 6; Enter
after 4 in 5, 4, 3 makes a second 3; Enter after 5 in 1, 5, 6 makes 9.
REVIEW CYCLES: 1.

THE COUNTDOWN LEFT AS THE OLD APP HAS IT, asked 2026-10-12: "let's leave
it for now. We can define reverse list behaviour when we next add one."
His expectation, for then: Enter after 5 in 5, 4, 3 makes 4 and renumbers
the rest 3, 2; after 4, makes 3 and renumbers the old 3 as 2. Why it can
wait (MEASURED over the backup's 13,938 files): no list counts down. The
one real countdown, page/Marginalian/2024-10-22-marginalian-18, 18 to 1 in
a quote, has a blank quote line between its items, so it is 18 one-item
lists; a jump like 1, 5, 6 occurs in no tight list.

PARKED, asked 2026-10-12 ("stick a pin in it"): tab-indented text read as
a code block where it is not code and should read as a quote — found in
journal/1995/1995-03-26 (the terraces of Purgatory, numbered lines
indented with tabs, parsed as one code block, MEASURED). Not yet counted
across the corpus.

Cycle 1's fixes accepted 2026-10-12 (53a1547).

Group 3 CLOSED at 1 cycle: he skipped the confirmation pass (2026-10-12).

## Group 4, done (2026-10-12)

Asked: run group 4 "until it meets the criteria of working like the old
app"; the review lighter, this being the old app's behaviour restored, not
new UI. Every item played first over both apps in the shared steps' new
section "editing as the old app does"; after: every reading the old app's,
or a decided difference listed with its reason (MEASURED, 0 open). Before →
after, test-first unless named a step:

27. Enter in a quote: a blank quote line → a line break; on the empty last
    line it leaves the quote (quoteKeys.test).
28. The code button over two paragraphs: two blocks → one, a line each,
    its text left selected; a selection grazing the next paragraph's start
    leaves it (format.test).
29. Already the same: the quote button lifts the three paragraphs on both.
30. Shift-Tab on the middle run of a nested quote: the whole inner quote →
    that run alone (quoteKeys.test). The stored spelling differs (no blank
    quote line between a quote's blocks here), listed.
31. `_italic_` at the start of a Shift-Enter line or a quote's later line:
    literal → italic (typing.test).
32. `- ` on a middle line: the line below rode into the item → stays its own
    paragraph; `> ` on a quote's later line: a nested quote → text
    (typing.test).
33. Items 4–5 of a list from 3 copied: `3. / 4.` → `4. / 5.` (paste.test).
34. A selection inside a code block: fenced → its characters (paste.test).
35. Two lines in an emphasised run: already the same. `> inner` in a quote:
    nested → text; a one-line `> ![](a.png)`: text → a quote; a bare URL
    pasted: linked on the next space → linked at once (the inventory had it
    right; a seed losing its space hid it in the first run) (paste.test).
36. A bookmark's link in inline code: inserted → "no link inside a code
    block" (insertLink.test), and every press of a row's link now hands the
    keys back to the text (step: "none" → "inside a line").
37. A refused fence pasted: silent → pinned with its reason, released by the
    next entry as a stored refusal's is (paste.test, surface.test).
38. ` -- ` and quotes in the markdown view: literal → a dash and curls, never
    inside a fenced block or a code span (sourceKeys.test; INFERRED that the
    old app skipped code there too — not played).
39. A wholly bold-italic row: a stage direction → a speaker (numbering.test).
40. NOT CHANGED, decided: an entry's title is its first level-one heading
    everywhere (the successor plan's decision 5, the Horace shelf corrected
    in the data to it).
41. A quotation in a note: filled and ruled → neither (the step).
42. A reference block in the rendered view: editable → inert, a click
    puts the caret at its start and whispers "Reference style is edited in
    the markdown view (⌃⌘M)" (editor.test).
43. A page label where a space follows its marker: a line high (8 of 60,
    MEASURED) → beside its leaf's first word, measured (folios.test; the
    step: 0 of 72 here, 9 of 72 in the old app, whose own rule this is —
    listed). 226 such markers in 103 files of the backup (MEASURED), Lewis's
    Preface among them.
44. A near-miss entry link pasted: a dead link → text (paste.test).

Decided differences listed: the quote button's caret (stays put here), the
nested-quote spelling, the list copy's selection count, the page labels.

A hand-check list of 19 steps over one scratch page, every item but 29
and 40, played headless in its order first (all but the Lewis page labels,
which hang on the window's width), handed over 2026-10-12; 8e222c2
accepted 2026-10-12. Review: offered as one cycle at high over
e1681fe..8e222c2, or none, the reader having called restored behaviour
less strict for review; asked for, 2026-10-12.

Review cycle 1 (/code-review high, e1681fe..8e222c2): 137,761 tokens
(MEASURED, the transcript's last message), 10 findings, all taken:
1. The markdown view's own insert re-entered its input handler and curled
   the straight quote a second quote puts back: `"b""` read `“b”`, the
   second quote lost (MEASURED in Helium on the unfixed src; the old app
   reads `“b"`). A guard around the insert; the step types `"b""`.
2. Shift-Tab on the blank line between two runs of a nested quote split
   the inner quote round an empty paragraph: refused, saying "⌃⌘M toggles
   markdown" as Tab there does.
3. The reference block took a join from either side, a cut, a mark: a
   transaction filter refuses any step reaching into one, a change taking
   it whole still landing.
4. A code block inside a quote or a note copied fenced: the copy walks
   down to the innermost block. (A list item cannot hold a code block in
   the schema, so the finding's list case does not arise.)
5. The code button where nothing changes (a verse line) swallowed the
   press: refused again, so the corner says why.
6. A picture in a paragraph the selection only grazes refused the code
   button: the refusal reads the same range the change does.
7. Quotes curled inside a link's address and title and a bare address in
   the markdown view: left alone there.
8. A list copy opening at an item's end copied an empty item: it starts at
   the next item, as a verse copy does.
9. The page labels' measuring scheduler was the margin-notes' copied: one
   `measurePass`, and the labels' pass walks the document once, not twice.
10. Two comments named another module's behaviour: rewritten.
Seen and not taken (the reviewer's cut list): a "- " typed before a blank
line in a quote leaves a hard break at the next paragraph's start, the
saved text unchanged; a pasted refusal's pin replaces any stored fence
refusals already pinned. REVIEW CYCLES: 1.

## Groups 5–7, one batch (asked 2026-10-12)

Asked: groups 5–7 built as one batch with one review at the end. Each item
restored to the old app's behaviour, read from both codes first (two
research passes, READ), except where noted:
- 56, asked 2026-10-12, as recommended: (a) a picture whose write fails
  says "picture not saved — storage full"; (b) an export names its lost
  pictures in its tally ("exported N entries — 2 pictures missing"), the
  exported text keeping each picture's name for a re-import; (c) a
  hover-copied block's pictures travel in the HTML flavour only, the
  markdown keeping the name, as stored.
- 60: no action — a folded section is opened before the jump, so no
  folio is left without a box (INFERRED); recorded, not asked.

Built (2026-10-12), test-first: the pure parts in Vitest (the Tag title,
the link title, the missing-picture count, the lifecycle's caret and
markdown-view link), the wiring in a new step section, "notices and
surfaces as the old app has them", played over both apps and over the
unfixed src, every step's reading moving with its change (MEASURED):
45. The bookmark card's link, "+ sub-page" and ⌃⌘N type `[label](href)`
    after the caret in the markdown view, undoably, as the old app's
    "+ sub-page" did (it had no ⌃⌘N).
46. The caret is read when the bookmark or shortcuts card opens and when
    "+ sub-page" is pressed: none in the entry says "place your cursor in
    the entry" and inserts nothing.
47. Search, the Go to row, an open page or bookshelf panel (once the
    pointer and the keys have left it) and the backups status are
    answered again when the journal read ends, well or badly.
48. The open line bar's boxes follow the entry under it; a box hidden
    under the focus hands it to the one shown.
49. A result clicked after more typing highlights what it was found for.
50. The format bar is re-placed when the masthead changes size.
51. The copy button goes with its block on a navigation or ⌃⌘M.
52. The Line numbering choice is kept in this browser
    (gesta.v1.lineinterval); a failed write says "line numbers not saved
    — storage full".
53. A failed copy's pin copies the markdown; a failure landing after the
    entry changed is whispered.
54. "nothing to import here — …" sticks; two files for one entry say so on
    screen; any other pick failure names its error.
55. Export on a store that failed to read says "couldn’t load entries —
    reload first".
56. As asked, above.
57. The Tag button's title names the namespace's noun.
58. Every link says "⌘-click to open".
59. The old app's icon, inlined by main.ts (a `<link>` in index.html was
    emitted as a second file).
61. A bare launch writes today's #date into the address.
62. ⌃⌘ letters match in either case.
63. A drag that began in the line bar does not close it.
Committed f5b97a0. The compare: 419 steps, 0 open; seven differences
listed with their reasons (two cursor arrivals, the Import button's
hand-back, 56a as asked, the line bar's re-ask on another tab's write,
?warm=slow being the successor's probe). One gap the compare found and
fixed before the commit: a shortcut refused for want of a caret left the
keys nowhere; they go back to the entry, as the old app's did. Seen in
the hand-check probe and not taken: the hover copy button can stand over
the line bar's Line box when a hovered block's top is under the masthead.

068a671 (group 4 review cycle 1) and f5b97a0 (groups 5–7) accepted 2026-10-12.

Review cycle 1 of groups 5–7 (/code-review high, 068a671..f5b97a0):
127,726 tokens (MEASURED, the transcript's last message), 10 findings, all
taken:
1. The Go to row was never re-answered after the warm, opening it putting
   the focus in it: re-answered while nothing has been picked, the focus
   put back on its first select (a step, "Go to opened before the warm").
2. A panel holding the keys but not the pointer waited on a mouseleave
   that never came: it waits on the pointer alone, its rows keyed by
   address so the keys stay put (a step, "the bookshelf opened before the
   warm, the keys on its button").
3. A Line numbering write that failed blocked the change and left the
   select and the gutter disagreeing: the change is made and the failure
   said. (The old app blocked it; not asked — an edge of a full store.)
4. The markdown view's link went into whatever entry was shown when the
   write landed: the entry is checked too (lifecycle.test).
5. The markdown view's link was spelled by hand, unescaped: one
   `linkMarkdown`, the serializer's spelling (insertLink.test).
6. "⌘-click to open" rode out in every HTML copy: it is the editor's own
   drawing of a link, and a hover copy strips it.
7. `after` promised to leave the selection standing and did not: the
   contract now says what both views do, as the old app's insert did —
   typed at the selection's end, the caret after it (keeping the
   selection left the caret before the link, MEASURED in the full run).
8. Every failed picture write said "storage full": only a full store
   says so, and the pin copies the error.
9. Two comments named another module; the export's warm-refusal comment
   pinned a test that does not reach it: trimmed, the latter dropped.
10. The undoable insert was written three times: one `typeInto`; the
    picture pass skips HTML holding no picture.
REVIEW CYCLES: 1.

276cfb3 accepted 2026-10-12; no confirmation pass asked for: groups 5–7 closed at REVIEW CYCLES: 1.

ffd4596 accepted 2026-10-12. THE INVENTORY IS CLOSED: groups 1–7 built and accepted, group 8 listed, help.html in step.

THE PARKED FENCES, taken up 2026-10-12 (asked): prose read as code is
prose stored in ``` fences with no language, not indentation read as
code (1995-03-26's passage is fenced in the stored text, READ). The fix is
the text's, once: tools/fencedProse.ts (pure, its test beside it) sorts a
bare fence as prose, code, a layout (columns of tabs, spaces or pipes,
lines indented apart) or unsafe (a quotation would read as other words),
and makes the prose a quotation; tools/fencedProseRun.ts runs it over the
backup into ~/Desktop/gesta-imports/gesta-fenced-prose with a review page
beside it. Over 13,939 entries (MEASURED): 777 fences made quotations in
203 entries, 118 kept for their layout (1995-03-26 among them), 811 kept
as code, 19 kept as unsafe, 71 left as asked — the gesta-wrangling
entries, which record terminal text, and 1996-02-08:13. The import
overwrites existing entries: run it from a backup taken just before.
Asked 2026-10-12 as the review was read: wrapped prose joined a line a
paragraph, lists and verse a line each; /text/ italic and Emacs
[[address][label]] links read inside the quotations; 2011-12-01:18 and
2018-12-29 kept as code. Run: 774 quotations in 201 entries. Next, asked:
after this import, a second pass with its own review over the entries'
ordinary text — 220 Emacs links in 121 entries, 110 slash spans in 80
(MEASURED; a code comment `/* … */` among them, so not every pair is
italic).

THE FENCED PROSE IMPORTED. Asked as the review was read further: every
entry of 2026 left whole ("almost all gesta-wrangling"), 2018-12-29 too;
`/x/` italic inside brackets as well, [/Purg/ 31.44-5] → [*Purg* 31.44-5].
Final run: 752 quotations in 188 entries (MEASURED). Imported; the backup
afterwards matched 187 of the 188, the 188th, 2022-11-05, carrying a later
correction typed in the app, uuna → una (MEASURED).

THE OLD SPELLINGS, the second pass, asked: "fixing the Emacs links and
Emacs italics left over in the text, starting again with the review page
before making changes". tools/oldSpellings.ts (pure, its test beside it)
respells an entry's text outside code — a fenced block, a code span, an
address, a link's destination: an Emacs link to an address
`[[address][label]]` → `[label](address)`, its label's marks kept, a link
read whole across a line break; text opened and closed by slashes italic.
Asked as the review was read: a link whose target names an existing day
of the journal is a link to that day (`[[file:1991.org::#19910621][21 June
1991]]` → `[21 June 1991](#1991-06-21)`); a span opened by one mark and
closed by the other — a slash with an underscore or a star either way
round — is italic (1987-10-23:3, 1993-01-17:1). Left as they are: a pair
with no slash, a comment's `/* */`, and any other double-bracketed name.
tools/oldSpellingsRun.ts writes ~/Desktop/gesta-imports/gesta-old-spellings
with a review page beside it, holding back an entry whose words would read
differently. Final run: 96 Emacs links and 162 italics in 185 entries, 0
held (MEASURED). Imported 2026-10-13: the backup matches all 185, and the
pass run again over it changes 0 entries (MEASURED). Left in the text: 124
double-bracketed names in 73 entries — 67 naming .org files, 24 `file:`
links naming no day, 7 `#` anchors, 26 others (names, the phonetic [[w]] of
1990-11-30, and 2022-04-26's "previous" link, whose target names 2002-04-19
under the label Tuesday 19 April 2022) (MEASURED).

THE FENCES EMPHASIS HELD BACK, asked 2026-10-13 after 2022-04-19's
Jinnee passage was found still fenced: the words check had read a star or
an underscore typed as emphasis (`*me*`) as words changed, and kept 18
fences as unsafe (MEASURED). The check is now blind to `*` and `_`, and the
quotation is spelled as it reads back (`_yes_` → `*yes*`). Run again over
the backup into ~/Desktop/gesta-imports/gesta-fenced-prose-emphasis, the
eleven fences put to him: 11 quotations in 10 entries (MEASURED). Left:
2022-04-19 (his to rewrite by hand), 2015-06-29:8 (a comment block), and
2023-02-17:114 and 2023-03-09:49, which I had misread as unsafe from
their marks and kept out of the eleven; both read back right (MEASURED),
and were added, asked: 13 quotations in 12 entries (MEASURED). 2015-02-05, 2015-07-18 and 2019-01-11 stay unsafe (code).

THE KEPT FENCES ASKED FOR AS QUOTATIONS, 2026-10-13: 29 fences named from
the review's kept list, put into the same folder. A fence named is a
quotation whatever it reads as, its layout kept: each line's indent past
the least (a one-space lead is a wrap's, not an indent), its inner
spacing, wrapped prose joined except an indented line or a table's row.
Asked shapes: 1995-06-12:35 its four tabbed lines a quotation inside it;
1995-06-12:88 a list of three with two sub-lists. Found reading the run:
the words check blind to every star and underscore let 1997-07-29's
`/____/` rules pair across the quotation's lines, the text between turned
bold (MEASURED). The check now passes a star or underscore only where it
opens or closes a word, and a quotation whose marks run over a line break
keeps its fence. 1997-07-29 asked for all the same: a rule line, no letter
and a run of underscores or stars, is written as code, so its marks stand.
Slash italics need a letter inside. Asked after: in a layout, a paragraph
indented whole is a quotation inside the quotation, indented paragraphs in
a row one, their blank lines kept (2023-03-24's tweets); a paragraph only
partly indented is verse and keeps its indents. Result: 41 quotations in 32 entries,
no emphasis running over a line break (MEASURED). The same look over the
whole backup: 12 entries with emphasis over a line break, all a `*…*` span
typed over several lines, none made by the two imported passes (READ).

PARKED, 2026-10-13, his suggestion for another pass: a two-column pipe
table, where it pairs a text with its translation, made a `::: verse`
block with `|` pairs. Over the backup (MEASURED): 670 two-column pipe
lines in 21 entries, 6 of them in 2026 (the wrangling entries' terminal
tables among them), 439 lines in 2023-09-18 alone, 36 in page/Tres
Leones. Not every one pairs a text with a translation (INFERRED); each
wants reading before a rule is chosen.

THE PIPE TABLES, taken up 2026-10-13 (asked, "with the review preview").
tools/pipeTables.ts makes a two-column table a `::: verse` block of pairs:
the divider dropped, an empty row a stanza break, a column of line
numbers the block's first number, table pieces apart only by blank lines
read as one (2017-11-24's Inferno 7, broken into scraps on its way in).
Asked as it was read: a table quoting a text already on the bookshelf is
the reference ⌃⌘C makes for that passage, the bookshelf's own lines
(his example, Inferno 7.115-30; the tool's highlight is byte for byte
his, MEASURED). tools/bookshelfQuotes.ts places the passage — lines
compared as letters and numerals alone, one line in a passage of three
or more allowed to differ — and calls the app's referencePayload over a
selection of those lines. A table after a line ending in an old Emacs
link and a colon makes that link the reference, its words kept, and is
the passage alone. Left: a picture, a single row, more than two columns,
numbers that do not run on, the 2026 entries, 1997-10-24's signature and
2024-08-27's grid of words (both by reading). First run: 16 references
and 30 verse blocks in 20 entries.
Asked as the review was read: a translation in other words than the
bookshelf's is no bar ("we don't need to preserve that for this
entry"), so the original alone places a passage; and thirteen tables of
three columns named as references or verse, their first column labelling
the lines (`<<par-1-103>>`, `2-19-7`, `<<eh-1>>`, a number, nothing) —
such a column is dropped, a number starting the block. Every range he
named is the one placed (MEASURED), but 2022-11-17:198, named
"Purgatorio 2.58-63", is 19.58-63 by its labels and the bookshelf's text.
2017-11-15 quotes Odes 3.29 in another edition, seven of its twenty lines
differing, and is given its passage by name (29-48). A page made verse by
this run is quoted as it will stand (2022-07-31 refers to Tres Leones);
an entry never quotes itself; a speaker's row is matched as a row. Run:
29 references and 30 verse blocks in 31 entries (MEASURED). Asked after:
2023-04-08 a reference to Cavafy, The First Step 17-24 (the translation
alone quoted, numbered a line on) and 2023-03-22:33 to Housman, Last
Poems 25, 9-12, both named. He took ten references for linkless: their
link is in the sentence before, which the review page did not show; it
shows it now, and the run stops on a reference with no link. Run: 30
references and 29 verse blocks in 31 entries (MEASURED). He asked why
2026 went unread: the skip was the fenced-prose pass's, carried over
unasked. Read, 2026 adds one table, Jesu bleibet meine Freude (verse; not
on the bookshelf); its two data tables, 2026-06-26's key bindings and
2026-07-16's language codes, are left by name. Run: 30 references and 30
verse blocks in 32 entries (MEASURED). Asked after: a single-column
passage (the Housman, the Cavafy) is quoted as a verse block numbered
from its first line, where ⌃⌘C quotes it as bare lines by a pinned
decision; the tool wraps it, the app is unchanged (asked of him).

⌃⌘R QUOTES SINGLE-COLUMN VERSE AS A NUMBERED VERSE BLOCK, asked
2026-10-13 ("⌃⌘R for creating a reference should probably do the
numbered `::: verse` block"; ⌃⌘C, the entry link, quotes nothing and is
unchanged). A plain verse block's passage now copies as its own fence
numbered from its first quoted line, as a dual-language block's did; an
ink-less row in it is a gap. Prose and a stanza's lines keep their bare
quoted lines: a stanza counts from its own first line, so a run from
inside one would be numbered wrong. Reversed a pinned decision; the unit
tests changed first (reference.test), the help card says how each kind is
quoted, and a new shared step, "⌃⌘R on verse lines 2–3", reads it in
headless Helium (MEASURED), its difference from the old app's bare lines
listed. Hand-checked in his Helium on Housman, Last Poems 25.9-12: the
clipboard held the reference minted by the same code, byte for byte
(MEASURED). 8df275e accepted 2026-10-13. src/editor/reference.ts is no
DOM seam and this closes no phase: no review by the review shape.

THE OLD .ORG LINKS, asked 2026-10-13 ("do the .org links pass with a
review page"). 113 double-bracket links left in the text (MEASURED).
tools/orgReferences.ts makes each one resolved a markdown link, its words
kept; a link whose line ends in a colon, nothing but marks between,
introduces the quotation under it, which becomes the bookshelf's passage
as ⌃⌘R quotes it. tools/orgReferencesRun.ts resolves: a year file's link
to the day its label names, else the day its anchor still stands in (8
anchors survive as `<<name>>`); a text's file, mapped by hand to its
place on the bookshelf, by its quotation (verse as the tables were;
prose — the Doctor Who scripts — by its first and last lines, speakers'
names aside, the episode the label names first, then the earliest), by a
line anchor (`purg-8-28`, `1-254` with the label's range), or by the
anchor's own words or episode number. Found reading the run: the Tao
Te Ching page holds Inferno 30.130-2 too, so a quotation named after a
link was placed in the link's text — the colon rule now needs the link
last; "One day I shall come back" placed in The Five Doctors, which
quotes The Dalek Invasion of Earth, before the episode order. Run: 18
day links, 9 references with their passages, 9 bookshelf links, in 28
entries; 77 left: names and numbers, texts not on the bookshelf, working
files, days its label does not name (MEASURED).
Asked after: 2008-01-28's Brenan link is his own ⌃⌘R reference into
2016-02-06, given by name. Found with it: the old anchors stand in the
text still as Org property drawers (`> :CUSTOM_ID: brenans-vision`), so a
year file's link whose day its label does not name is placed by its
drawer — under a `##` section, the section's first quotation highlighted
(else its first paragraph); under none, the entry itself. Run: 25 day
links, 9 references with their passages, 9 bookshelf links, in 35
entries; 70 left (MEASURED).
Asked after: four more given by name, each his own ⌃⌘R reference
(2015-07-20's Figure of Beatrice pp. 22-25, 2016-02-06's Beatrician
vision, 2016-02-07's Four Loves, 2016-02-14's Alford), kept with
Brenan's in tools/orgReferencesNamed.json; each address taken from the
session's transcript, not retyped, and its highlight found in its entry
(MEASURED). The link keeps his words; the passage is not set under it, the
link standing mid-sentence. Run: 24 day links, 9 references with their
passages, 11 bookshelf links, in 36 entries; 69 left (MEASURED).

THE ORG DRAWERS, asked 2026-10-13 ("do the drawers pass with a review
page"). 24 property drawers in 21 entries, every one `:PROPERTIES:`,
`:CUSTOM_ID:`, `:END:` (MEASURED). Seven old `[[#anchor][label]]` links
still pointed at them, so tools/orgDrawersRun.ts first points each at its
anchor's place by the drawer rules, highlights read against the entries as
the run leaves them (a target paragraph held an old link of its own,
whose text the run changes), then clears every drawer with the blank line
after it (tools/orgReferences.ts, clearDrawers), the words checked to lose
the drawers' alone. Run: 7 links, 24 drawers, 23 entries (MEASURED). A
look over every highlighted in-app link in the backup with this folder
laid over it: 229 of 239 find their words; the 10 others name entries no
longer filed under those names (Doctor Who's series level, a page moved)
— links broken before today, put to him (MEASURED).
Asked after: 2015-07-20's Four Loves section, its drawer cleared, has its
quotation made the reference to its passage (Eros); the minted link is
his own for 2016-02-07, byte for byte (MEASURED), the passage the
bookshelf's words ("this high condition" where the entry had "the"). The
prose matcher now places a long line by its opening and close, sixty
letters each, so a word changed inside does not part it.
Asked after: 2016-07-25's "the vision after the Florence film" highlights
the whole two-paragraph passage he gave in 2016-02-22, named by its first
and last words (a span named so may run any length; a quotation placed
by its lines may not run four times its own).
Asked after: the ten links to entries filed anew (Doctor Who's series
level gone, Sean's Books 68 renamed, the Figure of Beatrice now in
chapters — its highlight in 7, Scivias Book 1/Vision 4 now 1.4) are
repointed in the same folder, the address alone rewritten in the text.
Found doing it: the store's rewriteLinks, which a sub-entry's rename
uses, rebuilds a link's label with its first piece's marks, so
`[Doctor Who, *The Zygon Inversion*]` lost its italics (MEASURED, a run
over 2023-09-17) — put to him, not fixed here. Run: 7 links, 1 quotation
made a reference, 10 links repointed, 24 drawers, in 31 entries; every
one of the backup's 240 highlighted links finds its words (MEASURED).
The sub-entries step ("the day's body ends with the link") flaked again
under a full verify; it now waits for the click's selectionchange before
End, as the source-view and bookmark-link steps do, and a full run after
reads as approved (MEASURED). The rename's label loss confirmed by a
probe: `[the *Ideas* page]` retargeted reads `[the Ideas page]`; a label
wholly italic keeps its marks (MEASURED).

A RENAME KEEPS A LINK LABEL'S OWN MARKS, asked 2026-10-13 after the
import ("I'll import first, then fix the rename bug"). rewriteLinks
rebuilt a link's label as one text with its first piece's marks, so a
sub-entry's rename took the italics out of `[the *Ideas* page]`. Where
the label stays, only the link's mark now moves (links.test, red first).
A shared step in a last section of its own, "renamed under a label part
italic", reads the host's link after a sub-page's rename in both apps:
`[the *Ideas* page](#page/Rename%20Host/Plans)` (MEASURED, 0 open); last,
because the old app keeps a deleted page in its scope lists. The step
opens the host first: seeded behind the app's back, a host not yet read
was not in the cache the rename retargets through.
c96a959 accepted 2026-10-13 on the headless reading. src/store/links.ts is no DOM
seam and this closes no phase: no review by the review shape.

MILTON QUOTED LINE FOR LINE, asked 2026-10-13 ("look for other bits of
Milton in the journal entries and turn them into references, usual
drill, review first"; 2022-02-15's "PL 3.17-8:" his example).
tools/shelfLines.ts finds runs of consecutive lines, quoted or bare, that
are an author's verse on the bookshelf (Paradise Lost, Lycidas), carrying
through a line spelled otherwise when the next goes on (1993-06-12's
1.242-63, Milton's "hee"); a run under 30 letters is no quotation; code
and a quotation already under a bookshelf link are left. A run after a
short citation ending in a colon makes the citation the link in its own
words; any other gives way to the whole ⌃⌘R reference. Left by name: the
four entries quoting Paradise Lost 1.254-55 as the reference feature's
test data (gesta-wrangling, the Verity Cards snapshot and page). Run: 110
references, 570 lines, in 54 entries; every one of the 350 highlighted
links then in the backup and folder finds its words (MEASURED).
Asked after: 1988-04-11 is 3.682-85, not -84 — its last line spelled
"Heav'n" against the bookshelf's "Heaven" ended the run. A differing line
is now carried also when it is close to the passage's own (letter pairs
shared by Dice's measure ≥ 0.8). Run: 110 references, 587 lines, in 54
entries (MEASURED).
Asked after: 1996-10-06 is 12.646-49 (he named 648-49, seeing the review's
two lines) — a closing `<br/>` kept three lines from matching, and a stray
blank line split the first from the rest. A line's closing `<br/>` or `\`
is now off its verse, and a blank line is carried when the passage's next
line follows it. And 2000-03-18 is 3.681-89 — its last line, "Where no ill
seems.", half of 689. A run's last line that starts the passage's next
line, ten letters or more, is now carried: 24 runs gained their closing
half-line, three read in their entries (2022-11-13, 2006-10-11,
2002-10-30), each a half-line. Run: 110 references, 615 lines, in 54
entries; 112 highlighted links in the folder, each finds its words
(MEASURED).
Asked after (2002-10-16 is 9.994-97 and 2006-10-06 is 2.170-72, both
already so by the change above; "can we run a check for more half-lines"):
a probe over every run read the line either side against the passage's
neighbouring line. It found 30 opening half-lines and first lines spelled
otherwise, and one closing half-line under ten letters ("Illumine …"). A
run now reaches back over lines that are the passage's own spelled
otherwise, the first of them perhaps a half-line; a half-line is six
letters or more, and from eight letters two letters' change is allowed
(fixt, mee); a line joining two places with an ellipsis is not carried
(2020-03-28 "His malice …That space…"). Two left, as the probe reads
them: that line, and 2020-03-04's last line with "{ *Paradise Lost*,
8.546ff }" after it. Run: 110 references, 646 lines, in 54 entries; 112
highlighted links, each finds its words (MEASURED).
Asked after: 2019-12-04 quoted 11.553-54 at `>>` inside a quotation of
his, and the reference was set at the outer level, splitting his
quotation in two; the review's green showed the reference alone, so his
lines either side read as lost (they were in the file, MEASURED). A run
quoted at depth two or more now keeps the outer levels, the reference
inside the quotation and its passage a level in (15 runs; each nested
verse parses as verse inside two quotations, MEASURED); the review's
green is the same window as its red, as the entry will read. Two
single-level quotations that go on past the verse (2025-10-03,
2025-10-27, a card's citation, the verse, more notes) are still split
around it. His bookshelf fixes in the same pass — 9.1016, 6.60, 10.710
’gan, 5.802 and 5.848 a closing quotation mark — each regenerated after
the backup took it; 1995-07-29 (9.1016) and 2020-03-28 (5.802) changed,
the others fall in no reference. Run: 110 references, 646 lines, in 54
entries; 112 highlighted links, each found by the page's own finder over
the backup (MEASURED).
Asked after: 2020-03-28's "His malice …That space the Evil one abstracted
stood" is 9.459-61 and 9.463-65 — the line joined with an ellipsis closes
the first run with its words before the ellipsis, a half-line of 461, and
opens the second with its words after, 463. Such a line now gives way
only when both its places are the runs' — 2020-03-04's "Authority and
reason on her wait. … 1 { *Paradise Lost*, 8.546ff }" stays whole, his
note with it — and inside a quotation the two references share one
quoted blank between them. Run: 110 references, 648 lines, in 54
entries; 112 highlighted links, each found by the page's own finder
(MEASURED).
Asked after: 2020-03-04 is 8.546-54 — its last line "Authority and
reason on her wait. … 1 { *Paradise Lost*, 8.546ff }" is 554 with the
quoted book's footnote after the ellipsis, "the citation, and we've got
that in the reference link". A joined line's place no run takes is now
kept beside the reference as written, unless it names the referenced
work, when it is dropped as the citation the link gives; 2020-03-04 is
the only entry it touches (MEASURED). Run: 110 references, 649 lines, in
54 entries; 112 highlighted links, each found by the page's own finder
(MEASURED).
Imported 2026-10-13 and backed up: 53 of the 54 entries match the folder
byte for byte; 2019-12-04, saved again at 16:13, differs only in its four
quoted blank lines written `> ` where the folder wrote `>` (MEASURED).

### Elisions' apostrophes (2026-10-13, asked: "Let's fix the elision apostrophes")
On the bookshelf, ‘ is an opening quotation mark far more often than an
elision (‘I 588, ‘The 240), and some quotations run across paragraphs, so
neither the word nor a closing mark decides alone (MEASURED, a survey of
every ‘). tools/elisions.ts turns ‘ to ’ where: the word after it is a
clip that is no word of its own (‘tis, ‘scape, ‘mongst, an explicit list
from the survey) — always; a clip that is also a word, in Latin or French
or a single letter (‘is, ‘old, ‘ad, ‘t, ‘d), or a dropped h (the word
without it not in /usr/share/dict/words, with it in) — only where no
closing mark follows in the paragraph, a dialect's own clipped ending
(-in’, o’, th’, ha’, wiv’) closing nothing; a mark between letters
(they‘ll) — always. A word with its own apostrophe after the mark
(‘D’you, ‘e’) opens a quotation. First runs turned Horace's and
Boethius's Latin openers (‘et, ‘est: web2 holds "het", "hest"), Frost's
‘Isn’t and ‘D’you, Shakespeare's ‘D sol re — each made a test. Run: 1305
turned in 422 bookshelf entries, 154 left and listed on the review page;
the 49 highlighted links into changed entries all still found by the
page's finder, which folds ‘ and ’ alike (MEASURED).
Verify's time, asked ("10 minutes seems very long"): measured stage by
stage on an idle machine — tsc 1 s, the suite 3 s, comments 0 s, hooks
5 s, the Helium tools 278 s (MEASURED); the ten minutes were runs beside
other work. The steps hold 349 fixed waits, about 151 s at their face
value: 31 of a second or more (about 69 s), 273 of 100–300 ms (about
60 s) (MEASURED, counted in the step files). Waiting for the thing itself
instead is proposed, not yet asked.
Asked after: ‘and for hand and ‘andy for handy turn (unclosed, ‘And
opening a quotation staying); and the review shows each line once with
all its marks — turned green, weighed and left red, every other opening
mark amber — "it'd be easier to see if any were missing if they weren't
done individually". Run: 1354 turned in 427 entries, 263 left, 702
other marks shown in the lines (MEASURED).
Verify's speed, asked: "we definitely want a faster verify run" — next.
Asked after: Sayers's "‘You ‘and over that key, … any sense or
feeling,’" — the closing mark that left ‘and was the quotation's own,
opened at ‘You. The pass now reads each paragraph keeping whether a
quotation is open; no single quotation opens inside another, so a clip
met inside one turns. 22 more turned, each read (MEASURED). And a
dropped h is now found through a plural or a verb's ending (‘orses,
‘appened), web2 holding stems only: 29 more, each read. Run: 1405
turned in 431 entries, 241 left (MEASURED).
Asked after (Sayers's ‘avin’ and ‘earin’ still wrong: "Beginning to
wonder if there's a different approach"; then "Go with the better
approach"): the rules keep only the sure classes — a clip that is no word,
a mark between letters; every other mark the rules weighed (1277) and
every other opening mark in a line they touched (692) was read in its
sentence, 1977 in four batches by reader agents (488k tokens in all,
MEASURED from their notifications, against an estimate of 150–250k), the
judgements kept in tools/elisionsRead.json. Reading and the rules
disagreed on 40 of the 1301 the rules had judged; all 40 and the 26 the
readers marked unsure were read again here: the rules had turned the
quotation openers that begin Venus's and Lucrece's speeches (‘And…, ‘Is
thine own heart…, ‘Art thou…) and left Shakespeare's ’t and ’bout. One
reading changed: Browning's "probavit.*‘ That" is a closing mark typed
the wrong way, turned. Two Sayers pairs typed in each other's places
(’‘Ens, ’‘Twouldn’t) are swapped into ‘’. Left for a hand: four Nine
Tailors closing marks set after the space ("there? ‘And he"), Merchant of
Venice 3.5's stray "‘ Then", Donne's Satyre II "‘and they are his
owne". Run: 1569 turned in 431 entries — 369 by rule, 1200 by reading —
777 read as openings and left; 49 highlighted links into changed
entries all still found (MEASURED). The reading cost 488k tokens across
four readers against an estimate of 150–250k (MEASURED from their
transcripts). IMPORTED 2026-10-13 ("Looks good. Ready to import." then
"431 entries, backed up"): all 431 files in the folder byte-identical to
the backup afterwards (MEASURED, cmp).

### A faster verify (2026-10-13, asked: "we definitely want a faster verify run")
Asked from "Fixed waits? Shouldn't we be able to wait for when something
appears". Measured (TIMING=1, new): the corner run 268 s, of it about
206 s fixed sleeps. Changed, each under the verdict: the 270 sleeps of
300 ms or less became `rest()`, two animation frames with a 100 ms cap;
the adapter's `stored()` waits on a watcher the driver installs (650 ms
past the last edit gesture — key, input, paste, drop, cut, pointerdown,
click — and no IndexedDB write open) instead of 800 ms each of 53 calls;
seven typing-then-save sleeps the same way. Six more converted were put
back, the verdict reading otherwise: the two-window steps' 2.5 s cover the
"saved" fade and the other window's redraw, and a picture's conversion
needs its 2 s. The flaky "a bookmark's link pressed" step now measures
the line until two readings a frame apart agree. Running the bridge
beside the corner was tried and dropped: three of three runs then read
an arrival's place differently, the load moving it. Result: the Helium
stage 278 s → 202–206 s, three runs of three passing (MEASURED). The
sleeps left mostly time the app's own clocks; faking the page's timers
would be the next lever.

A flake after it (2026-10-13): the "source view" step once carried the
caret from the top under a busy machine, the typed "FOOD " landing above
the day's text; it did not come back in fourteen section runs. The step
now waits for the editor's focus and places the caret until it stays
(e148622).

### Quotation marks (2026-10-13, asked: "yes, build the pass")

Found while checking his hand fixes after the elisions: 125 opening marks
with a space after them. Two kinds were proposed and asked for — closing
marks typed as opening ones after italics (Browning, The Inn Album most),
and the spaced marks of the Paradise Lost edition (“ ‘ Let there be light!
‘ said God) — and a third, measured on the way and put on the review for
his ruling, not asked: opening marks typed as closing ones before italics
(’*Your uncle!*, Tey's The Privateer most). `tools/quoteMarks.ts`, pure,
11 tests; `tools/quoteMarksRun.ts` writes Desktop/gesta-imports/
gesta-quote-marks with its review page. Read whole before handing over:
the spaced decisions, the left and the opening turns one by one, the
closing turns not after italics. Faults found reading and fixed
test-first: a plural's possessive (six days’ work) read as a quotation's
close; a closing mark ending its line after a blank-line reset left; three
italic elisions in Busman's Honeymoon (’*im*, ’*Tis Pity*, ’*ave*) turned.
Run: 404 marks in 79 entries — 185 closing turned, 99 opening turned, 60
spaced openings and 60 spaced closings closed up — 5 left for a hand
(MEASURED). One highlighted link (journal 2020-03-28 → Paradise Lost 5,
the Milton pass's) carried the spaced marks in its highlight and its
quotation; the run sets both right and writes the day, so all 48 links
into changed entries are found after (MEASURED). The link check now
passes a link's occurrence as the page does (`nth || 0`); over the whole
backup 280 of 288 highlighted bookshelf links are found, the 8 not all
into paired Horace and Boethius texts these passes never touched
(MEASURED).
His look found Horace, Epistles 1.16 "called ‘ wise and faultless’" left
("that should probably be no-space"): a spaced mark whose quotation
closes later on its own line is now an opening one, 12 tests; the run
moved that mark alone (MEASURED).
Then Paradise Lost 4 "couldst thou ‘ faithful ‘ add?" ("faithful should
have opening and closing single quotes without spaces") and Romeo and
Juliet 1.4 "O’er ladies ‘ lips" ("should be ladies’"): a later spaced ‘ on
the line counts as the quotation's close, and a spaced mark after a
plural, before a small letter, outside a quotation, is its possessive
(thus, his, was and the like are no plural). 14 tests. Run: 407 marks in
81 entries, 2 left (Paradise Lost 9 "die. ‘ “", Lucrece "‘ ‘For"); 52
links into changed entries, all found after (MEASURED).
Then Paradise Lost 9 "lest ye die. ‘ “" ("pretty sure that should be
lest ye die.’”"): a spaced mark inside a quotation with only a spaced “
after it on its line closes both. 15 tests. Run: 408 marks in 81 entries,
1 left (Lucrece "‘ ‘For"); 52 links, all found after (MEASURED).
His rulings on the last two questions: the Lucrece mark stays ("no, that's
inner reported speech. And so the inner one should probably be
double-quotes, but let's leave it for now"); the 99 ’ before italics
turned to ‘ stand ("‘*Your uncle!* looks right"). The folder as run at
c48f15a is the one to import.
IMPORTED 2026-10-14: all 82 files of the folder byte-identical to the
backup afterwards; the pass run again over the backup sets 0 marks right,
the Lucrece mark alone left (MEASURED).
The plan note's commit failed verify on "⌃⌘T on today from Search" and
"Tab twelve times from the bookmarks card" reading the caret at the end:
the step typed "one" straight after ⌃⌘K, and before the Search box took
the focus the word went into the day under it (the entry read "one", the
box empty, 3 runs in 4 alone; MEASURED). Every ⌃⌘K-then-type step now
waits for the box's focus first; 4 runs in 4 read as approved (MEASURED).

### 2026-10-15 — a deep link's passage carrying its footnote marks

8 highlighted links into the paired Horace Odes (2.16, 1.5) and Boethius
texts opened their entry and selected nothing: their passages, minted
before search skipped footnote marks, carry them ("vestimenta ⁵ maris
deo. ⁶"), and the stream they are matched against no longer does. Asked:
"In the app" over rewriting the links. A deep link's passage now drops
its footnote marks as the search box's query does, one shared rule; test
first in highlight.test. Over the backup 0 highlighted bookshelf links
are lost, against 8 before; a headless Helium probe following such a link
selected nothing before the change and the whole passage after
(MEASURED).
His look in Helium: the link into Odes 1.5.13-16 lands with the four
lines selected, Latin and English, the marks ⁵ ⁶ inside the selection
("I can confirm in the live app that it does the highlighting now").
Accepted 2026-10-15 (51179136cdd7…). No review: highlight.ts and
search.ts are no DOM seam, and no phase closes.

### 2026-10-15 — stray quotation marks, a review and import pass

Asked ("yes, stray marks as another review and import pass") after the
survey's list. tools/strayMarks.ts, 10 tests; tools/strayMarksRun.ts
writes Desktop/gesta-imports/gesta-stray-marks and its review page. The
survey's classes, and one it had not counted, found reading the doubles:
an opening double mark typed after a word as a closing one, 98, nearly
all Browning's after italics (*Unique!*“). Run: 249 marks in 121 entries
(98 double closings turned, 52 double openings turned — Gaudy Night,
Miss Pym, Browning after a dash — 3 Allingham dropped h's (— ”e was →
’e), 9 pairs back to front, 55 double closings set apart closed up — 48
of them Hide My Eyes, 6 The Figure of Beatrice after a single closing —
30 single marks run onto their punctuation, opened and spaced, Tey and
Williams, and the 2 Horace possessives), 13 left: Sayers's ditto marks
in two timetables, a spaced pair in The Lost Tools of Learning, Gaudy
Night's "Too long. ” ...", Beatrice's "*simulacra* ”," (MEASURED).
Faults found reading and fixed test-first before the page was handed
over: a closing mark inside italics (pain —”*) read as an opening one;
Allingham's "‘My husband comes in for his supper at nine,’ — he goes"
read as a resumed speech (a single quotation open on its line now
keeps it a closing mark); a double mark set apart after a single
closing one, before a capital or a bracket, left. The resumed speeches
Tey and Williams set in single marks inside a book of doubles stay
single: turned and spaced, not made double. One journal day
(2015-07-20) follows its link into The Figure of Beatrice; 10 links into
changed entries, all found after (MEASURED).
His look found The Lost Tools of Learning "in the form ” All A is B ” can
be recast" left ("All A is B should be surrounded without spaces by
double open and closed quotes"): a spaced pair around words on one line
now quotes them, closed up; 11 tests. Run: 251 marks in 122 entries, 11
left (the ditto marks, Gaudy Night's "Too long. ” ...", Beatrice's
"*simulacra* ”,"); only that line moved (MEASURED).
Then three more from his look: The Poetry of Search, "“ ‘One law" ("If
the closing quotation marks don't have spaces, then the opening
quotations marks shouldn't either") — an opening double mark set apart
from an opening single one closes up, the one such in the bookshelf;
Murder Must Advertise's ditto marks under "Jan." ("these should probably
be bullet points") — a ditto opening a quoted line before a number is a
• character; The Five Red Herrings' timetable ("these should probably be
em-dashes") — a spaced double mark between two times is an em-dash (it
stands in the 12.30 train's column, a station that train does not
stop at, not a range). 14 tests. Run: 261 marks in 124 entries, 2 left
(Gaudy Night's "Too long. ” ...", Beatrice's "*simulacra* ”,");
"Otherwise looks good, I think" (MEASURED).
That commit's verify failed once on "Tab held in a quote", the caret read
at the end of ">> quoted" where the approved run reads it inside the
line; the stored text matched. Tools-only change, so a timing flake; it
did not come back in 4 runs of the section alone, so its cause is not
measured. The step's word click now clicks again (up to 3 times) until
the caret stands in the word, a guard on the likeliest cause, the click
measured while the page settled after the view switch (INFERRED).
IMPORTED 2026-10-15: all 125 files of the folder byte-identical to the
backup afterwards; the pass run again over the backup sets 0 marks right,
the 2 left for a hand alone remaining (MEASURED).
The 2 left he fixed by hand, with Gaudy Night's two ’ for ” in the same
paragraph (itch”, ghoulies”); read in the backup, and the pass run again
leaves 0 (MEASURED).

### 2026-10-15 — speeches in single marks, Lucrece's inner speech

Asked: "a review and import of making the inner quotes double-quotes in
Lucrece and then close out any open examples left". The open examples:
the speeches the stray-marks pass opened and spaced but kept single.
Every book they stand in speaks in doubles — Tey's 1,501–2,236 “ against
51–111 opening ‘, Williams's and Allingham's alike (MEASURED). 54
paragraphs holding such a mark were read: 27 speeches in single marks
where the book speaks in doubles (Tey, Williams, Allingham's Late Pig),
the rest quotations inside a double-marked speech, rightly single, left.
Two more found reading: Privateer 6's first ‘*No*!’ (at its line's
start) and Police at the Funeral's "Marcus*.’’", a doubled mark for ’”.
Lucrece: Tarquin's words inside Lucrece's, “Awake … ‘“For some
hard-favour’d groom of thine,” quoth he, “Unless … infamy.”. Every mark
judged by reading, kept in tools/speechMarksRead.json by its words, set by
tools/speechMarks.ts (3 tests); a run fails on words found twice or not
at all. Run: 62 marks in 23 entries, nothing but marks changed in any
file, no highlighted link into them (MEASURED).
"Looks good." IMPORTED 2026-10-15: all 23 files of the folder
byte-identical to the backup afterwards; the run again over the backup
refuses, every reading's words gone; the quotation-marks and stray-marks
passes over the backup set 0 marks and leave 0 for a hand (MEASURED).

### 2026-10-15 — ⌃⌘R quotes from mid-line when the selection does

Shakespeare's line-for-line pass run (384 quotations, 2,858 lines, 280
entries; review only, not for import): he asked that a reference whose
passage starts mid-line start mid-line too ("for Milton, I would have
preferred when the passage starts mid-line, so does the cited
reference. I don't remember getting asked about that"), and, the passes
minting through ⌃⌘R, that ⌃⌘R itself do so ("I thought this already
happened, so yes, let's make this change"). A passage's first and last
lines are now quoted from the word the selection starts in to the word it
ends in; the line numbers stand, the highlight was already exact; a
paired row stays whole. Test first in reference.test; four tests that
selected mid-line only for convenience now select whole lines, the
referencePayload test keeps the mid-line case end to end. Headless Helium:
"⌃⌘R on a line" over "bloudie Crosse" quotes "> bloudie Crosse" under
I.i.2.1, "⌃⌘R across a stanza gap" from "deepe wounds did remaine," to
"But on his brest a bloudie Crosse"; nothing else moved; the corner run
approved on that reading (MEASURED). Milton: 27 runs began mid-line and
32 ended so on its review page (MEASURED) — the redo, and the two
Shakespeare questions (one quotation split by speakers, his own wording
from memory), wait on his word.
The first commit of it failed verify on the sub-entries section, an
arrival at 2026-09-06 reading "selected 1": run alone the section did it
in 1 of 10 arrivals, the selected node a stanza gap row (`vgap
ProseMirror-selectednode`, the bar on) (MEASURED). An arrival's caret is
placed with TextSelection.near, which is Selection.near and gives a node
selection on a selectable gap when the kept place falls on one (READ,
renderedView.ts placeCaret) — an app defect, timing-dependent, not the
change's; the commit went in on a second run. A fix touches
renderedView.ts, a DOM seam: put to him.

### 2026-10-16 — ⌃⌘R mid-line accepted; an arrival never selects a stanza gap

21a5938 looked at in Helium and accepted (060c849ae1bd…). The arrival's
gap selection put to him; he asked it fixed ("yes, let's fix this,
too"). Measured first under node: over "::: verse\nOne line\n\nTwo
line\n:::", TextSelection.near at the position before the gap gives a
NodeSelection of the gap, every other position a caret (MEASURED). An
arrival's caret is now the first text position at or after the place,
else before it (caretNear in renderedView.ts, test first in
renderedView.test). The sub-entries section run alone 10 times after it:
250 readings, all "sel none · bar off" (MEASURED; before it, 1 run in 10
failed). renderedView.ts is a DOM seam: the batch owes one review.
Asked by him on seeing it: what the outline round a blank row is for. In
headless Helium over Twelfth Night 1.1 (journal 2026-09-06): a click on
the blank row, an ArrowDown from the line above it, an ArrowUp or a
Home-ArrowLeft from the line below each select the row whole, outlined
(`ProseMirror-selectednode`, 2px #8cf) with the format bar shown; an
ArrowDown or ArrowRight from there moves on (MEASURED). The one gesture
built on it is Enter with the row selected, a line after it (READ,
rowKeys.ts enterInRow, pinned in rowKeys.test); Backspace at the start
of the line below and Delete at the end of the line above already take a
gap out (READ, rowKeys.ts). Whether the row stays selectable is put to him.

### 2026-10-16 — a blank row is an empty line

Three ways were put to him for the outline round a selected blank row:
leave it, make the row unselectable, or keep it selectable and draw it as
an empty line. Measured in a throwaway copy in headless Helium: with the
row unselectable, ↑ and ↓ step across it keeping the column, and a click
anywhere on it (six spots) lands at the start of the line below; as
committed, typing over the selected row makes it the line typed, joining
the stanzas (MEASURED). He asked for the third: "I prefer 3. In general,
'principle of least surprise' feels like the right aim here." Built test
first: the format bar is not shown over a selected blank row
(blankRowSelected, rowKeys.test); Backspace on it takes it out with the
caret at the end of the line above, where it had gone to the start of the
line below; Delete already went to the line below (editor.test, through
the whole key chain); the row selected is drawn with a blinking caret at
its start in place of the box (editor.css). A new Helium section, "a
blank row", over Twelfth Night 1.1 (2026-09-06): clicked, the caret on
the row, no box, the caret drawn, bar off; Backspace, the row gone and the
caret after "attending"; x typed, the row the line "x" (MEASURED). The old
app does the same three with the browser's own caret in the empty row
(MEASURED, its run regenerated); the three fields that differ are listed
with their reasons. Nothing else in the run moved.

### 2026-10-16 — the review over ⌃⌘R mid-line and the blank row

Accepted by him (66a8e867b144…); one `/code-review` at high over
c87808e..3277077 (21a5938, 7dc5fd4, 3277077). REVIEW CYCLES: 1. Cost
107,293 tokens (MEASURED, the transcript's last message: 2 input + 476
cache creation + 102,537 cache read + 4,278 output). Ten findings, each
read against the code before its fix:
1. A blank row in a paired block, typed into or given Enter, became a
   full-width line among pairs (READ: the text fell into the first row
   type the block takes; enterInRow inserted a line). Now a new row takes
   its block's shape, a pair where the block holds one; typing over the
   row is its own command (rowKeys.test).
2. The drawn caret blinked on after the editor lost the focus (READ: the
   node's class outlives a blur). Drawn only under `.ProseMirror-focused`;
   a new reading, "the search row opened over it", drawn false (MEASURED).
3. A selection starting on punctuation quoted the line from it (". I
   have"), and one starting at a line's end quoted an empty first line
   (READ). wordEdges now widens a selection to whole words, past spaces
   and punctuation it starts on, into the next line if need be, an
   opening mark before the first word kept (reference.test).
4. The highlight took the selection as made while the passage took whole
   words (READ). ⌃⌘R now takes both, and the range, from wordEdges.
5. Backspace on a blank row with no line above it (the block's first
   row, or after a note) put the caret outside the rows (READ). The caret
   now goes to the row on the side the key points, or the other side;
   Delete the same, mirrored (rowKeys.test).
6. A comment on blankRowSelected spoke of the format bar, another
   module's (READ). Dropped; a role in plain English, no checker owed.
7. The blank row stays a node selection with a drawn caret, where a real
   caret position (a gap cursor) would spare every other consumer its
   exception (Shift-arrows, ⌘C, composition). A design alternative, not a
   defect: noted for him, not built.
8. enterInRow repeated blankRowSelected's test. Uses it now.
9. The blank-row reader was pasted into both adapters. One reader,
   tools/adapters/blankRow.mjs, over the root each names.
10. ⌃⌘G's Escape hand-back placed its caret with TextSelection.near (READ,
   main.ts). Routed through caretNear.
The old app's run regenerated; the one new difference ("the search row
opened over it · caret") listed with its reason. "Tab held in a quote"
read "at the end" in one approve run against "inside a line" before
(MEASURED), the flake seen once on 2026-10-15; the approved line kept as
it was.
e791a43 accepted 2026-10-16 (4f60b30f99a5…); no confirmation pass asked
for: the batch closed at REVIEW CYCLES: 1.

### 2026-10-16 — the confirmation pass over the review's fixes

Asked for ("Let's start the review run"): one `/code-review` at high over
3277077..e791a43. REVIEW CYCLES: 2. Cost 119,010 tokens (MEASURED, the
transcript's last message: 2 input + 4,187 cache creation + 112,248
cache read + 2,573 output). Nine findings, each read against the code
before its fix:
1. wordEdges' backward step read past a line's end, `inWord(undefined)`
   testing the string "undefined": a selection begun at the end of a line
   ending in a letter took that line's last word (the reviewer MEASURED
   it; the test of cycle 1 used a line ending in a comma). Guarded
   (reference.test).
2. Text typed on a blank row was taken by the view's own text handler
   before the typing rules: a `"` stayed straight (READ). The row is now
   opened first, then the text handed to every text handler a line's
   typing meets (editor.test); headless Helium, a new reading "a
   quotation mark typed on the blank row", reads “ in both apps
   (MEASURED); its cursor field listed with the x's reason.
3. Backspace on the second of two blank rows went down, a gap not
   counted as a row on the key's side (the reviewer MEASURED it). The
   side is now read past other blank rows (rowKeys.test).
4. ⌃⌘R's refusals read the selection as made, before the widening: a
   selection begun at the end of one block's last line was refused as
   two blocks (READ). The refusals read the widened words (reference.test).
5. The forward skip stopped at an opening mark with no word after it
   (READ). It passes such a mark (reference.test).
6. A `|` typed on a blank row became a literal pipe (the reviewer
   MEASURED it). Fixed by 2: the pipe meets the line's own handler.
7. The comments on freshRow and dropBlankRow carried no pins though
   tests check both (READ). Pinned.
8. Enter on an empty line chose the new row's shape by the row, not the
   block (READ). freshRow and textStart now (rowKeys.test).
9. dropBlankRow fell back on Selection.near, which can select a gap
   whole (READ). caretNear moved beside it, a direction its first try,
   and used there; its test moved to rowKeys.test.
5ea6345 accepted 2026-10-16 (7457466cc31e…): the batch closed at REVIEW
CYCLES: 2.

### 2026-10-16 — the Milton references quoted from mid-line

Asked ("look at fixing the Miltons"), after ⌃⌘R took mid-line passages.
A run now carries how many of its line's letters a half-line opening it
quotes, and one closing it, read off the run's ends once it is found,
whichever rule carried them (the closeness rule had carried nine
half-lines the half-line rule never saw); referenceAt selects from those
letters, the word a cut falls in taken whole and a closing cut running on
over the line's own marks. A line two letters short of its own or fewer
is spelled otherwise, not halved: the first run read "Heav'n", "chang'd",
"thir" and "Accurst" as half-lines and cut each a letter short, its
closing mark lost (MEASURED); and a fuzzy half-line is cut at its closest
alignment ("he had of mee" had taken "Ingrate,"). Tests first in
shelfLines.test and bookshelfQuotes.test.
The redo (tools/out/miltonRedo.ts, a one-off, not kept): each entry the
pass changed read as it stood before the import, from the backup's
archive named by its 2026-10-13 manifest; the pass run again there finds
the same 110 runs (MEASURED), and 50 of the 54 entries come out byte for
byte as imported (the other four moved with the bookshelf's later fixes).
Each run opening or closing on a half-line is minted whole and mid-line,
and in the entry as it stands now in the backup the link's address and
the passage's first and last lines are replaced. Run: 49 references in
25 entries, 26 opening and 32 closing on half-lines; 107 lines changed
(49 addresses, 58 passage lines), no file's line count moved; every
file a fixed point; all 79 bookshelf links in them found by the page's
own finder over the backup (MEASURED). Folder
~/Desktop/gesta-imports/gesta-shelf-lines-midline with its review page.
A closing mark is the bookshelf's, as ⌃⌘R gives it ("Where no ill
seems:" for his "seems.").
IMPORTED 2026-10-16: all 25 files of the folder byte-identical to the
backup afterwards (MEASURED, cmp).

### 2026-10-16 — Shakespeare quoted line for line: one quotation one reference

Asked: runs of one quotation joined into one reference; where his wording
differs, a diff on the review ("I expect the differences won't be
significant ... but I want to check all the examples first"). The pass
(tools/shelfLines.ts):
- A run carries its first and last rows by place. A speaker's row is
  numbered 0, and a run opening on one had been minted from the scene's
  first row: 27 lines of Cymbeline cited 4.2.1-342, eight such on the old
  review (READ). Now 4.2.327-48.
- Runs of one passage in one quotation join when nothing of the passage is
  left out between them and nothing else stands there but blank lines,
  speakers' names, the passage's own rows (a line may hold several, a
  direction set a line early or late), or his own wording of the lines
  left out, line for line (Dice ≥ 0.6: his rewordings 0.69–0.79, the
  Quenya of 2022-04-11 0.04–0.11, MEASURED). An ellipsis keeps runs apart,
  as he ruled for Milton's 2020-03-28; so do words of his own, a line left
  out, and a second verse block (⌃⌘R refuses two). A run keeps to one
  verse block (no run in either poet's corpus was refused, MEASURED).
- A run is followed word by word past either end where his line breaks
  differ from the passage's, through whole lines of his whose every word is
  the passage's ("Asked after": 2000-01-16 left "liars and swearers enow
  ..." outside 4.2.50-60; now 4.2.50-62).
- A kept place that only numbers the scene is dropped ("… (II,i)",
  1995-12-15, asked).
- The review groups every reference by a word diff: wording, spelling only,
  same words (wordDiff, tested); a quotation he keeps as written is listed
  (2002-02-03, "a deliberate variant", asked). His spelling variants give
  way to the bookshelf's text (asked: 1990-08-23, 1991-01-27).
Milton's 110 runs over its pre-import originals come out as imported but
for 2016-11-10, whose "a dark" half-line the pass now takes (2.891-97 for
2.892-97); not changed, put to him.
Bookshelf fixes, asked: Macbeth 1.3's "This supernatural soliciting"
restored as line 140 (missing on the MIT site too, he checked a paper
copy), Tempest 5.1.48 "‘gaitist" made "’gainst" (Folger's reading); both
IMPORTED 2026-10-16, byte-identical to the backup. A word-by-word
comparison of every play with Folger's text (tools/out, not kept) lists
102 passages Folger has and the bookshelf lacks
(~/Desktop/gesta-imports/shakespeare-missing-lines.html), Pericles's
Gower choruses among them; set aside by him for now.
Run: 360 references in 278 entries; 36 wording, 70 spelling only, 254 the
same words; 379 highlighted links, each found by the page's own finder;
every file a fixed point (MEASURED). Review only, not yet imported.
Asked after, from his reading of the review: a speaker's name opening the
quotation stays outside (2017-11-27 PORTIA, 2016-02-15, 2025-11-26,
2017-11-14 FESTE where the bookshelf says Clown), and lines left after a
reference where his line breaks or speech-by-speech blank lines differ
(2018-12-20, 2025-11-02, 2005-11-24). Now: a speaker's name on its own
line above the quotation, or before a colon or a wide space opening its
line (one to three capitalised words: never "Too old by heaven:"), goes
into the reference, the speaker's row heading the passage where the run
starts inside the speech; the word-by-word walk passes blank lines between
speeches, his own bracketed directions, and the passage's speaker and
direction rows. Every reference in the folder checked for both: 0 names
left above, 0 lines of the passage left below (MEASURED). Tempest 2016-09-10
read against the corrected 5.1. Run: 360 references in 278 entries; 39
wording, 71 spelling only (asked: all take the bookshelf's spelling), 250
the same words; 379 links found; Milton unchanged but 2016-11-10.
The first commit of it failed verify on headless Helium's "a blank row"
section, the click landing on no row; the section alone read as approved
4 times in 4 (MEASURED), no app code changed since 5ea6345: the timing
flake, committed on a second run. MND 2.2.210 "tie heresies" made "the
heresies" (Folger's reading), asked; folder gesta-mnd-2.2.
MND 2.2 IMPORTED 2026-10-16, byte-identical to the backup. Asked after
(2009-08-03 against 2006-10-30, "They both should"): a quotation opening a
speech takes its speaker's row whether or not it names the speaker. 147
play passages starting inside a speech, the speaker unnamed, have no
speaker row, as ⌃⌘R gives them (MEASURED); put to him. Run: 360
references; 39 wording, 70 spelling only, 251 the same words; 379 links
found; 0 names above, 0 lines below (MEASURED).
Verify failed twice more on "a blank row clicked" in the full run while
the section alone passed 4 in 4: the click's place read before the row was
in the window (INFERRED). The step now scrolls the row into view first.
Asked after (1991-04-04): his own line "Furor scribendi." above the
quotation was taken for HECATE's name and replaced. A line above counts as
a name only in capitals or as the speaker's own name in the bookshelf.
Asked after (1997-03-21, "[AYLI, II. vii]" should be the full label): of
three references in the folder labelled in his own words, one was a
Quenya line ending in a colon (2022-04-11). A citation keeps its words as
the link only when it gives the lines ("PL 3.17-8"); one giving the act
and scene alone gives way to the full reference; a line with no numbers is
no citation. Shakespeare: 0 references now in his own words; Milton
unchanged (MEASURED).
2006-06-28 a second deliberate variant, kept as written; he put the
quotation itself beneath it with ⌃⌘R, stored with the page's full address
(file:///…/index.html#bookshelf/…). The pass knew a reference only as
"](#bookshelf/": a quotation under a full-address link is now one too;
that gap had given Milton's 2022-07-03 a second link over his own
reference to Lycidas 15-22. The backup holds 47 files with full-address
links, 40 to the bookshelf, two written today (MEASURED): a reference
pasted in Gesta is stored with the page's address; put to him.
Asked after (2010-05-20, "To do ’t." left below 4.4.45-47; "I thought you
said you'd fix them all"): the leftover check had only looked at lines of
eight letters or more, and the walk compared words, "do ’t" two against
"do’t" one. The walk now meets the quotation's lines against the passage
letter by letter, a few spelled otherwise, a line ending where a word of
the passage ends ("evit" no line of "evitata"), a speaker's name taken
only as written or as a name alone where the passage has a speaker's row
(2015-02-08 "RICHARD II" for KING RICHARD II). Asked after (2019-08-27):
an attribution closing the quotation that names the work ("\- Hecate,
*Macbeth* 3.5") goes with it. The check now reads every line after every
reference against the bookshelf's text running on, any length: 0 carry
on, 0 attributions naming the work, 0 names left above (MEASURED). Run:
358 references in 276 entries; 377 links found.
Milton, three imported entries the pass now makes otherwise, in one folder
gesta-milton-fixes: 2016-11-10 from "a dark" (2.891-97), 1988-04-11 its
closing "—*Paradise Lost*, I. ll. 246-7." dropped, 2022-07-03 the
full-address copy of its link taken out; 12 links found (MEASURED).
"Wording differs changes look good." IMPORTED 2026-10-16: the Shakespeare
folder (275 entries, 357 references) and gesta-milton-fixes (3), all 278
files byte-identical to the backup; both passes run again over the backup
make 0 references (MEASURED). Shakespeare's line-for-line work closed.
Parked by him: the 147 references starting inside a speech, its speaker
unnamed, without a speaker's row; the 102 passages Folger has and the
bookshelf lacks; a reference pasted in Gesta stored with the page's full
file:/// address.
"a blank row clicked" failed a third full run after the scroll-into-view
change; the section alone passes. An earlier section visits 2026-09-06, so
the last arrival restores a remembered place a moment after settling
(INFERRED): the step now clicks through the locator, which waits for the
row to stop moving.
The 147 references starting inside a speech, the speaker unnamed: "Let's
leave it" (asked) — no speaker's row.

### 2026-10-16 — a pasted reference keeps its bare address

Asked ("fix the pasted reference, and then import the shorter links").
Headless Helium, a new section "a reference pasted": ⌃⌘R over Horace, ⌘V
into another page, the link stored as "file:…#page/Horace" (MEASURED);
the old app's run stores it bare. A pasted link to this page by its full
address now keeps its bare address (bareLinks in paste.ts, the editor's
transformPasted; paste.test), as typed links already did; the reading now
"bare" in both apps (MEASURED). Nine page lists in later sections gain the
new page "Referred"; 434 steps, 0 open. paste.ts and editor.ts are DOM
seams: a review is owed after his look.
The backup's full-address links: 65 to Gesta's own page in 31 files made
bare in gesta-bare-links (only the addresses change, each file a fixed
point; 64 name an entry, the 65th, 2026-09-09's Rick Hanson newsletter,
named none before either) (MEASURED). Links to the web reader's pages and
to the web stay as written.
The Hanson link was re-pointed to "Hanson, Rick" (his address) before the
import; IMPORTED 2026-10-16, 31/31 byte-identical to the backup, and the
backup holds 0 links by the page's full file address (MEASURED). Accepted
2026-10-16.

#### Review, cycle 1 — 97b973d..48390f9

`/code-review` at high. REVIEW CYCLES: 1. Cost 95,689 tokens (MEASURED, the
transcript's last message: 2 + 3,080 + 89,921 input, 2,686 output). Ten
findings, unverified; fixed:

1. Markdown pasted as plain text (several lines) took the placeBlocks route,
   which transformPasted never sees: a full-address link stayed full. Now
   `bareBlocks` over the parsed blocks too (paste.test › a link to this page
   in pasted markdown).
2. The step swallowed a bar miss and the corner: it now logs `barMissed` and
   `said`.
3. A link whose words are its address (a bare URL pasted alone) had its href
   cut and its words kept: now left whole.
4. The step could not tell the HTML route from the text one: it now reads
   the HTML flavour's href, "file address" in both apps (MEASURED), so the
   bare link stored is the paste's doing. The old app's first read threw
   "Clipboard data has changed"; the read retries.
6. `makeHref`, nav's minting of a same-document URL, replaces the direct
   `internalHash` slice (its `"` escaping kept).
9. A paste with nothing to change comes back as the same slice.
10. The shadowing `frag` is gone with the rewrite.

Not taken: 5 (normalising in the link mark's parseDOM: the schema has no
page address, and every paste route now passes through one of the two
calls); 7 (settle waiting for an arrival's restored scroll: the locator
click has held in every full run since, a wider change not asked); 8 (the
new page "Referred" in nine list readings: approved already, a move would
churn them again).

d36d8e7 accepted 2026-10-17; no confirmation pass asked: the batch closed
at REVIEW CYCLES: 1.

### 2026-10-17 — Old English Beowulf

Asked: an Old English *Beowulf* on the bookshelf, one page, cited by line
through the poem ("*Beowulf*, 50-52"), under a top-level `Old English`
that the citation does not name; length marks and hyphens removed (the
part after a hyphen lower-cased, Gardena), brackets and notes dropped, the
half-lines a double space apart, the fitts as gaps.
The source: Gutenberg #9701 (Harrison and Sharp) numbers 3,184 lines on
Heyne's count, one ahead of the standard by 3150 (MEASURED); Wyatt (1894,
Wikisource, 137 pages all "proofread", none "validated") has the standard
3182 (MEASURED). Klaeber 1922 is full view on HathiTrust, scans only.
A root's page carrying `::: reference` / `no author` names no author in its
works' references; the root itself cites as its title (reference.ts,
headings.ts, reference.test; the help card's Ref paragraph).
tools/beowulfWyatt.ts + Run: 3182 lines in 43 parts, 636 printed line
numbers checked, one misprinted (2885 for 2835); six transcription slips
corrected (w«s ×2, Hr¯wðel, Gewât, two stray marks) (MEASURED). Folder
~/Desktop/gesta-imports/gesta-beowulf + review page.
7c01462 accepted 2026-10-17 (the citation looked at: "*Beowulf*, 50-52").
IMPORTED 2026-10-17: both files byte-identical to the backup (MEASURED).

### 2026-10-17 — a pasted reference keeps its spaces

Seen in his paste of *Beowulf* 50-52: the half-lines' double space folded
to one in the stored text (2026-10-17 line 43, MEASURED); the text flavour
kept it (MEASURED, a scratch run of referencePayload). ProseMirror folds
runs of spaces in pasted HTML not marked `data-pm-slice` (READ,
prosemirror-view parseFromClipboard), and ⌃⌘R's and the hover copy's HTML
are written outside the editor. Asked: fix it. Gesta's own copied HTML
now carries `data-gesta-copy`, and the editor's clipboard parser keeps
whitespace in HTML that carries it (paste.ts, editor.ts, richCopy.ts).
Headless: "prose with two spaces pasted" over the Williams fixture read
"folded" before the fix and "kept" after, in both apps (MEASURED). The
step pastes over the whole page: pasted at a paragraph's start, the HTML
route joined the quote's last line onto that paragraph — the same before
the fix (MEASURED), noted, not changed.

### 2026-10-17 — the old app frozen; a passing run not replayed

Asked, after 37 minutes of one fix were mostly headless runs (MEASURED:
the old app's whole run 7m57s, again with the successor's 11m27s, a
flake's rerun 3m30s, the commit's verify 6m59s). The old app frozen
(462eca2): never replayed, its stored run still compared. A passing run
not replayed: the fingerprint of everything a run reads stamped when it
passes; two builds of one source are byte-identical (MEASURED, one SHA-256),
so the stamp matches until something changes. Measured: a matched run
0.69 s against 3m19s played. The first pass after the change saw the
corner differ and a rerun pass, its diff not kept — a flake, the second
of the day.

#### Review, cycle 1 — d36d8e7..571ca3b (the no-author setting, Beowulf, the kept spaces)

`/code-review` at high, after his accept. REVIEW CYCLES: 1. Cost 111,989
tokens (MEASURED, the transcript's last message: 2 + 1,907 + 106,101 input,
3,979 output). Ten findings; fixed (asked "Fix those"):
1. A passage from the no-author root itself cited as a bare "1-3": the
   root's title now stands wherever no title does.
2. One marked element anywhere kept a whole paste's whitespace: now only
   HTML whose every block is marked (keepsSpaces, a paste.test over stand-in
   nodes — the pin finding 6 asked for), its layout whitespace dropped.
3. `no author` matched inside other words: now a line of its own.
4. The Beowulf run read Wikisource's answer unchecked, and emptied any
   folder it was given: both refused now (it refuses ~/Desktop, MEASURED).
5. The new step swallowed a bar miss: it logs `barMissed` now.
7. A label parsed a root's markdown once per directive: journalOf keeps
   each entry's directives on its text.
9. paste.ts's header spoke of plain text only: moved onto pasteSlice.
10. The htmlHead difference's reason names the mark now.
Not taken: 8 (`data-pm-slice` instead of the mark: it skips the fitting of
foreign HTML into place, which changes where a reference lands).

6372b7e accepted 2026-10-17; no confirmation pass asked: the batch closed at
REVIEW CYCLES: 1.

### 2026-10-17 — the bookshelf's shelves

Asked: the bookshelf grouped by language — Latin, Old English, Italian,
French, English, in that order, translations under English (Hesse,
Cavafy) — after a stop to think: moving authors into a tree would have
moved 466 entries and 583 links for eight authors alone (MEASURED) and
broken the citation's author, the list, go-to, the breadcrumb and search's
book scope. Chosen (B): a grouping in the list only, the keys unchanged;
the list's form B2 (headings in the list's own type, authors set in) from
a mockup of four; the go-to box grouped too; the shelves kept in
`bookshelf/Shelves` (not a page: "something bookshelf-specific under
page"), opened from "Shelves…" at the list's foot. shelves.ts (pure,
tested); panelRows heads each shelf; destinationRows groups by shelf;
search's scopes leave Shelves out; help card. Headless "shelves" step,
last in the run, new here, the old app frozen: Latin / Boethius set in
26px, English / the rest, Shelves… opens the entry, go-to grouped
(MEASURED). Folder ~/Desktop/gesta-imports/gesta-shelves: Shelves,
Beowulf moved to bookshelf/Beowulf with its own `no author`, 2026-10-17's
reference pointed at it.

### 2026-10-18 — search's scopes on shelves; All Latin

Asked: "The go-to dropdown in the header has changed, but the search
dropdown hasn't", then a selectable "All Latin" for a shelf of more than
one author. scopeOptions groups the bookshelf's roots by shelf as
destinationRows does; a shelf of two or more authors opens its group with
"All <shelf>", a new scope kind `shelf` (its authors' books, every level)
— English gets "All English" by the same rule. A result under it keeps
its author in "where". Headless: the scope groups, and under All Latin a
word only Boethius holds and one only Browning holds each found
(MEASURED). The step's Latin now lists Browning too.

A sub-entries reading was wrong in f68b559's approved copy and approved
unnoticed: "+ tagged entry" put its link mid-heading ("ORS[Ideas]INO"),
read as Music the last link. The step clicked the heading's centre and
pressed End, which moves no caret on a Mac; the click landed inside the
536px heading text in its 712px box (MEASURED). One run at 03:54 landed
right by chance; HEAD's whole tree reproduced the bad reading after it,
so not this change. The step now presses ⌘↓ to the body's end: Ideas
last, the renamed link Plans (MEASURED). Logged in tools/out/flakes.log.

#### Review cycle 1 — shelves and All Latin (6372b7e..36ddf64)

REVIEW CYCLES: 1. One /code-review at high over 6372b7e..36ddf64 after
the accept: 108,775 tokens (the transcript's last message: 2 + 2,683 +
103,414 + 2,676), 10 findings, all fixed in one commit:
1. A shelf named twice drew its authors under both (duplicate keys):
   parseShelves merges a repeated name into one shelf.
2–3. parseShelves read raw lines (a `##` in a code block or quote, a
   heading's markup kept): it now reads the parsed document — top-level
   `##` headings, links by linkRuns, addresses by hashParts. contentsLinks
   was not reused: it drops a heading with no links under it, which is
   the shelf for the rest.
4. "Shelves…" showed only when the entry existed, and a bookshelf address
   makes nothing on a visit: the row is always on the bookshelf list and
   makes the page with its heading the first time.
5. "Shelves" was an author everywhere but three lists: no "+ book" on it,
   create and extract refuse ("the shelves hold no books"), rename refuses
   ("the shelves keep their name"), and no author is filed or re-filed
   under it.
6. A shelf named "Pages" merged with the pages' optgroup: a dropdown's run
   breaks where the namespace does, keyed by where it starts
   (rowGroups, optionGroups, now in the models); shelf labels trimmed.
7. The list and go-to read the cache before the pending save: both flush
   first. Headless "a shelf renamed, the list opened at once" reads
   "Classical" with the flush, "Latin" without (MEASURED).
8. The grouping block copied into go-to and search: rootGroups in
   shelves.ts serves the list, go-to and search.
9. The shelf scope's books are a Set.
10. shelves.ts's module header (the layout says it) removed; the step's
    fixed 400 ms after the search rows replaced by a wait for rows that
    hold the query.

aa3a4f3 ACCEPTED 2026-10-18; no confirmation pass asked — closed at 1 cycle.

### 2026-10-18 — The Fight at Finnsburh, from Wyatt

Asked: "Import Wyatt's Fight at Finnsburh first. (into Old English)".
Wyatt's appendix "The Fight at Finnsburg", Wikisource pages 162–163, 48
lines, made `bookshelf/Finnsburh` headed "The Fight at Finnsburh" (the
name as asked; Wyatt's heading in the note), `no author`, one verse block,
the Beowulf rules: length marks, hyphens, brackets and notes gone, the
half-lines two spaces apart. Wyatt's asterisks where the fragment breaks
off (the first half of line 1, the second of line 48) kept, as text: they
round-trip bare and parse with no emphasis (MEASURED, the test). Every
line read against the page scans: five transcription slips corrected —
5 beratð/berað, 11 hiegeað/hicgeað, 33 hyue/hyne, 35 sealo-brün/sealo-brūn,
47 hū ðū/hū ðā wīgend (the last missed on a first look at the full page,
found reading the output against enlarged crops). Its label read by
referenceCorpus: *The Fight at Finnsburh* (MEASURED). The fetch moved to
tools/wyattPages.ts, shared with the Beowulf run. Folder
~/Desktop/gesta-imports/gesta-finnsburh. The Shelves entry is not shipped
(an existing entry): its Old English line is added by hand.

### 2026-10-18 — Deor, The Wanderer, The Seafarer

Asked: import the three from early-medieval-england.net (the site's own
footer: "Site by Sean Miller") as paired verse, whole lines: the Old
English half-lines two spaces apart, the translation's joined by one.
A table per stanza there, a row per half-line, an empty row a lost
half-line (The Seafarer 16 stands alone, as the site numbers it). Keys
Deor, Wanderer, Seafarer, headed Deor, The Wanderer, The Seafarer, each
`no author`; the site's spare spaces inside a half-line collapsed, its one
italic kept, its note marks dropped and its seven notes (six on Deor, one
on The Wanderer) not carried, pending a ruling. 42, 115 and 124 lines,
every number the site prints at its line (MEASURED); labels *Deor*, *The
Wanderer*, *The Seafarer* (referenceCorpus, MEASURED). Folder
~/Desktop/gesta-imports/gesta-old-english.

Then asked: "the notes should be carried over. As footnotes, not marginal
notes." As the Sidney footnotes are written: a mark " ¹" after the
half-line the site marks, in the Old English, numbered within its stanza;
the stanza's notes, "[1] …", in a `::: note` inside the verse block after
its last line, so the lines after count on. Every paragraph of a note
kept, its italics and accents kept, its "Back to text" gone; a note with no
mark, or a mark with no note, is an error. Deor 6 notes, The Wanderer 1
(its note quotes a line with " | ", parsed as the note's text, not a
pair), The Seafarer none and left out of the folder. Replacing an imported
entry is allowed only where the backup holds it exactly as the first run
wrote it (MEASURED: Deor and Wanderer identical).

### 2026-10-18 — Hávamál; any work in stanza fences cites by stanza

Asked: an "Old Norse" shelf and Hávamál from early-medieval-england.net,
the same rules, "a poem in stanzas, so a reference to Deyr fé / deyja
frændr / deyr sjálfr it sama should be *Hávamál*, 76.1-3"; then, on my
proposing a `by stanza` directive (the Faerie Queene plan had stanza
citation only under its directive): "FQ should also have cited by stanza.
Any work using the stanza fence should cite by stanza." So the reference
reads stanzaRange wherever the passage is in stanza fences, and a run
across top-level stanzas is allowed, in any work; ⌃⌘G's Line box takes
`N.M` on any page holding stanzas. The Faerie Queene's directive now only
adds its Roman book and canto (its readings unchanged, MEASURED).
Hávamál: the site's rows are lines, not half-lines; 164 stanzas, 1087
lines, every stanza and line number the site prints at its place; 18 notes
as footnotes inside their stanza; five rows with no translation written
`text |`. Keyed `Havamal`, headed `Hávamál`: the import does not normalise
a file name, so an NFD name would key apart from the link (MEASURED, 7
against 9 code units); no author key in the backup is non-ASCII. Headless
"a work in stanzas": ⌃⌘R 76.1-3, 76.4–77.4, ⌃⌘G 77.4 on ek veit einn
(MEASURED). My first seed cut stanza 77 to two lines and I reported "77.2
lands on ek veit einn" as if of the poem; he caught it ("line 2 of stanza
77 is deyja frændr"); the seed is now the poem's two stanzas. The shelves
step's "a shelf renamed" read the double-click's bar once in a full run:
it now waits for the bar to hide. Folder ~/Desktop/gesta-imports/gesta-old-norse.

#### Review cycle 1 — stanza citation and Hávamál (70f680a..865f092)

REVIEW CYCLES: 1. One /code-review at high after the accept: 118,800
tokens (the transcript's last message: 2 + 1,446 + 113,939 + 3,413), 10
findings:
1. hwaetTextsRun with no ids threw on the first poem already imported:
   FIXED — a poem the backup has is left out and named, the run goes on;
   nothing to write says so and writes nothing.
2. ⌃⌘G takes the stanza ask on any page with a top-level stanza, so a
   page mixing stanzas with a plain verse block loses that block's lines:
   NOT CHANGED — no page in the backup mixes them (MEASURED); raised.
3. Without the directive a digit-keyed entry's numerals run into the
   stanza range (1.1.2.1): NOT CHANGED — the ruling was every stanza work
   cites by stanza, and the only stanza works are the Faerie Queene (its
   directive) and Hávamál (a root, no numerals); raised.
4. goto.ts and goto.test.ts comments still named the directive: FIXED.
5. coveredUnits walked up to four times per ⌃⌘R: NOT CHANGED — 4.0 ms a
   ⌃⌘R over all of Beowulf, 1.3 ms over Hávamál (MEASURED).
6–7. The footnote mark and the page head copied between the two poem
   forms: FIXED — one `marked`, one `pageHead`; Hávamál and Deor rebuilt
   from the cache equal the backup byte for byte (MEASURED).
8. The guard missed a poem filed under another name: FIXED — also found
   by its heading among the backup's roots.
9. An empty stanza would crash stanzaLines: NOT CHANGED — hwaetStanzas
   never yields one (READ: it pushes a table's rows only when there are any).
10. The steps' seed waits ran out silently: FIXED in both (shelves, a
    work in stanzas) — the reading carries `seeded`. My first fix named
    the helper `landed`, shadowing the steps' own `landed(page, ms)`, and
    four sections failed; the run was approved before it was read, then
    restored from git, the helper renamed, and the run read and approved.

### Old English verse cites half-lines (2026-10-18, asked)

Asked: Old English verse, its lines explicitly two half-lines that are
cited separately, cites "Men ne cunnon…" as *Beowulf*, 50b-52; only Old
English verse — other verse with half-lines does not cite 50a/50b, and Old
English prose does not either, so the switch is named for what it is.
Chosen from two offered (asked): a line on the work's page, in its
`::: reference` box, `Old English verse` on a line of its own — not the
Old English shelf, which would tie a citation to a shelf's name.

- The page that says it is the entry's own or any above it, so a root of
  works with no author (Beowulf, Deor…) says it once for itself, an
  author's work for its parts.
- The halves are the original's text (a pair's first cell) split at its
  first run of two spaces between words; a line with none (`* * *`) is
  whole; the translation's words cite the line.
- A run starting on a second half or ending on a first says so (50b-52,
  49-50a), a half alone 50a or 50b, both halves the line; the numbers keep
  their elision (1162b-68a).
- Not built: ⌃⌘G does not take 50b.
- Tests: reference.test, four; Helium "Old English verse" (two readings,
  new here). Played headless first: 50b-52 and 50a (MEASURED).
- Not a DOM seam (editor/reference.ts, store/reference.ts, headings.ts,
  help.html): no review owed.
- To make it work in the backup the five Old English pages (Beowulf,
  Finnsburh, Deor, The Wanderer, The Seafarer) each need the line, typed
  in Gesta — never re-shipped.
- Seen in Helium (82d56be, The Seafarer): cited 80b-85 rightly, but the
  quoted pair still began "dream mid dugeþum.  " — a paired row is quoted
  whole. Fixed: in Old English verse a pair's original is quoted from the
  half the citation starts on to the half it ends on; the translation stays
  whole, as it cannot be divided by half-lines (a single-column line was
  already cut at the selection's words). Test: reference.test, one; Helium
  "⌃⌘R from a second half-line beside its translation", played headless
  first: 80b-81a quoted from "Dagas sind gewitene," (MEASURED). One full
  run read "Tab held in a quote" with the caret at the end, not inside: the
  section alone three times and the next full run read the approved
  "inside a line" — a flake of the click's landing, not this change.

### Beowulf's misreadings (2026-10-18, asked)

Asked: "the meaningless typos in the Beowulf transcript are really bad, so
we'll want to fix those before creating any references. Maybe see whether
the Klaeber scans help with that." Found by the Old English quotation sheet:
lines placed by likeness showed the bookshelf's words, not his, wrong.

- Klaeber on HathiTrust: a script is met by a Cloudflare challenge (403),
  not passed. The Internet Archive holds Klaeber 1922 twice
  (beowulfandfighta00klaeuoft, cu31924059417794) and Wyatt 1894 twice
  (beowulf00wyat, beowulfedwithte00wyatgoog), OCR text and page images;
  Gutenberg #9701 (Harrison & Sharp's Heyne) is proofread text. Wikisource's
  page status is no guide: 176 pages "Proofread", 15 "Validated", the
  misreadings on them (MEASURED).
- The candidates: every bookshelf word Gutenberg's text does not have, 248
  (MEASURED), on 109 of Wyatt's pages. Each read against Wyatt's printed
  page (the Internet Archive's scan; Wikimedia's thumbnails refused a run
  of requests, 429): 87 misreadings, 161 Wyatt's own readings
  (ond-, his emendations, fāmi-heals, fīftēna, wylm...).
- The real-word kind (a misreading that is a word, "ha" for "he"): the
  bookshelf's words that differ from Gutenberg's at their place, 371, each
  looked for in both IA OCRs of Wyatt at that line; the 31 found in
  neither read against the page — all Wyatt's (MEASURED). Not covered: a
  misreading both IA OCRs share at that line.
- The run now writes `bookshelf/Beowulf` as it stands (no author, Old
  English verse — the line he added, the only difference between his
  backup and what was shipped, MEASURED) with the 87 set right by line,
  each a whole word found once on its line; it refuses a backup page that
  differs from what it wrote before. Against the backup: 87 lines change,
  each by one word ("æt somne" → "ætsomne" the one that joins two).
- The import folder: ~/Desktop/gesta-imports/gesta-beowulf, review page
  beside it.
- IMPORTED 2026-10-18, the backup identical to the folder (MEASURED); the
  pre-Shelves copy (Old English, Old English/Beowulf) removed by hand.
- The text note, asked ("wanted the point that it was corrected to be
  in"): Beowulf's and Finnsburh's now say "from the transcription on
  Wikisource, its misreadings corrected against Wyatt’s printed page",
  typed into both pages by hand and carried into both runs; no count, as
  the review page holds the list. The Beowulf run's guard takes the
  backup page as it writes it with or without the misreadings.

### Old English and Old Norse quotations made references (2026-10-18, asked: "go")

The sheet (`tools/out/northSurvey.ts`, scratch) first, read and ruled on:
runs not lists (1990-08-18 "Deor 9, 10, 11, 12, 7, 28…" seen wrong), a
lone refrain by the run before it, spellings placed by likeness, half-lines
cited (asked: "We definitely want to respect only citing half-lines with
the Old English"), accents counted as a difference (asked, 1996-01-09).
Rulings: 2023-04-25 lines 9–14, Beowulf recited from memory with its slips,
keep his own text; 2016-03-14 is a LaTeX typesetting entry, left like the
Gesta-wrangling ones; 1998-09-08 he re-set to quote 112–114a.

`tools/shelfLines.ts` and `tools/bookshelfQuotes.ts`, test-first:
- letters matched with accents dropped and ð and þ one letter (his
  quotations follow other editions' marks); the review's word comparison
  keeps them (`wordDiff`), so þá → þa shows.
- `::: stanza` pages indexed (Hávamál).
- a line placed by likeness counts toward a run's 30 letters, before or
  after its anchor (1991-12-08's three lines, one exact and short).
- a pair's half-line is cut in its original cell, so Old English verse
  beside its translation is cited and quoted by its halves (80b-90).
`tools/shelfLinesRun.ts`: several prefixes; KEEP may name the quotation's
line in the entry; the review compares the original side of a pair only.

Run over the six works: 127 references, 618 lines, in 79 entries; left:
single lines and half-lines too short to place, the three lone refrains,
Lewis's Allegory of Love (a book on the shelf, its quotation his), two
entries already linked. Folder ~/Desktop/gesta-imports/gesta-shelf-lines-old-english.
- Asked: every entry under "Lines quoted" made a reference, Lewis's Allegory
  of Love included, but for the two excluded (2023-04-25 lines 9–14;
  2016-03-14); and 2023-01-13's "Hroðgar maðelode", the first line of a poem
  of his own, left (asked). The translations a reference brings stay, his
  own beside them to be trimmed by hand (asked: "in case the translations
  have relevant variants"). Placed by hand in the run (PLACED), too short
  for it: 1992-02-25, 1992-04-16 (three), 1993-06-07, 2017-09-29,
  2020-01-12, 2022-08-31; a line of verse in a list or his own line made a
  link on its words, no passage (LINKED): 2016-03-29, 39b.
- Found in the folder and fixed as a class, test-first: a short citation
  ending in a colon a blank line above the run ("*Hávamál* 23:", "Seafarer
  9b:") was left standing over the reference, saying it twice — now the
  run's citation as one just above is; stanzas quoted one after another are
  one run, one reference across them (1995-04-03, Hávamál 36–37).
- Still asked: the three entries quoting Deor's refrain alone.
- Asked: the three lone refrains cite Deor 7; 2025-06-01's card title
  joined to Dante left as written. Folder now 140 references, 638 lines, 91
  entries. Seen in it: a quoted line keeps its footnote mark without the
  note (⌃⌘R's passage leaves the note fence out) — 6 lines, 6 entries;
  raised, not changed.
- IMPORTED 2026-10-18: 91 entries, all identical in the backup (MEASURED).

### 2026-10-18 — a reference pasted onto a selection links it

Asked: a reference (⌃⌘R / Ref) pasted with ⌘V onto a selection — a line
number in a sentence — makes the selection a link to the reference's
address rather than pasting the reference whole. Built test-first in
`src/editor/paste.ts` (`linkSelection`), called first in the editor's
paste. Taken as the same class and built with it: a copied entry link
(`[label](#…)`) pasted onto a selection. A paste is a paste as before when
the selection is empty, spans two blocks, sits where a link cannot (a code
or reference block), the text is no reference, or its address names no
entry. The source view is unchanged (a textarea; its paste is literal).
Helium step "a reference pasted onto a word" (MEASURED: the word linked to
`#page/Williams/Witchcraft%203`, one reference in the stored text, the
caret after the word).
- Asked, the same day: a reference pasted into a line that already has
  words in it arrives as its citation alone, the link with no colon; on an
  empty line, whole as before (asked: "A", from three offered — by where
  it is pasted, a second copy gesture, ⇧⌘V; and the colon dropped inside a
  sentence). `citeInLine` in `src/editor/paste.ts`, test-first. Helium step
  "a reference pasted mid-sentence" (MEASURED: the citation after
  "greater.", no colon, one whole reference on the page).
- REVIEW CYCLES: 1. `/code-review` at high over 68c17cd^..d71a7d0: 95,733
  tokens (MEASURED, the run's transcript), 8 findings. Fixed, test-first:
  text after a reference's first line that is no quoted passage pastes as
  before (it was dropped); a copy made in the page (`data-pm-slice`) pastes
  as itself (a cut reference pasted mid-line lost its quotation) — Helium
  step "the page's own reference pasted mid-sentence" (MEASURED: copied
  in-page, the whole reference pasted, no citation alone); a test that
  ⌃⌘R's payload is the text both read; spaces at a selection's edges left
  outside the link; the clipboard read once; one helper for the address a
  paste names and one for a one-line link as a slice. Not changed: a line
  of a picture or spaces alone counts as empty (the help says "words").
  Asked, not changed: a caret at the end of a line ending in a colon (or a
  heading) takes the citation alone — a whole reference is pasted on a
  line of its own ("a reference is always on a new line").

### 2026-10-18 — Spenser and Austen added to the five; prose quoted, quotations joined

Asked: the references to Jane Austen (Pride and Prejudice) and the Faerie
Queene checked and added to the review pages and to
~/Desktop/gesta-imports/gesta-shelf-lines-five. Found, fixed in the tools:
- `shelfLinesRun.ts` split its prefixes at every comma, so a filed name
  ("Spenser, Edmund", the default "Milton, John") matched nothing (MEASURED:
  0 index entries); a comma and a space now stays inside a name.
- Prose was not read (the index is verse only): `quotedPassages` places a
  quoted paragraph by `quotedProse`, a book's text whole, so a prose book
  and a translation beside verse are found; normalised book text memoised
  (a run took over ten minutes; now about a minute for seven authors).
- Asked, the same day: "lots of passages in separate quote paras which
  should be connected quotations"; and variants never preserved, the
  quotations only identified. Quoted paragraphs a blank line apart join
  one by one while nothing of the book is left out between them (2017-06-04:
  nineteen tercets of Purgatorio 18 made two references, 22-57 and 61-75,
  where 58-60 is not quoted); a quotation and its translation one after
  another are one reference (`sameQuoted`), and two such, one after another
  in the passage, one across them (Alcuin, O mea cella 31-34). References of
  one work standing one after another: 123 → 16, the rest lines left out
  between them or already in the backup (MEASURED).
- Prose: a short citation with a number is the link in its own words (the
  reference cites the chapter alone).
- Listed, not changed: a verse run beside a quoted line no run takes (20:
  a citation inside the quote, a line spelled too far from the book's, an
  elision, a translation line in the block, a line not the author's) — the
  review page's "Part of a quotation left beside its reference".
Folder rewritten for the seven: 649 references, 4223 lines, 295 entries
(was 438, 2357, 217); none of the old entries dropped, 153 identical, 64
changed, 78 new (MEASURED). Review pages per author regenerated, Spenser's
(29 in 11 entries) and Austen's (26 in 21) new.
- Seen in the review the same day: common phrases made references — "My
  dearest love," (1998-05-26), "What do you think?" (2015-11-07,
  2026-08-11), "Congratulations." (2018-07-21), "What do you mean?"
  (2020-04-07), "The intention…" (2024-09-15). Fixed as a class: a quotation
  the prose path places is held to the verse run's floor, 30 letters
  (`ENOUGH`): every false match was 15 letters or fewer; the genuine lines
  under 30 (about 25, Dante's and Virgil's, never in the old folder) are
  left for a hand. Austen 20 in 15 entries, every one a passage
  ("Otherwise, the Austens look good").
- Seen the same day: Spenser's I.x.63 (1992-05-04) and I.vii.40
  (1992-05-02) cards showed no reference link. The folder had it; the card's
  window began a line above the quotation, and a citation a blank line
  above, which the reference replaces, was out of sight with the link. The
  window now runs over every line the reference changes, a line either
  side: 0 cards of 625 without a link on any page (MEASURED). Folder and
  pages rewritten: 625 references, 4195 lines, 285 entries.
