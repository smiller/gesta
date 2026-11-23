import { section, page, A, R, S, log, go, rest, settled, writeAll, seededIn, wheelTo, caretAt, fixture, STANZA_SEEDS, MARGIN_SEEDS } from "./kit.ts";

const OVID = "bookshelf/Ovid/Metamorphoses/Book 1";
const SHELVES = "# Shelves\n\n## Latin\n- [Boethius](#bookshelf/Boethius)\n- [Ovid](#bookshelf/Ovid)\n\n## English\n";
section("menus", async () => {
  /* the keys over every kind of row: a shelf's heading passed over, an author on a shelf, one on the shelf with no list, the acts at the foot */
  await writeAll({ "bookshelf/Shelves": SHELVES, "bookshelf/Spenser, Edmund": STANZA_SEEDS["bookshelf/Spenser, Edmund"], "bookshelf/Ovid": "# Ovid\n", [OVID]: fixture("ovid-metamorphoses-1.md") });
  const seeded = await seededIn(OVID);
  await keysOverRows(seeded);
  await focusBack();
  await round();
});
async function keysOverRows(seeded: boolean): Promise<void> {
  const sel = async () => ({ sel: (await R.menuNow(page)).sel });
  await go("commonplace/Horace");
  await page.click(S.bookshelfOpener);
  await page.waitForSelector(".menu .shelf", { timeout: 5000 }).catch(() => {});
  await log("the bookshelf menu opened", { seeded, ...(await sel()) });
  for (const k of ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "Home", "ArrowUp", "End"]) {
    await page.keyboard.press(k);
    await log(k, await sel());
  }
  await page.keyboard.type("spe");
  await log("spe typed", await sel());
  await page.keyboard.press("Enter");
  await A.waitEntry(page, "bookshelf/Spenser, Edmund", 5000).catch(() => {});
  await log("Enter on Edmund Spenser", { entry: await A.entry(page), menu: await R.menu(page) });
  await go("commonplace/Horace");
  await page.click(S.commonplaceOpener);
  await page.keyboard.press("End");
  await log("the commonplace menu, End", await sel());
  /* one menu over the other opens afresh, its first row selected */
  await page.click(S.bookshelfOpener);
  await rest(page);
  await log("the commonplace icon over the bookshelf menu", await sel());
  await page.keyboard.press("Escape");
}
async function focusBack(): Promise<void> {
  /* the caret where it stood, after Escape, Tab, the icon pressed again and a click on the open entry's own row */
  await go("commonplace/Horace");
  await caretAt("Maecenas", 4);
  const after = async () => ({ menu: await R.menu(page), beforeCaret: (await R.menuNow(page)).beforeCaret });
  for (const close of ["Escape", "Tab", "icon"]) {
    await page.click(S.bookshelfOpener);
    await rest(page);
    if (close === "icon") await page.click(S.bookshelfOpener); else await page.keyboard.press(close);
    await rest(page);
    await log("closed by " + close, await after());
  }
  await page.click(S.commonplaceOpener);
  await rest(page);
  await page.click('.menu a[href="#commonplace/Horace"]');
  await rest(page);
  await log("closed by a click on the open entry's row", await after());
}
section("menu area", async () => {
  /* a layout check: where the page stands beside an open menu, read as positions */
  await writeAll({ "bookshelf/Ovid": "# Ovid\n", [OVID]: fixture("ovid-metamorphoses-1.md") });
  await seededIn(OVID);
  await gridMenuArea();
  await menuAreaOpened();
});
async function menuAreaOpened(): Promise<void> {
  /* a wide entry moves over for the open menu, the line at the top held there; a narrow window keeps the menu over the text */
  const area = async () => { const m = await R.menuNow(page); return { menuArea: m.menuArea, textLeft: m.textLeft }; };
  await go(OVID);
  await settled(page);
  await log("Ovid 1, the menu closed", await area());
  await wheelTo(2400);
  await settled(page);
  const top = (await R.menuNow(page)).topLine;
  await page.click(S.bookshelfOpener);
  await settled(page);
  await log("Ovid 1 scrolled, the menu open", { ...(await area()), sameTopLine: (await R.menuNow(page)).topLine === top });
  await page.keyboard.press("Escape");
  await settled(page);
  await log("Ovid 1, the menu closed again", { ...(await area()), sameTopLine: (await R.menuNow(page)).topLine === top });
  /* ⌃⌘J's round opens the menu area and closes it on the way to the Go to row */
  for (const n of [1, 2, 3]) {
    await page.keyboard.press("Control+Meta+j");
    await settled(page);
    await log("Ovid 1 scrolled, ⌃⌘J pressed " + n, { ...(await area()), sameTopLine: (await R.menuNow(page)).topLine === top });
  }
  await page.keyboard.press("Escape");
  await settled(page);
  await log("Ovid 1, the Go to row closed", { ...(await area()), sameTopLine: (await R.menuNow(page)).topLine === top });
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: 860, height: size.height });
  await go(OVID);
  await page.click(S.bookshelfOpener);
  await settled(page);
  await log("Ovid 1 at 860 px, the menu open", { menuArea: (await R.menuNow(page)).menuArea });
  await page.keyboard.press("Escape");
  await page.setViewportSize(size);
}
const GRID = "commonplace/Three Cards";
async function gridMenuArea(): Promise<void> {
  /* a grid hangs left of the page's own edge: a window wide enough for the page to clear the menu still has the grid under it */
  await writeAll({ [GRID]: "::: grid\n::: card-light-green\nOne\n:::\n::: card-light-blue\nTwo\n:::\n::: card-light-red\nThree\n:::\n:::\n" });
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: 1400, height: size.height });
  await go(GRID);
  await page.click(S.bookshelfOpener);
  await settled(page);
  await log("three cards at 1400 px, the menu open", { menuArea: (await R.menuNow(page)).menuArea });
  await page.keyboard.press("Escape");
  /* a note in the margin hangs left of the page too, and with a menu area open is set clear of the menu */
  await writeAll(MARGIN_SEEDS);
  await page.setViewportSize({ width: 1500, height: size.height });
  await go("bookshelf/Donne, John/Anniversaries/The First Anniversarie");
  await page.click(S.bookshelfOpener);
  await settled(page);
  await log("Donne's margin notes at 1500 px, the menu open", await page.evaluate(() => {
    const menu = document.querySelector(".menu")!.getBoundingClientRect().right;
    const notes = [...document.querySelectorAll("#editor .margin-note.in-margin")].map((n) => n.getBoundingClientRect().left);
    return { inMargin: notes.length > 0, clearOfMenu: notes.every((l) => l >= menu) };
  }));
  await page.keyboard.press("Escape");
  await page.setViewportSize(size);
}
async function round(): Promise<void> {
  /* ⌃⌘J round the two menus and the Go to row to nothing and on again; from an open panel; an icon clicked */
  await go("commonplace/Horace");
  for (const n of [1, 2, 3, 4, 5]) {
    await page.keyboard.press("Control+Meta+j");
    await rest(page);
    await log("⌃⌘J pressed " + n, await R.round(page));
  }
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+Meta+h");
  await rest(page);
  await log("⌃⌘H", await R.round(page));
  await page.keyboard.press("Control+Meta+j");
  await rest(page);
  await log("⌃⌘J over the help panel", await R.round(page));
  await page.keyboard.press("Escape");
  await page.click(S.commonplaceOpener);
  await rest(page);
  await log("the commonplace icon clicked", await R.round(page));
  await page.keyboard.press("Escape");
}
