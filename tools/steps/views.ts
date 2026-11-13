import { section, page, A, R, S, log, go, winY, cornerText, wheelTo, setAnswer, STANZA_SEEDS, searchFor, rest } from "./kit.ts";

section("source view", async () => {
  /* the source view: ⌃⌘M over the day, the caret carried across by its count, an edit in the source landing */
  await sourceViewOpening();
  await sourceViewFollowing();
  await switchViews();
  await wordCountInSourceView();
});
async function sourceViewOpening(): Promise<void> {
  await go("2026-09-06");
  /* the editor reads the DOM selection when the browser's selectionchange
     reaches it: waited for, not a fixed beat — a 100 ms beat left the caret
     at the top on one run in three, and again under a busy machine */
  /* and only while the editor holds focus, and not in the beat after it set
     the selection itself, when it puts its own back: under a busy machine
     the caret was carried from the top with "food of love" selected on
     screen, so it is placed until it stays */
  await page.waitForFunction((ed) => document.querySelector(ed)?.contains(document.activeElement), S.editor, { timeout: 2000 }).catch(() => {});
}
async function sourceViewFollowing(): Promise<void> {
  for (let tries = 0; tries < 3; tries++) {
    await A.watchSelection(page);
    await R.caretBefore(page, "food of love");
    await A.selectionMoved(page, 2000);
    await rest(page);
    await rest(page);
    if (await page.evaluate(() => { const s = document.getSelection(); return !!s.anchorNode?.textContent.slice(s.anchorOffset).startsWith("food of love"); })) break;
  }
}
async function switchViews(): Promise<void> {
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 });
  await log("⌃⌘M", await R.sourceView(page, await A.stored(page)));
  await page.keyboard.type("FOOD ");
  await page.keyboard.press("Tab");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 });
  await log("⌃⌘M back", await R.sourceBack(page));
  /* the caret moved in the source without an edit: back, it stands where it was moved to, not where it came from */
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.sourceCaretTo(page, "play on");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await log("the caret moved in the source, ⌃⌘M back", await R.sourceBack(page));
  await wheelTo(0);
  await page.click(S.editorFirst);
  await rest(page);   /* the click's caret is read a beat later, as the section's first caret is: a chord at once switched with the caret before the click */
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await log("⌃⌘M from the top", { y: await winY() });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.click(S.editorFirst);
  await wheelTo(600);
  const away = await winY();
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await rest(page);
  /* within two lines, not to the top or to the caret: the switch carries the text at the window's top, and the pixel offset follows the other view's layout */
  await log("⌃⌘M scrolled away from the caret", { stayed: Math.abs((await winY()) - away) < 60 });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await log("⌃⌘M back, still scrolled away", { stayed: Math.abs((await winY()) - away) < 60 });
  await page.keyboard.press("Control+Meta+w");
  await rest(page);
  await log("⌃⌘W rendered", { corner: await cornerText() });
  await page.keyboard.press("Control+Meta+m");
}
async function wordCountInSourceView(): Promise<void> {
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+w");
  await rest(page);
  await log("⌃⌘W in the source view", { corner: await cornerText() });
  /* the search row closed in the source view: the keys go back to the text */
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.keyboard.press("Escape");
  await rest(page);
  await log("⌃⌘K, then Escape, in the source view", {});
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
}
section("go to", async () => {
  /* the Go to row: ⌃⌘J on a day, a year pick refilling the months, a day pick navigating; on a book, the chain and the sentinel */
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+j");
  await rest(page);
  await log("⌃⌘J on a day", await R.goto(page));
  await page.selectOption(S.gotoDay, "05");
  await A.waitEntry(page, "2026-09-05", 5000);
  await log("a day picked", { entry: await A.entry(page), open: await R.gotoOpen(page) });
  await go("bookshelf/Browning,%20Robert/Pippa%20Passes");
  await page.keyboard.press("Control+Meta+j");
  await rest(page);
  await log("⌃⌘J on a book", await R.goto(page));
  await page.selectOption(S.gotoDestination, "");
  await rest(page);
  await log("Journal picked from the book", (await R.goto(page)).selects);
  await page.keyboard.press("Escape");
  await log("Escape", await R.goto(page));
});
section("sub-entries", async () => {
  /* the sub-entries: the dialogs answered by the harness; the day holding
     one already, Music, linked from its text, so a delete leaves a tag */
  await A.foreignWrite(page, "2026-09-06/Music", "**music**\n");
  await A.foreignWrite(page, "2026-09-06", (await A.stored(page, "2026-09-06")) + "\n[Music](#2026-09-06/Music)\n");
  await go("2026-09-06");
  await log("the masthead over the day after the rows closed", await R.rowsClosed(page));
  /* the link goes in at the caret: the click's caret is the editor's only
     once its selectionchange has reached it. ⌘↓ takes it to the body's end;
     End moves no caret on a Mac, and the click alone left it mid-heading,
     the link splitting a word, once the heading ran past the click's point */
  await A.watchSelection(page);
  await page.click(S.editorFirst);
  await A.selectionMoved(page, 2000);
  await page.keyboard.press("Meta+ArrowDown");
  await rest(page);
  await log("a day's tools", await R.tools(page));
  setAnswer("Ideas");
  await A.act.create(page);
  await A.waitEntry(page, "2026-09-06/Ideas", 5000);
  const onLeaf = await A.act.createOnLeaf(page);
  await log("⌃⌘N on the tagged entry", onLeaf || await R.corner(page));
  await log("⌃⌘N, Ideas typed", { entry: await A.entry(page), crumb: await R.crumb(page), tools: await R.tools(page) });
  await go("2026-09-06", 5000);
  await log("the day's body ends with the link, its tag bar lists it", { link: await R.lastLink(page), tags: await R.tags(page) });
  await page.click(S.tagbarLink("#2026-09-06/Ideas"));
  await A.waitEntry(page, "2026-09-06/Ideas", 5000);
  setAnswer("Plans");
  await page.click(S.renameButton);
  await A.waitEntry(page, "2026-09-06/Plans", 5000);
  await rest(page);
  await log("renamed to Plans", { entry: await A.entry(page), hash: page.url().split("#")[1], hostLink: /\[Plans\]\(#2026-09-06\/Plans\)/.test(await A.stored(page, "2026-09-06")) });
  await page.goto(A.url("2026-09-06"));
  await R.waitLink(page, "#2026-09-06/Plans");
  await log("the host's link followed", await R.lastLink(page));
  await page.click(S.tagbarLink("#2026-09-06/Plans"));
  await A.waitEntry(page, "2026-09-06/Plans", 5000);
  await page.click(S.deleteButton);
  await R.waitLinkGone(page, "#2026-09-06/Plans");
  await log("deleted: back on the day, its link gone, the other tag left", { entry: await A.entry(page), links: await R.links(page), tags: await R.tags(page) });
  setAnswer(null);
});
section("list", async () => {
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
  await rest(page);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("```");
  await page.keyboard.press("Enter");
  await page.keyboard.type("code line");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("after the block");
  await rest(page);
  await log("a code block typed, Enter twice out of it", { md: await A.stored(page) });
  await log("a list typed: bullet, Enter, Tab, Enter, Shift-Tab twice", { md: await A.stored(page), ...(await R.corner(page)) });
  await log("the gap between the two outer items, and a line's height", await R.listGaps(page));
});
section("search", async () => {
  await go("page/Links");
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
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
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.selectOption(S.searchScope, { label: "Journal" });
  await page.keyboard.type("blackamoor");
  await R.waitSearchRows(page);
  await page.keyboard.press("Enter");
  await R.waitSelection(page, "blackamoor");
  await log("a jump to a hit in the entry already open", { entry: await A.entry(page), selected: await R.selectionText(page), open: await R.searchOpen(page) });
});
section("walk", async () => {
  /* the walk over a book whose index alternates prose and verse follows the index, not the alphabet */
  await go("bookshelf/Boethius/Consolatio/3pr1");
  await page.keyboard.press("Control+Meta+.");
  await R.waitEntryNot(page, "bookshelf/Boethius/Consolatio/3pr1");
  await rest(page);   /* a selection left on the last entry keeps the bar up one frame into this one (MEASURED, 10 ms) */
  await log("⌃⌘. from 3pr1 over an index of 3pr1, 3m1, 3pr2", { entry: await A.entry(page) });
  await page.keyboard.press("Control+Meta+.");
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio/3pr2", 5000).catch(() => {});
  await log("⌃⌘. again", { entry: await A.entry(page) });
  await page.keyboard.press("Control+Meta+,");
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio/3m1", 5000).catch(() => {});
  await log("⌃⌘, back", { entry: await A.entry(page) });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+.");
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio/3pr2", 5000).catch(() => {});
  await rest(page);
  await log("⌃⌘M, then ⌃⌘.", { entry: await A.entry(page), source: await R.inSource(page) });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
});
section("stanza", async () => {
  /* the Faerie Queene's stanzas, each a `::: stanza N` fence — the number drawn in its own column at every interval, the crumb the canto's key, ⌃⌘R across a stanza gap referring to 1.1.1.3–2.1 and quoting both, ⌃⌘G asking by a Stanza box and a Line box */
  await A.seedStanza(page, STANZA_SEEDS);
  await go("bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene/1.1");
  await R.settle(page);
  await log("a canto opened", { ...(await R.stanzas(page)), crumb: (await R.masthead(page)).crumb, title: (await R.masthead(page)).title });
  await R.selectBetween(page, "bloudie Crosse", "bloudie Crosse");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on a line", { lines: await R.clipboardLines(page) });
  await R.selectBetween(page, "deepe wounds", "bloudie Crosse");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R across a stanza gap", { lines: await R.clipboardLines(page) });
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await page.keyboard.type("2");
  await page.keyboard.press("Tab");
  await page.keyboard.type("1");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G stanza 2, line 1", { ...(await R.linebar(page)), landedText: await R.landedText(page) });
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("9");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G stanza 2, line 9", await R.linebar(page));
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("3");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("ii");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G stanza ii, line 3", { ...(await R.linebar(page)), landedText: await R.landedText(page) });
  await page.keyboard.press("Meta+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G line 3, no stanza", await R.linebar(page));
  await page.keyboard.press("Escape");
});
section("a blank row", async () => {
  /* a blank row between stanzas is an empty line: clicked, the caret drawn on it, no box and no bar, and not drawn once the search row has the focus; typed into, it becomes the line typed, a quotation mark curled as in any line; Backspace takes it out, the caret at the end of the line above */
  await go("2026-09-06");
  await R.settle(page);
  /* the locator's click, which waits for the row to stop moving: an arrival's
     restored place scrolled it between a position read and a click */
  await clickBlank();
  await log("a blank row clicked", await R.blankRow(page));
  await searchFor(page, "");
  await rest(page);
  await log("the search row opened over it", await R.blankRow(page));
  await page.keyboard.press("Escape");
  await rest(page);
  await clickBlank();
  await page.keyboard.press("Backspace");
  await rest(page);
  await log("Backspace on the blank row", await R.blankRow(page));
  await page.keyboard.press("Meta+z");
  await rest(page);
  await clickBlank();
  await page.keyboard.type("x");
  await rest(page);
  await log("x typed on the blank row", await R.blankRow(page));
  await page.keyboard.press("Meta+z");
  await rest(page);
  await clickBlank();
  await page.keyboard.type("\"");
  await rest(page);
  await log("a quotation mark typed on the blank row", await R.blankRow(page));
  await page.keyboard.press("Meta+z");
  await rest(page);
});
const clickBlank = async () => { const g = page.locator(S.editor + " .vgap").first(); const b = await g.boundingBox(); await g.click({ position: { x: 60, y: b.height / 2 } }); await rest(page); };
section("the switch carries the text", async () => {
  /* ⌃⌘M carries the TEXT at the window's top across the switch, not its pixel offset: a long canto switched at its middle and at its end */
  await switchCarriesTextOpening();
  await switchPlaceRemembered();
  await switchFrom20pxDown();
  await caretSeenSourceM();
});
async function switchCarriesTextOpening(): Promise<void> {
  const canto = Array.from({ length: 40 }, (_, k) => "::: stanza " + (k + 1) + "\n" + Array.from({ length: 9 }, (_, j) => "Stanza " + (k + 1) + ", line " + (j + 1) + ", set down to fill the measure").join("\n") + "\n:::").join("\n\n") + "\n";
  await go("page/Long%20Canto");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, canto);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  await wheelTo(0);
  await page.click(S.editorFirst);
}
async function switchPlaceRemembered(): Promise<void> {
  for (const [label, where] of [["a long canto switched at its middle", 0.5], ["a long canto switched at its end", 1]] as [string, number][]) {
    await wheelTo(Math.round((await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) * where));
    const rendered = await R.topStanza(page), renderedEnd = await R.lastStanzaShowing(page);
    await page.keyboard.press("Control+Meta+m");
    await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
    await rest(page);
    const source = await R.topStanza(page), sourceEnd = await R.lastStanzaShowing(page);
    await page.keyboard.press("Control+Meta+m");
    await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
    await rest(page);
    /* at the end the source, the shorter, stops at its own foot: the last stanza showing in both, not one stanza at both tops */
    await log(label, where < 1 ? { rendered, source, back: await R.topStanza(page) } : { rendered: renderedEnd, source: sourceEnd, back: await R.lastStanzaShowing(page) });
    if (where < 1) {
      await log("the switch's place remembered", { matches: await page.evaluate((k) => { try { const r = JSON.parse(localStorage.getItem(k) || "[]").find((x: { key: string }) => x.key === "page/Long Canto"); return !!r && Math.abs(r.y - scrollY) < 3; } catch { return null; } }, A.ns + "places") });
      /* the page grows above the text just set, as a picture resolving does: the switch's place is held like an arrival's */
      await page.evaluate((s) => { document.querySelector(s).style.paddingTop = "400px"; }, S.editor);
      await rest(page);
      await log("⌃⌘M back, then 400px grown above", { top: await R.topStanza(page) });
      await page.evaluate((s) => { document.querySelector(s).style.paddingTop = ""; }, S.editor);
      await rest(page);
    }
  }
}
async function switchFrom20pxDown(): Promise<void> {
  await wheelTo(20);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await rest(page);
  const nearTop = await winY();
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await log("⌃⌘M from 20px down", { source: nearTop, back: await winY() });
  /* a caret placed low in the source view's window, then back: it is still in view */
  await wheelTo(Math.round((await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) / 2));
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await page.mouse.click(400, (await page.evaluate(() => innerHeight)) - 30);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
}
async function caretSeenSourceM(): Promise<void> {
  await log("a caret seen in the source, ⌃⌘M back", { caretInView: await page.evaluate(() => { const s = getSelection(); if (!s.rangeCount) return null; const r = s.getRangeAt(0).getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }) });
}
section("contents folds", async () => {
  /* a work's contents folding under its headings: the stanza seeds' Faerie Queene, its contents page a `##` Book heading over a canto link — closed on arrival with its count, opened by the triangle in the margin, remembered with the link followed from it on the way back */
  await A.seedStanza(page, STANZA_SEEDS);
  await go("bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene");
  await R.settle(page);
  await log("a contents page opened", await R.folds(page));
  await R.clickFoldTriangle(page, "Book I");
  await log("the triangle clicked", await R.folds(page));
  await page.click(S.editorLink("#bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene/1.1")).catch(() => {});
  await A.waitEntry(page, "bookshelf/Spenser, Edmund/The Faerie Queene/1.1", 5000).catch(() => {});
  await log("its canto followed", { entry: await A.entry(page) });
  await wheelTo(0);
  await go("bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene");
  await rest(page);
  await log("back on the contents", await R.folds(page));
});
