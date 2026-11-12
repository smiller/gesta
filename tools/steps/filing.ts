import { section, page, A, R, S, log, go, cursor, winY, cornerText, setAnswer, prompts, landed, rest } from "./kit.ts";

section("author filing", async () => {
  /* (2026-10-05) "New author…" asks the name, then where it sorts, filled with the surname first; Rename on an author with a book re-files it, the book and the link to it with it, and the corner says so; the current app asks once and files the name as typed, and refuses to rename an author with books */
  await newAuthorSeanMiller();
  await bookCaretHeadingS();
  await renameAuthorTyped();
  await renameAuthorFollowing();
  await reFiledBookPicture();
});
async function newAuthorSeanMiller(): Promise<void> {
  await go("2026-09-06");
  await page.click(S.booksOpener);
  setAnswer(["Sean Miller", "Miller, Sean"]);
  prompts.length = 0;
  await page.click(S.newAuthor);
  await A.waitEntry(page, "bookshelf/Miller, Sean", 5000).catch(() => {});
  await log("New author…, Sean Miller, Enter twice", { prompts: prompts.slice(), entry: await A.entry(page), stored: await A.stored(page, "bookshelf/Miller, Sean") });
  await page.click(S.booksOpener);
  await log("the bookshelf lists it by its heading", await R.panel(page));
  await page.keyboard.press("Escape");
  /* + book with the caret inside the heading: refused, the author's name kept */
  const mid = await page.evaluate((s) => { const h = document.querySelector(s); const b = h.getBoundingClientRect(); return { x: b.left + 8, y: b.top + b.height / 2 }; }, S.editorFirst);
  await page.mouse.click(mid.x, mid.y);
  await rest(page);
  setAnswer("Odes");
  await A.act.create(page);
  await page.waitForFunction((s) => /heading/.test(document.querySelector(s)?.textContent || ""), S.corner, { timeout: 3000 }).catch(() => {});
  await log("+ book with the caret in the heading", { corner: await cornerText(), stored: await A.stored(page, "bookshelf/Miller, Sean"), book: await A.stored(page, "bookshelf/Miller, Sean/Odes") });
  /* the same in the markdown view, the caret on the heading's line */
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 3000 }).catch(() => {});
}
async function bookCaretHeadingS(): Promise<void> {
  await page.evaluate((s) => { const ta = document.querySelector(s); ta.focus(); ta.setSelectionRange(3, 3); }, S.source);
  setAnswer("Odes");
  await A.act.create(page);
  await page.waitForFunction((s) => /heading/.test(document.querySelector(s)?.textContent || ""), S.corner, { timeout: 3000 }).catch(() => {});
  await log("+ book with the caret on the heading's line, markdown view", { corner: await cornerText(), stored: await A.stored(page, "bookshelf/Miller, Sean"), book: await A.stored(page, "bookshelf/Miller, Sean/Odes") });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { state: "detached", timeout: 3000 }).catch(() => {});
  /* a click just past the heading's last letter, the caret at its end */
  const end = await page.evaluate((s) => { const h = document.querySelector(s); const r = document.createRange(); r.selectNodeContents(h); const b = r.getBoundingClientRect(); return { x: b.right + 3, y: b.top + b.height / 2 }; }, S.editorFirst);
  await page.mouse.click(end.x, end.y);
  /* the editor takes a click's caret on the selection's change, a tick later than the click */
  await rest(page);
  await page.keyboard.press("Enter");
  setAnswer("Odes");
  await A.act.create(page);
}
async function renameAuthorTyped(): Promise<void> {
  await A.waitEntry(page, "bookshelf/Miller, Sean/Odes", 5000).catch(() => {});
  await page.click(S.editor);
  await page.keyboard.type("A book. ");
  await R.pastePng(page);
  await R.waitImg(page);
  await R.waitCorner(page, "saved");
  await go("bookshelf/Miller%2C%20Sean", 5000);
  setAnswer("Sean Miller");
  prompts.length = 0;
  await page.click(S.renameAuthor);
  await A.waitEntry(page, "bookshelf/Sean Miller", 5000).catch(() => {});
  await page.waitForFunction((s) => /filed under/.test(document.querySelector(s)?.textContent || ""), S.corner, { timeout: 3000 }).catch(() => {});
  await log("Rename, Sean Miller typed, Enter", { prompts: prompts.slice(), entry: await A.entry(page), corner: await cornerText(), author: await A.stored(page, "bookshelf/Sean Miller"), book: await A.stored(page, "bookshelf/Sean Miller/Odes"), oldAuthor: await A.stored(page, "bookshelf/Miller, Sean"), oldBook: await A.stored(page, "bookshelf/Miller, Sean/Odes") });
  await page.click(S.booksOpener);
  await log("the bookshelf after the re-file", await R.panel(page));
  await page.keyboard.press("Escape");
  await go("bookshelf/Sean%20Miller/Odes", 5000);
}
async function renameAuthorFollowing(): Promise<void> {
  await page.waitForFunction(() => { const i = document.querySelector("#editor img"); return i && (i.naturalWidth || i.dataset.missing); }, null, { timeout: 5000 }).catch(() => {});
}
async function reFiledBookPicture(): Promise<void> {
  await log("the re-filed book, its picture", { entry: await A.entry(page), md: await A.stored(page, "bookshelf/Sean Miller/Odes"), missing: await page.evaluate(() => document.querySelector("#editor img")?.dataset.missing || null), ...(await R.picture(page).catch(() => ({}))) });
}
section("replace", async () => {
  /* find and replace (2026-10-08, successor-only): ⌃⌘E in the rendered view switches to the source view and opens the bar, the corner whispering; Enter in Find steps on, Enter in Replace with replaces the outlined match and moves on, Skip moves on leaving it, Replace All replaces the rest, ⌘Z in the text undoes the All in one step, Escape closes and switches back; opened in the source view it stays there */
  await replaceInRenderedView();
  await replaceInSourceView();
  await escapeSwitchBackRefused();
  await entrySavedAnotherWindow();
  await savedElsewhereFollowing();
});
async function replaceInRenderedView(): Promise<void> {
  await go("page/Replaced");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, "One*-*two *-*three, and *,* four.\n\nFive*-*six.\n");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await log("⌃⌘E in the rendered view", { ...(await R.replaceBar(page)), corner: await R.cornerTextOrEmpty(page) });
  await page.keyboard.type("*-*");
  await rest(page);
  await log("*-* typed into Find", await R.replaceBar(page));
  await page.keyboard.press("Enter");
  await rest(page);
  await log("Enter in Find", await R.replaceBar(page));
  await page.click(S.replaceWith, { timeout: 2000 }).catch(() => {});
  await page.keyboard.type("-");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("Enter in Replace with", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.click(S.replaceSkip, { timeout: 2000 }).catch(() => {});
  await rest(page);
  await log("Skip", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {});
  await rest(page);
  await log("Replace All, the rest replaced", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.click(S.source, { timeout: 2000 }).catch(() => {});
  await page.keyboard.press("Meta+z");
  await rest(page);
  await log("⌘Z in the text", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.keyboard.press("Escape");
  await rest(page);
  await log("Escape, opened in the rendered view", await R.replaceBar(page));
  await page.keyboard.press("Control+Meta+m");
}
async function replaceInSourceView(): Promise<void> {
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await log("⌃⌘E in the source view", await R.replaceBar(page));
  await page.keyboard.press("Escape");
  await rest(page);
  await log("Escape, opened in the source view", await R.replaceBar(page));
  /* a long entry: the layer the matches are drawn on keeps the text's line pitch to its last line, where 27.54px set it 79px low over 2,706 lines of Paradise Lost (2026-10-08) */
  await R.setSource(page, Array.from({ length: 1500 }, (_, i) => "Line " + i + " of a long entry, with *-* in it and more words after it to wrap.").join("\n\n"));
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await log("a long entry's matches", await R.replaceDrift(page));
  /* Replace All far from the end keeps the window where it was: the whole-text edit put the caret, and the window, at the entry's last line */
  { const y = await winY(); await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {}); await rest(page); await log("Replace All in a long entry", { count: (await R.replaceBar(page)).count, kept: Math.abs((await winY()) - y) < 60 }); }
  await page.keyboard.press("Escape");
  /* a replacement holding the find: the rest are counted, not "none" */
  await R.setSource(page, "cat and cat\n");
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await page.fill("#replacefind", "cat").catch(() => {});
  await page.fill("#replacewith", "cats").catch(() => {});
  await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {});
  await rest(page);
  await log("Replace All, the replacement holding the find", await R.replaceBar(page));
  await page.keyboard.press("Escape");
  /* a switch back the parse refuses: the cursor goes back to the text, not into the hidden Find box */
  await R.setSource(page, "::: grid 2\n::: card-red\nx\n:::\n:::\n");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
}
async function escapeSwitchBackRefused(): Promise<void> {
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await page.fill("#replacefind", "::: card-red").catch(() => {});
  await page.fill("#replacewith", "zz").catch(() => {});
  await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {});
  await rest(page);
  await page.keyboard.press("Escape");
  await rest(page);
  await log("Escape, the switch back refused", await R.replaceBar(page));
  await R.setSource(page, "One*-*two.\n");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  /* another panel opened over the bar closes it, and switches back as Escape does */
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await page.keyboard.press("Control+Meta+h");
  await rest(page);
  await log("⌃⌘H over the bar", { ...(await R.replaceBar(page)), help: (await R.helpOpen(page)).help });
  await page.keyboard.press("Escape");
  await rest(page);
  /* the same entry saved in another window rebuilds the source view under the bar: the bar closes, its offsets belonging to the text it was opened on, and the caret goes back to the match it stood on, not to the text's end */
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await page.fill("#replacefind", "*-*").catch(() => {});
  /* the switch's own save lands first, or the other window's write is refused as stale */
  await landed(page, 1500);
}
async function entrySavedAnotherWindow(): Promise<void> {
  { const other = await page.context().newPage();
    await other.goto(A.url("page/Replaced")); await A.waitEntry(other, "page/Replaced");
    await other.click(S.editor); await other.keyboard.press("End"); await other.keyboard.type(" Seven*-*eight.");
    await R.waitCorner(other, "saved");
    /* the landed write reaches this window by its notice: waited for, so a reading never races it */
    await page.waitForFunction(() => /Seven/.test(document.querySelector("textarea.source")?.value || document.querySelector("#editor")?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
    await rest(page);
    await log("the entry saved in another window, the bar open", { ...(await R.replaceBar(page)), text: await page.evaluate(() => document.querySelector("textarea.source")?.value ?? null), caret: await page.evaluate(() => document.querySelector("textarea.source")?.selectionStart ?? null) });
    await other.close(); }
}
async function savedElsewhereFollowing(): Promise<void> {
  await page.keyboard.press("Escape");
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {}); }
}
section("losing nothing", async () => {
  /* what was lost and is kept now: a fence's words after its language, a picture under the code button, a selection under a paste of line breaks, page markers in a copy, a second export's report, a store that never answers */
  await fenceWordsBothViews();
  await exportPressedTwice();
  await exportPressedTwiceFollowing();
  await typedIntoEntryImport();
  await storeThatNeverAnswers();
});
async function fenceWordsBothViews(): Promise<void> {
  await go("page/Kept");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, "```not code\nx = 1\n```\n\ncap ![](x.png) tion\n\n::: note\nin her degree ⟨8⟩ and on\n:::\n");
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await log("a fence's words after the language, through both views", { fence: await page.evaluate((s) => document.querySelector(s)?.value.split("\n")[0] ?? null, S.source) });
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await R.waitCorner(page, "saved");   /* the source's save landed first: its whisper would stand over the refusal's */
  await R.selectBetween(page, "cap", "tion");
  await rest(page);
  await page.click(".fmt .code");
  await rest(page);
  await log("the code button over a picture", { corner: await cornerText(), kept: ((await A.stored(page)) || "").includes("cap ![](x.png) tion") });
  await R.selectBetween(page, "cap", "cap");
  await R.pasteText(page, "\n\n");
  await rest(page);
  await log("line breaks pasted over a selection", { kept: ((await A.stored(page)) || "").includes("cap ![](x.png) tion") });
  await R.selectBetween(page, "in her", "and on");
  await page.keyboard.press("Meta+c");
  await rest(page);
  await log("⌘C over a page marker", { text: await R.clipboardText(page) });
  await page.hover(S.editor + " div.note");
  await rest(page);
  await page.click(S.copybtn);
  await rest(page);
  await log("a note with a page marker hover-copied", { text: await R.clipboardText(page) });
}
async function exportPressedTwice(): Promise<void> {
  /* a folder picker that answers only when told: the export stays running */
  await page.evaluate(() => { window.__pickers = 0; window.showDirectoryPicker = () => new Promise((_, reject) => { window.__pickers++; window.__pickerAbort = () => reject(new DOMException("dismissed", "AbortError")); }); });
  await page.click(".toolbtn[title^='Export every entry']");
  await rest(page);
  await page.click(".toolbtn[title^='Export every entry']");
  await rest(page);
  await log("export pressed again while one runs", { corner: await cornerText(), pickers: await page.evaluate(() => window.__pickers) });
  await page.evaluate(() => window.__pickerAbort?.());
  await rest(page);
  /* an import over the entry open, typed into while it runs: the import's text stands and its tally shows; the keys go back to the text after the button */
  await go("page/Typed");
  await page.click(S.editor);
  await page.keyboard.type("before the import. ");
  await landed(page, 1200);
}
async function exportPressedTwiceFollowing(): Promise<void> {
  await page.evaluate(() => {
    const file = (name: string, text: string) => ({ kind: "file", name, getFile: () => Promise.resolve(new File([text], name)) });
    const dir = (name: string, kids: unknown[]) => ({ kind: "directory", name, values: async function* () { for (const k of kids) yield k; } });
    const fillers = Array.from({ length: 1500 }, (_, i) => file("Filler " + String(i).padStart(4, "0") + ".md", "# Filler " + i + "\n"));
    window.showDirectoryPicker = () => Promise.resolve(dir("export", [dir("page", [...fillers, file("Typed.md", "IMPORTED TEXT\n")])]));
  });
}
async function typedIntoEntryImport(): Promise<void> {
  await page.click(".toolbtn[title^='Import']");
  await rest(page);
  const afterButton = await cursor();
  await page.waitForFunction(importing, S.corner, { timeout: 10000 }).catch(() => {});
  await page.click(S.editor);
  await page.keyboard.type("T0 T1 T2 ");
  /* the import's end: its tally, or a failure still owed from an earlier section, which every operation's end puts back */
  await page.waitForFunction(imported, S.corner, { timeout: 30000 }).catch(() => {});
  const tallied = await cornerText();
  await page.waitForTimeout(1000);
  await log("typed into an entry an import overwrites", { afterButton, text: await page.evaluate(textStart, S.editor), corner: tallied });
}
const importing = (c: string): boolean => /^importing/.test(document.querySelector(c)?.textContent || "");
const imported = (c: string): boolean => !/^importing/.test(document.querySelector(c)?.textContent || "");
const textStart = (e: string): string => (document.querySelector(e)?.textContent || "").slice(0, 40);
async function storeThatNeverAnswers(): Promise<void> {
  /* a page of its own, the persist call watched from before the app's first line */
  const hung = await page.context().newPage();
  await hung.addInitScript(() => { const s = navigator.storage; const own = s.persist.bind(s); s.persist = () => { window.__persistAsked = true; return own(); }; });
  await hung.goto(A.url("page/Horace", "warm=hang"));
  await hung.waitForTimeout(8500);
  await log("a store that never answers", await hung.evaluate((c) => ({ corner: document.querySelector(c)?.textContent || "", persistAsked: !!window.__persistAsked }), S.corner));
  await hung.close();
}
