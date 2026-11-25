import { resolve } from "node:path";
import { NS } from "../../src/store/keys.ts";
import { ENTRY_DB, ENTRY_STORE, IMG_DB, IMG_STORE } from "../../src/store/store.ts";
import { tmpdir } from "node:os";
import { blankRowReader } from "./blankRow.ts";
import type { Page } from "../heliumPage.ts";
import { inPage, inPageWith } from "./inPage.ts";
import { said, saidAfterGesture } from "./said.ts";
import { waitSaveLanded } from "./saves.ts";
import { expected, waitState } from "./waits.ts";
import type { SearchShown } from "../../src/published.ts";
import { landings, landing, pieceAt, closesNeedle, type TextPoint } from "./textPoint.ts";
export const name = "app";
/* under the system temp, not tools/out: a profile under Dropbox is held by
   the sync and by the exiting browser, and its delete failed one run in
   three (measured) */
export const profile = resolve(tmpdir(), "gesta-helium-corner-profile");
const PAGE = "file://" + resolve("dist/index.html");
export const ns = NS;
export const bookmarksKey = NS + "bookmarks";
export const url = (hash: string, query = "") => PAGE + (query ? "?" + query : "") + "#" + hash;
/* the seeds written into the page's store and the page opened again over
   them, under a query no address carries: the next goto then loads the
   page anew and reads what was written since; on the address alone it
   moved only the hash, and an entry written before it went unread (pin:
   shelves › the bookshelf on its shelves) */
export async function reseeded(page: Page, seeds: Record<string, string>) {
  for (const [k, md] of Object.entries(seeds)) await foreignWrite(page, k, md);
  await page.goto("about:blank");
  await page.goto(url("commonplace/Horace", "fresh"));
  await waitWarm(page);
}
/* the page opened once to make its store before the seeds go in */
async function launch(page: Page, seeds: Record<string, string>) {
  await page.goto(url("commonplace/Horace"));
  await waitWarm(page);
  await reseeded(page, seeds);
  return page.evaluate(() => window.__published("probe"));
}
/* a section's start: the origin's storage cleared — the entries, the
   pictures, the index, localStorage — the clipboard emptied, and the
   fixtures seeded again, the page warm on Horace */
export async function fresh(page: Page, seeds: Record<string, string>) {
  await page.goto("about:blank");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Storage.clearDataForOrigin", { origin: "file://", storageTypes: "all" });
  await cdp.detach();
  const stages = await launch(page, seeds);
  await page.evaluate(() => navigator.clipboard.writeText("")).catch(() => {});
  return stages;
}
export const entry = (page: Page) => page.evaluate(() => window.__published("entry"));
export const waitEntry = (page: Page, key: string, ms = 15000) => waitState(page, { name: "entry", ms, stood: () => entry(page) }, (k) => window.__published("entry") === k, key);
/* once the search's rows answer `q`, or once `ms` has gone by: a wait
   that runs out says so in the run's own output, with what the box held,
   and answers null, the rows then those of some other query */
export async function waitSearchAnswered(page: Page, q: string, ms = 5000): Promise<SearchShown | null> {
  const stood = () => page.evaluate(() => ({ shown: window.__published("search"), typed: document.querySelector<HTMLInputElement>(".search-input")?.value ?? null, focused: String(document.activeElement?.className || document.activeElement?.tagName).slice(0, 30) }));
  const answered = await expected("search", ms, (t) => page.waitForFunction((q) => window.__published("search")?.answered === q, q, { timeout: t, polling: 25 }), async () => ({ q, ...(await stood()) }));
  return answered ? page.evaluate(() => window.__published("search")) : null;
}
export const waitWarm = (page: Page) => waitState(page, { name: "warm", ms: 15000, stood: () => page.evaluate(() => window.__published("probe")) }, () => window.__published("probe").includes("all;"));
/* the markdown the store holds, read straight from IndexedDB as it stands */
export const storedNow = (page: Page, which?: string) => page.evaluate(([which, dbName, storeName]) => new Promise<string | null>((res, rej) => { const key = which || window.__published("entry"); const r = indexedDB.open(dbName); r.onerror = () => rej(r.error); r.onsuccess = () => { const db = r.result; const g = db.transaction(storeName).objectStore(storeName).get(key); g.onsuccess = () => { db.close(); res(g.result?.md ?? null); }; g.onerror = () => { db.close(); rej(g.error); }; }; }), [which, ENTRY_DB, ENTRY_STORE]);
/* after the save's debounce and every store write it opened */
export const stored = async (page: Page, which?: string) => { await waitSaveLanded(page, 3000); return storedNow(page, which); };
/* another tab's write or delete, made in `page` straight to the store and announced as a landing is */
export const pictureKeys = (page: Page, prefix: string) => page.evaluate(([prefix, dbName, storeName]) => new Promise<IDBValidKey[]>((res, rej) => { const r = indexedDB.open(dbName); r.onerror = () => rej(r.error); r.onsuccess = () => { const db = r.result; const g = db.transaction(storeName).objectStore(storeName).getAllKeys(); g.onsuccess = () => { db.close(); res(g.result.filter((k) => String(k).startsWith(prefix)).sort()); }; g.onerror = () => { db.close(); rej(g.error); }; }; }), [prefix, IMG_DB, IMG_STORE]);
export const foreignWrite = (page: Page, key: string, md: string | null) => page.evaluate(([k, md, dbName, storeName, channel]) => new Promise<void>((res, rej) => { const r = indexedDB.open(dbName); r.onerror = () => rej(r.error); r.onsuccess = () => { const db = r.result; const t = db.transaction(storeName, "readwrite"); const st = t.objectStore(storeName); if (md === null) st.delete(k); else st.put({ key: k, md }); t.onerror = () => rej(t.error); t.oncomplete = () => { db.close(); new BroadcastChannel(channel).postMessage(k); res(); }; }; }), [key, md, ENTRY_DB, ENTRY_STORE, NS + "entries"]);
export const act = {
  create: async (page: Page) => { await page.keyboard.press("Control+Meta+n"); },
  createOnLeaf: async (page: Page): Promise<{ unavailable: string } | null> => { await page.keyboard.press("Control+Meta+n"); await page.waitForTimeout(100); return null; },
};
export const sel = {
  editor: "#editor .ProseMirror", editorFirst: "#editor .ProseMirror > :first-child",
  commonplaceOpener: ".opener[title='Commonplace menu']", bookshelfOpener: ".opener[title='Bookshelf menu']",
  menuRow: (name: string) => ".menu a[title='" + name + "']",
  corner: ".alert.show", backupsButton: ".toolbtn[title='Automatic folder backups']",
  replaceWith: "#replacewith", replaceAll: ".replace-toolbar button[title^='Replace every']", replaceSkip: ".replace-toolbar button[title^='Leave this']",
  markdown: "textarea.markdown", copybtn: ".copybtn", fmtB: ".fmt .b", fmtTag: ".fmt .t",
  shortcutsEditor: ".shortcuts .shortcut-edit", shortcutsSave: ".shortcuts .editbox .toolbtn", shortcutsInput: ".shortcuts .search-input",
  bookmarkKey: ".bookmarks .bookmark-setalias", bookmarkDel: ".bookmarks .bookmark-del",
  tagbarLink: (href: string) => ".tagbar a[href='" + href + "']", renameButton: ".toolbtn[title=\"Rename this entry’s tag\"]", renameSubEntry: ".toolbtn[title^='Rename this']", renameAuthor: ".toolbtn[title='Rename this author']", newAuthor: ".menu .menu-act", deleteButton: ".toolbtn[title='Delete this tagged entry']",
  gotoDay: ".page-goto select[aria-label='Day']", gotoDestination: ".page-goto select[aria-label='Destination']", searchScope: ".page-search select", searchRows: ".search-results li",
  editorLink: (href: string) => "#editor a[href='" + href + "']", editorImg: "#editor img", editorPre: "#editor pre", editorVerse: "#editor .verse", editorCard: "#editor .card-light-blue", editorCell: "#editor .vpair .vcell",
};
/* THE SCREEN LINE, read in the page: its parts top-level functions run there as one script */
function pageShows(c: string): boolean {
  const e = document.querySelector(c);
  return !!e && !e.hidden;
}
function selectedNow(): string {
  const sel = document.getSelection();
  if (document.querySelector(".ProseMirror-selectednode")) return "node";
  return sel && !sel.isCollapsed ? sel.toString().length + " chars" : "none";
}
function openedNow(): string {
  const opened = [["menu", ".menu"], ["help", ".helppanel:not(.bookmarks):not(.backups)"], ["bookmarks", ".bookmarks"], ["backups", ".backups"], ["shortcuts", ".shortcuts"]].find(([, c]) => pageShows(c));
  return opened ? opened[0] : "none";
}
function openRows(): string {
  const rows = [".page-goto", ".page-search", ".page-lines"].filter((c) => document.querySelector(c)?.open && pageShows(c)).map((c) => c.slice(6));
  if (pageShows(".goto-toolbar")) rows.push("goto-toolbar");
  return rows.length ? rows.join("+") : "none";
}
function screenLine(): string {
  const corner = window.__corner() || "";
  return [window.__published("entry"), "sel " + selectedNow(), "toolbar " + (document.querySelector(".fmt")?.classList.contains("show") ? "on" : "off"),
    "opened " + openedNow(), "rows " + openRows(),
    pageShows(".mode") ? "markdown" : "html", "corner " + JSON.stringify(corner)].join(" · ");
}
export const screen = (page: Page): Promise<string> => page.evaluate(inPage(screenLine, pageShows, selectedNow, openedNow, openRows));
/* the alert area flush under the masthead, which it follows a frame late
   on a resize (read 27 px under the text on a grid after a verse entry),
   and the scroll, the layout's height and the text's left edge the same
   over four frames, a measuring pass a frame after a change having run,
   an open menu moving the page over
   (pin: the entry's top › an entry opening on a grid)
   (pin: launch, menus, the corner, links › after a click outside) */
export async function settled(p: Page) {
  await p.evaluate(inPage(settling, alertsFlush, layoutKey)).catch(() => {});
}
function alertsFlush(): boolean {
  const a = document.querySelector(".alerts"), h = document.querySelector(".site-head");
  return !a || !h || Math.round(a.getBoundingClientRect().top) === Math.round(h.getBoundingClientRect().bottom);
}
function layoutKey(): string {
  const text = document.querySelector("#editor .page") ?? document.querySelector("#editor");
  return scrollY + ":" + document.documentElement.scrollHeight + ":" + text?.getBoundingClientRect().left;
}
function settling(): Promise<void> {
  return new Promise<void>((done) => {
    let last = "", same = 0, frames = 0;
    const tick = () => { const now = layoutKey(); same = now === last && alertsFlush() ? same + 1 : 0; last = now; if (same >= 4 || ++frames > 120) done(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
/* where the selection stands, noted before a gesture moves it: the wait
   ends at a selectionchange that finds it moved, so an event an earlier
   gesture had queued, finding it where it was, is passed over. Two frames
   after a script's selection, under the load of two runs at once, a chord
   took the caret before the editor had it */
export const watchSelection = (page: Page) => page.evaluate(() => {
  const at = () => { const s = getSelection(); return [s.anchorNode, s.anchorOffset, s.focusNode, s.focusOffset]; };
  window.__selFrom = at();
  window.__selSeen = false;
  window.__selUnmoved = () => at().every((x, i) => x === window.__selFrom[i]);
  const moved = () => { if (at().some((x, i) => x !== window.__selFrom[i])) { window.__selSeen = true; document.removeEventListener("selectionchange", moved); } };
  document.addEventListener("selectionchange", moved);
});
export const selectionMoved = (page: Page, ms = 1000) => waitState(page, { name: "selection", ms }, () => window.__selSeen);
/* each placement is a script's, the selection standing where it lands once
   it returns: one onto the selection already there has no change to wait
   for, and waited a second for it. Placed on a settled page: a write to a
   row's attributes in the moment before the editor reads a script's range
   redraws the caret it held (MEASURED: 20 of 20 in a probe). Placed once,
   never again on a collapse, so a collapse still fails its step with the
   editor's last writes (pin: bookmarks › fb over a selection, already here) */
async function placed<T>(page: Page, place: () => Promise<T>): Promise<T> {
  await settled(page);
  await watchSelection(page);
  const out = await place();
  const unmoved = await page.evaluate(() => window.__selUnmoved());
  if (!unmoved) await selectionMoved(page);
  return out;
}
/* the editor's text nodes by the block each sits in, the nearest ancestor not laid out inline */
function textBlocks(): Text[][] {
  const root = document.querySelector("#editor .ProseMirror"), out: Text[][] = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let last: Element | null = null;
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    let el = t.parentElement;
    while (el !== root && /^(inline|contents)/.test(getComputedStyle(el).display)) el = el.parentElement;
    if (el !== last) { out.push([]); last = el; }
    out[out.length - 1].push(t as Text);
  }
  return out;
}
function textRange([from, to]: [TextPoint, TextPoint]): [Node, number, Node, number] | null {
  const nodes = textBlocks(), got = landings(nodes.map((b) => b.map((t) => t.data)), from, to);
  if (!got) return null;
  const [[a, p, o], [z, q, e]] = got;
  return [nodes[a][p], o, nodes[z][q], e];
}
/* from one point to another, as a drag from one to the other leaves it */
function selectInEditor([from, to, focus]: [TextPoint, TextPoint, boolean]): boolean {
  const r = textRange([from, to]);
  if (!r) return false;
  if (focus) document.querySelector<HTMLElement>("#editor .ProseMirror").focus();
  document.getSelection().setBaseAndExtent(...r);
  return true;
}
function pointOfText(points: [TextPoint, TextPoint]): { x: number; y: number } | null {
  const r = textRange(points);
  if (!r) return null;
  const range = document.createRange();
  range.setStart(r[0], r[1]); range.setEnd(r[2], r[3]);
  r[0].parentElement.scrollIntoView({ block: "center" });
  const b = range.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}
const notThere = (from: TextPoint, to: TextPoint): Error => new Error("no “" + from[0] + "”" + (to[0] === from[0] ? "" : " or “" + to[0] + "”") + " in the editor");
/* a selection or a caret set from the text, the step failing on a needle not there */
async function landSelection(page: Page, [from, to]: [TextPoint, TextPoint], focus: boolean): Promise<void> {
  if (!(await placed(page, () => page.evaluate(inPageWith([from, to, focus], selectInEditor, textRange, textBlocks, landings, landing, pieceAt, closesNeedle))))) throw notThere(from, to);
}
export const read = {
  blankRow: blankRowReader("#editor .ProseMirror"),
  /* the contents-folds step: the headings that fold, which are open, their counts, the links showing, the followed link's place */
  folds: (page: Page) => page.evaluate(() => { const hs = [...document.querySelectorAll("#editor h2")]; const links = [...document.querySelectorAll("#editor a")].filter((a) => a.offsetParent); const canto = links.find((a) => (a.getAttribute("href") || "").endsWith("/1.1")); const r = canto?.getBoundingClientRect(); return { folds: hs.filter((h) => h.classList.contains("fold")).length, open: hs.filter((h) => h.getAttribute("aria-expanded") === "true").map((h) => h.textContent.slice(0, 12)), counts: hs.map((h) => h.dataset.count || null), linksShowing: links.length, cantoInView: r ? r.top >= 0 && r.bottom <= innerHeight : null }; }),
  /* the triangle stands beside the heading's FIRST line: a two-line heading's middle is below it (the step's first aim) */
  clickFoldTriangle: async (page: Page, text: string) => { const at = await page.evaluate((t) => { const h = [...document.querySelectorAll("#editor h2")].find((x) => x.textContent.startsWith(t)); if (!h) return null; const r = h.getBoundingClientRect(); return { x: r.left - 12, y: r.top + 14 }; }, text); if (at) { await page.mouse.click(at.x, at.y); await page.waitForTimeout(200); } },
  /* the places step: the line just under the masthead, and whether the window is at the top */
  place: (page: Page) => page.evaluate(() => { const top = window.__pageTop() + 6; const box = document.querySelector("#editor .ProseMirror").getBoundingClientRect(); const el = document.elementFromPoint(box.left + 40, top); return { atTop: scrollY === 0, line: (el?.closest("p, li, h1, h2, h3, .row, .verse > *") || el)?.textContent.trim().slice(0, 32) || null }; }),
  /* the margin-note step: each margin-note's form and width, the row it stands beside, its middle against that row's first line, how far it was pushed; the line numbers shown; which margin-note holds the caret */
  margins: (page: Page) => waitState(page, { name: "margin note", ms: 3000 }, () => [...document.querySelectorAll("#editor .margin-note")].every((n) => n.classList.contains("in-margin") === (n.style.getPropertyValue("--mn-w") !== ""))).then(() => page.evaluate(() => {
    const caret = getSelection().anchorNode;
    return { marginNotes: [...document.querySelectorAll("#editor .margin-note")].map((n) => {
      const r = n.getBoundingClientRect(), row = n.nextElementSibling, rr = row?.getBoundingClientRect();
      const line = rr ? rr.top + parseFloat(getComputedStyle(row).lineHeight) / 2 : 0;
      return { text: n.textContent.slice(0, 20), form: n.classList.contains("in-margin") ? "margin " + n.style.getPropertyValue("--mn-w") : "text", beside: row?.textContent.slice(0, 16) ?? null,
        offCentre: n.classList.contains("in-margin") && !n.style.getPropertyValue("--mn-push") ? Math.round(r.top + parseFloat(getComputedStyle(n).lineHeight) / 2 - line) : null,
        clear: n.classList.contains("in-margin") ? Math.round(r.right - (n.parentElement.getBoundingClientRect().left)) : Math.round(r.left - (rr?.left ?? r.left)),
        pushed: !!n.style.getPropertyValue("--mn-push"), caret: !!caret && n.contains(caret) };
    }), shown: [...document.querySelectorAll("#editor .ln.shown")].map((r) => r.dataset.line) };
  })),
  clickMargin: async (page: Page, text: string) => { const at = await page.evaluate((t) => { const n = [...document.querySelectorAll("#editor .margin-note")].find((x) => x.textContent.startsWith(t)); if (!n) return null; const r = n.getBoundingClientRect(); return { x: r.right - 2, y: r.top + 8 }; }, text); if (at) { await page.mouse.click(at.x, at.y); await page.waitForTimeout(150); } },
  /* the stanza step: the number each stanza DRAWS (its ::before), and the line numbers shown */
  stanzas: (page: Page) => page.evaluate(() => ({ drawn: [...document.querySelectorAll("#editor .verse")].map((v) => getComputedStyle(v, "::before").content.replace(/"/g, "")), shown: [...document.querySelectorAll("#editor .ln.shown")].map((r) => r.dataset.line) })),
  /* a placement that found no words returned false, which no step read */
  selectBetween: async (page: Page, a: string, b: string) => { await landSelection(page, [[a, 0], [b, b.length]], true); return true; },
  selectFrom: (page: Page, from: TextPoint, to: TextPoint) => landSelection(page, [from, to], true),
  /* a hand's drag over one English cell of a dual-language block, its first letter to its last; then what is selected and what is marked beside it */
  dragCell: async (page: Page, start: string) => {
    const at = await page.evaluate((s) => {
      const cell = [...document.querySelectorAll("#editor .dual-language > .vpair > .vcell + .vcell")].find((c) => c.textContent.startsWith(s));
      if (!cell) return null;
      cell.scrollIntoView({ block: "center" });
      /* a cell tall enough to start under the alert area stuck below the masthead is scrolled clear of it */
      const clear = window.__pageTop() + 10, top = cell.getBoundingClientRect().top;
      if (top < clear) scrollBy(0, top - clear);
      const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT); const ts = []; for (let t = w.nextNode(); t; t = w.nextNode()) ts.push(t);
      const box = (t: Node, i: number) => { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); return r.getBoundingClientRect(); };
      const a = box(ts[0], 0), last = ts.at(-1), b = box(last, last.length - 1);
      return { x1: a.left + 1, y1: a.top + a.height / 2, x2: b.right, y2: b.top + b.height / 2 };
    }, start);
    if (!at) return false;
    await page.mouse.move(at.x1, at.y1);
    await page.mouse.down();
    await page.mouse.move((at.x1 + at.x2) / 2, at.y2, { steps: 8 });
    await page.mouse.move(at.x2, at.y2, { steps: 8 });
    await page.mouse.up();
    return true;
  },
  dualSelection: (page: Page) => page.evaluate(() => ({ selected: getSelection().toString().slice(0, 60), ends: getSelection().toString().slice(-30), marked: [...document.querySelectorAll("#editor .dl-covered")].map((m) => m.textContent.slice(0, 40)) })),
  /* each rest of a split line: its number, and how far its text starts past the end of the half above, in px; and the numbers drawn */
  splitRests: (page: Page) => page.evaluate(() => {
    const rows = [...document.querySelectorAll("#editor .ProseMirror .verse > .vrow")];
    const ends = (el: Element) => { const r = document.createRange(); r.selectNodeContents(el); const rs = r.getClientRects(); return rs.length ? [rs[0].left, rs[rs.length - 1].right] : null; };
    let above = null;
    const rests = [];
    for (const el of rows) {
      if (!el.dataset.line) continue;
      if (el.dataset.kind === "cont" && above) rests.push({ text: el.textContent, line: +el.dataset.line, past: Math.round(ends(el)[0] - ends(above)[1]), setIn: getComputedStyle(el).paddingLeft, lines: new Set([...(() => { const r = document.createRange(); r.selectNodeContents(el); return r.getClientRects(); })()].filter((x) => x.width).map((x) => Math.round(x.top))).size });
      above = el;
    }
    return { rests, drawn: rows.filter((el: Element) => el.classList.contains("shown")).map((el: HTMLElement) => +el.dataset.line) };
  }),
  dualLayout: (page: Page) => page.evaluate(() => {
    const blocks = [...document.querySelectorAll("#editor .verse.dual-language")];
    let sentences = 0, level = 0, clear = 0;
    for (const b of blocks) {
      const pairs = [...b.querySelectorAll(":scope > .vpair")];
      pairs.forEach((p) => {
        sentences++;
        const [latin, english] = p.children;
        if (Math.abs(latin.getBoundingClientRect().top - english.getBoundingClientRect().top) < 1) level++;
        /* clear of whatever stands below it: the next row with English, a note, or the rule over the next pair */
        const rows = [...b.children];
        const next = rows.slice(rows.indexOf(p) + 1).find((r) => r.classList.contains("vpair") || r.classList.contains("note"));
        const after = b.nextElementSibling;
        const limit = next ? (next.classList.contains("vpair") ? next.children[0] : next).getBoundingClientRect().top : after ? after.getBoundingClientRect().top - 1.2 * parseFloat(getComputedStyle(after).fontSize) : Infinity;
        if (english.getBoundingClientRect().top + english.scrollHeight <= limit + 1) clear++;
      });
    }
    const rests = [...document.querySelectorAll('#editor .dual-language > [data-kind="cont"]')];
    const opening = rests.find((r) => r === r.parentElement.firstElementChild);
    const note = (mark: number) => [...document.querySelectorAll("#editor .dual-language > .note")].find((n) => n.textContent.startsWith("[" + mark + "]"));
    const column = (n: Element) => n && (Math.abs(n.getBoundingClientRect().left - n.parentElement.querySelector(".vpair > .vcell + .vcell").getBoundingClientRect().left) < 1 ? "English" : Math.abs(n.getBoundingClientRect().left - n.parentElement.querySelector(".vpair > .vcell").getBoundingClientRect().left) < 1 ? "Latin" : "neither");
    const em = parseFloat(getComputedStyle(blocks[0]).fontSize);
    const englishWidth = Math.round(blocks[0].querySelector(".vpair > .vcell + .vcell").getBoundingClientRect().width / em);
    const waiting = blocks.reduce((n, b) => n + [...(b.children as HTMLCollectionOf<HTMLElement>)].filter((r) => parseFloat(r.style.paddingTop) > 0 || parseFloat(r.style.marginTop) > 0).length, 0);
    const tempe = [...document.querySelectorAll("#editor .dual-language .vcell")].find((c) => c.textContent.startsWith("Men call it Tempe"));
    const lines = (el: Element) => { const r = document.createRange(); r.selectNodeContents(el); return new Set([...r.getClientRects()].filter((x) => x.width).map((x) => Math.round(x.top))).size; };
    const latinWrapped = blocks.reduce((n, b) => n + [...b.querySelectorAll(":scope > .vrow")].filter((r) => lines(r.classList.contains("vpair") ? r.children[0] : r) > 1).length, 0);
    return { blocks: blocks.length, sentences, level, clear, waiting, latinWrapped, tempeLines: tempe && Math.round(tempe.scrollHeight / parseFloat(getComputedStyle(tempe).lineHeight)), rests: rests.length, setIn: rests.filter((r) => parseFloat(r.style.getPropertyValue("--cont-x")) > 0).length,
      openingRest: opening && { text: opening.textContent.split("|")[0].trim(), setIn: parseFloat(opening.style.getPropertyValue("--cont-x")) > 0 }, note1: column(note(1)), note4: column(note(4)), englishEm: englishWidth };
  }),
  dualInset: (page: Page) => page.evaluate(() => {
    const b = document.querySelector("#editor div.note > .verse.dual-language");
    const outer = [...document.querySelectorAll("#editor .verse.dual-language")].find((x) => !x.closest("div.note"));
    if (!b || !outer) return { inset: !!b, page: !!outer };
    const left = (el: Element) => el.getBoundingClientRect().left;
    const right = (el: Element) => el.getBoundingClientRect().right;
    const latin = b.querySelector(".vpair > .vcell"), english = b.querySelector(".vpair > .vcell + .vcell");
    const notes = [...b.querySelectorAll(":scope > .note")];
    const lines = (el: Element) => { const r = document.createRange(); r.selectNodeContents(el); return new Set([...r.getClientRects()].filter((x) => x.width).map((x) => Math.round(x.top))).size; };
    return {
      englishEdge: Math.round(left(english) - left(outer.querySelector(".vpair > .vcell + .vcell"))),
      notes: notes.map((n) => Math.abs(left(n) - left(english)) < 1 ? "English" : Math.abs(left(n) - left(latin)) < 1 && right(n) <= left(english) ? "Latin" : "neither").join(" "),
      englishNoteToEdge: notes.length > 1 ? Math.round(right(b) - right(notes[1])) : null,
      latinWrapped: [...b.querySelectorAll(":scope > .vrow")].filter((r) => lines(r.classList.contains("vpair") ? r.children[0] : r) > 1).length,
    };
  }),
  dualQuote: (page: Page) => page.evaluate(() => {
    const b = document.querySelector("#editor blockquote .verse.dual-language");
    if (!b) return { dual: false };
    const rows = [...b.querySelectorAll(":scope > .vrow")];
    const english = b.querySelector(".vpair > .vcell + .vcell");
    const lh = parseFloat(getComputedStyle(rows[0]).lineHeight);
    const top = (el: Element) => el.getBoundingClientRect().top;
    const lines = Math.round(english.scrollHeight / parseFloat(getComputedStyle(english).lineHeight));
    return { dual: true, rows: rows.length, level: Math.abs(top(rows[0].children[0]) - top(english)) < 1,
      latinStep: rows[1] ? Math.round((top(rows[1]) - top(rows[0])) / lh * 10) / 10 : null, englishLines: lines,
      englishInside: top(english) + english.scrollHeight <= b.closest("blockquote").getBoundingClientRect().bottom + 1 };
  }),
  caretCell: (page: Page) => page.evaluate(() => {
    const sel = getSelection(), n = sel.anchorNode; const el = n && (n.nodeType === 3 ? n.parentElement : n);
    const cell = el?.closest(".vcell, .note, .vrow");
    if (!cell) return null;
    const r = document.createRange(); r.selectNodeContents(cell); r.setEnd(sel.anchorNode, sel.anchorOffset);
    const at = r.toString().length;
    return cell.textContent.slice(0, 40) + (at === 0 ? " · at its start" : at === cell.textContent.length ? " · at its end" : " · inside");
  }),
  clipboardLines: (page: Page) => page.evaluate(async () => { try { return (await navigator.clipboard.readText()).split("\n").map((l) => l.replace(/\(#[^)]*\)/, "(…)").slice(0, 70)); } catch (e) { return [String(e)]; } }),
  landedText: (page: Page) => page.evaluate(() => document.querySelector("#editor .landed")?.textContent || null),
  corner: (page: Page) => page.evaluate(() => { const s = document.querySelector(".alert.show") ?? [document.querySelector(".alert.success"), document.querySelector(".alert.info")].find((e) => e?.textContent); return { text: s?.textContent, show: s?.classList.contains("show"), opacity: getComputedStyle(s).opacity, pill: document.querySelector(".backup-paused")?.hidden }; }),
  /* the error and the warning live, and nothing a fading alert's clock decides */
  /* an error stands until something resolves it; a warning fades on the clock */
  standingText: (page: Page) => page.evaluate(() => window.__published("alerts").error || undefined),
  masthead: (page: Page) => page.evaluate(() => { const h = document.querySelector(".site-head"); const r = h.getBoundingClientRect(); return { crumb: document.querySelector(".datelabel")?.textContent.replace(/\s+/g, " ").trim(), title: document.querySelector(".page-title")?.textContent, titleHidden: document.querySelector(".page-title")?.hidden, lines: !document.querySelector(".page-lines")?.hidden, today: !document.querySelector(".toolbtn[title='Go to today']")?.hidden, backups: document.querySelector(".toolbtn[title='Automatic folder backups']")?.textContent, height: r.height, sticky: getComputedStyle(h).position }; }),
  /* an open menu's selected row, the menu area's width, where the page's text starts, and the words before the caret */
  menuNow: (page: Page) => page.evaluate(() => { const s = getSelection(); const t = s && s.rangeCount && s.anchorNode && s.anchorNode.nodeType === 3 ? (s.anchorNode.textContent || "").slice(Math.max(0, s.anchorOffset - 12), s.anchorOffset) : ""; const under = (window as unknown as { __pageTop?: () => number }).__pageTop?.() ?? 0; const left = document.querySelector("#editor .page")?.getBoundingClientRect().left ?? 0; const first = document.elementFromPoint(left + 40, under + 10)?.closest(".vrow, .page > *"); return { topLine: first?.textContent?.trim().slice(0, 30) ?? null, sel: window.__published("menuSel"), menuArea: window.__published("menuArea"), textLeft: Math.round(document.querySelector("#editor .page")?.getBoundingClientRect().left ?? -1), beforeCaret: t }; }),
  round: (page: Page) => page.evaluate(() => ({ icons: [...document.querySelectorAll(".opener[aria-expanded='true']")].map((b) => b.getAttribute("aria-label")), goto: !!document.querySelector(".page-goto")?.open, focus: document.activeElement?.closest(".menu, .page-goto")?.classList[0] ?? null, sel: window.__published("menuSel") })),
  menu: (page: Page) => page.evaluate(() => { const p = document.querySelector(".menu"); return p ? { rows: [...p.querySelectorAll("a")].map((a) => a.textContent), create: p.querySelector(".menu-act")?.textContent, empty: p.querySelector(".menu-empty")?.textContent } : null; }),
  afterModClick: (page: Page) => page.evaluate(() => ({ stayed: window.__published("entry"), nodeSelected: !!document.querySelector(".ProseMirror-selectednode"), selection: document.getSelection()?.toString().slice(0, 20), toolbar: document.querySelector(".fmt")?.classList.contains("show") })),
  pairs: (page: Page) => page.evaluate(() => document.querySelectorAll("#editor .vpair").length),
  refusedFence: async (page: Page) => ({ corner: await said(page), paragraphs: await page.evaluate(() => document.querySelectorAll("#editor p").length) }),
  /* whether the refusal still stands, not which info does: two take turns there by the run's load */
  cleanSwitch: (page: Page) => page.evaluate(() => ({ refusalStands: /stayed a paragraph/.test(window.__published("alerts").error || ""), verse: !!document.querySelector("#editor .verse") })),
  linesRow: (page: Page) => page.evaluate(() => ({ open: document.querySelector(".page-lines").open, focused: document.activeElement?.getAttribute("aria-label"), options: [...document.querySelectorAll(".page-lines option")].map((o) => o.textContent) })),
  linesRowOpen: (page: Page) => page.evaluate(() => ({ open: document.querySelector(".page-lines").open })),
  clipboardReference: async (page: Page) => ({ ...(await page.evaluate(async () => { const corner = ""; try { const items = await navigator.clipboard.read(); const types = items[0].types; const html = types.includes("text/html") ? await (await items[0].getType("text/html")).text() : ""; const text = types.includes("text/plain") ? await (await items[0].getType("text/plain")).text() : ""; return { corner, types, textHead: text.slice(0, 40), passage: text.split("\n\n").slice(1).join("\n\n").slice(0, 60), htmlHead: html.replace(/<meta[^>]*>/g, "").replace(/href="[^"]*"/, 'href="…"').slice(0, 160), anchor: /<a href="[^"]*#commonplace\/Horace\?h=/.test(html), em: html.includes("<em>Horace</em>"), grid: /grid-template-columns:/.test(html) }; } catch (e) { return { corner, clipboard: String(e) }; } })), corner: await said(page) }),
  codeBlock: (page: Page) => page.evaluate(() => { const pre = document.querySelector("#editor pre"); return { lang: pre.dataset.lang, label: getComputedStyle(pre, "::after").content, tokens: [...pre.querySelectorAll("[class^=tok-]")].map((t) => t.className + ":" + t.textContent) }; }),
  copyHover: (page: Page) => page.evaluate(() => { const b = document.querySelector(".copybtn"); const pre = document.querySelector("#editor pre").getBoundingClientRect(); const r = b.getBoundingClientRect(); return { show: b.classList.contains("show"), title: b.title, insideBlock: r.top >= pre.top && r.right <= pre.right + 1 }; }),
  /* read once the label has settled: read a rest after the click, it once
     still said "copy"; a label that never settles is read as it stands
     (pin: card copy › a card hover-copied) */
  copyLabel: async (page: Page) => {
    await waitState(page, { name: "copy button", ms: 1000, polling: 25 }, () => /^(copied|copy failed)$/.test(document.querySelector(".copybtn")?.textContent ?? ""));
    return page.evaluate(() => document.querySelector(".copybtn").textContent);
  },
  clipboardCard: (page: Page) => page.evaluate(async () => { try { const items = await navigator.clipboard.read(); const html = items[0].types.includes("text/html") ? await (await items[0].getType("text/html")).text() : ""; const bg = /background-color:\s*([^;"]+)/.exec(html); return { bg: bg && bg[1], grid: /grid-template-columns:/.test(html), card: /class="card-light-blue"/.test(html), raw: /background-color/.test(html) ? undefined : html.replace(/<meta[^>]*>/g, "").slice(0, 120) }; } catch (e) { return { clipboard: String(e) }; } }),
  cardLive: (page: Page) => page.evaluate(() => getComputedStyle(document.querySelector("#editor .card-light-blue")).backgroundColor),
  /* the grid's readings: the layout, the band above its corner, a selection across its cards, the corner's text */
  gridLayout: (page: Page) => page.evaluate(() => { const g = document.querySelector("#editor div.grid"); if (!g) return { grid: false, columns: 0, cards: document.querySelectorAll("#editor [class^='card-']").length, wider: false, type: null }; const cs = getComputedStyle(g); return { grid: true, columns: cs.gridTemplateColumns.split(" ").length, cards: g.children.length, wider: g.getBoundingClientRect().width > document.querySelector("#editor .ProseMirror").getBoundingClientRect().width, type: cs.fontSize }; }),
  gridHover: async (page: Page) => { const r = await page.evaluate(() => { const g = document.querySelector("#editor div.grid"); return g ? g.getBoundingClientRect().toJSON() : null; }); if (!r) return { show: false, label: null, title: null }; await page.mouse.move(r.right - 30, r.top - 12); await page.waitForTimeout(150); return page.evaluate(() => { const b = document.querySelector(".copybtn"); return { show: b.classList.contains("show"), label: b.textContent, title: b.title }; }); },
  clipboardText: (page: Page) => page.evaluate(async () => { try { return (await navigator.clipboard.readText()).slice(0, 40); } catch (e) { return String(e); } }),
  selectCards: (page: Page) => page.evaluate(() => { const cards = document.querySelectorAll("#editor [class^='card-']"); const r = document.createRange(); r.setStart(cards[1], 0);   /* the grid's cards: the first card on the page is the one above the grid */ r.setEnd(cards[cards.length - 1], cards[cards.length - 1].childNodes.length); const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); }),
  replaceToolbar: (page: Page) => page.evaluate(() => { const b = document.querySelector(".replace-toolbar"); const view = document.querySelector("textarea.markdown") ? "markdown" : "html"; if (!b) return { toolbar: "none", view }; const f = document.getElementById("replacefind"), w = document.getElementById("replacewith"); const fr = f.getBoundingClientRect(), wr = w.getBoundingClientRect(); const now = document.querySelector(".markdown-marks:not([hidden]) mark.now"), nr = now?.getBoundingClientRect(); const head = document.querySelector(".site-head").getBoundingClientRect().bottom; return { open: !b.hidden, view, count: b.querySelector(".count").textContent, find: f.value, with: w.value, focus: document.activeElement?.id || document.activeElement?.tagName, boxes: fr.left === wr.left && fr.right === wr.right ? "aligned" : fr.left + "-" + fr.right + " / " + wr.left + "-" + wr.right, marks: document.querySelectorAll(".markdown-marks:not([hidden]) mark").length, outlined: now ? now.textContent + (nr.top >= head && nr.bottom <= innerHeight ? " on screen" : " off screen") : null }; }),
  replaceDrift: (page: Page) => page.evaluate(() => { const ta = document.querySelector("textarea.markdown"), m = document.querySelector(".markdown-marks:not([hidden])"); if (!ta || !m) return { layer: "none" }; return { count: document.querySelector(".replace-toolbar .count")?.textContent, drift: Math.round(m.getBoundingClientRect().height - ta.getBoundingClientRect().height) }; }),
  setMarkdown: (page: Page, text: string) => page.fill("textarea.markdown", text),
  markdownCaretTo: (page: Page, text: string) => page.evaluate((t) => { const a = document.querySelector("textarea.markdown"); const i = a.value.indexOf(t); a.focus(); a.setSelectionRange(i, i); }, text),
  /* the stanza at the window's top, just under the masthead: in HTML mode the first verse still showing; in markdown mode the stanza whose lines hold the top line, or the next after a gap (the lines unwrapped: the step's are short) */
  topStanza: (page: Page) => page.evaluate(() => {
    const under = window.__pageTop() + 2;
    const ta = document.querySelector("textarea.markdown");
    if (!ta) { const v = [...document.querySelectorAll("#editor .verse[data-stanza]")].find((x) => x.getBoundingClientRect().bottom > under); return v ? +v.dataset.stanza : null; }
    const cs = getComputedStyle(ta), lines = ta.value.split("\n");
    let i = Math.max(0, Math.floor((under - ta.getBoundingClientRect().top - parseFloat(cs.paddingTop)) / parseFloat(cs.lineHeight)));
    for (let k = i; k >= 0; k--) { if (/^:::\s*$/.test(lines[k]) && k < i) break; const m = lines[k].match(/^::: stanza (\d+)/); if (m) return +m[1]; }
    for (let k = i; k < lines.length; k++) { const m = lines[k].match(/^::: stanza (\d+)/); if (m) return +m[1]; }
    return null;
  }),
  /* whether the entry's last stanza is on screen, in either view */
  lastStanzaShowing: (page: Page) => page.evaluate(() => {
    const ta = document.querySelector("textarea.markdown");
    if (!ta) { const vs = document.querySelectorAll("#editor .verse[data-stanza]"); const r = vs[vs.length - 1]?.getBoundingClientRect(); return !!r && r.top < innerHeight && r.bottom > 0; }
    const cs = getComputedStyle(ta), lines = ta.value.split("\n"), at = lines.map((l) => /^::: stanza /.test(l)).lastIndexOf(true);
    const top = ta.getBoundingClientRect().top + parseFloat(cs.paddingTop) + at * parseFloat(cs.lineHeight);
    return top < innerHeight && top > 0;
  }),
  /* markdown mode scrolled until a text is at the window's top, measured on a twin that wraps as the textarea does: its paragraphs wrap, and a line count stopped a Book short */
  markdownScrollTo: (page: Page, text: string) => page.evaluate((t) => { const a = document.querySelector("textarea.markdown"), cs = getComputedStyle(a), twin = document.createElement("div"); for (const p of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "wordSpacing", "tabSize", "padding", "borderWidth", "borderStyle", "boxSizing", "overflowWrap", "wordBreak"] as const) twin.style[p] = cs[p]; Object.assign(twin.style, { position: "absolute", visibility: "hidden", left: "-9999px", top: "0", whiteSpace: "pre-wrap", width: a.getBoundingClientRect().width + "px" }); twin.textContent = a.value.slice(0, a.value.indexOf(t)); const mark = twin.appendChild(document.createElement("span")); mark.textContent = "x"; document.body.appendChild(twin); const y = mark.offsetTop; twin.remove(); const under = document.querySelector(".site-head").getBoundingClientRect().bottom + 4; scrollTo(0, scrollY + a.getBoundingClientRect().top + y - under); }, text),
  inMarkdown: (page: Page) => page.evaluate(() => !!document.querySelector("textarea.markdown")),
  cardsAndPairs: (page: Page) => page.evaluate(() => ({ cards: document.querySelectorAll("#editor .card-light-blue").length, pairs: document.querySelectorAll("#editor .vpair").length })),
  picture: (page: Page) => page.evaluate(() => { const img = document.querySelector("#editor img"); return { src: img.getAttribute("src")?.slice(0, 5), width: img.naturalWidth, height: img.naturalHeight, last: document.querySelector("#editor .ProseMirror").lastElementChild?.tagName }; }),
  shortcuts: (page: Page) => page.evaluate(() => { const c = document.querySelector(".shortcuts"); return c ? { rows: [...c.querySelectorAll("li")].map((li) => li.textContent.trim()), editor: !!c.querySelector(".shortcut-edit"), focused: document.activeElement?.className.split(" ")[0] } : null; }),
  editorTextHead: (page: Page) => page.evaluate(() => document.querySelector("#editor .ProseMirror").textContent.slice(0, 30)),
  bookmarks: (page: Page) => page.evaluate(() => { const c = document.querySelector(".bookmarks"); return c ? { rows: [...c.querySelectorAll("li")].map((li) => li.innerText.replace(/\s+/g, " ").trim().slice(0, 40)), foot: c.querySelector(".bookmarks-add")?.textContent.replace(/\s+/g, " ").trim(), focused: document.activeElement?.className.split(" ")[0] } : null; }),
  bookmarksLit: (page: Page) => page.evaluate(() => [...document.querySelectorAll(".bookmarks li.bookmark-typing")].length),
  backups: (page: Page) => page.evaluate(() => { const c = document.querySelector(".backups"); return c ? { buttons: [...c.querySelectorAll("button")].map((b) => b.textContent), status: c.querySelector(".backups-status")?.textContent || null } : null; }),
  backupsOpen: (page: Page) => page.evaluate(() => !!document.querySelector(".backups")),
  help: (page: Page) => page.evaluate(() => ({ help: !document.querySelector(".helppanel").hidden, menu: !!document.querySelector(".menu"), heading: document.querySelector(".helppanel h3")?.textContent })),
  helpOpen: (page: Page) => page.evaluate(() => ({ help: !document.querySelector(".helppanel").hidden })),
  gotoToolbarShown: (page: Page) => page.evaluate(() => { const b = document.querySelector(".goto-toolbar"); const marked = document.querySelector("#editor .landed"); const r = marked?.getBoundingClientRect(); return { open: !b.hidden, focused: document.activeElement?.classList.contains("ProseMirror") ? "editor" : document.activeElement?.id, ...(b.querySelector("label[for=stanzainput]") && !b.querySelector("label[for=stanzainput]").parentElement.hidden ? { stanzaBox: true } : {}), lineBox: !b.querySelector("label[for=lineinput]").parentElement.hidden, pageBox: !b.querySelector("label[for=pageinput]").parentElement.hidden, marked: marked ? (marked.dataset.line || marked.dataset.page || marked.className) : null, centred: r ? Math.round((r.top + r.bottom) / 2 - innerHeight / 2) : null, corner: "" }; }),
  gotoToolbar: async (page: Page) => ({ ...(await read.gotoToolbarShown(page)), corner: await said(page) }),
  caretRow: (page: Page) => page.evaluate(() => document.getSelection()?.anchorNode?.parentElement?.closest(".vrow")?.dataset.line),
  waitPairGrew: (page: Page, prev: string, ms: number, phrase: string) => waitState(page, { name: "pair row", ms, polling: "raf" }, ([root, prev, phrase]) => { const rows = [...document.querySelectorAll(root + " blockquote:has(.vrow) .vrow")]; const row = rows.find((r) => r.textContent.includes(phrase)); if (!row) return false; const cells = [...row.children], line = parseFloat(getComputedStyle(cells[0]).lineHeight); const wrapped = cells.some((x) => x.getBoundingClientRect().height > line * 1.5); return !wrapped && getComputedStyle(row).gridTemplateColumns.split(" ").map((w) => Math.round(parseFloat(w))).join(" ") !== prev; }, ["#editor", prev, phrase]),
  quotedPair: (page: Page) => page.evaluate((root) => { const quotes = document.querySelectorAll(root + " blockquote").length; const plain = document.querySelector(root + " blockquote:not(:has(.vrow))"), paired = document.querySelector(root + " blockquote:has(.vrow)"); if (!plain || !paired) return { quotes, plain: !!plain, paired: !!paired }; const textLeft = (el: Element) => { const t = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode(); if (!t) return null; const r = document.createRange(); r.selectNodeContents(t); return r.getBoundingClientRect().left; }; const left = textLeft(plain), cells = [...paired.querySelectorAll(".vrow > *")], c0 = cells[0]?.getBoundingClientRect(); if (left == null || !c0) return { quotes, text: left != null, cells: cells.length }; const line = parseFloat(getComputedStyle(cells[0]).lineHeight), a = plain.getBoundingClientRect(), b = paired.getBoundingClientRect(); return { quotes, indent: Math.round(c0.left - left), cols: getComputedStyle(cells[0].parentElement).gridTemplateColumns.split(" ").map((w) => Math.round(parseFloat(w))).join(" "), wrapped: cells.some((c) => c.getBoundingClientRect().height > line * 1.5), sameBox: Math.round(b.left - a.left) === 0 && Math.round(b.width - a.width) === 0 }; }, "#editor"),
  pastedReference: (page: Page) => page.evaluate(() => ({ link: document.querySelector("#editor a")?.getAttribute("href"), quote: document.querySelector("#editor blockquote")?.textContent })),
  highlightFollowed: (page: Page) => page.evaluate(() => { const s = document.getSelection(); const r = s.rangeCount && !s.isCollapsed ? s.getRangeAt(0).getBoundingClientRect() : null; return { selected: s.toString(), toolbar: document.querySelector(".fmt").classList.contains("show"), onScreen: !!r && r.top >= 0 && r.bottom <= innerHeight }; }),
  /* read until it holds still: a click on a place read while the page was settling landed beside the word, or on the heading (a held Tab's caret, a double click) */
  wordAt: async (page: Page, needle: string, len: number) => {
    const once = () => read.wordAtOnce(page, needle, len);
    let p = await once();
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
      const q = await once();
      if (q.x === p.x && q.y === p.y) return q;
      p = q;
    }
    return p;
  },
  wordAtOnce: async (page: Page, needle: string, len: number) => {
    const at = (await page.evaluate(inPageWith([[needle, 0], [needle, len]], pointOfText, textRange, textBlocks, landings, landing, pieceAt, closesNeedle))) as { x: number; y: number } | null;
    if (!at) throw notThere([needle, 0], [needle, len]);
    return at;
  },
  /* a 5 s timeout throws with what the page held instead of the toolbar, so a failed section says why */
  waitToolbar: (page: Page) => page.waitForFunction(() => document.querySelector(".fmt")?.classList.contains("show"), null, { timeout: 5000 }).then(() => {}, async () => { throw new Error("the toolbar did not show: " + JSON.stringify(await page.evaluate(() => { const s = document.getSelection(), ed = document.querySelector("#editor .ProseMirror, #page"); return { selected: s ? s.toString().length : null, inEditor: !!(s && s.anchorNode && ed && ed.contains(s.anchorNode)), active: String(document.activeElement?.className || document.activeElement?.tagName).slice(0, 30), focused: !!ed?.classList.contains("ProseMirror-focused"), now: Math.round(performance.now()), calls: window.__selCalls ?? [], writes: window.__muts ?? [] }; }))); }),
  toolbar: (page: Page) => page.evaluate(() => { const f = document.querySelector(".fmt"); const r = f.getBoundingClientRect(); return { show: f.classList.contains("show"), selected: document.getSelection().toString(), lit: [...f.querySelectorAll("button.on")].map((b) => b.title.split(" ")[0]), aboveSelection: document.getSelection().rangeCount ? r.bottom < document.getSelection().getRangeAt(0).getBoundingClientRect().top : null, focused: document.activeElement?.classList.contains("ProseMirror") ? "editor" : document.activeElement?.className.slice(0, 20), tag: !f.querySelector(".t").hidden }; }),
  textAroundLink: (page: Page, href: string) => page.evaluate((href) => { const a = document.querySelector("#editor a[href='" + href + "']"); return a && a.closest(".vrow, p, li, h1, h2, h3").textContent.slice(0, 40); }, href),
  caretBefore: (page: Page, needle: string) => landSelection(page, [[needle, 0], [needle, 0]], false),
  markdownMode: (page: Page, storedMd: string) => page.evaluate((storedMd) => { const ta = document.querySelector("textarea.markdown"); return { pill: !document.querySelector(".mode")?.hidden, focused: document.activeElement === ta, sameAsStore: ta.value === storedMd, caretAt: ta.value.slice(ta.selectionStart, ta.selectionStart + 12) }; }, storedMd),
  markdownBack: (page: Page) => page.evaluate(() => { const s = document.getSelection(); return { pill: !document.querySelector(".mode")?.hidden, text: document.querySelector("#editor .ProseMirror").textContent.includes("FOOD   food of love"), caretBefore: s.anchorNode?.textContent.slice(Math.max(0, s.anchorOffset - 6), s.anchorOffset), caretAfter: s.anchorNode?.textContent.slice(s.anchorOffset, s.anchorOffset + 8) }; }),
  goto: (page: Page) => page.evaluate(() => ({ open: document.querySelector(".page-goto")?.open, focused: document.activeElement?.getAttribute("aria-label"), selects: [...document.querySelectorAll(".page-goto select")].map((s) => s.getAttribute("aria-label") + "=" + (s.selectedOptions[0]?.disabled ? "—" : s.value) + " [" + [...s.options].map((o) => o.textContent).join("|") + "]") })),
  gotoOpen: (page: Page) => page.evaluate(() => document.querySelector(".page-goto")?.open),
  rowsClosed: (page: Page) => page.evaluate(() => ({ height: document.querySelector(".site-head").getBoundingClientRect().height, gotoOpen: document.querySelector(".page-goto")?.open, searchOpen: document.querySelector(".page-search")?.open })),
  tools: (page: Page) => page.evaluate(() => [...document.querySelectorAll(".site-tools .toolbtn")].filter((b) => !b.hidden).map((b) => b.textContent)),
  crumb: (page: Page) => page.evaluate(() => document.querySelector(".datelabel").textContent.replace(/\s+/g, " ").trim()),
  lastLink: (page: Page) => page.evaluate(() => { const a = [...document.querySelectorAll("#editor a")].pop(); return a && [a.textContent, a.getAttribute("href")]; }),
  tags: (page: Page) => page.evaluate(() => [...document.querySelectorAll(".tagbar a")].map((a) => a.textContent)),
  links: (page: Page) => page.evaluate(() => [...document.querySelectorAll("#editor a")].map((a) => a.getAttribute("href"))),
  waitLinkGone: (page: Page, href: string) => waitState(page, { name: "link", ms: 5000 }, (href) => window.__published("entry") === "2026-09-06" && !document.querySelector("#editor a[href='" + href + "']"), href),
  waitLink: (page: Page, href: string) => waitState(page, { name: "link", ms: 5000 }, (href) => document.querySelector("#editor a[href='" + href + "']"), href),
  listGaps: (page: Page) => page.evaluate(() => { const li = document.querySelectorAll("#editor ul > li"); const a = li[0].getBoundingClientRect(), b = li[li.length - 1].getBoundingClientRect(); const line = (el: Element) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const t = w.nextNode(); const r = document.createRange(); r.selectNodeContents(t); return r.getBoundingClientRect(); }; const l0 = line(li[0]), l1 = line(li[0].querySelector("li")); return { outerGapPastNestedList: +(b.top - a.bottom).toFixed(1), lineToNextLine: +(l1.top - l0.bottom).toFixed(1), line: +l0.height.toFixed(1) }; }),
  search: (page: Page) => page.evaluate(() => { const cls = (s: string) => (s || "").replace(/\s*svelte-\w+/g, ""); return { open: document.querySelector(".page-search")?.open, focused: cls(document.activeElement?.className), scope: document.querySelector(".page-search select")?.selectedOptions[0]?.textContent, options: [...document.querySelectorAll(".page-search option")].map((o) => o.textContent), rows: [...document.querySelectorAll(".search-results li")].map((li) => cls(li.className) + ": " + li.innerText.replace(/\s+/g, " ").trim()) }; }),
  searchOpen: (page: Page) => page.evaluate(() => document.querySelector(".page-search")?.open),
  selectionText: (page: Page) => page.evaluate(() => document.getSelection()?.toString()),
  pill: (page: Page) => page.evaluate(() => { const b = document.querySelector(".backup-paused"); const r = b.getBoundingClientRect(); return { text: b.textContent, hidden: b.hidden, display: getComputedStyle(b).display, right: innerWidth - r.right, bottom: innerHeight - r.bottom }; }),
  selectAll: (page: Page, sel: string) => placed(page, () => page.evaluate((sel) => { const v = document.querySelector(sel); const r = document.createRange(); r.selectNodeContents(v); const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); }, sel)),
  caretAfter: (page: Page, needle: string, offset: number) => landSelection(page, [[needle, offset], [needle, offset]], false),
  pasteText: (page: Page, text: string) => page.evaluate((text) => { const dt = new DataTransfer(); dt.setData("text/plain", text); document.querySelector("#editor .ProseMirror").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }, text),
  pastePng: (page: Page) => page.evaluate(async () => { const c = document.createElement("canvas"); c.width = 1600; c.height = 800; const x = c.getContext("2d"); x.fillStyle = "#c33"; x.fillRect(0, 0, 1600, 800); const blob = await new Promise<Blob>((r) => c.toBlob(r, "image/png")); const dt = new DataTransfer(); dt.items.add(new File([blob], "shot.png", { type: "image/png" })); document.querySelector("#editor .ProseMirror").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }),
  cornerAfter: saidAfterGesture,
  settle: (page: Page) => waitState(page, { name: "alert", ms: 5000 }, () => !document.querySelector(".alert.info.show, .alert.success.show")),
  waitSelection: (page: Page, text: string) => waitState(page, { name: "selection", ms: 5000, stood: () => page.evaluate(() => document.getSelection()?.toString()) }, (t) => document.getSelection()?.toString().toLowerCase() === t, text),
  waitEntryAndSelection: (page: Page, key: string, text: string) => waitState(page, { name: "entry", ms: 5000, stood: () => page.evaluate(() => [window.__published("entry"), document.getSelection()?.toString()]) }, ([k, t]) => window.__published("entry") === k && document.getSelection()?.toString() === t, [key, text]),
  waitImg: (page: Page) => waitState(page, { name: "picture", ms: 8000 }, () => document.querySelector("#editor img")),
  waitEntryNot: (page: Page, key: string) => waitState(page, { name: "entry", ms: 5000, stood: () => entry(page) }, (k) => window.__published("entry") !== k, key),
};
