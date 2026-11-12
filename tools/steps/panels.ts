import { section, page, A, R, S, log, go, wheelTo, setAnswer, rest } from "./kit.ts";

section("shortcuts", async () => {
  /* shortcuts: ⌃⌘S with an empty table opens the editor; a table saved; a code typed and Enter inserts at the caret */
  await go("page/Expanded");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+s");
  await rest(page);
  await log("⌃⌘S, no table yet", await R.shortcuts(page));
  await page.fill(S.shortcutsEditor, "sig: Sean Miller\nmd: markdown");
  await page.click(S.shortcutsSave);
  await rest(page);
  await log("saved", { ...(await R.shortcuts(page)), corner: await R.cornerText(page) });
  await page.click(S.shortcutsInput);
  await page.keyboard.type("m");
  await rest(page);
  await log("m typed", (await R.shortcuts(page)).rows);
  await page.keyboard.press("Enter");
  await rest(page);
  await log("Enter", { card: await R.shortcuts(page), text: await R.editorTextHead(page) });
});
section("bookmarks", async () => {
  /* bookmarks: ⌃⌘B on a day, A adds it, 1 jumps to it from elsewhere, a key given and typed, × deletes */
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await log("⌃⌘B on a day", await R.bookmarks(page));
  await page.keyboard.press("a");
  await rest(page);
  await log("A pressed", await R.bookmarks(page));
  await page.keyboard.press("Escape");
  await go("page/Horace", 5000);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.keyboard.press("1");
  await A.waitEntry(page, "2026-09-06", 5000);
  await log("1 from Horace", { entry: await A.entry(page), card: await R.bookmarks(page) });
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.click(S.bookmarkKey);
  await rest(page);
  await page.keyboard.type("fb");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("keyed fb", await R.bookmarks(page));
  await page.keyboard.press("f");
  await rest(page);
  await log("f typed", { lit: await R.bookmarksLit(page) });
  await page.keyboard.press("b");
  await rest(page);
  await log("b typed, already here", { card: await R.bookmarks(page), corner: await R.cornerText(page) });
  /* the same press over a selection: the focus back, the selection as it stood */
  await R.selectBetween(page, "food", "love");
  await rest(page);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.keyboard.type("fb");
  await rest(page);
  await log("fb over a selection, already here", { corner: await R.cornerText(page) });
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.click(S.bookmarkDel);
  await rest(page);
  await log("× pressed", await R.bookmarks(page));
  await page.keyboard.press("Escape");
});
section("bookmarks damaged", async () => {
  /* a damaged list (2026-10-01): ⌃⌘B says so and A is refused with its pin; repaired by hand, the next ⌃⌘B shows its rows without a reload — the current app keeps the latch until one — and A lands, releasing the pin; a reload ends the step so neither app carries the pin on, back on the day the next step reads */
  await go("page/Horace", 5000);
  await page.evaluate((k) => localStorage.setItem(k, "not json"), A.bookmarksKey);
  await page.reload();
  await A.waitEntry(page, "page/Horace").catch(() => {});
  await A.waitWarm(page).catch(() => {});
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await log("⌃⌘B over a damaged list", await R.bookmarks(page));
  await page.keyboard.press("a");
  await rest(page);
  await log("A over a damaged list", { card: await R.bookmarks(page), corner: await R.cornerText(page), stored: await page.evaluate((k) => localStorage.getItem(k), A.bookmarksKey) });
  await page.keyboard.press("Escape");
  await page.evaluate((k) => localStorage.setItem(k, '["2026-09-06"]'), A.bookmarksKey);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await log("⌃⌘B over the list repaired", await R.bookmarks(page));
  await page.keyboard.press("a");
  await rest(page);
  await log("A over the list repaired", { card: await R.bookmarks(page), corner: await R.cornerText(page) });
  await page.keyboard.press("Escape");
  await page.reload();
  await A.waitEntry(page, "page/Horace").catch(() => {});
  await A.waitWarm(page).catch(() => {});
  await go("2026-09-06");
});
section("backups", async () => {
  /* the backups panel: the button opens the card; unconfigured, the setup button alone; Escape closes */
  await page.click(S.backupsButton);
  await rest(page);
  await log("backups", await R.backups(page));
  await page.keyboard.press("Escape");
  await log("Escape", { card: await R.backupsOpen(page) });
});
section("help", async () => {
  /* help: ⌃⌘H opens the card over the entry and closes the pages panel; Escape closes it */
  await page.click(S.pagesOpener);
  await page.keyboard.press("Control+Meta+h");
  await rest(page);
  await log("⌃⌘H over an open pages panel", await R.help(page));
  await page.keyboard.press("Escape");
  await log("Escape", await R.helpOpen(page));
});
section("line bar", async () => {
  /* ⌃⌘G: the bar over verse takes a line, cycles nothing on one block, marks and centres; Escape hands the caret to the row; over a book of leaves the Page box */
  await go("page/Horace");
  await R.settle(page);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await log("⌃⌘G over Horace", await R.linebar(page));
  await page.keyboard.type("3");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("3, Enter", await R.linebar(page));
  await page.keyboard.press("Enter");
  await rest(page);
  await log("Enter again on one block", await R.linebar(page));
  await page.keyboard.press("Escape");
  await rest(page);
  await log("Escape", { ...(await R.linebar(page)), caretRow: await R.caretRow(page) });
  await go("page/Williams/Witchcraft%203");
  await R.settle(page);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await log("⌃⌘G over Witchcraft", await R.linebar(page));
  await page.keyboard.type("9z");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("9z, Enter", await R.linebar(page));
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("61");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("61, Enter", await R.linebar(page));
  await page.keyboard.press("Escape");
});
section("reference paste", async () => {
  /* a reference pasted as plain text into the rendered view renders as its markdown */
  await go("page/Pasted");
  await page.click(S.editor);
  await R.pasteText(page, "[*Gesta*, 7 September 2026](#2026-09-07?h=blind%20cord):\n\n> blind cord");
  await rest(page);
  await log("a reference pasted", { md: await A.stored(page), ...(await R.pastedReference(page)) });
  await R.pasteText(page, "[*Gesta*](#2026-09-06?h=food%20of%20love)");
  await rest(page);
  await page.click(S.editorLink("#2026-09-06?h=food%20of%20love"));
  await R.waitEntryAndSelection(page, "2026-09-06", "food of love");
  await rest(page);
  await log("the reference link followed", await R.highlightFollowed(page));
  /* the link's passage is deep in a long entry: the jump must SCROLL to it,
     not only select it — the one-line case above never needed a scroll,
     and the jump landed at the top of Paradise Lost (found by hand
     2026-09-12); the bar stays off, the passage is to be read in context */
  await go("page/Pasted");
  await page.click(S.editor);
  await R.pasteText(page, "[*Pippa*](#bookshelf/Browning%2C%20Robert/Pippa%20Passes?h=Power%20shall%20fall%20short%20in%20or%20exceed)");
  await rest(page);
  await page.click(S.editorLink("#bookshelf/Browning%2C%20Robert/Pippa%20Passes?h=Power%20shall%20fall%20short%20in%20or%20exceed"));
  await R.waitEntryAndSelection(page, "bookshelf/Browning, Robert/Pippa Passes", "Power shall fall short in or exceed");
  await rest(page);
  await log("a link deep into a long entry followed", await R.highlightFollowed(page));
  /* a paired reference is a fence inside the quotation (2026-09-12): its
     pair stands where a quoted paragraph's text does, its cells unwrapped */
  await go("page/Pasted Pair");
  await page.click(S.editor);
  await R.pasteText(page, "[*Milton*](#2026-09-07?h=mind):\n\n> The mind is its own place\n\n[*Horace*](#page/Horace?h=intemptata):\n\n> ::: verse 13\n> intemptata nites. Me tabula sacer | you shine untested. As for me, a holy\n> votiva paries indicat uvida | wall with a votive table shows that I\n> suspendisse potenti | have hung up my still dripping clothes\n> vestimenta maris deo. | to the deity who rules the sea.\n> :::");
  await page.waitForTimeout(700);
  await log("a paired reference pasted", await R.quotedPair(page));
  /* the grow side: a longer English half typed into the quoted pair widens the entry under the caret rather than wrapping (short of the 1000px window's cap, where a wrap is the cap's — measured 2026-09-12 with a longer phrase). READ WITHIN 400ms OF THE KEYS: a reading at 700ms proved nothing about the grow (the 2026-09-12 confirmation pass); the settled reading follows it */
  const pasted = await R.quotedPair(page);
  await R.caretAfter(page, "rules the sea.", 14);
  await page.keyboard.type(" and every creature in it");
  const grew = await R.waitPairGrew(page, pasted.cols, 400, "every creature in it");   /* the whole phrase present, the row grown AND unwrapped: the first column change is an early keystroke's, and a read then caught the row mid-fit, twice (verify, 2026-09-12) */
  await log("typed into the quoted pair", { grew, ...(await R.quotedPair(page)) });
  await page.waitForTimeout(600);
  await log("typed into the quoted pair, settled", await R.quotedPair(page));
});
section("toolbar", async () => {
  /* the toolbar: a double-click selects a word and floats the bar; B bolds it; Tag moves it out */
  await go("2026-09-06");
  await wheelTo(0);
  const word = await R.wordAt(page, "music", 5);
  await page.mouse.dblclick(word.x, word.y);
  await R.waitBar(page);
  await rest(page);   /* the editor's own selection lands a beat after the DOM's */
  await log("a word double-clicked", await R.bar(page));
  await page.click(S.fmtB);
  await rest(page);
  await log("B clicked", { ...(await R.bar(page)), md: (await A.stored(page)).includes("**music**") });
  setAnswer("Music");
  await page.click(S.fmtTag);
  await A.waitEntry(page, "2026-09-06/Music", 5000);
  await log("Tag with Music answered", { entry: await A.entry(page), body: await A.stored(page) });
  await go("2026-09-06", 5000);
  await log("the day's text around the link", await R.textAroundLink(page, "#2026-09-06/Music"));
  setAnswer(null);
});
