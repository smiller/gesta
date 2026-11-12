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

/* a run of some steps is not the whole run: it always plays */
export function mayReuse(stamp: string | null, fp: string, opts: { steps: boolean }): boolean {
  return !opts.steps && stamp === fp;
}
/* APPROVING TAKES THE RUN THAT WAS READ, it does not play again: a replay wrote
   whatever it met, a flaky section's timeout included, over a run read and good */
export function approvalRefusal(received: string | null, playedOver: string | null, fp: string): string | null {
  if (received === null) return "no run to approve: play it, and read what differs";
  if (playedOver === null) return "that was not a whole run: play it without STEPS";
  if (playedOver !== fp) return "what the run reads has changed since it played: play it again";
  if (/^SECTION FAILED|^EXIT /m.test(received)) return "a section of that run failed: play it again";
  return null;
}

/* the tools/ files a run reads: the drivers and their types, the steps, the adapters */
export const stamped = (path: string): boolean => /^tools\/(helium[^/]*\.ts|steps\/[^/]+\.ts|adapters\/[^/]+\.ts)$/.test(path);
