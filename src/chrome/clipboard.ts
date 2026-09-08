/* The clipboard writer, ported 2026-09-07 from the current app's
   writeClipboard (11-copy-a-code-block…js): the async API first, and on
   its refusal an off-screen textarea plus execCommand("copy") that gives
   back the selection AND the focus it displaced. Three rungs, the MIDDLE
   one lossy by construction: a ClipboardItem carries both flavours, plain
   writeText only one, the textarea both again by taking the copy event
   over. Both engines have ClipboardItem from file:// (measured 2026-07-31
   in the current app), so a two-flavour write never stands on the lossy
   rung; a plain string lands on it by design. DOM-facing: the fallback is
   measured in Helium, not under node. Resolves whether the copy landed. */
export interface Flavours { text: string; html: string }
export function writeClipboard(payload: string | Flavours): Promise<boolean> {
  const { text, html } = typeof payload === "string" ? { text: payload, html: "" } : payload;
  function fallback(): boolean {
    const sel = window.getSelection();
    const keep = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    /* read HERE, not when the write began: on the async arm this runs at
       rejection time, and what to restore is what the textarea displaces */
    const owner = document.activeElement as HTMLElement | null;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    /* armed for exactly ONE synchronous execCommand and removed in the
       finally rather than on the event, which may never arrive; both
       flavours first, preventDefault LAST, so a throwing setData leaves the
       engine's own copy of the text standing */
    const twoFlavours = (e: ClipboardEvent): void => {
      e.clipboardData!.setData("text/plain", text);
      e.clipboardData!.setData("text/html", html);
      e.preventDefault();
    };
    let ok = false;
    if (html) document.addEventListener("copy", twoFlavours);
    try { ok = document.execCommand("copy"); }
    catch { /* refused: ok stays false */ }
    finally { if (html) document.removeEventListener("copy", twoFlavours); }
    ta.remove();
    /* focus and caret come back TOGETHER or not at all: focusing an editing
       host with no selection makes the engine invent a caret at offset 0
       (measured in both engines), and the next keystroke would land at the
       top of the entry. Focus first, since it can move the caret. */
    if (keep && sel) {
      if (owner && owner !== document.body) owner.focus();
      sel.removeAllRanges();
      sel.addRange(keep);
    }
    return ok;
  }
  const cb = navigator.clipboard;
  if (html && typeof ClipboardItem !== "undefined" && cb?.write) {
    return cb.write([new ClipboardItem({
      "text/plain": new Blob([text], { type: "text/plain" }),
      "text/html": new Blob([html], { type: "text/html" }),
    })]).then(() => true, fallback);
  }
  if (cb?.writeText) return cb.writeText(text).then(() => true, fallback);
  return Promise.resolve(fallback());
}
/* the ledger's shape: a promise that REJECTS when nothing landed */
export function copyText(text: string): Promise<void> {
  return writeClipboard(text).then((ok) => { if (!ok) throw new Error("the clipboard refused the write"); });
}
