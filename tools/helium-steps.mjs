// THE STEPS, shared: one list of gestures and readings played over an
// ADAPTER (tools/adapters/*.mjs) that knows where the app is and how its
// screen reads, so the successor and the current app answer the same
// questions in the same order and their outputs diff line by line. Split
// out of helium-corner.mjs 2026-09-12, asked: the approved output should
// be what the current app does, not what the successor did on the day.
// Every step logs its label, its own reading and the screen after it.
export const SEEDS = {
  "2026-09-06": "twelfth", "2026-09-05": "williams", "page/Horace": "horace", "page/Williams/Witchcraft 3": "williams",
  "bookshelf/Browning, Robert/Pippa Passes": "pippa",
  "page/Links": "A link to [Horace](#page/Horace), one to [itself](#page/Links), and one [outside](https://example.org/).\n",
  "bookshelf/Boethius/Consolatio": "# De consolatione philosophiae\n\n## Book 3\n\n- [3pr1](#bookshelf/Boethius/Consolatio/3pr1)\n- [3m1](#bookshelf/Boethius/Consolatio/3m1)\n- [3pr2](#bookshelf/Boethius/Consolatio/3pr2)\n",
  "bookshelf/Boethius/Consolatio/3pr1": "# 3pr1\n\nIam cantum illa finiuerat.\n", "bookshelf/Boethius/Consolatio/3m1": "# 3m1\n\nQui serere ingenuum uolet agrum.\n", "bookshelf/Boethius/Consolatio/3pr2": "# 3pr2\n\nTum defixo paululum uisu.\n",
};
export async function runSteps(page, ctx, A, opts = {}) {
  const shot = opts.screenshot;
  const log = async (label, x) => { const base = x !== null && typeof x === "object" && !Array.isArray(x) ? x : { value: x }; console.log(label + ":", JSON.stringify({ ...base, screen: await A.screen(page) })); };
  const go = async (hash, ms = 15000) => { await page.goto(A.url(hash)); await A.waitEntry(page, decodeURIComponent(hash).replace(/%20/g, " "), ms); };
  const R = A.read, S = A.sel;
  /* the dialogs, answered by the harness: `answer` is what a prompt gets, a confirm is accepted */
  let answer = null;
  page.on("dialog", (d) => { if (d.type() === "confirm") d.accept(); else if (answer !== null) d.accept(answer); else d.dismiss(); });
  /* ONE SECTION PER FEATURE, each opening its own entry, run in order and
     each in its own try: a selector the app lacks fails that section's
     remaining steps as one line and the run goes on, so a whole
     comparison comes out of one run */
  const sections = [
    ["launch, panels, the corner, links", async () => {
  const stages = await A.launch(page, SEEDS);
  console.log("the launch's stages:", JSON.stringify(stages));
  await log("after warm", await R.corner(page));
  await log("masthead over Horace", await R.masthead(page));
  if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-masthead.png"), clip: { x: 0, y: 0, width: 1000, height: 130 } });
  await page.click(S.pagesOpener);
  await log("pages panel", await R.panel(page));
  if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-panel.png"), clip: { x: 0, y: 0, width: 600, height: 260 } });
  await page.click(S.booksOpener);
  await log("books panel, displacing it", await R.panel(page));
  await page.click(S.booksOpener);
  await log("its own opener again", await R.panel(page));
  await page.click(S.pagesOpener);
  await page.keyboard.press("Escape");
  await log("after Escape", await R.panel(page));
  await page.click(S.pagesOpener);
  await page.mouse.click(500, 400);
  await log("after a click outside", await R.panel(page));
  await page.click(S.pagesOpener);
  await page.click(S.panelRow("Williams"));
  await A.waitEntry(page, "page/Williams", 5000);
  await log("after a row click", { entry: await A.entry(page), panel: await R.panel(page) });
  await page.waitForTimeout(3200);
  await log("3.2 s later", await R.corner(page));
  await page.click(S.editor);
  await page.keyboard.press("End");
  await page.keyboard.type(" corner");
  await R.waitCorner(page, "saved");
  await log("after typing", await R.corner(page));
  if (shot) await page.screenshot({ path: shot, clip: { x: 0, y: 500, width: 500, height: 100 } });
  await page.click(S.corner);
  await log("after the click", await R.corner(page));
  await page.keyboard.press("Control+Meta+,");
  await page.waitForTimeout(100);
  await log("after ⌃⌘, on the first entry", await R.corner(page));
  await go("page/Links");
  await page.click(S.editorLink("#page/Links"));
  await page.waitForTimeout(200);
  await log("a link to itself", { entry: await A.entry(page), ...(await R.corner(page)) });
  await page.click(S.editorLink("https://example.org/"));
  await page.waitForTimeout(200);
  await log("a plain click on an external link", { entry: await A.entry(page), url: page.url().split("#")[1] });
  const popup = ctx.waitForEvent("page", { timeout: 5000 }).then((p) => p.url(), () => "(no new tab)");
  await page.click(S.editorLink("#page/Horace"), { modifiers: ["Meta"] });
  await page.waitForTimeout(200);
  await log("⌘-click on an internal link", { newTab: (await popup).split("#")[1], ...(await R.afterModClick(page)) });
  const popup2 = ctx.waitForEvent("page", { timeout: 5000 }).then((p) => p.url(), () => "(no new tab)");
  await page.click(S.editorLink("https://example.org/"), { modifiers: ["Meta"] });
  await page.waitForTimeout(200);
  await log("⌘-click on an external link", { newTab: (await popup2) !== "(no new tab)", ...(await R.afterModClick(page)) });   /* headless has no network: whether a tab opened, not where it got */
  await page.click(S.editorLink("#page/Horace"));
  await A.waitEntry(page, "page/Horace", 5000);
  await log("a plain click on an internal link", { entry: await A.entry(page) });
    }],
    ["fence", async () => {
  /* a verse fence pasted as TEXT mid-paragraph is set down between the halves, its first line inside */
  await go("page/Pasted%20Fence");
  await page.click(S.editor);
  await page.keyboard.type("start end");
  /* THE CARET PLACED THROUGH THE DOM SELECTION, not the keys: Home and the
     arrows moved it on some runs and not others (measured 2026-09-12, three
     runs), and the paste then landed at the paragraph's end */
  await page.waitForTimeout(100);
  await R.caretAfter(page, "start end", 5);
  await page.waitForTimeout(100);
  await R.pasteText(page, "::: verse\nHeil! Heil! | Hail! Hail!\nErlösung | Salvation\n:::");
  await page.waitForTimeout(200);
  await log("a fence pasted as text mid-paragraph", { md: await A.stored(page) });
    }],
    ["verse copy", async () => {
  /* a verse block copied inside the rendered view with ⌘C and pasted into a fresh page with ⌘V comes back as the block */
  await go("page/Horace");
  await R.selectAll(page, S.editorVerse);
  await page.waitForTimeout(100);
  await page.keyboard.press("Meta+c");
  await go("page/Pasted%20Verse");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  await page.waitForTimeout(300);
  { const md = await A.stored(page); console.log("a verse block copied and pasted:", JSON.stringify({ fence: md.startsWith("::: verse"), pairs: await R.pairs(page), head: md.split("\n").slice(0, 3) })); }
    }],
    ["refused fence", async () => {
  /* a refused fence named on the switch back: "::: versey" typed in the source stays a paragraph and the corner says why; a clean switch releases it */
  await go("page/Fenced");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source);
  await page.keyboard.type("::: versey\nline\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor);
  await page.waitForTimeout(150);
  await log("a refused fence", await R.refusedFence(page));
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source);
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("::: verse\nline\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor);
  await page.waitForTimeout(150);
  await log("a clean switch", await R.cleanSwitch(page));
    }],
    ["quote tab", async () => {
  /* Tab in a quote nests, Shift-Tab lifts, again at the floor says so; ⌃⌘L opens the Line numbering row over verse */
  await go("page/Quoted");
  await page.click(S.editor);
  await page.keyboard.type("> quoted words");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(150);
  await log("Tab in a quote", { md: await A.stored(page) });
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(150);
  await log("Shift-Tab twice", { md: await A.stored(page), corner: await R.cornerText(page) });
  await go("page/Horace");
  await page.keyboard.press("Control+Meta+l");
  await page.waitForTimeout(100);
  await log("⌃⌘L over Horace", await R.linesRow(page));
  await page.keyboard.press("Escape");
  await log("Escape", await R.linesRowOpen(page));
    }],
    ["reference copy", async () => {
  /* the rich flavour: ⌃⌘R over a selection in a paired verse block writes markdown and HTML, the HTML carrying the citation anchor and the pair's grid inline */
  await go("page/Horace");
  await R.selectAll(page, S.editorCell);
  await page.waitForTimeout(100);
  await page.keyboard.press("Control+Meta+r");
  await R.waitCornerMatch(page, /copied|copy/);
  await log("⌃⌘R", await R.clipboardReference(page));
    }],
    ["code block", async () => {
  /* code: a fence with a language typed, its tokens coloured, the label in the corner, the copy button on hover */
  await go("page/Coded");
  await page.click(S.editor);
  await page.keyboard.type("```js");
  await page.keyboard.press("Enter");
  await page.keyboard.type("const n = 42 // answer");
  await page.waitForTimeout(150);
  await log("a js block typed", await R.codeBlock(page));
  await page.hover(S.editorPre);
  await page.waitForTimeout(150);
  await log("hovered", await R.copyHover(page));
  await page.click(S.copybtn);
  await page.waitForTimeout(300);
  await log("clicked", await R.copyLabel(page));
    }],
    ["card copy", async () => {
  /* a card copied both ways carries its colour: the hover copy's HTML and ⌘C's HTML both spell the background inline, and ⌘V on a fresh page brings the card back */
  await go("page/Carded");
  await page.click(S.editor);
  await R.pasteText(page, "::: card-light-blue\n*Purgatorio* 19.26\n\n::: verse\nquand’ una donna apparve | When a lady appeared\n:::\n:::");
  await page.waitForTimeout(200);
  await page.hover(S.editorCard);
  await page.waitForTimeout(150);
  await page.click(S.copybtn);
  await page.waitForTimeout(300);
  await log("a card hover-copied", { label: await R.copyLabel(page), live: await R.cardLive(page), ...(await R.clipboardCard(page)) });
  await R.selectAll(page, S.editorCard);
  await page.waitForTimeout(100);
  await page.keyboard.press("Meta+c");
  await page.waitForTimeout(200);
  await log("a card ⌘C'd", await R.clipboardCard(page));
  await go("page/Pasted%20Card");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  await page.waitForTimeout(300);
  { const md = await A.stored(page); console.log("pasted on a fresh page:", JSON.stringify({ fence: md.startsWith("::: card-light-blue"), lines: md.split("\n").length, ...(await R.cardsAndPairs(page)) })); }
    }],
    ["picture", async () => {
  /* a pasted picture: a PNG drawn on a canvas, pasted as a file, filed beside the entry and placed */
  await go("page/Pictured");
  await page.click(S.editor);
  await page.keyboard.type("A picture: ");
  await R.pastePng(page);
  await R.waitImg(page);
  await R.waitCorner(page, "saved");
  await log("a picture pasted", { md: await A.stored(page), ...(await R.picture(page)) });
    }],
    ["shortcuts", async () => {
  /* shortcuts: ⌃⌘S with an empty table opens the editor; a table saved; a code typed and Enter inserts at the caret */
  await go("page/Expanded");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+s");
  await page.waitForTimeout(150);
  await log("⌃⌘S, no table yet", await R.shortcuts(page));
  await page.fill(S.shortcutsEditor, "sig: Sean Miller\nmd: markdown");
  await page.click(S.shortcutsSave);
  await page.waitForTimeout(150);
  await log("saved", { ...(await R.shortcuts(page)), corner: await R.cornerText(page) });
  await page.click(S.shortcutsInput);
  await page.keyboard.type("m");
  await page.waitForTimeout(100);
  await log("m typed", (await R.shortcuts(page)).rows);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  await log("Enter", { card: await R.shortcuts(page), text: await R.editorTextHead(page) });
    }],
    ["bookmarks", async () => {
  /* bookmarks: ⌃⌘B on a day, A adds it, 1 jumps to it from elsewhere, a key given and typed, × deletes */
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(150);
  await log("⌃⌘B on a day", await R.bookmarks(page));
  await page.keyboard.press("a");
  await page.waitForTimeout(300);
  await log("A pressed", await R.bookmarks(page));
  await page.keyboard.press("Escape");
  await go("page/Horace", 5000);
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(150);
  await page.keyboard.press("1");
  await A.waitEntry(page, "2026-09-06", 5000);
  await log("1 from Horace", { entry: await A.entry(page), card: await R.bookmarks(page) });
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(150);
  await page.click(S.bookmarkKey);
  await page.waitForTimeout(150);
  await page.keyboard.type("fb");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await log("keyed fb", await R.bookmarks(page));
  await page.keyboard.press("f");
  await page.waitForTimeout(100);
  await log("f typed", { lit: await R.bookmarksLit(page) });
  await page.keyboard.press("b");
  await page.waitForTimeout(150);
  await log("b typed, already here", { card: await R.bookmarks(page), corner: await R.cornerText(page) });
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(150);
  await page.click(S.bookmarkDel);
  await page.waitForTimeout(150);
  await log("× pressed", await R.bookmarks(page));
  await page.keyboard.press("Escape");
    }],
    ["backups", async () => {
  /* the backups panel: the button opens the card; unconfigured, the setup button alone; Escape closes */
  await page.click(S.backupsButton);
  await page.waitForTimeout(100);
  await log("backups", await R.backups(page));
  await page.keyboard.press("Escape");
  await log("Escape", { card: await R.backupsOpen(page) });
    }],
    ["help", async () => {
  /* help: ⌃⌘H opens the card over the entry and closes the pages panel; Escape closes it */
  await page.click(S.pagesOpener);
  await page.keyboard.press("Control+Meta+h");
  await page.waitForTimeout(100);
  await log("⌃⌘H over an open pages panel", await R.help(page));
  await page.keyboard.press("Escape");
  await log("Escape", await R.helpOpen(page));
    }],
    ["line bar", async () => {
  /* ⌃⌘G: the bar over verse takes a line, cycles nothing on one block, marks and centres; Escape hands the caret to the row; over a book of leaves the Page box */
  await go("page/Horace");
  await R.settle(page);
  await page.keyboard.press("Control+Meta+g");
  await page.waitForTimeout(100);
  await log("⌃⌘G over Horace", await R.linebar(page));
  await page.keyboard.type("3");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await log("3, Enter", await R.linebar(page));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await log("Enter again on one block", await R.linebar(page));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  await log("Escape", { ...(await R.linebar(page)), caretRow: await R.caretRow(page) });
  await go("page/Williams/Witchcraft%203");
  await R.settle(page);
  await page.keyboard.press("Control+Meta+g");
  await page.waitForTimeout(100);
  await log("⌃⌘G over Witchcraft", await R.linebar(page));
  await page.keyboard.type("9z");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  await log("9z, Enter", await R.linebar(page));
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("61");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await log("61, Enter", await R.linebar(page));
  await page.keyboard.press("Escape");
    }],
    ["reference paste", async () => {
  /* a reference pasted as plain text into the rendered view renders as its markdown */
  await go("page/Pasted");
  await page.click(S.editor);
  await R.pasteText(page, "[*Gesta*, 7 September 2026](#2026-09-07?h=blind%20cord):\n\n> blind cord");
  await page.waitForTimeout(200);
  await log("a reference pasted", { md: await A.stored(page), ...(await R.pastedReference(page)) });
  await R.pasteText(page, "[*Gesta*](#2026-09-06?h=food%20of%20love)");
  await page.waitForTimeout(200);
  await page.click(S.editorLink("#2026-09-06?h=food%20of%20love"));
  await R.waitEntryAndSelection(page, "2026-09-06", "food of love");
  await page.waitForTimeout(300);
  await log("the reference link followed", await R.highlightFollowed(page));
    }],
    ["toolbar", async () => {
  /* the toolbar: a double-click selects a word and floats the bar; B bolds it; Tag moves it out */
  await go("2026-09-06");
  await page.evaluate(() => scrollTo(0, 0));
  const word = await R.wordAt(page, "music", 5);
  await page.mouse.dblclick(word.x, word.y);
  await R.waitBar(page);
  await page.waitForTimeout(100);   /* the editor's own selection lands a beat after the DOM's */
  await log("a word double-clicked", await R.bar(page));
  await page.click(S.fmtB);
  await page.waitForTimeout(100);
  await log("B clicked", { ...(await R.bar(page)), md: (await A.stored(page)).includes("**music**") });
  answer = "Music";
  await page.click(S.fmtTag);
  await A.waitEntry(page, "2026-09-06/Music", 5000);
  await log("Tag with Music answered", { entry: await A.entry(page), body: await A.stored(page) });
  await go("2026-09-06", 5000);
  await log("the day's text around the link", await R.textAroundLink(page, "#2026-09-06/Music"));
  answer = null;
    }],
    ["source view", async () => {
  /* the source view: ⌃⌘M over the day, the caret carried across by its count, an edit in the source landing */
  await go("2026-09-06");
  await R.caretBefore(page, "food of love");
  await page.waitForTimeout(100);   /* the editor reads the DOM selection a beat later; without the beat the caret was at the top on one run in three */
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 });
  await log("⌃⌘M", await R.sourceView(page, await A.stored(page)));
  await page.keyboard.type("FOOD ");
  await page.keyboard.press("Tab");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 });
  await log("⌃⌘M back", await R.sourceBack(page));
    }],
    ["go to", async () => {
  /* the Go to row: ⌃⌘J on a day, a year pick refilling the months, a day pick navigating; on a book, the chain and the sentinel */
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+j");
  await page.waitForTimeout(100);
  await log("⌃⌘J on a day", await R.goto(page));
  await page.selectOption(S.gotoDay, "05");
  await A.waitEntry(page, "2026-09-05", 5000);
  await log("a day picked", { entry: await A.entry(page), open: await R.gotoOpen(page) });
  await go("bookshelf/Browning,%20Robert/Pippa%20Passes");
  await page.keyboard.press("Control+Meta+j");
  await page.waitForTimeout(100);
  await log("⌃⌘J on a book", await R.goto(page));
  await page.selectOption(S.gotoDestination, "");
  await page.waitForTimeout(100);
  await log("Journal picked from the book", (await R.goto(page)).selects);
  await page.keyboard.press("Escape");
  await log("Escape", await R.goto(page));
    }],
    ["sub-entries", async () => {
  /* the sub-entries: the dialogs answered by the harness (declared above) */
  await go("2026-09-06");
  await log("the masthead over the day after the rows closed", await R.rowsClosed(page));
  await page.click(S.editorFirst);
  await page.keyboard.press("End");
  await log("a day's tools", await R.tools(page));
  answer = "Ideas";
  await A.act.create(page);
  await A.waitEntry(page, "2026-09-06/Ideas", 5000);
  const onLeaf = await A.act.createOnLeaf(page);
  await log("⌃⌘N on the tagged entry", onLeaf || await R.corner(page));
  await log("⌃⌘N, Ideas typed", { entry: await A.entry(page), crumb: await R.crumb(page), tools: await R.tools(page) });
  await go("2026-09-06", 5000);
  await log("the day's body ends with the link, its tag bar lists it", { link: await R.lastLink(page), tags: await R.tags(page) });
  await page.click(S.tagbarLink("#2026-09-06/Ideas"));
  await A.waitEntry(page, "2026-09-06/Ideas", 5000);
  answer = "Plans";
  await page.click(S.renameButton);
  await A.waitEntry(page, "2026-09-06/Plans", 5000);
  await page.waitForTimeout(300);
  await log("renamed to Plans", { entry: await A.entry(page), hash: page.url().split("#")[1], hostLink: /\[Plans\]\(#2026-09-06\/Plans\)/.test(await A.stored(page, "2026-09-06")) });
  await page.goto(A.url("2026-09-06"));
  await R.waitLink(page, "#2026-09-06/Plans");
  await log("the host's link followed", await R.lastLink(page));
  await page.click(S.tagbarLink("#2026-09-06/Plans"));
  await A.waitEntry(page, "2026-09-06/Plans", 5000);
  await page.click(S.deleteButton);
  await R.waitLinkGone(page, "#2026-09-06/Plans");
  await log("deleted: back on the day, its link gone, the other tag left", { entry: await A.entry(page), links: await R.links(page), tags: await R.tags(page) });
  answer = null;
    }],
    ["list", async () => {
  await go("page/Brand%20New");
  await page.click(S.editor);
  await page.keyboard.type("- one");
  await page.keyboard.press("Enter");
  await page.keyboard.type("two");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.keyboard.type("three");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(200);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("```");
  await page.keyboard.press("Enter");
  await page.keyboard.type("code line");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("after the block");
  await page.waitForTimeout(200);
  await log("a code block typed, Enter twice out of it", { md: await A.stored(page) });
  await log("a list typed: bullet, Enter, Tab, Enter, Shift-Tab twice", { md: await A.stored(page), ...(await R.corner(page)) });
  await log("the gap between the two outer items, and a line's height", await R.listGaps(page));
    }],
    ["search", async () => {
  await go("page/Links");
  await page.keyboard.press("Control+Meta+k");
  await page.waitForTimeout(100);
  await log("⌃⌘K", await R.search(page));
  await page.selectOption(S.searchScope, { label: "Everything" });
  await page.keyboard.type("sister");
  await R.waitSearchRows(page);
  await log("typed sister", await R.search(page));
  await page.keyboard.press("ArrowDown");
  await log("after ↓", (await R.search(page)).rows.filter((r) => r.includes("active")));
  await page.keyboard.press("Enter");
  await R.waitSelection(page, "sister");
  await log("Enter", { entry: await A.entry(page), selected: await R.selectionText(page), open: await R.searchOpen(page) });
    }],
    ["walk", async () => {
  /* the walk over a book whose index alternates prose and verse follows the index, not the alphabet */
  await go("bookshelf/Boethius/Consolatio/3pr1");
  await page.keyboard.press("Control+Meta+.");
  await R.waitEntryNot(page, "bookshelf/Boethius/Consolatio/3pr1");
  await log("⌃⌘. from 3pr1 over an index of 3pr1, 3m1, 3pr2", { entry: await A.entry(page) });
  await page.keyboard.press("Control+Meta+.");
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio/3pr2", 5000).catch(() => {});
  await log("⌃⌘. again", { entry: await A.entry(page) });
  await page.keyboard.press("Control+Meta+,");
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio/3m1", 5000).catch(() => {});
  await log("⌃⌘, back", { entry: await A.entry(page) });
    }],
    ["pill", async () => {
  if (A.pill) {
    await page.goto(A.url("page/Horace", "corner=pill"));
    await A.waitWarm(page);
    await log("with ?corner=pill", await R.pill(page));
    if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-pill.png"), clip: { x: 500, y: 500, width: 500, height: 100 } });
  }
    }],
  ];
  for (const [name, fn] of sections) {
    try { await fn(); }
    catch (e) { console.log("SECTION FAILED (" + name + "): " + String(e).split("\n")[0].slice(0, 200)); }
  }
}
