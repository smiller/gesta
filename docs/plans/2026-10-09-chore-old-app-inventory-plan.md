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
Run: 403 marks in 79 entries — 185 closing turned, 99 opening turned, 59
spaced openings and 60 spaced closings closed up — 6 left for a hand
(MEASURED). One highlighted link (journal 2020-03-28 → Paradise Lost 5,
the Milton pass's) carried the spaced marks in its highlight and its
quotation; the run sets both right and writes the day, so all 48 links
into changed entries are found after (MEASURED). The link check now
passes a link's occurrence as the page does (`nth || 0`); over the whole
backup 280 of 288 highlighted bookshelf links are found, the 8 not all
into paired Horace and Boethius texts these passes never touched
(MEASURED).
