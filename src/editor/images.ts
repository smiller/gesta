/* The image node view: a relative src — a sidecar's name, as the markdown
   wrote it — is resolved through the store to a blob URL, asynchronously,
   so the document keeps the path and the screen gets the picture. A data:
   or http(s) src is left to the browser. Decided 2026-09-07 with the
   store's rule that a picture is its bytes under its export path. */
import type { NodeViewConstructor } from "prosemirror-view";
import { RELATIVE_SRC } from "../store/names.ts";

export type ImageResolver = (src: string) => Promise<string | null>;
export function imageView(resolve: ImageResolver): NodeViewConstructor {
  return (node) => {
    const dom = document.createElement("img");
    dom.alt = String(node.attrs.alt);
    let url: string | null = null;
    const src = String(node.attrs.src);
    if (RELATIVE_SRC.test(src)) {
      dom.dataset.src = src;
      resolve(src).then((u) => { if (u) { url = u; dom.src = u; } else dom.dataset.missing = "1"; },
        () => { dom.dataset.missing = "1"; });
    } else dom.src = src;
    return {
      dom,
      destroy: () => { if (url) URL.revokeObjectURL(url); },
    };
  };
}
