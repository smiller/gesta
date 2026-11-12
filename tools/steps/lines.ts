import { section, page, A, R, log, rest } from "./kit.ts";

section("a link to a line", async () => {
  /* an address naming a line marks it as ⌃⌘G does: no selection, no format bar, and gone at the next press */
  await linkLineClicked();
  await linkParagraphBeforeWarm();
  await keyBeforeWarm();
});
async function linkLineClicked(): Promise<void> {
  await linkLineClicked2();
  await linkLineAnotherNo();
}
async function linkLineClicked2(): Promise<void> {
  const work = "bookshelf/Statius", book = work + "/Book 1", href = "#bookshelf/Statius/Book%201?line=";
  await A.foreignWrite(page, work, "# Statius\n\n- [To line 3](" + href + "3)\n");
  await A.foreignWrite(page, book, "# Book 1\n\n::: note\n[3-4](" + href + "3) and [nowhere](" + href + "99)\n:::\n\n::: verse\none\ntwo\n:::\n\n::: verse 3\nthree\nfour\n:::\n\n[Five](" + href + "5)\n\n::: dual-language 5\nquinque | Five, a sentence that runs on over the lines it translates.\nsex\nseptem\n:::\n");
  await page.goto(A.url(book.replace(/ /g, "%20")));
  await A.waitEntry(page, book, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  
  await click("3-4");
  await log("a link to a line, clicked", await seen());
  await page.locator("#editor .vrow", { hasText: "one" }).first().click();
  await rest(page);
  await log("a link to a line, the next click", await seen());
  await click("3-4");
  await log("a link to a line, clicked again", await seen());
  await page.keyboard.press("ArrowDown");
  await rest(page);
  await log("a link to a line, the next key", await seen());
  await click("nowhere");
  await log("a link to a line the page lacks", await seen());
  await click("Five");
  await log("a link to a line in a dual-language block", await page.evaluate(() => { const r = document.querySelector("#editor .landed"), on = (e: Element) => getComputedStyle(e).backgroundColor !== "rgba(0, 0, 0, 0)"; return { row: on(r), latin: on(r.children[0]), english: on(r.children[1]), latinText: r.children[0].textContent }; }));
  await page.goto(A.url(work));
  await A.waitEntry(page, work, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await click("To line 3");
  await A.waitEntry(page, book, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await rest(page);
  await log("a link to a line, from another page", await seen());
  
  await page.keyboard.press("Meta");
  await rest(page);
  await page.keyboard.press("Meta+c");
  await rest(page);
  await log("a link to a line, a bare modifier and a copy", await seen());
  await log("a link to a line, the caret after arriving", await top());
  await page.keyboard.press("ArrowDown");
  await rest(page);
  await log("a link to a line, a key after arriving", { ...(await seen()), ...(await top()) });
  /* a stanza: the same words name the same place as the bar, and an omitted line says so */
  const stanzas = "bookshelf/Statius/Stanzas", skips = "bookshelf/Statius/Skips";
  await A.foreignWrite(page, stanzas, "# Stanzas\n\n[2.1](#bookshelf/Statius/Stanzas?line=2.1) [2](#bookshelf/Statius/Stanzas?line=2)\n\n::: stanza 1\nalpha\nbeta\n:::\n\n::: stanza 2\ngamma\ndelta\n:::\n");
  await A.foreignWrite(page, skips, "# Skips\n\n[2](#bookshelf/Statius/Skips?line=2)\n\n::: verse\nfirst\n⟨skipped line number⟩\nthird\n:::\n");
  await page.goto(A.url(stanzas));
  await A.waitEntry(page, stanzas, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await click("2.1");
  await log("a link to a stanza, and line", await seen());
  await page.goto(A.url(skips));
  await A.waitEntry(page, skips, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await click("2");
  await log("a link to an omitted line", await seen());
  /* no press between two landings: the second keeps its mark */
  await page.goto(A.url(book.replace(/ /g, "%20") + "?line=3"));
  await A.waitEntry(page, book, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await rest(page);
  await page.evaluate((h) => { location.hash = h; }, href + "5");
}
async function linkLineAnotherNo(): Promise<void> {
  await rest(page);
  await rest(page);
  await rest(page);
  await log("a link to a line, then another with no press", await seen());
}
const seen = () => page.evaluate(() => ({ landed: document.querySelector("#editor .landed")?.textContent ?? null, selected: getSelection().toString(), address: location.hash.split("?")[1] ?? null, said: document.querySelector(".saved.show")?.textContent ?? null }));
const click = async (text: string) => { await page.locator("#editor a", { hasText: text }).first().click(); await rest(page); await rest(page); };
const top = () => page.evaluate(() => { const s = getSelection(); return { row: s.anchorNode?.parentElement?.closest(".vrow")?.textContent ?? null, focused: document.activeElement?.closest("#editor") ? "the text" : "elsewhere" }; });
async function linkParagraphBeforeWarm(): Promise<void> {
  /* opened before the warm: the work's own page says how it counts, and a rename follows */
  
  await page.goto(A.url(work2.replace(/ /g, "%20") + "?line=61", "warm=slow"));
  await A.waitEntry(page, work2, 8000).catch(() => {});
  await R.settle(page);
  await page.waitForFunction(() => document.querySelector("#editor .landed"), null, { timeout: 8000 }).catch(() => {});
  await rest(page);
  await log("a link to a paragraph before the warm", await page.evaluate(() => ({ landed: document.querySelector("#editor .landed")?.textContent.slice(0, 24) ?? null })));
  /* a key before the warm: the landing owed is dropped, the warm's two seconds timed by the app's own clock */
  await page.goto(A.url(work2.replace(/ /g, "%20") + "?line=61", "warm=slow"));
  await A.waitEntry(page, work2, 8000).catch(() => {});
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(2600);
}
const work2 = "bookshelf/Augustine/De Doctrina Christiana/Book 2";
async function keyBeforeWarm(): Promise<void> {
  await log("a key before the warm", await page.evaluate(() => ({ landed: document.querySelector("#editor .landed")?.textContent.slice(0, 24) ?? null })));
}
section("a lettered line", async () => {
  /* a row saying its own number, 157a: every kind it can stand as, the gutter at every interval, the box, a link and a reference */
  await gutterPageSSetting();
  await linkLetteredLine();
});
async function gutterPageSSetting(): Promise<void> {
  const work = "bookshelf/Statius/Thebaid", key = work + "/Book 8", href = "#bookshelf/Statius/Thebaid/Book%208?line=";
  await A.foreignWrite(page, "bookshelf/Statius", "# Statius\n");
  await A.foreignWrite(page, work, "# Thebaid\n");
  await A.foreignWrite(page, key, "# Book 8\n\n[To the letter](" + href + "157a)\n\n::: dual-language 155\nquintus | Five, a sentence that runs on down beside the lines after it, and past them.\nsextus\nseptimus\n⟨line 157a⟩littera sola\n⟨line 157b⟩littera par | Its own English.\noctavus\n:::\n\n::: verse 200\nplanus\n⟨line 200a⟩littera in versu\n:::\n");
  const open = async () => { await page.goto(A.url(key.replace(/ /g, "%20"))); await A.waitEntry(page, key, 5000).catch(() => {}); await R.settle(page); await rest(page); await rest(page); };
  await open();
  
  
  await log("the gutter at the page's setting", { drawn: await gutter() });
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  const was = await page.evaluate((s) => document.querySelector(s)?.value ?? null, LINES);
  await setLines("0");
  await rest(page);
  await log("the gutter with no numbering", { interval: await page.evaluate((s) => document.querySelector(s)?.value ?? null, LINES), drawn: await gutter() });
  await setLines(was);
  await rest(page);
  await page.keyboard.press("Escape");
  await rest(page);
  ;
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  ;
  await log("⌃⌘G 157a, a lettered line with no English", await ask("157a"));
  await log("⌃⌘G 157, the line before it", await ask("157"));
  await log("⌃⌘G 157b, a lettered line with its own English", await ask("157b"));
  await log("⌃⌘G 158, the line after them", await ask("158"));
  await log("⌃⌘G 200a, a lettered line of plain verse", await ask("200a"));
  await log("⌃⌘G 157c, a letter the page lacks", await ask("157c"));
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("157a");
  await page.keyboard.press("Enter");
  await rest(page);
  await page.keyboard.press("Escape");
  await rest(page);
  await page.keyboard.press("Shift+Meta+ArrowRight");
  await rest(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on a lettered line", { lines: await R.clipboardLines(page) });
  await open();
}
const LINES = ".page-lines select, #pagelines select";
const setLines = (v: string) => page.evaluate(([s, v]) => { const e = document.querySelector(s); if (!e) return false; e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); return true; }, [LINES, v]);
async function linkLetteredLine(): Promise<void> {
  await page.locator("#editor a", { hasText: "To the letter" }).first().click();
  await rest(page);
  await rest(page);
  await log("a link to a lettered line", { ...(await seen2()), address: await page.evaluate(() => location.hash.split("?")[1] ?? null) });
}
const gutter = () => page.evaluate(() => [...document.querySelectorAll("#editor .ln")].map((r) => getComputedStyle(r, "::before").content.replace(/"/g, "")).filter((c) => c && c !== "none"));
const seen2 = () => page.evaluate(() => { const m = document.querySelector("#editor .landed"), widest = Math.max(...[...document.querySelectorAll("#editor .verse.dual-language > .vpair")].map((p) => p.getBoundingClientRect().width)); return { landed: m?.textContent ?? null, label: m?.dataset.line ?? null, band: m ? (m.closest(".dual-language") ? Math.abs(m.getBoundingClientRect().width - widest) < 1 : null) : null, said: document.querySelector(".saved.show")?.textContent || null }; });
const ask = async (n: string) => { await page.keyboard.press("Meta+a"); await page.keyboard.type(n); await page.keyboard.press("Enter"); await rest(page); return seen2(); };
section("a bracketed line", async () => {
  /* a line printed moved under its old number in brackets: drawn with it, asked with it, the plain number the plain line's */
  
  await A.foreignWrite(page, "bookshelf/Statius", "# Statius\n");
  await A.foreignWrite(page, "bookshelf/Statius/Thebaid", "# Thebaid\n");
  await A.foreignWrite(page, key, "# Book 16\n\n[To the bracket](#bookshelf/Statius/Thebaid/Book%2016?line=[378])\n\n::: dual-language 370\nseptuagesimus | Seventy, a sentence that runs on down beside the lines after it, and past them.\nunus\n⟨line [378]⟩translata prima\n⟨line [379]⟩translata altera\n:::\n\n::: dual-language 375\nquintus | Five\nsextus\nseptimus\noctavus\n:::\n");
  
  await open();
  await log("the gutter by a bracketed line", { drawn: await page.evaluate(() => [...document.querySelectorAll("#editor .ln")].map((r) => getComputedStyle(r, "::before").content.replace(/"/g, "")).filter((c) => c && c !== "none")) });
  ;
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  ;
  await log("⌃⌘G [378], a bracketed line", await askBracketed("[378]"));
  await log("⌃⌘G 378, the plain line of that number", await askBracketed("378"));
  await log("⌃⌘G 372, a number not printed", await askBracketed("372"));
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("[379]");
  await page.keyboard.press("Enter");
  await rest(page);
  await page.keyboard.press("Escape");
  await rest(page);
  await page.keyboard.press("Shift+Meta+ArrowRight");
  await rest(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on a bracketed line", { lines: await R.clipboardLines(page) });
  await open();
  await page.locator("#editor a", { hasText: "To the bracket" }).first().click();
  await rest(page);
  await rest(page);
  await log("a link to a bracketed line", { ...(await seen3()), address: await page.evaluate(() => decodeURI(location.hash.split("?")[1] ?? "")) });
});
const key = "bookshelf/Statius/Thebaid/Book 16";
const open = async () => { await page.goto(A.url(key.replace(/ /g, "%20"))); await A.waitEntry(page, key, 5000).catch(() => {}); await R.settle(page); await rest(page); await rest(page); };
const askBracketed = async (n: string) => { await page.keyboard.press("Meta+a"); await page.keyboard.type(n); await page.keyboard.press("Enter"); await rest(page); return seen3(); };
const seen3 = () => page.evaluate(() => { const m = document.querySelector("#editor .landed"), widest = Math.max(...[...document.querySelectorAll("#editor .verse.dual-language > .vpair")].map((p) => p.getBoundingClientRect().width)); return { landed: m?.textContent ?? null, label: m?.dataset.line ?? null, band: m ? Math.abs(m.getBoundingClientRect().width - widest) < 1 : null, said: document.querySelector(".saved.show")?.textContent || null }; });
section("a line with no English of its own", async () => {
  /* the mark is the row's band across both columns on every row of a dual-language block, the rows the English runs down beside included; nothing moves */
  
  await A.foreignWrite(page, "bookshelf/Statius", "# Statius\n");
  await A.foreignWrite(page, band, "# Band\n\n[The second](#bookshelf/Statius/Band?line=2)\n\n::: dual-language\nprimus | First, a sentence that runs on down over the lines it translates, and past them.\nsecundus, a Latin line long enough to measure\ntertius\n:::\n");
  await page.goto(A.url(band));
  await A.waitEntry(page, band, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await rest(page);
  
  await log("a line with no English, unmarked", await geometry());
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G to a line with no English", await geometry());
  await page.keyboard.press("Escape");
  await rest(page);
  await page.goto(A.url(band));
  await A.waitEntry(page, band, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await page.locator("#editor a", { hasText: "The second" }).first().click();
  await rest(page);
  await rest(page);
  await log("a link to a line with no English", await geometry());
});
const band = "bookshelf/Statius/Band";
const geometry = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll("#editor .verse.dual-language > .vrow")], [pair, row] = rows, r = document.createRange();
    r.selectNodeContents(row);
    const words = r.getBoundingClientRect(), box = row.getBoundingClientRect(), whole = pair.getBoundingClientRect();
    return { words: Math.round(words.width), wordsTop: Math.round(words.top - whole.top), rows: rows.map((x) => Math.round(x.getBoundingClientRect().height)), acrossBoth: Math.abs(box.left - whole.left) < 1 && Math.abs(box.right - whole.right) < 1, marked: row.classList.contains("landed") };
  });
section("the block a line is in", async () => {
  /* the corner names the block only where the number is in more than one */
  
  await A.foreignWrite(page, "bookshelf/Statius", "# Statius\n");
  await A.foreignWrite(page, twice, "# Twice\n\n::: verse\nalpha\nbeta\n:::\n\n::: verse\ngamma\n:::\n");
  await page.goto(A.url(twice));
  await A.waitEntry(page, twice, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  ;
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await log("⌃⌘G for a line in one of two blocks", await ask2("2"));
  await log("⌃⌘G for a line in both blocks", await ask2("1"));
  await log("Enter again for a line in both blocks", await ask2(""));
  await log("⌃⌘G past the last line where blocks repeat a number", await ask2("9"));
  await page.keyboard.press("Escape");
  await rest(page);
});
const twice = "bookshelf/Statius/Twice";
const ask2 = async (n: string) => {
    if (n) { await page.keyboard.press("Meta+a"); await page.keyboard.type(n); }
    await page.keyboard.press("Enter");
    await rest(page);
    return { ...(await R.linebar(page)), landed: await R.landedText(page) };
  };
