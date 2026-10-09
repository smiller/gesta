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
INFERRED). Either the app or the sentence changes, item by item.

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
