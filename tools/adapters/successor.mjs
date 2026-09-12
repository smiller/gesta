// The successor's adapter for the shared headless steps (helium-steps.mjs):
// where the page is, how it is seeded, and how each thing on its screen is
// read. The writer's adapter (writer.mjs) answers the same questions over
// the current app, so one step list drives both and the two outputs diff.
// Split out of helium-corner.mjs 2026-09-12.
import { resolve } from "node:path";
import { tmpdir } from "node:os";
export const name = "successor";
/* under the system temp, not tools/out: a profile under Dropbox is held by
   the sync and by the exiting browser, and its delete failed one run in
   three (measured 2026-09-12) */
export const profile = resolve(tmpdir(), "gesta-helium-corner-profile");
const PAGE = "file://" + resolve("dist/index.html");
export const url = (hash, query = "") => PAGE + (query ? "?" + query : "") + "#" + hash;
/* the seeds are written by the page itself under ?store=seed (main.ts) */
export async function launch(page, seeds) {
  await page.goto(url("page/Horace", "store=seed"));
  await page.waitForFunction(() => document.documentElement.dataset.probe?.includes("all;"), null, { timeout: 15000 });
  return page.evaluate(() => document.documentElement.dataset.probe);
}
export const entry = (page) => page.evaluate(() => document.documentElement.dataset.entry);
export const waitEntry = (page, key, ms = 15000) => page.waitForFunction((k) => document.documentElement.dataset.entry === k, key, { timeout: ms });
export const waitWarm = (page) => page.waitForFunction(() => document.documentElement.dataset.probe?.includes("all;"), null, { timeout: 15000 });
/* the markdown the store holds, read straight from IndexedDB after the
   save's debounce */
export const stored = async (page, which) => { await page.waitForTimeout(800); return page.evaluate((which) => new Promise((res, rej) => { const key = which || document.documentElement.dataset.entry; const r = indexedDB.open("gesta.entries"); r.onerror = () => rej(r.error); r.onsuccess = () => { const db = r.result; const g = db.transaction("entries").objectStore("entries").get(key); g.onsuccess = () => { db.close(); res(g.result?.md ?? null); }; g.onerror = () => { db.close(); rej(g.error); }; }; }), which); };
export const act = {
  create: async (page) => { await page.keyboard.press("Control+Meta+n"); },
  createOnLeaf: async (page) => { await page.keyboard.press("Control+Meta+n"); await page.waitForTimeout(100); return null; },
};
export const sel = {
  editor: "#editor .ProseMirror", editorFirst: "#editor .ProseMirror > :first-child",
  pagesOpener: ".opener[title='Open the pages list']", booksOpener: ".opener[title='List the authors on the bookshelf']",
  panelRow: (name) => ".pages a[title='" + name + "']",
  corner: ".saved.show", backupsButton: ".toolbtn[title='Automatic folder backups']",
  source: "textarea.source", copybtn: ".copybtn", fmtB: ".fmt .b", fmtTag: ".fmt .t",
  shortcutsEditor: ".shortcuts .shortcut-edit", shortcutsSave: ".shortcuts .editbox .toolbtn", shortcutsInput: ".shortcuts .search-input",
  bookmarkKey: ".bookmarks .bookmark-setalias", bookmarkDel: ".bookmarks .bookmark-del",
  tagbarLink: (href) => ".tagbar a[href='" + href + "']", renameButton: ".toolbtn[title=\"Rename this entry's tag\"]", deleteButton: ".toolbtn[title='Delete this tagged entry']",
  gotoDay: ".page-goto select[aria-label='Day']", gotoDestination: ".page-goto select[aria-label='Destination']", searchScope: ".page-search select", searchRows: ".search-results li",
  editorLink: (href) => "#editor a[href='" + href + "']", editorImg: "#editor img", editorPre: "#editor pre", editorVerse: "#editor .verse", editorCard: "#editor .card-light-blue", editorCell: "#editor .vpair .vcell",
};
export const screen = (page) => page.evaluate(() => {
  const q = (sel) => document.querySelector(sel);
  const sel = document.getSelection();
  const selected = q(".ProseMirror-selectednode") ? "node" : sel && !sel.isCollapsed ? sel.toString().length + " chars" : "none";
  const panel = [["pages", ".pages"], ["help", ".helppanel:not(.bookmarks):not(.backups)"], ["bookmarks", ".bookmarks"], ["backups", ".backups"], ["shortcuts", ".shortcuts"]].find(([, c]) => q(c) && !q(c).hidden);
  const rows = [".page-goto", ".page-search", ".page-lines"].filter((c) => q(c)?.open && !q(c).hidden).map((c) => c.slice(6));
  if (q(".linebar") && !q(".linebar").hidden) rows.push("linebar");
  const corner = q(".saved.show")?.textContent || "";
  return [document.documentElement.dataset.entry, "sel " + selected, "bar " + (q(".fmt")?.classList.contains("show") ? "on" : "off"),
    "panel " + (panel ? panel[0] : "none"), "rows " + (rows.length ? rows.join("+") : "none"),
    q(".mode") && !q(".mode").hidden ? "source" : "rendered", "corner " + JSON.stringify(corner)].join(" · ");
});
export const read = {
  corner: (page) => page.evaluate(() => { const s = document.querySelector(".saved"); return { text: s?.textContent, show: s?.classList.contains("show"), opacity: getComputedStyle(s).opacity, pill: document.querySelector(".backup-paused")?.hidden }; }),
  cornerText: (page) => page.evaluate(() => document.querySelector(".saved.show")?.textContent),
  cornerTextOrEmpty: (page) => page.evaluate(() => document.querySelector(".saved.show")?.textContent || ""),
  masthead: (page) => page.evaluate(() => { const h = document.querySelector(".site-head"); const r = h.getBoundingClientRect(); return { crumb: document.querySelector(".datelabel")?.textContent.replace(/\s+/g, " ").trim(), title: document.querySelector(".page-title")?.textContent, titleHidden: document.querySelector(".page-title")?.hidden, lines: !document.querySelector(".page-lines")?.hidden, today: !document.querySelector(".toolbtn[title='Go to today']")?.hidden, backups: document.querySelector(".toolbtn[title='Automatic folder backups']")?.textContent, height: r.height, sticky: getComputedStyle(h).position }; }),
  panel: (page) => page.evaluate(() => { const p = document.querySelector(".pages"); return p ? { rows: [...p.querySelectorAll("a")].map((a) => a.textContent), create: p.querySelector(".panel-new")?.textContent, empty: p.querySelector(".panel-empty")?.textContent } : null; }),
  afterModClick: (page) => page.evaluate(() => ({ stayed: document.documentElement.dataset.entry, nodeSelected: !!document.querySelector(".ProseMirror-selectednode"), selection: document.getSelection()?.toString().slice(0, 20), bar: document.querySelector(".fmt")?.classList.contains("show") })),
  pairs: (page) => page.evaluate(() => document.querySelectorAll("#editor .vpair").length),
  refusedFence: (page) => page.evaluate(() => ({ corner: document.querySelector(".saved.show")?.textContent, paragraphs: document.querySelectorAll("#editor p").length })),
  cleanSwitch: (page) => page.evaluate(() => ({ corner: document.querySelector(".saved.show")?.textContent || "", verse: !!document.querySelector("#editor .verse") })),
  linesRow: (page) => page.evaluate(() => ({ open: document.querySelector(".page-lines").open, focused: document.activeElement?.getAttribute("aria-label"), options: [...document.querySelectorAll(".page-lines option")].map((o) => o.textContent) })),
  linesRowOpen: (page) => page.evaluate(() => ({ open: document.querySelector(".page-lines").open })),
  clipboardReference: (page) => page.evaluate(async () => { const corner = document.querySelector(".saved.show")?.textContent; try { const items = await navigator.clipboard.read(); const types = items[0].types; const html = types.includes("text/html") ? await (await items[0].getType("text/html")).text() : ""; const text = types.includes("text/plain") ? await (await items[0].getType("text/plain")).text() : ""; return { corner, types, textHead: text.slice(0, 40), passage: text.split("\n\n").slice(1).join("\n\n").slice(0, 60), htmlHead: html.replace(/<meta[^>]*>/g, "").replace(/href="[^"]*"/, 'href="…"').slice(0, 160), anchor: /<a href="[^"]*#page\/Horace\?h=/.test(html), em: html.includes("<em>Horace</em>"), grid: /grid-template-columns:/.test(html) }; } catch (e) { return { corner, clipboard: String(e) }; } }),
  codeBlock: (page) => page.evaluate(() => { const pre = document.querySelector("#editor pre"); return { lang: pre.dataset.lang, label: getComputedStyle(pre, "::after").content, tokens: [...pre.querySelectorAll("[class^=tok-]")].map((t) => t.className + ":" + t.textContent) }; }),
  copyHover: (page) => page.evaluate(() => { const b = document.querySelector(".copybtn"); const pre = document.querySelector("#editor pre").getBoundingClientRect(); const r = b.getBoundingClientRect(); return { show: b.classList.contains("show"), title: b.title, insideBlock: r.top >= pre.top && r.right <= pre.right + 1, labelHidden: getComputedStyle(document.querySelector("#editor pre"), "::after").opacity }; }),
  copyLabel: (page) => page.evaluate(() => document.querySelector(".copybtn").textContent),
  clipboardCard: (page) => page.evaluate(async () => { try { const items = await navigator.clipboard.read(); const html = items[0].types.includes("text/html") ? await (await items[0].getType("text/html")).text() : ""; const bg = /background-color:\s*([^;"]+)/.exec(html); return { bg: bg && bg[1], grid: /grid-template-columns:/.test(html), card: /class="card-light-blue"/.test(html), raw: /background-color/.test(html) ? undefined : html.replace(/<meta[^>]*>/g, "").slice(0, 120) }; } catch (e) { return { clipboard: String(e) }; } }),
  cardLive: (page) => page.evaluate(() => getComputedStyle(document.querySelector("#editor .card-light-blue")).backgroundColor),
  cardsAndPairs: (page) => page.evaluate(() => ({ cards: document.querySelectorAll("#editor .card-light-blue").length, pairs: document.querySelectorAll("#editor .vpair").length })),
  picture: (page) => page.evaluate(() => { const img = document.querySelector("#editor img"); return { src: img.getAttribute("src")?.slice(0, 5), width: img.naturalWidth, height: img.naturalHeight, last: document.querySelector("#editor .ProseMirror").lastElementChild?.tagName }; }),
  shortcuts: (page) => page.evaluate(() => { const c = document.querySelector(".shortcuts"); return c ? { rows: [...c.querySelectorAll("li")].map((li) => li.textContent.trim()), editor: !!c.querySelector(".shortcut-edit"), focused: document.activeElement?.className.split(" ")[0] } : null; }),
  editorTextHead: (page) => page.evaluate(() => document.querySelector("#editor .ProseMirror").textContent.slice(0, 30)),
  bookmarks: (page) => page.evaluate(() => { const c = document.querySelector(".bookmarks"); return c ? { rows: [...c.querySelectorAll("li")].map((li) => li.innerText.replace(/\s+/g, " ").trim().slice(0, 40)), foot: c.querySelector(".bookmarks-add")?.textContent.replace(/\s+/g, " ").trim(), focused: document.activeElement?.className.split(" ")[0] } : null; }),
  bookmarksLit: (page) => page.evaluate(() => [...document.querySelectorAll(".bookmarks li.bookmark-typing")].length),
  backups: (page) => page.evaluate(() => { const c = document.querySelector(".backups"); return c ? { buttons: [...c.querySelectorAll("button")].map((b) => b.textContent), status: c.querySelector(".backups-status")?.textContent || null } : null; }),
  backupsOpen: (page) => page.evaluate(() => !!document.querySelector(".backups")),
  help: (page) => page.evaluate(() => ({ help: !document.querySelector(".helppanel").hidden, pages: !!document.querySelector(".pages"), heading: document.querySelector(".helppanel h3")?.textContent })),
  helpOpen: (page) => page.evaluate(() => ({ help: !document.querySelector(".helppanel").hidden })),
  linebar: (page) => page.evaluate(() => { const b = document.querySelector(".linebar"); const marked = document.querySelector("#editor .landed"); const r = marked?.getBoundingClientRect(); return { open: !b.hidden, focused: document.activeElement?.classList.contains("ProseMirror") ? "editor" : document.activeElement?.id, lineBox: !b.querySelector("label[for=lineinput]").parentElement.hidden, pageBox: !b.querySelector("label[for=folioinput]").parentElement.hidden, marked: marked ? (marked.dataset.line || marked.dataset.folio || marked.className) : null, centred: r ? Math.round((r.top + r.bottom) / 2 - innerHeight / 2) : null, corner: document.querySelector(".saved.show")?.textContent || "" }; }),
  caretRow: (page) => page.evaluate(() => document.getSelection()?.anchorNode?.parentElement?.closest(".vrow")?.dataset.line),
  pastedReference: (page) => page.evaluate(() => ({ link: document.querySelector("#editor a")?.getAttribute("href"), quote: document.querySelector("#editor blockquote")?.textContent })),
  highlightFollowed: (page) => page.evaluate(() => { const s = document.getSelection(); const r = s.rangeCount && !s.isCollapsed ? s.getRangeAt(0).getBoundingClientRect() : null; return { selected: s.toString(), bar: document.querySelector(".fmt").classList.contains("show"), onScreen: !!r && r.top >= 0 && r.bottom <= innerHeight }; }),
  wordAt: (page, needle, len) => page.evaluate(([needle, len]) => { const w = document.createTreeWalker(document.querySelector("#editor .ProseMirror"), NodeFilter.SHOW_TEXT); let tn; while ((tn = w.nextNode())) if (tn.textContent.includes(needle)) break; const r = document.createRange(); r.setStart(tn, tn.textContent.indexOf(needle)); r.setEnd(tn, tn.textContent.indexOf(needle) + len); tn.parentElement.scrollIntoView({ block: "center" }); const b2 = r.getBoundingClientRect(); return { x: b2.left + b2.width / 2, y: b2.top + b2.height / 2 }; }, [needle, len]),
  waitBar: (page) => page.waitForFunction(() => document.querySelector(".fmt")?.classList.contains("show"), null, { timeout: 5000 }),
  bar: (page) => page.evaluate(() => { const f = document.querySelector(".fmt"); const r = f.getBoundingClientRect(); return { show: f.classList.contains("show"), selected: document.getSelection().toString(), lit: [...f.querySelectorAll("button.on")].map((b) => b.title.split(" ")[0]), aboveSelection: document.getSelection().rangeCount ? r.bottom < document.getSelection().getRangeAt(0).getBoundingClientRect().top : null, focused: document.activeElement?.classList.contains("ProseMirror") ? "editor" : document.activeElement?.className.slice(0, 20), tag: !f.querySelector(".t").hidden }; }),
  textAroundLink: (page, href) => page.evaluate((href) => { const a = document.querySelector("#editor a[href='" + href + "']"); return a && a.closest(".vrow, p, li, h1, h2, h3").textContent.slice(0, 40); }, href),
  caretBefore: (page, needle) => page.evaluate((needle) => { const w = document.createTreeWalker(document.querySelector("#editor .ProseMirror"), NodeFilter.SHOW_TEXT); let tn; while ((tn = w.nextNode())) if (tn.textContent.includes(needle)) break; const r = document.createRange(); r.setStart(tn, tn.textContent.indexOf(needle)); r.collapse(true); const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); }, needle),
  sourceView: (page, storedMd) => page.evaluate((storedMd) => { const ta = document.querySelector("textarea.source"); return { pill: !document.querySelector(".mode")?.hidden, focused: document.activeElement === ta, sameAsStore: ta.value === storedMd, caretAt: ta.value.slice(ta.selectionStart, ta.selectionStart + 12) }; }, storedMd),
  sourceBack: (page) => page.evaluate(() => { const s = document.getSelection(); return { pill: !document.querySelector(".mode")?.hidden, text: document.querySelector("#editor .ProseMirror").textContent.includes("FOOD   food of love"), caretBefore: s.anchorNode?.textContent.slice(Math.max(0, s.anchorOffset - 6), s.anchorOffset), caretAfter: s.anchorNode?.textContent.slice(s.anchorOffset, s.anchorOffset + 8) }; }),
  goto: (page) => page.evaluate(() => ({ open: document.querySelector(".page-goto")?.open, focused: document.activeElement?.getAttribute("aria-label"), selects: [...document.querySelectorAll(".page-goto select")].map((s) => s.getAttribute("aria-label") + "=" + (s.selectedOptions[0]?.disabled ? "—" : s.value) + " [" + [...s.options].map((o) => o.textContent).join("|") + "]") })),
  gotoOpen: (page) => page.evaluate(() => document.querySelector(".page-goto")?.open),
  rowsClosed: (page) => page.evaluate(() => ({ height: document.querySelector(".site-head").getBoundingClientRect().height, gotoOpen: document.querySelector(".page-goto")?.open, searchOpen: document.querySelector(".page-search")?.open })),
  tools: (page) => page.evaluate(() => [...document.querySelectorAll(".site-tools .toolbtn")].filter((b) => !b.hidden).map((b) => b.textContent)),
  crumb: (page) => page.evaluate(() => document.querySelector(".datelabel").textContent.replace(/\s+/g, " ").trim()),
  lastLink: (page) => page.evaluate(() => { const a = [...document.querySelectorAll("#editor a")].pop(); return a && [a.textContent, a.getAttribute("href")]; }),
  tags: (page) => page.evaluate(() => [...document.querySelectorAll(".tagbar a")].map((a) => a.textContent)),
  links: (page) => page.evaluate(() => [...document.querySelectorAll("#editor a")].map((a) => a.getAttribute("href"))),
  waitLinkGone: (page, href) => page.waitForFunction((href) => document.documentElement.dataset.entry === "2026-09-06" && !document.querySelector("#editor a[href='" + href + "']"), href, { timeout: 5000 }).catch(() => {}),
  waitLink: (page, href) => page.waitForFunction((href) => document.querySelector("#editor a[href='" + href + "']"), href, { timeout: 5000 }).catch(() => {}),
  listGaps: (page) => page.evaluate(() => { const li = document.querySelectorAll("#editor ul > li"); const a = li[0].getBoundingClientRect(), b = li[li.length - 1].getBoundingClientRect(); const line = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const t = w.nextNode(); const r = document.createRange(); r.selectNodeContents(t); return r.getBoundingClientRect(); }; const l0 = line(li[0]), l1 = line(li[0].querySelector("li")); return { outerGapPastNestedList: +(b.top - a.bottom).toFixed(1), lineToNextLine: +(l1.top - l0.bottom).toFixed(1), line: +l0.height.toFixed(1) }; }),
  search: (page) => page.evaluate(() => { const cls = (s) => (s || "").replace(/\s*svelte-\w+/g, ""); return { open: document.querySelector(".page-search")?.open, focused: cls(document.activeElement?.className), scope: document.querySelector(".page-search select")?.selectedOptions[0]?.textContent, options: [...document.querySelectorAll(".page-search option")].map((o) => o.textContent), rows: [...document.querySelectorAll(".search-results li")].map((li) => cls(li.className) + ": " + li.innerText.replace(/\s+/g, " ").trim()) }; }),
  searchOpen: (page) => page.evaluate(() => document.querySelector(".page-search")?.open),
  selectionText: (page) => page.evaluate(() => document.getSelection()?.toString()),
  pill: (page) => page.evaluate(() => { const b = document.querySelector(".backup-paused"); const r = b.getBoundingClientRect(); return { text: b.textContent, hidden: b.hidden, display: getComputedStyle(b).display, right: innerWidth - r.right, bottom: innerHeight - r.bottom }; }),
  selectAll: (page, sel) => page.evaluate((sel) => { const v = document.querySelector(sel); const r = document.createRange(); r.selectNodeContents(v); const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); }, sel),
  caretAfter: (page, needle, offset) => page.evaluate(([needle, offset]) => { const walker = document.createTreeWalker(document.querySelector("#editor .ProseMirror"), NodeFilter.SHOW_TEXT); let t; while ((t = walker.nextNode())) if (t.textContent.includes(needle)) break; const r = document.createRange(); r.setStart(t, t.textContent.indexOf(needle) + offset); r.collapse(true); const sel = document.getSelection(); sel.removeAllRanges(); sel.addRange(r); }, [needle, offset]),
  pasteText: (page, text) => page.evaluate((text) => { const dt = new DataTransfer(); dt.setData("text/plain", text); document.querySelector("#editor .ProseMirror").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }, text),
  pastePng: (page) => page.evaluate(async () => { const c = document.createElement("canvas"); c.width = 1600; c.height = 800; const x = c.getContext("2d"); x.fillStyle = "#c33"; x.fillRect(0, 0, 1600, 800); const blob = await new Promise((r) => c.toBlob(r, "image/png")); const dt = new DataTransfer(); dt.items.add(new File([blob], "shot.png", { type: "image/png" })); document.querySelector("#editor .ProseMirror").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }),
  waitCorner: (page, text, ms = 5000) => page.waitForFunction((t) => document.querySelector(".saved.show")?.textContent === t, text, { timeout: ms }).catch(() => {}),
  waitCornerMatch: (page, re) => page.waitForFunction((src) => new RegExp(src).test(document.querySelector(".saved.show")?.textContent || ""), re.source, { timeout: 5000 }).catch(() => {}),
  settle: (page) => page.waitForFunction(() => !document.querySelector(".saved.show"), null, { timeout: 5000 }).catch(() => {}),
  waitSelection: (page, text) => page.waitForFunction((t) => document.getSelection()?.toString().toLowerCase() === t, text, { timeout: 5000 }).catch(() => {}),
  waitEntryAndSelection: (page, key, text) => page.waitForFunction(([k, t]) => document.documentElement.dataset.entry === k && document.getSelection()?.toString() === t, [key, text], { timeout: 5000 }),
  waitImg: (page) => page.waitForFunction(() => document.querySelector("#editor img"), null, { timeout: 8000 }),
  waitSearchRows: (page) => page.waitForFunction(() => document.querySelectorAll(".search-results li").length > 0, null, { timeout: 15000 }),
  waitEntryNot: (page, key) => page.waitForFunction((k) => document.documentElement.dataset.entry !== k, key, { timeout: 5000 }).catch(() => {}),
};
