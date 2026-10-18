/* A headless run is replayed only when something it reads has changed:
   the inputs' fingerprint is stamped when a run passes, and a later run
   whose inputs fingerprint the same is not played again */
import { createHash } from "node:crypto";

export interface Input { name: string; bytes: string | Uint8Array }

export function fingerprint(inputs: Input[]): string {
  const h = createHash("sha256");
  for (const { name, bytes } of [...inputs].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const b = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : bytes;
    h.update(name + "\u0000" + b.length + "\u0000");
    h.update(b);
  }
  return h.digest("hex");
}

/* approving makes a new approved copy, and a run of some steps is not the
   whole run: both always play */
export function mayReuse(stamp: string | null, fp: string, opts: { approve: boolean; steps: boolean }): boolean {
  return !opts.approve && !opts.steps && stamp === fp;
}
