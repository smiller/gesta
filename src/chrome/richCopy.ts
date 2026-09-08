/* The rich flavour: the HTML beside the markdown on the clipboard, so a
   card pasted into an email arrives as its coloured box, a footnote as
   its smaller ruled note, a paired canto with its two columns rather than
   interleaved. Ported 2026-09-08 from 12-block-clipboard.js and the
   staging in 24-copying-a-reference.js. Anything whose LOOK is
   class-driven CSS is written inline, read off the LIVE twin's computed
   style — nothing carries a stylesheet across a paste, and reading it
   off the element keeps the palette spelled once. A quote and a
   reference block are left unstyled on purpose: the one is semantic and
   the receiver's own rendering beats Gesta's ink fighting it, the other's
   whole identity is a ::before label that cannot be inlined. The block's
   break-out width is not swept: the grid carries the meaning, the pull
   is local decoration. A detached element's computed style is "" for
   every property, so a passage built from markdown is PARKED in the
   editing surface, out of flow, for the length of the sweep. */
import { DOMSerializer } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { parseMarkdown } from "../model/parse.ts";
import { citationAnchorHTML } from "../editor/reference.ts";
import { inlineBlockStyles } from "../editor/inlineStyles.ts";
export { inlineBlockStyles };

/* a live block's HTML with its look inlined and the caret-holders gone */
export function richBlockHtml(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  inlineBlockStyles(el, clone);
  return clone.outerHTML.replace(/​/g, "");
}
/* the reference's HTML: the citation line, then the quoted passage
   rendered from its markdown and swept while parked under the surface */
export function richReferenceHtml(surface: HTMLElement, url: string, label: string, passageMd: string): string {
  const doc = parseMarkdown(passageMd);
  const frag = DOMSerializer.fromSchema(schema).serializeFragment(doc.content);
  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  stage.style.cssText = "position:absolute;left:-9999px;top:0;width:" + surface.clientWidth + "px";
  try {
    stage.appendChild(frag);
    surface.appendChild(stage);
    const blocks = Array.from(stage.children).map((b) => richBlockHtml(b)).join("");
    return "<p>" + citationAnchorHTML(url, label) + ":</p>" + blocks;
  } finally { stage.remove(); }
}
