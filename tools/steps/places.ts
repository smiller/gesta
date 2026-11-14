import { section, page, ctx, A, R, S, log, go, winY, inView, cornerText, wheelTo, setAnswer, MARGIN_SEEDS, rest, still, keep, seed } from "./kit.ts";

section("places", async () => {
  /* every entry returns to where it was left: Pippa scrolled down and left to settle, Horace followed, then Back, Forward, Back and a reload — the browser's own restore on Back and Forward ran against the entry being left and saved the other's offset for it */
  await pippaScrolledDown();
  await pippaPlaceReturned();
  await backPlaceClosedSection();
  await contentsLinkBeforeWarm();
  await forcedEntryLeftScrolled();
  await backToInlineCodeLines();
});
async function pippaScrolledDown(): Promise<void> {
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await wheelTo(1200);
  await page.waitForTimeout(700);
  await log("Pippa scrolled down", await R.place(page));
  await go("commonplace/Horace");
  await rest(page);
  await log("Horace followed", await R.place(page));
  await page.goBack();
  await A.waitEntry(page, pippa, 5000).catch(() => {});
  await rest(page);
  await log("Back", await R.place(page));
  await page.goForward();
  await A.waitEntry(page, "commonplace/Horace", 5000).catch(() => {});
  await rest(page);
  await log("Forward", await R.place(page));
  await page.goBack();
  await A.waitEntry(page, pippa, 5000).catch(() => {});
  await rest(page);
  await log("Back again", await R.place(page));
  await page.reload();
  await A.waitEntry(page, pippa).catch(() => {});
  await A.waitWarm(page).catch(() => {});
  await rest(page);
  await log("reloaded", await R.place(page));
  await page.evaluate((s) => { document.querySelector(s).style.paddingTop = "400px"; }, S.editor);   /* the page grows above the held place, as a picture resolving does */
  await rest(page);
  await log("400px grown above the held place", await R.place(page));
  await page.waitForTimeout(500);
  await go("commonplace/Horace");
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await rest(page);
  await log("Pippa after the growth", await R.place(page));
  /* a place inside a section closed on the way back: Consolatio grown to six Books, left in Book 5, its fold state forgotten, returned to */
  let consolatio = "# De consolatione philosophiae\n\n";
  for (let b = 1; b <= 6; b++) { consolatio += "## Book " + b + "\n\n- [3pr1](#bookshelf/Boethius/Consolatio/3pr1)\n\n"; for (let i = 1; i <= 6; i++) consolatio += "Filler " + b + "." + i + " " + "words to fill a line of the page out ".repeat(6) + "\n\n"; }
  await go("bookshelf/Boethius/Consolatio");
  await page.click(S.editor);
  await page.keyboard.press("Meta+a");
  await R.pasteText(page, consolatio);
}
const pippa = "bookshelf/Browning, Robert/Pippa Passes";
async function pippaPlaceReturned(): Promise<void> {
  await page.waitForTimeout(900);
  for (let b = 1; b <= 6; b++) await R.clickFoldTriangle(page, "Book " + b);
  const toFiller = await page.evaluate((s) => { const p = [...document.querySelectorAll(s + " p")].find((x) => x.textContent.startsWith("Filler 5.4")); return p ? Math.round(p.getBoundingClientRect().top - (document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0) - 4) : 0; }, S.editor);
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, toFiller);
  await page.waitForTimeout(700);
  await go("commonplace/Horace");
}
async function backPlaceClosedSection(): Promise<void> {
  await page.evaluate((k) => { try { localStorage.removeItem(k); } catch { /* none */ } }, A.ns + "folds");
  await go("bookshelf/Boethius/Consolatio");
  await rest(page);
  await log("back to a place in a closed section", { open: (await R.folds(page)).open, fillerInView: await inView("Filler 5.4") });
  /* the same page reloaded with the warm held back: drawn unfolded from its one row, then folded when the warm lands, the place set again */
  await page.goto(A.url("bookshelf/Boethius/Consolatio", "warm=slow"));
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio", 5000).catch(() => {});
  await rest(page);
  await log("before the warm", { folds: (await R.folds(page)).folds, fillerInView: await inView("Filler 5.4") });
  await A.waitWarm(page).catch(() => {});
  await rest(page);
  await log("the warm landed", { folds: (await R.folds(page)).folds, open: (await R.folds(page)).open, fillerInView: await inView("Filler 5.4") });
  await page.goto(A.url("bookshelf/Boethius/Consolatio", "warm=slow"));
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio", 5000).catch(() => {});
  /* Book 5's link, beside the held place: Book 1's lies far above it, and the held place moved the page under the click */
  await page.locator(S.editorLink("#bookshelf/Boethius/Consolatio/3pr1")).nth(4).click().catch(() => {});
}
async function contentsLinkBeforeWarm(): Promise<void> {
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio/3pr1", 5000).catch(() => {});
  await log("a contents link clicked before the warm", { entry: await A.entry(page), refused: /no such/.test(await cornerText()) });
  await A.waitWarm(page).catch(() => {});
  /* the source read down to text a closed section hides, then back to the rendered view: the section opens */
  await go("bookshelf/Boethius/Consolatio");
  await rest(page);
  for (const b of (await R.folds(page)).open) await R.clickFoldTriangle(page, b.trim().split(":")[0]);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.sourceScrollTo(page, "Filler 3.4");
  await rest(page);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  await log("a closed section's text switched to", { open: (await R.folds(page)).open, fillerInView: await inView("Filler 3.4") });
  /* a forced entry: refused on the open path, scrolled, left and returned to */
  await go("commonplace/Forced%20Long");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
}
async function forcedEntryLeftScrolled(): Promise<void> {
  await forcedEntryReturned();
  await heldPlaceRenderedView();
}
async function forcedEntryReturned(): Promise<void> {
  await R.setSource(page, Array.from({ length: 90 }, (_, i) => "Line " + (i + 1) + " of a long refused entry.").join("\n\n") + "\n\n::: grid\n::: card-light-blue\nalpha\n:::\nloose\n:::\n");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(400);
  for (let i = 0; i < 12 && !((await A.stored(page, "commonplace/Forced Long")) || "").includes("loose"); i++);
  await go("commonplace/Horace");
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await rest(page); }
  await go("commonplace/Forced%20Long");
  await rest(page);
  await wheelTo(900);
  const leftAt = await winY();
  await page.waitForTimeout(700);
  await go("commonplace/Horace");
  await go("commonplace/Forced%20Long");
  await rest(page);
  await log("a forced entry left scrolled, returned to", { source: await R.inSource(page), stayed: Math.abs((await winY()) - leftAt) < 3 });
  /* the masthead changing height under a held place, as it does when the
     entry arrived from had a taller one: the place is set again, in the
     source view by its offset and in the rendered one by its text */
  await log("a held place, the masthead shrinking under it", await shrunk(async () => ({ stayed: Math.abs((await winY()) - leftAt) < 3 })));
  await go("commonplace/Horace");
}
async function heldPlaceRenderedView(): Promise<void> {
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await rest(page); }
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await rest(page);
  await wheelTo(2600);
  await page.waitForTimeout(700);
  await go("commonplace/Horace");
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await rest(page);
  /* the row under the masthead, read mid-column: 40px in is the gutter */
  const heldLine = await rowUnderHead();
  await log("a held place in the rendered view, the masthead shrinking under it", await shrunk(async () => { const line = await rowUnderHead(); return { sameText: line === heldLine, line }; }));
  /* a scroll the page did not make and no hand did — the browser's find —
     is a reader moving: the hold lets go */
  await page.evaluate(() => window.scrollTo(0, window.scrollY + 400));
  await page.waitForTimeout(500);
  const foundLine = await rowUnderHead();
  /* then the editor grows below, as a picture loading does */
  await page.evaluate(() => { document.querySelector("#editor .ProseMirror").style.paddingBottom = "300px"; });
  await rest(page);
  const afterGrow = await rowUnderHead();
  await page.evaluate(() => { document.querySelector("#editor .ProseMirror").style.paddingBottom = ""; });
  await log("a held place, then a scroll no hand made", { kept: afterGrow === foundLine, line: afterGrow });
}
const shrunk = async (fn: () => Promise<unknown>) => {
    await page.evaluate(() => { const h = document.querySelector(".site-head"); h.style.maxHeight = "50px"; h.style.overflow = "hidden"; });
    try { await rest(page); return await fn(); }
    finally { await page.evaluate(() => { const h = document.querySelector(".site-head"); h.style.maxHeight = ""; h.style.overflow = ""; }); await rest(page); }
  };
const rowUnderHead = () => page.evaluate(() => { const top = (document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0) + 6; const box = document.querySelector("#editor .ProseMirror").getBoundingClientRect(); const el = document.elementFromPoint(box.left + box.width / 2, top); return (el?.closest(".vrow, p, li, h1, h2, h3") || el)?.textContent.trim().slice(0, 32) || null; });
async function backToInlineCodeLines(): Promise<void> {
  await go("commonplace/Horace");
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await rest(page); }
  /* a place held on lines that open on inline code, one paragraph so the window's top always falls on text: the caret at the line's start, the code run no stop on the way */
  await go("commonplace/Coded%20Lines");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, Array.from({ length: 60 }, (_, i) => "I `go` and the sea, line " + (i + 1) + ".").join("\n"));
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(1500);
  await wheelTo(1200);
  await page.waitForTimeout(700);
  await go("commonplace/Horace");
  await go("commonplace/Coded%20Lines");
  await rest(page);
  await log("back to lines opening on inline code", { source: await R.inSource(page) });
  /* a place held in the source mid-way down one long paragraph, the entry forced into the source by a stray line in a grid (another entry otherwise opens rendered): the caret on the line on screen, so a key typed leaves the window where it is */
  await go("commonplace/Long%20Paragraph");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, Array.from({ length: 300 }, (_, i) => "Sentence " + (i + 1) + " of one long paragraph.").join(" ") + "\n\n::: grid\n::: card-light-blue\nalpha\n:::\nloose\n:::\n");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(1500);
  await wheelTo(1200);
  await page.waitForTimeout(700);
  await go("commonplace/Horace");
  await go("commonplace/Long%20Paragraph");
  await rest(page);
  const before = await winY();
  /* the caret's line on screen, from a twin of the textarea: a markdown line's start is a paragraph's, and a held index unmoved stands mid-line, neither shown by "stayed" alone */
  const onScreenStart = await page.evaluate((src) => {
    const ta = document.querySelector(src); if (!ta) return null;
    const cs = getComputedStyle(ta), d = document.createElement("div");
    for (const k of ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "wordSpacing", "paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth", "boxSizing", "tabSize"] as const) d.style[k] = cs[k];
    Object.assign(d.style, { position: "absolute", visibility: "hidden", left: "-9999px", top: "0", whiteSpace: "pre-wrap", overflowWrap: "break-word", width: ta.getBoundingClientRect().width + "px" });
    const t = d.appendChild(document.createTextNode(ta.value + "\u200b")); document.body.append(d);
    const top = (k: number) => { const r = document.createRange(); r.setStart(t, k); r.setEnd(t, k + 1); return r.getBoundingClientRect().top; };
    const i = ta.selectionStart, at = i === 0 || top(i - 1) < top(i) - 2;
    d.remove(); return at;
  }, S.source);
  await page.keyboard.type("Z");
  await rest(page);
  await log("typed at the place in a long paragraph's source", { source: await R.inSource(page), lineOnScreen: onScreenStart, stayed: Math.abs((await winY()) - before) < 3 });
}
section("entries left and renamed", async () => {
  /* what leaving, renaming and deleting do to an entry, a clipboard that refuses, and a page whose site data is blocked */
  await unknownPageLeftUntouched();
  await deletedScrolledPlaceDropped();
  await copyWithClipboardRefused();
});
async function unknownPageLeftUntouched(): Promise<void> {
  await go("commonplace/Never%20Typed");
  await go("commonplace/Horace");
  await log("an unknown page visited and left untouched", { stored: (await A.stored(page, "commonplace/Never Typed")) ?? null });
  await go("2026-09-05");
  /* the caret in the text, not its heading, where a new entry's link is refused */
  await R.caretAfter(page, "The most famous story", "The most famous story".length);
  setAnswer("Long");
  await A.act.create(page);
  await A.waitEntry(page, "2026-09-05/Long", 5000).catch(() => {});
  await page.click(S.editor);
  await R.pasteText(page, Array.from({ length: 80 }, (_, i) => "Line " + (i + 1) + " of a long entry.").join("\n\n"));
  await R.waitCorner(page, "saved");
  await wheelTo(900);
  await page.waitForTimeout(700);
  const before = await winY();
  setAnswer("Longer");
  await page.click(S.renameButton);
  await A.waitEntry(page, "2026-09-05/Longer", 5000).catch(() => {});
  await rest(page);
  await log("a long entry renamed, scrolled", { entry: await A.entry(page), stayed: Math.abs((await winY()) - before) < 3 });
  await wheelTo(600);
  await page.waitForTimeout(700);
  await page.click(S.deleteButton);
  await A.waitEntry(page, "2026-09-05", 5000).catch(() => {});
  await rest(page);
}
async function deletedScrolledPlaceDropped(): Promise<void> {
  await log("deleted scrolled: its place dropped", { entry: await A.entry(page), placeKept: await page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || "[]").some((r: { key: string }) => r.key === "2026-09-05/Longer"); } catch { return null; } }, A.ns + "places") });
  setAnswer(null);
}
async function copyWithClipboardRefused(): Promise<void> {
  await page.evaluate(() => { const c = navigator.clipboard; window.__clip = [c.write, c.writeText, document.execCommand]; c.write = () => Promise.reject(new Error("refused")); c.writeText = () => Promise.reject(new Error("refused")); document.execCommand = () => false; });
  await page.keyboard.press("Control+Meta+c");
  await rest(page);
  await log("⌃⌘C with the clipboard refused", { corner: await cornerText() });
  await page.evaluate(() => { const c = navigator.clipboard, [a, b, x] = window.__clip; c.write = a; c.writeText = b; document.execCommand = x; });
  await page.keyboard.press("Control+Meta+c");
  await rest(page);
  await log("⌃⌘C again, the clipboard back", { corner: await cornerText() });
  const blocked = await ctx.newPage();
  await blocked.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("site data blocked", "SecurityError"); } }); });
  await blocked.goto(A.url("commonplace/Horace"));
  await A.waitEntry(blocked, "commonplace/Horace", 8000).catch(() => {});
  /* localStorage alone refused: the profile's IndexedDB still answers, so the store's own failure path is not what this reads */
  await log("a page opened with localStorage refused", { entry: (await A.entry(blocked)) ?? null, blockedScreen: ((await A.screen(blocked).catch(() => "")) || "").split(" · corner")[0] });
  await blocked.close();
}
section("margin-note", async () => {
  /* a margin-note set in the left margin beside the line after it: 15em in a 1500px window, pushed below a two-line margin-note a line above it, back in the text at the tools' 1000px; the caret typed into it at both widths */
  await seed(MARGIN_SEEDS);
  await page.setViewportSize({ width: 1500, height: 900 });
  await go("bookshelf/Donne%2C%20John/Anniversaries/The%20First%20Anniversarie");
  await R.settle(page);
  await log("margin-notes in verse at 1500px", await R.margins(page));
  await R.clickMargin(page, "What life");
  await page.keyboard.type(" X");
  await log("typed into a margin-note in the margin", { lines: ((await A.stored(page)) || "").split("\n").filter((l) => /X/.test(l)) });
  await page.setViewportSize({ width: 1000, height: 600 });
  /* the resize's measuring pass run before the reading */
  await R.settle(page);
  await page.keyboard.type("Y");
  await still(page);
  await log("narrowed to 1000px, typed on", { ...(await R.margins(page)), lines: ((await A.stored(page)) || "").split("\n").filter((l) => /X/.test(l)) });
  await page.setViewportSize({ width: 1500, height: 900 });
  await go("commonplace/Margins");
  await R.settle(page);
  await log("margin-notes between paragraphs and in a grid at 1500px", await R.margins(page));
  await page.setViewportSize({ width: 1000, height: 600 });
});
section("footnote marks", async () => {
  /* a footnote mark, a space and superscript digits after a word, is no break in a phrase search: "Pedenteria in comparison" finds "Pedenteria ¹ in comparison", and Enter selects it, the mark inside; "m²" stays text */
  await go("commonplace/Footnoted");
  /* the box holding the whole query (it keeps the last one while the entry stays open, so a new one is typed over ⌘A), then the scan's pause: a row from the query before can stand until it runs */
  await page.click(S.editor);
  await page.keyboard.type("Skill of government was but a Pedenteria ¹ in comparison, so as Amphion, ³ was said; an area of 4 m² here.");
  await page.waitForTimeout(1500);
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.selectOption(S.searchScope, { label: "Everything" });
  await page.keyboard.type("Pedenteria in comparison");
  await searched("Pedenteria in comparison");
  await log("typed Pedenteria in comparison", await R.search(page));
  await page.keyboard.press("Enter");
  await R.waitSelection(page, "pedenteria ¹ in comparison");
  await log("Enter on the footnoted phrase", { entry: await A.entry(page), selected: await R.selectionText(page) });
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("Amphion, was");
  await searched("Amphion, was");
  await log("typed Amphion, was", await R.search(page));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("4 m²");
  await searched("4 m²");
  await log("typed 4 m²", await R.search(page));
  await page.keyboard.press("Escape");
});
const searched = async (q: string) => { await page.waitForFunction((q) => document.querySelector(".page-search input")?.value === q, q, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); };
section("bookmarks from another window", async () => {
  /* two windows, last of the steps that read the page lists, the page made here joining them: a page made in a second one and bookmarked there; ⌃⌘B in the first shows its row and keeps it stored, though the first never loaded that page, its page, opened from that row, is read from the store with the second window's text and takes the typing after it; saved again in the second while open in the first, it is redrawn there; saved in the second while the first has typing not yet saved, the first's save is refused; open in the first and deleted in the second, it stays on screen, the corner says so, typing there is refused and the page opened again is blank; and a × there writes the list with it kept */
  await secondWindow();
  await pageOpenFirstSaved();
});
async function secondWindow(): Promise<void> {
  await keep("bookmarks", '["2026-09-06","commonplace/Horace"]');
  await go("2026-09-06");
  const other = await page.context().newPage();
  await other.goto(A.url("commonplace/Made%20Elsewhere"));
  await A.waitEntry(other, "commonplace/Made Elsewhere").catch(() => {});
  await A.waitWarm(other).catch(() => {});
  await other.click(S.editor);
  await other.keyboard.type("made in the second window");
  await other.waitForTimeout(2500);
  await other.keyboard.press("Control+Meta+b");
  await rest(other);
  await other.keyboard.press("a");
  await other.waitForTimeout(500);
  await log("A in a second window", { card: await R.bookmarks(other) });
  await other.close();
  await page.bringToFront();
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(500);
  await log("⌃⌘B back in the first", { card: await R.bookmarks(page), stored: await page.evaluate((k) => localStorage.getItem(k), A.bookmarksKey) });
  await page.click(".bookmarks .bookmark-label:text-is('Made Elsewhere')", { timeout: 1000 }).catch(() => {});
  await A.waitEntry(page, "commonplace/Made Elsewhere", 5000).catch(() => {});
  await rest(page);
  await log("its row's page opened from the first", { entry: await A.entry(page), text: await R.editorTextHead(page) });
  await page.click(S.editor);
  await page.keyboard.type("typed in the first");
  await page.waitForTimeout(2500);
  await log("its row's page typed into from the first", { entry: await A.entry(page), stored: await A.stored(page, "commonplace/Made Elsewhere"), corner: await R.cornerText(page) });
}
async function pageOpenFirstSaved(): Promise<void> {
  const again = await page.context().newPage();
  await again.goto(A.url("commonplace/Made%20Elsewhere"));
  await A.waitEntry(again, "commonplace/Made Elsewhere").catch(() => {});
  await A.waitWarm(again).catch(() => {});
  await page.bringToFront();
  await page.click(S.editor);
  await again.click(S.editor);
  await again.keyboard.type(", the second again");
  await again.waitForTimeout(2500);
  await log("the page open in the first, saved in the second", { textEnd: await textEnd(), stored: await A.stored(page, "commonplace/Made Elsewhere"), focused: await page.evaluate((s) => !!document.querySelector(s)?.contains(document.activeElement), S.editor) });
  await page.click(S.editor);
  await page.keyboard.type(", the first unsaved");
  await A.foreignWrite(again, "commonplace/Made Elsewhere", "rewritten in the second");
  await page.waitForTimeout(2500);
  await log("typed in the first as the second saves", { textEnd: await textEnd(), stored: await A.stored(page, "commonplace/Made Elsewhere"), corner: await R.cornerText(page) });
  await page.click(S.corner);
  await rest(page);
  await go("commonplace/Deleted%20Elsewhere");
  await page.click(S.editor);
  await page.keyboard.type("to be deleted in the second");
  await page.waitForTimeout(1500);
  await A.foreignWrite(again, "commonplace/Deleted Elsewhere", null);
  await page.waitForTimeout(500);
  await log("the page open in the first, deleted in the second", { entry: await A.entry(page), textEnd: await textEnd(), corner: await R.cornerText(page) });
  await page.click(S.editor);
  await page.keyboard.type(", typed after");
  await page.waitForTimeout(1500);
  await log("typed into the page deleted in the second", { stored: await A.stored(page, "commonplace/Deleted Elsewhere"), corner: await R.cornerText(page) });
  await go("2026-09-06");
  await log("the deleted page left for the day", { corner: await R.cornerText(page) });
  await go("commonplace/Deleted%20Elsewhere");
  await log("the deleted page opened again in the first", { textEnd: await textEnd() });
  await again.close();
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.click(S.bookmarkDel);
  await rest(page);
  await log("× on its first row", { card: await R.bookmarks(page), stored: await page.evaluate((k) => localStorage.getItem(k), A.bookmarksKey) });
  await page.keyboard.press("Escape");
}
const textEnd = () => page.evaluate((s) => document.querySelector(s)?.textContent.slice(-30), S.editor);
