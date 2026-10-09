import { flattenText } from "../model/flatten.ts";
import { parseMarkdown } from "../model/parse.ts";
import { pastedImageFile } from "./images.ts";
import { sourceTab } from "./sourceKeys.ts";
import { wordCount, wordsOf } from "./format.ts";
import type { Surface, ReplacePort } from "./surface.ts";

export interface SourceOptions {
  onChange: () => void;
  onPasteFile: (file: File) => void;
  onRefuse: (why: string) => void;
}

const MIRROR = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "wordSpacing", "tabSize", "padding", "borderWidth", "borderStyle", "boxSizing", "overflowWrap", "wordBreak"] as const;
const mirror = (from: HTMLElement, to: HTMLElement): void => { const cs = getComputedStyle(from); for (const p of MIRROR) to.style[p] = cs[p]; };

export function sourceView(mount: HTMLElement, md: string, opts: SourceOptions): Surface {
  const ta = document.createElement("textarea");
  ta.className = "source";
  ta.spellcheck = false;
  ta.value = md;
  ta.addEventListener("input", () => opts.onChange());
  ta.addEventListener("paste", (e) => { const f = pastedImageFile(e.clipboardData); if (f) { e.preventDefault(); opts.onPasteFile(f); } });
  ta.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || ta.readOnly) return;
    if (e.repeat && ta.selectionStart !== ta.selectionEnd) { e.preventDefault(); return; }
    const r = sourceTab(ta.value, ta.selectionStart, ta.selectionEnd, e.shiftKey);
    if (r === null) return;
    e.preventDefault();
    if ("refuse" in r) { if (!e.repeat) opts.onRefuse(r.refuse); return; }
    ta.value = r.value;
    ta.setSelectionRange(r.start, r.end);
    ta.dispatchEvent(new Event("input"));
  });
  mount.appendChild(ta);
  const marks = document.createElement("div");
  marks.className = "source-marks";
  marks.hidden = true;
  mount.insertBefore(marks, ta);
  /* where a character of the textarea stands on screen, measured on a
     hidden twin that wraps as it does: a textarea reports no geometry for
     its text. Built once per question, removed with done(). */
  function twin(): { topOf(i: number): number; indexAt(y: number): number; done(): void } {
    const el = document.createElement("div");
    mirror(ta, el);
    Object.assign(el.style, { position: "absolute", visibility: "hidden", top: "0", left: "-9999px", whiteSpace: "pre-wrap", width: ta.getBoundingClientRect().width + "px" });
    const text = el.appendChild(document.createTextNode(ta.value + "​"));
    document.body.appendChild(el);
    const range = document.createRange();
    const origin = ta.getBoundingClientRect().top - el.getBoundingClientRect().top - ta.scrollTop;
    const topOf = (i: number): number => {
      range.setStart(text, Math.min(i, ta.value.length)); range.setEnd(text, Math.min(i, ta.value.length) + 1);
      const r = range.getClientRects()[0] || range.getBoundingClientRect();
      return origin + r.top;
    };
    const indexAt = (y: number): number => {
      let lo = 0, hi = ta.value.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (topOf(mid) < y - 1) lo = mid + 1; else hi = mid; }
      return lo;
    };
    return { topOf, indexAt, done: () => el.remove() };
  }
  let shown: { hits: number[]; len: number; now: number } | null = null;
  function paint(): void {
    if (!shown) { marks.hidden = true; marks.replaceChildren(); return; }
    mirror(ta, marks);
    Object.assign(marks.style, { top: ta.offsetTop + "px", left: ta.offsetLeft + "px", width: ta.offsetWidth + "px" });
    const v = ta.value, out: Node[] = [];
    let from = 0;
    shown.hits.forEach((h, k) => {
      out.push(document.createTextNode(v.slice(from, h)));
      const m = document.createElement("mark");
      if (k === shown!.now) m.className = "now";
      m.textContent = v.slice(h, h + shown!.len);
      out.push(m);
      from = h + shown!.len;
    });
    out.push(document.createTextNode(v.slice(from) + "\u200b"));
    marks.replaceChildren(...out);
    marks.hidden = false;
  }
  const repaint = (): void => { if (shown) paint(); };
  window.addEventListener("resize", repaint);
  /* a textarea paints no selection while the cursor is in the bar: the
     current match is drawn on a layer behind the text instead
     (pin: replace › *-* typed into Find) */
  const replace: ReplacePort = {
    text: () => ta.value,
    start: (under) => {
      const t = twin(), top = t.topOf(ta.selectionStart);
      const seen = top >= under && top <= document.documentElement.clientHeight;
      const i = seen ? ta.selectionStart : t.indexAt(under);
      t.done();
      return i;
    },
    show: (hits, len, now, under) => {
      shown = { hits, len, now };
      paint();
      if (now < 0) return;
      ta.setSelectionRange(hits[now], hits[now] + len);
      const top = marks.querySelector("mark.now")!.getBoundingClientRect().top;
      const lh = parseFloat(getComputedStyle(ta).lineHeight), foot = document.documentElement.clientHeight;
      if (top < under + lh || top > foot - 2 * lh) window.scrollBy(0, top - (under + (foot - under) / 2));
    },
    clear: () => { shown = null; paint(); },
    /* through the textarea's own editing, so ⌘Z in the text undoes it, a
       whole-text edit in one step (pin: replace › ⌘Z in the text) */
    edit: (from, to, text, caret) => {
      if (ta.readOnly) return;
      const back = document.activeElement as HTMLElement | null;
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(from, to);
      if (!document.execCommand("insertText", false, text)) { ta.setRangeText(text, from, to, "end"); ta.dispatchEvent(new Event("input")); }
      ta.setSelectionRange(caret, caret);
      back?.focus({ preventScroll: true });
    },
    watch: (fn) => { ta.addEventListener("input", fn); return () => ta.removeEventListener("input", fn); },
    focus: () => ta.focus({ preventScroll: true }),
    place: (pos) => { const at = Math.min(pos, ta.value.length); ta.setSelectionRange(at, at); ta.focus({ preventScroll: true }); },
  };
  const insertText = (text: string): void => {
    if (ta.readOnly) return;
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end");
    ta.focus();
    ta.dispatchEvent(new Event("input"));
  };
  return {
    source: true,
    md: () => ta.value,
    flat: () => flattenText(ta.value),
    caret: () => ta.selectionStart,
    /* reported seen always, the switch back jumped to a caret a reader had
       scrolled away from (pin: source view › ⌃⌘M back, still scrolled away) */
    caretSeen: () => {
      const t = twin(), top = t.topOf(ta.selectionStart);
      t.done();
      return top + parseFloat(getComputedStyle(ta).lineHeight) >= 0 && top <= document.documentElement.clientHeight;
    },
    topAt: (under) => { const t = twin(), i = t.indexAt(under); t.done(); return i; },
    lineStart: (pos) => { const t = twin(), i = t.indexAt(t.topOf(pos)); t.done(); return i; },
    placeAt: () => null,
    reveal: () => {},
    end: () => ta.value.length,
    scrollToPos: (i, under) => {
      const t = twin(), top = t.topOf(i);
      t.done();
      window.scrollTo(0, window.scrollY + top - under);
    },
    focus: () => { ta.focus({ preventScroll: true }); },
    lock: (on) => { ta.readOnly = on; },
    placeCaret: (pos, scroll) => {
      const at = pos ?? ta.value.length;
      /* the caret BEFORE the focus: a fresh textarea's selection sits at
         its end, and focusing scrolls that into view (pin: source view › ⌃⌘M from the top) */
      ta.setSelectionRange(at, at);
      ta.focus({ preventScroll: !scroll });
    },
    insertText,
    insertPicture: (name) => insertText("![](" + name + ")"),
    /* the markdown is parsed first, so syntax never counts as words and both
       views report one number (pin: source view › ⌃⌘W in the source view) */
    words: () => {
      const a = ta.selectionStart, b = ta.selectionEnd;
      const text = a === b ? ta.value : ta.value.slice(a, b);
      try { return wordCount(parseMarkdown(text), 0, 0); } catch { return wordsOf(text); }
    },
    replace,
    destroy: () => { window.removeEventListener("resize", repaint); marks.remove(); ta.remove(); },
  };
}
