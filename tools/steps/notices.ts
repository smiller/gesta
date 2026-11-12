import { section, view, write, page, ctx, A, R, S, shot, log, go, seededIn, setAnswer, rest, type Tree } from "./kit.ts";

section("notices and surfaces as the old app has them", async () => {
  /* the inventory's groups 5–7, each gesture read over both apps, the old app's reading the one to match */
  await noticesOpening();
  await importRefusedFilesOnly();
  await blockPictureHoverCopied();
});
async function noticesOpening(): Promise<void> {
  await chordWithCapsLock();
  await lineNumberingKeptAcross();
}
async function chordWithCapsLock(): Promise<void> {
  await go("page/Horace");
  await view(false);
  await dismiss();
  await page.click(S.editor);
  /* the key as Caps Lock spells it: a press with ⌘ held reaches the page lower-cased */
  await page.evaluate(() => (document.activeElement || document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "K", code: "KeyK", ctrlKey: true, metaKey: true, bubbles: true, cancelable: true })));
  await rest(page);
  await log("⌃⌘K with Caps Lock", { searchOpen: await page.evaluate(() => { const d = document.querySelector(".page-search, #pagesearch"); return !!d && (d.tagName === "DETAILS" ? d.open : !d.hidden); }) });
  await page.keyboard.press("Escape");
  await page.goto(A.url("").replace(/#$/, ""));
  await page.waitForTimeout(2000);
  await log("a bare launch", { hash: await page.evaluate(() => location.hash) });
  await go("page/Horace");
  await view(false);
  /* picked with the row open, as a hand picks it */
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await setLines("1");
  await rest(page);
  await page.reload();
}
async function lineNumberingKeptAcross(): Promise<void> {
  await A.waitEntry(page, "page/Horace").catch(() => {});
  await page.waitForTimeout(500);
  await log("Line numbering kept across a reload", { interval: await page.evaluate((s) => document.querySelector(s)?.value ?? null, LINES) });
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await setLines("5");
}
const LINES = ".page-lines select, #pagelines select";
const setLines = (v: string) => page.evaluate(([s, v]) => { const e = document.querySelector(s); if (!e) return; e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); }, [LINES, v]);
async function importRefusedFilesOnly(): Promise<void> {
  await rest(page);
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  /* a folder picker answering with what each import reads */
  await picked({ name: "export", kids: [{ name: "stray.md", text: "x\n" }] });
  await page.click(importButton);
  await page.waitForTimeout(500);
  const first = await corner();
  await page.waitForTimeout(4000);
  await log("an import of refused files only", { corner: first, fourSecondsOn: await corner() });
  await dismiss();
  await picked({ name: "export", kids: [{ name: "page", kids: [{ name: "Trip--Log.md", text: "a\n" }, { name: "Trip-Log.md", text: "b\n" }] }] });
  await page.click(importButton);
  await page.waitForTimeout(500);
  await log("an import of two files for one entry", { corner: await corner() });
  await dismiss();
  await write("page/Pic Fail", "x\n");
  await R.caretAfter(page, "x", 1);
  await rest(page);
  await page.evaluate(() => { const P = IDBObjectStore.prototype; window.__idb = [P.put, P.add]; const full = () => { throw new DOMException("full", "QuotaExceededError"); }; P.put = full; P.add = full; });
  await R.pastePng(page);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const P = IDBObjectStore.prototype; [P.put, P.add] = window.__idb; });
  await log("a picture whose write fails", { corner: await corner() });
  await dismiss();
  await write("page/Pic Copy", "::: note\nx\n:::\n");
  await R.caretAfter(page, "x", 1);
  await rest(page);
  await R.pastePng(page);
  await page.waitForTimeout(1500);
  await page.hover(S.editor + " div.note");
  await rest(page);
  await page.click(S.copybtn, { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(500);
}
const importButton = ".toolbtn[title^='Import'], #importbtn";
async function blockPictureHoverCopied(): Promise<void> {
  await pictureBlockHoverCopied();
  await bookmarkLinkInMarkdownView();
}
async function pictureBlockHoverCopied(): Promise<void> {
  await log("a block with a picture hover-copied", { pictureCarried: await page.evaluate(async () => { try { const items = await navigator.clipboard.read(); const html = items[0].types.includes("text/html") ? await (await items[0].getType("text/html")).text() : ""; return /<img[^>]+src="data:image\//.test(html); } catch (e) { return String(e); } }) });
  await go("page/Horace");
  await view(false);
  const before = await A.stored(page, "page/Horace");
  await lineBarReasked(before);
  await resultAfterMoreTyping();
  await formatBarUnderMasthead();
  await copyButtonAfterNavigation();
  await failedCopyPinClicked();
  await shortcutWithNoCursor(before);
}
async function lineBarReasked(before: string): Promise<void> {
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  const asked = await boxes();
  await A.foreignWrite(page, "page/Horace", before.replace(/\n*$/, "") + "\n\nand on ⟨5⟩ here\n");
  await page.waitForTimeout(1200);
  await log("the line bar re-asked when the entry gains a page marker", { before: asked, after: await boxes() });
  const lineBox = await page.evaluate(() => { const r = document.querySelector("#lineinput")?.getBoundingClientRect(); return r ? { x: r.left + 5, y: r.top + r.height / 2 } : null; });
  const into = await page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { x: r.left + 60, y: r.top + 120 } : null; }, S.editor);
  if (lineBox && into) { await page.mouse.move(lineBox.x, lineBox.y); await page.mouse.down(); await page.mouse.move(into.x, into.y, { steps: 6 }); await page.mouse.up(); }
  await rest(page);
  await log("a drag from the Line box out over the entry", { barOpen: (await boxes()).line });
  await page.keyboard.press("Escape");
  await A.foreignWrite(page, "page/Horace", before);
  await page.waitForTimeout(1200);
}
async function resultAfterMoreTyping(): Promise<void> {
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.keyboard.type("atavis");
  await page.waitForTimeout(800);
  await page.keyboard.type(" zzz", { delay: 10 });
  await page.click(S.searchRows + ":first-child", { timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(600);
  await log("a result clicked after more typing", { selected: await page.evaluate(() => document.getSelection()?.toString() || "") });
}
async function formatBarUnderMasthead(): Promise<void> {
  await go("page/Horace");
  await view(false);
  await page.keyboard.press("Escape");
  await R.selectBetween(page, "Maecenas", "Maecenas");
  await rest(page);
  /* the bar over the first line, under the masthead: a row opening grows the masthead down over it */
  const was = await underHeader();
  await page.keyboard.press("Control+Meta+l");
  await page.waitForTimeout(400);
  await log("the format bar after Line numbering opens", { clearBefore: was, clearAfter: await underHeader() });
}
async function copyButtonAfterNavigation(): Promise<void> {
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await go("page/Pic Copy");
  await view(false);
  await page.hover(S.editor + " div.note");
  await rest(page);
  const over = await page.evaluate((s) => document.querySelector(s)?.classList.contains("show") ?? null, S.copybtn);
  await page.evaluate(() => { location.hash = "#page/Links"; });
  await page.waitForTimeout(800);
  await log("the copy button after a navigation", { over, after: await page.evaluate((s) => document.querySelector(s)?.classList.contains("show") ?? null, S.copybtn) });
  await log("a link's tooltip", { title: await page.evaluate((s) => document.querySelector(s + " a")?.title ?? null, S.editor), outside: await page.evaluate((s) => document.querySelector(s + " a[href^='https:']")?.title ?? null, S.editor) });
  await R.selectBetween(page, "link", "link");
  await rest(page);
  await log("the Tag button's tooltip", { title: await page.evaluate((s) => document.querySelector(s)?.title ?? null, S.fmtTag) });
}
async function failedCopyPinClicked(): Promise<void> {
  await page.click(S.editor);
  await refuse();
  await page.keyboard.press("Control+Meta+c");
  await rest(page);
  await restore();
  await page.click(S.corner, { timeout: 1000 }).catch(() => {});
  await rest(page);
  await log("a failed copy's pin clicked", { clipboard: (await R.clipboardText(page)).replace(/\(#[^)]*\)/, "(…)") });
  await log("the tab's icon", { icon: await page.evaluate(() => !!document.querySelector("link[rel~='icon']")?.getAttribute("href")) });
}
async function shortcutWithNoCursor(before: string): Promise<void> {
  await go("page/Horace");
  await view(false);
  await page.click(".page-title, #pagetitle, .site-head, header", { timeout: 1000 }).catch(() => {});
  await page.evaluate(() => { const h = document.querySelector(".site-head, header"); if (h) { const r = document.createRange(); r.selectNodeContents(h); r.collapse(true); const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); } });
  await page.keyboard.press("Control+Meta+s");
  await rest(page);
  await page.click(S.shortcutsInput, { timeout: 1000 }).catch(() => {});
  await page.keyboard.type("md");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("a shortcut chosen with no cursor in the entry", { corner: await corner(), unchanged: (await A.stored(page, "page/Horace")) === before });
}
async function bookmarkLinkInMarkdownView(): Promise<void> {
  await page.keyboard.press("Escape");
  await write("page/Source Link", "x\n");
  await view(true);
  await R.sourceCaretTo(page, "x");
  await page.keyboard.press("End");
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.click(".bookmark-link[aria-label='Link to Links']", { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(400);
  await log("a bookmark's link in the markdown view", { md: (await stored()).replace(/\(#[^)]*\)/, "(…)") });
  await view(false);
  const slow = await ctx.newPage();
  await slow.goto(A.url("page/Horace", "warm=slow"));
  await rest(slow);
  await slow.keyboard.press("Control+Meta+k");
  await rest(slow);
  await slow.keyboard.type("atavis");
  await slow.waitForTimeout(400);
  const loading = await slow.evaluate((s) => [...document.querySelectorAll(s)].map((l) => l.textContent.trim()).join(" | ").slice(0, 40), S.searchRows);
  await slow.waitForTimeout(3500);
  await log("Search opened before the warm", { loading, rows: await slow.evaluate((s) => document.querySelectorAll(s + ".hit, " + s + ":not(.empty)").length > 0, S.searchRows) });
  /* the Go to row and the bookshelf, each opened on a fresh slow launch with the keys left in it */
  const options = () => slow.evaluate(() => [...document.querySelectorAll(".page-goto select, #pagegoto select")].reduce((n, s) => n + s.options.length, 0));
  await slow.goto(A.url("page/Horace", "warm=slow&again=1"));
  await rest(slow);
  await slow.keyboard.press("Control+Meta+j");
  await rest(slow);
  const gotoBefore = await options();
  await slow.waitForTimeout(3500);
  await log("Go to opened before the warm", { more: (await options()) > gotoBefore, focusInRow: await slow.evaluate(() => !!document.activeElement?.closest(".page-goto, #pagegoto")) });
  const shelf = () => slow.evaluate(() => { const p = document.querySelector(".pages, #bookspanel"); return p ? p.querySelectorAll("a").length : -1; });
  await slow.goto(A.url("page/Horace", "warm=slow&again=2"));
  await rest(slow);
  await slow.click(S.booksOpener, { timeout: 2000 }).catch(() => {});
  await rest(slow);
  await slow.evaluate(() => document.querySelector(".pages .panel-new, #bookspanel .panel-new")?.focus());
  await slow.mouse.move(5, 700);
  const shelfBefore = await shelf();
  await slow.waitForTimeout(3500);
  await log("the bookshelf opened before the warm, the keys on its button", { before: shelfBefore, after: await shelf(), keysOnButton: await slow.evaluate(() => !!document.activeElement?.matches(".panel-new")) });
  await slow.close();
}
const corner = () => page.evaluate(() => document.querySelector(".saved.show, #saved.show")?.textContent || "");
const dismiss = () => page.click(S.corner, { timeout: 1000 }).catch(() => {});
const stored = async () => ((await A.stored(page)) ?? "").replace(/\n+$/, "");
const picked = (tree: Tree) => page.evaluate((tree) => {
    const file = (name: string, text: string) => ({ kind: "file", name, getFile: () => Promise.resolve(new File([text], name)) });
    const build = (n: Tree): unknown => n.text !== undefined ? file(n.name, n.text) : { kind: "directory", name: n.name, values: async function* () { for (const k of n.kids) yield build(k); } };
    window.showDirectoryPicker = () => Promise.resolve(build(tree));
    window.confirm = () => false;
  }, tree);
const boxes = () => page.evaluate(() => { const v = (s: string) => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }; return { line: v("#lineinput"), page: v("#folioinput") }; });
const underHeader = () => page.evaluate(() => { const b = document.querySelector(".fmt")?.getBoundingClientRect(), h = document.querySelector(".site-head, header")?.getBoundingClientRect(); return b && h ? b.top >= h.bottom - 1 : null; });
const refuse = () => page.evaluate(() => { const c = navigator.clipboard; window.__clip = [c.write, c.writeText, document.execCommand]; c.write = () => Promise.reject(new Error("refused")); c.writeText = () => Promise.reject(new Error("refused")); document.execCommand = () => false; });
const restore = () => page.evaluate(() => { const c = navigator.clipboard, [a, b, x] = window.__clip; c.write = a; c.writeText = b; document.execCommand = x; });
section("pill", async () => {
  if (A.pill) {
    await page.goto(A.url("page/Horace", "corner=pill"));
    await A.waitWarm(page);
    /* the pill is set after the launch's backup run, which ends after the
       warm: read on the warm alone, it was missed 1 run in 10 */
    await page.waitForFunction(() => document.querySelector(".backup-paused")?.hidden === false, null, { timeout: 5000 }).catch(() => {});
    await log("with ?corner=pill", await R.pill(page));
    if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-pill.png"), clip: { x: 500, y: 500, width: 500, height: 100 } });
  }
});
section("a rename keeps a label's marks", async () => {
  /* last of all: the old app keeps a deleted page in its scope lists, so
     the pages seeded here would show in any section after */
  /* a hand-written label part italic, its entry renamed: the label keeps its marks */
  await A.foreignWrite(page, "page/Rename Host", "See [the *Ideas* page](#page/Rename%20Host/Ideas) here.\n");
  await A.foreignWrite(page, "page/Rename Host/Ideas", "ideas\n");
  await go("page/Rename%20Host");
  await go("page/Rename%20Host/Ideas");
  setAnswer("Plans");
  await page.click(S.renameSubPage);
  await A.waitEntry(page, "page/Rename Host/Plans", 5000).catch(() => {});
  for (let i = 0; i < 30 && !((await A.stored(page, "page/Rename Host")) || "").includes("/Plans"); i++) await rest(page);
  await log("renamed under a label part italic", { entry: await A.entry(page), host: ((await A.stored(page, "page/Rename Host")) || "").split("\n")[0] });
  setAnswer(null);
});
section("shelves", async () => {
  /* the bookshelf's shelves: an entry Shelves names them in order and the authors on each; the list heads each shelf and sets its authors in, the go-to box groups by shelf */
  await bookshelfShelves();
  await goBoxShelves();
  await shelvesSearched();
  await shelvesSearchedFollowing();
});
async function bookshelfShelves(): Promise<void> {
  await A.foreignWrite(page, "bookshelf/Shelves", "# Shelves\n\n## Latin\n- [Boethius](#bookshelf/Boethius)\n- [Browning](#bookshelf/Browning%2C%20Robert)\n\n## English\n");
  /* read back before the reload: a reload during the write's commit read the store without it */
  const seeded = await seededIn("bookshelf/Shelves");
  await page.goto(A.url("2026-09-06"));
  await A.waitEntry(page, "2026-09-06", 5000).catch(() => {});
  await page.click(S.booksOpener);
  /* the list is answered again when the store's read ends: the shelves come with it */
  const shelvesShown = await page.waitForSelector(".pages .shelf", { timeout: 5000 }).then(() => true, () => false);
  await log("the bookshelf on its shelves", { seeded, shelvesShown, rows: await list() });
  await page.click(".pages button.panel-new:has-text('Shelves…')");
  await A.waitEntry(page, "bookshelf/Shelves", 5000).catch(() => {});
  await log("Shelves… clicked", { entry: await A.entry(page), panel: await R.panel(page) });
  /* a shelf renamed, the list opened at once: the list reads the text as typed */
  const latin = await R.wordAt(page, "Latin", 5);
  await page.mouse.dblclick(latin.x, latin.y);
  await rest(page);
  await page.keyboard.type("Classical");
  /* the bar the double-click floated hides once the typing has collapsed the selection: read before it went, the screen said so */
  await page.waitForFunction(() => !document.querySelector(".fmt")?.classList.contains("show"), null, { timeout: 2000 }).catch(() => {});
  await page.click(S.booksOpener);
  await page.waitForSelector(".pages .shelf", { timeout: 5000 }).catch(() => {});
  await log("a shelf renamed, the list opened at once", { rows: await list() });
}
const list = () => page.evaluate(() => { const p = document.querySelector(".pages"); return p ? [...p.children].map((e) => (e.classList.contains("shelf") ? "## " : e.classList.contains("shelved") ? "  " : "") + e.textContent + (e.classList.contains("shelved") ? " @" + Math.round(parseFloat(getComputedStyle(e).paddingLeft)) : "")) : null; });
async function goBoxShelves(): Promise<void> {
  await page.keyboard.press("Escape");
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+j");
  await rest(page);
  await log("the go-to box on its shelves", await groups(S.gotoDestination));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+Meta+k");
  await page.waitForSelector(S.searchScope + " optgroup", { timeout: 5000 }).catch(() => {});
  await log("the search scopes on their shelves", await groups(S.searchScope));
  await page.selectOption(S.searchScope, { label: "All Classical" });
}
const groups = (sel: string) => page.evaluate((sel) => [...document.querySelectorAll(sel + " optgroup")].map((g) => g.label + ": " + (g.label === "Pages" ? g.querySelectorAll("option").length + " pages" : [...g.querySelectorAll("option")].map((o) => o.textContent).join("|"))), sel);
async function shelvesSearched(): Promise<void> {
  /* a word only one author's book holds, then one only the other's: each found under the shelf */
  for (const q of ["uisu", "silk-mills"]) {
    await page.click(".page-search input");
    await page.keyboard.press("Meta+a");
    await page.keyboard.type(q);
    await page.waitForFunction((q) => document.querySelector(".page-search input")?.value === q, q, { timeout: 5000 }).catch(() => {});
    await page.waitForFunction((q) => { const li = [...document.querySelectorAll(".search-results li")]; return li.length > 0 && li.every((e) => e.innerText.toLowerCase().includes(q)); }, q, { timeout: 5000 }).catch(() => {});
    await log("searched " + q + " under All Classical", await page.evaluate(() => ({ scope: document.querySelector(".page-search select")?.selectedOptions[0]?.textContent, where: [...document.querySelectorAll(".search-results .where")].map((w) => w.textContent) })));
  }
}
async function shelvesSearchedFollowing(): Promise<void> {
  await page.keyboard.press("Escape");
}
