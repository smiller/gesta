import { section, caretAt, view, write, page, A, R, S, log, go, cornerText, wheelTo, TODAY, landed, searchFor, rest, keep } from "./kit.ts";

section("where the keys go", async () => {
  /* the caret or the focus that went nowhere: a card's chord pressed again, a row closed by its label, the bookmark card's link, Tab outside a list, a code block's Tab and ⌘A, Escape after a jump, ⌃⌘M and an arrival under an open row, Tab out of a card, held keys, a caret under the masthead, a line below a table, a picture landing while Search is typed in */
  /* a missing control fails its own step, not the section */
  await keysOpening();
  await keysAfterSearch();
  await picturePastedSearchTyped();
});
async function keysOpening(): Promise<void> {
  /* the view asked for, whichever the arrival brought */
  await chordsPressedTwice();
  await bookmarkLinkPressed();
  await tabCodeBlock();
  await tabTwelveTimesBookmarks();
  await enterHeldShortcut();
  await enterHeldFollowing();
  await enterCaretAboveWindow();
  await digitHeldBookmarksCard();
  await refusedEntryRedrawnUnder();
}
async function chordsPressedTwice(): Promise<void> {
  await go("commonplace/Horace");
  await view(false);
  await page.click(S.corner, { timeout: 1000 }).catch(() => {});   /* an earlier section's pin, dismissed as a reader does: the whispers below yield to it */
  await tap(S.editor);
  await twice("Control+Meta+s");
  await log("⌃⌘S pressed twice", {});
  await twice("Control+Meta+b");
  await log("⌃⌘B pressed twice", {});
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await tap(".page-lines > summary");
  await rest(page);
  await log("Line numbering closed by its label", await R.linesRowOpen(page));
  await go("commonplace/Links");
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.keyboard.press("a");
  await rest(page);
  await page.keyboard.press("Escape");
  await go("commonplace/Horace");
  /* the line's place once the measuring passes after an arrival are done:
     two readings a frame apart agree. Measured at once, a full run's click
     landed a word later as often as not */
  let at = await R.wordAt(page, "Maecenas atavis", 8);
  for (let i = 0; i < 20; i++) { await rest(page); const again = await R.wordAt(page, "Maecenas atavis", 8); if (again.x === at.x && again.y === at.y) break; at = again; }
  /* the click's caret is the editor's only once its selectionchange has
     reached it: under a full run's load the link landed at the caret before */
  await A.watchSelection(page);
  await page.mouse.click(at.x + 30, at.y);
}
async function bookmarkLinkPressed(): Promise<void> {
  await A.selectionMoved(page, 2000);
  await rest(page);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await tap(".bookmark-link[aria-label='Link to Links']");
  await rest(page);
  await page.keyboard.type("Z");
  await log("a bookmark's link pressed, Z typed", { line: ((await A.stored(page)) || "").split("\n").find((l) => l.includes("](#commonplace/Links)"))?.slice(0, 60) ?? null });
  await page.keyboard.press("Escape");
  /* Tab and ⌘A outside a list, in a code block, and the line below a table */
  await go("commonplace/Keys");
  await tap(S.editor);
  await view(true);
  await R.setSource(page, "one\n\ntwo\n\n```\nx = 1\ny = 2\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n");
  await view(false);
  await R.waitCorner(page, "saved");
  await page.waitForTimeout(1500);   /* every save landed first: a whisper of theirs stood over Tab's */
  /* clicked until the caret stands in the word: a click measured while the
     page settled after a view switch landed at the entry's end
     (pin: where the keys go › Tab held in a quote) */
  await clickWord("one");
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab in prose", { corner: await cornerText() });
  await R.selectBetween(page, "one", "two");
  await rest(page);
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab over two paragraphs", { corner: await cornerText() });
  await clickWord("x = 1");
  await page.keyboard.press("Tab");
  await rest(page);
}
async function tabCodeBlock(): Promise<void> {
  await log("Tab in a code block", { code: await page.evaluate((s) => document.querySelector(s)?.textContent ?? null, S.editorPre) });
  await page.keyboard.press("Meta+a");
  await rest(page);
  await log("⌘A in a code block", {});
  const below = await page.evaluate((e) => { const t = document.querySelector(e + " table"); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + 20, y: r.bottom + 14, last: document.querySelector(e).lastElementChild?.tagName }; }, S.editor);
  if (below) await page.mouse.click(below.x, below.y);
  await page.keyboard.type("z");
  await log("a click below a table at the end, z typed", { last: below?.last, tail: ((await A.stored(page)) || "").trimEnd().split("\n").slice(-2) });
  /* Escape after a search jump; ⌃⌘M over open results */
  await searchFor(page, "two");
  await landed(page, 600);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await rest(page);
  await log("Escape after a search jump", {});
  await searchFor(page, "one");
  await landed(page, 600);
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await log("⌃⌘M over open search results", {});
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await page.keyboard.press("Escape");
  /* an arrival at the entry already open, under the shortcuts popup and the Search row */
  await go(TODAY);
  await page.keyboard.press("Control+Meta+s");
  await rest(page);
  await page.keyboard.press("Control+Meta+t");
  await rest(page);
  await log("⌃⌘T on today from the shortcuts popup", {});
  await searchFor(page, "one");
  await landed(page, 600);
  await page.keyboard.press("Control+Meta+t");
  await rest(page);
  await log("⌃⌘T on today from Search", {});
  await page.keyboard.press("Escape");
  /* Tab out of a card */
  await tap(S.editor);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
}
async function tabTwelveTimesBookmarks(): Promise<void> {
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab twelve times from the bookmarks card", {});
  await page.keyboard.press("Escape");
  await tap(S.editor);
  await page.keyboard.press("Control+Meta+s");
  await rest(page);
  await page.keyboard.press("Shift+Tab");
  await rest(page);
  await log("Shift-Tab from the shortcuts popup", {});
  await page.keyboard.press("Escape");
  /* held keys: a key down again before it is up is the browser's auto-repeat */
  await page.focus(S.booksOpener);
  await hold("Tab", 11);
  await rest(page);
  await log("Tab held from the bookshelf button", { focus: await page.evaluate(() => document.activeElement?.getAttribute("title") ?? document.activeElement?.tagName) });
  await go("bookshelf/Boethius/Consolatio/3pr1");
  await tap(S.editor);
  await page.evaluate(() => { window.__walks = 0; addEventListener("hashchange", () => { window.__walks++; }); });
  await hold(".", 6, ["Control", "Meta"]);
  await page.waitForTimeout(1200);
  await log("⌃⌘. held from 3pr1", { walks: await page.evaluate(() => window.__walks) });
  await searchFor(page, "defixo");
  await landed(page, 600);
  await hold("Enter", 3);
  await rest(page);
  await log("Enter held on a search result", { entry: await A.entry(page), md: await A.stored(page, "bookshelf/Boethius/Consolatio/3pr2") });
  await go("commonplace/Held");
  await tap(S.editor);
  await page.keyboard.press("Control+Meta+s");
  await rest(page);
}
async function enterHeldShortcut(): Promise<void> {
  if (await page.isVisible(S.shortcutsEditor)) { await page.fill(S.shortcutsEditor, "sig: Sean Miller"); await tap(S.shortcutsSave); await rest(page); }
  await tap(S.shortcutsInput);
  await page.keyboard.type("sig");
  await rest(page);
  await hold("Enter", 3);
  await rest(page);
  await page.keyboard.type(" then.");
  await log("Enter held on a shortcut", { md: await A.stored(page) });
  await view(true);
  await R.setSource(page, "> quoted\n");
  await view(false);
  await clickWord("quoted");
  await hold("Tab", 3);
  await rest(page);
  await log("Tab held in a quote", { md: await A.stored(page) });
  /* a caret scrolled back into view stops below the masthead */
  await go("2026-09-05");
  await clickWord("The most famous story");
  /* the wheel's scroll settled before the Enter: one landing after it scrolled the caret back out of view */
  await wheelTo((await page.evaluate(() => scrollY)) + 900);
  await page.keyboard.press("Enter");
}
async function enterHeldFollowing(): Promise<void> {
  await page.waitForFunction(() => { const s = getSelection(); const r = s.rangeCount && (s.getRangeAt(0).getClientRects()[0] || s.anchorNode.parentElement?.getBoundingClientRect()); const head = document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0; return r && r.top >= head; }, null, { timeout: 2000 }).catch(() => {});
}
async function enterCaretAboveWindow(): Promise<void> {
  await log("Enter with the caret above the window", { clear: await page.evaluate(() => { const s = getSelection(); if (!s.rangeCount) return null; const r = s.getRangeAt(0).getClientRects()[0] || s.anchorNode.parentElement?.getBoundingClientRect(); const head = document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0; return r ? Math.round(r.top - head) : null; }) });
  await page.keyboard.press("Backspace");
}
async function digitHeldBookmarksCard(): Promise<void> {
  /* a picture that finishes preparing while Search is typed in */
  /* the digit that opens a bookmark, held: nothing typed into the entry it opened */
  await page.evaluate(() => { window.__typed = 0; document.addEventListener("beforeinput", () => { window.__typed++; }, true); });
  await keep("bookmarks", '["commonplace/Horace","2026-09-06"]');
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await hold("1", 4);
  await page.waitForTimeout(800);
  await log("a digit held on the bookmarks card", { typed: await page.evaluate(() => window.__typed) });
  /* a refused entry redrawn by another tab's write: Search, open over it, stays */
  await go("commonplace/Refused");
  await view(true);
  await R.setSource(page, "::: grid\nloose\n:::\n");
  for (let i = 0; i < 12 && !((await A.stored(page)) || "").includes("loose"); i++);
  await go("commonplace/Held");
  await go("commonplace/Refused");
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.keyboard.type("lo");
  await A.foreignWrite(page, "commonplace/Refused", "::: grid\nloose again\n:::\n");
  await page.waitForTimeout(800);
}
async function refusedEntryRedrawnUnder(): Promise<void> {
  await log("a refused entry redrawn under Search", { source: await R.inSource(page), query: await page.evaluate(() => document.querySelector(".search-input")?.value ?? null) });
  await page.keyboard.press("Escape");
  /* the picture's preparation held 800ms, so it lands after the keys are in Search */
  await go("commonplace/Pictured%20Late");
  await tap(S.editor);
}
const tap = (sel: string) => page.click(sel, { timeout: 3000 }).catch(() => {});
const twice = async (chord: string) => { for (let i = 0; i < 2; i++) { await page.keyboard.press(chord); await rest(page); } };
const clickWord = async (w: string) => {
    for (let i = 0; i < 3; i++) {
      const p = await R.wordAt(page, w, 1); await page.mouse.click(p.x, p.y); await rest(page);
      if (await page.evaluate((w) => (getSelection().anchorNode?.textContent || "").includes(w), w)) return;
      await rest(page); await rest(page);
    }
  };
const hold = async (key: string, times: number, mods: string[] = []) => {
    for (const m of mods) await page.keyboard.down(m);
    for (let i = 0; i < times; i++) { await page.keyboard.down(key); await page.waitForTimeout(i ? 50 : 400); }
    await page.keyboard.up(key);
    for (const m of mods.reverse()) await page.keyboard.up(m);
  };
async function keysAfterSearch(): Promise<void> {
  await page.evaluate(() => { const own = window.createImageBitmap; window.createImageBitmap = ((...a: [ImageBitmapSource]) => new Promise<ImageBitmap>((r) => setTimeout(() => r(own(...a)), 800))) as typeof own; });
  await R.pastePng(page);
  await searchFor(page, "abc");
  await page.waitForTimeout(2000);
}
async function picturePastedSearchTyped(): Promise<void> {
  await log("a picture pasted, then Search typed in", { query: await page.evaluate(() => document.querySelector(".search-input")?.value ?? null), pictures: await page.evaluate((s) => document.querySelectorAll(s).length, S.editorImg), md: await A.stored(page) });
  await page.keyboard.press("Escape");
}
section("editing as the help says", async () => {
  /* the help card's promises: a verse passage copied keeps its numbering, Enter in a countdown list counts down, Enter in a list item's own paragraph stays in the item, Tab in a quote carries its heading and table, and the line numbers while typing */
  /* a placed selection is read by the editor a moment later: a Tab pressed at once went where the arrival had left the caret */
  await verseLines23Copied();
  await tabTableQuote();
});
async function verseLines23Copied(): Promise<void> {
  /* an entry stored as another tab would, then opened */
  /* the numbers on screen beside a list: each item's own value, else the list's count from its start */
  await verseLinesCopied();
  await enterListItemS();
}
async function verseLinesCopied(): Promise<void> {
  await write("commonplace/Verse Copied", "::: verse\none line\ntwo line\nthree line\nfour line\nfive line\nsix line\nseven line\neight line\nnine line\nten line\neleven line\n:::\n");
  await R.selectBetween(page, "two line", "three line");
  await page.keyboard.press("Meta+c");
  await rest(page);
  await log("verse lines 2–3 copied", { clipboard: await R.clipboardLines(page) });
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on verse lines 2–3", { lines: (await R.clipboardLines(page)).map((l) => l.replace(/\(#[^)]*\)/, "(…)")) });
  await page.keyboard.press("ArrowRight");
  await caretAt("two line", 8);
  await page.waitForTimeout(3000);
  const before = await numbers();
  await page.keyboard.press("Enter");
  await page.keyboard.type("new line");
  await rest(page);
  const typing = await numbers();
  await page.waitForTimeout(3000);
  await log("a line typed into verse", { before, typing, after: await numbers() });
  await write("commonplace/Countdown", "5. five\n4. four\n");
  await caretAt("four", 4);
  await page.keyboard.press("Enter");
  await page.keyboard.type("next");
  await log("Enter in a countdown list", { md: await A.stored(page), numbers: await listNumbers() });
  await write("commonplace/Countdown Three", "5. five\n4. four\n3. three\n");
  await caretAt("five", 4);
  await page.keyboard.press("Enter");
  await page.keyboard.type("new");
  await log("Enter after the first item of a countdown", { md: await A.stored(page) });
  await write("commonplace/Countdown Middle", "5. five\n4. four\n3. three\n");
  await caretAt("four", 4);
  await page.keyboard.press("Enter");
  await page.keyboard.type("new");
  await log("Enter after the middle item of a countdown", { md: await A.stored(page) });
  await write("commonplace/Numbers Jump", "1. a\n5. e\n6. f\n");
  await caretAt("e", 1);
  await page.keyboard.press("Enter");
  await page.keyboard.type("new");
  await log("Enter after a jump in the numbering", { md: await A.stored(page) });
  await write("commonplace/Item Paragraph", "1. one\n\n   more of one\n\n2. two\n");
}
async function enterListItemS(): Promise<void> {
  await caretAt("more of one", 11);
  await page.keyboard.press("Enter");
  await page.keyboard.type("next");
  await log("Enter in a list item's second paragraph", { md: await A.stored(page) });
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("out");
  await log("Enter twice after it, out typed", { md: await A.stored(page) });
  await write("commonplace/Quoted Heading", "> ## Quoted head\n>\n> quoted text\n");
  await caretAt("Quoted head", 3);
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab on a heading in a quote", { md: await A.stored(page) });
  await write("commonplace/Quoted Table", "> quoted text\n>\n> | a | b |\n> | - | - |\n> | 1 | 2 |\n");
  await caretAt("1", 1);
}
const numbers = () => page.evaluate(() => [...document.querySelectorAll("#editor .ln.shown, #page .ln.shown")].filter((r) => getComputedStyle(r, "::before").content.replace(/"/g, "") !== "none").map((r) => r.dataset.line + ":" + r.textContent.trim().slice(0, 10)).join(" "));
const listNumbers = () => page.evaluate(() => [...document.querySelectorAll("#editor ol li, #page ol li")].map((li) => li.getAttribute("value") ?? "·").join(" ") + " (start " + (document.querySelector("#editor ol, #page ol")?.getAttribute("start") ?? "1") + (document.querySelector("#editor ol, #page ol")?.reversed ? ", reversed" : "") + ")");
async function tabTableQuote(): Promise<void> {
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab in a table in a quote", { md: await A.stored(page) });
}
