/* a relative src is resolved through the store to a blob URL, so the
   document keeps the path and the screen gets the picture (pin: picture › a
   picture pasted) */
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

/* decoded, downscaled to 1400 across, drawn on white (the jpeg fallback has
   no alpha) and recompressed as webp at 0.85. Rejects when the engine cannot
   decode the file. */
export const PASTE_MAX = 1400;
export function pastedPictureBytes(file: File): Promise<Uint8Array> {
  return createImageBitmap(file).then((bmp) => {
    let w = bmp.width, h = bmp.height;
    if (w > PASTE_MAX) { h = Math.round(h * PASTE_MAX / w); w = PASTE_MAX; }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no webp"))), "image/webp", 0.85));
  }).then((blob) => blob.arrayBuffer()).then((buf) => new Uint8Array(buf));
}
export function pastedImageFile(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const item of Array.from(data.items)) if (item.type && item.type.indexOf("image/") === 0) return item.getAsFile();
  return null;
}
