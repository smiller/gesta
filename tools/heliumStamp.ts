/* A headless run is replayed only when something it reads has changed:
   the inputs' fingerprint is stamped when a run passes, and a later run
   whose inputs fingerprint the same is not played again */
import { createHash } from "node:crypto";
import { posix } from "node:path";

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
export const failedRun = (run: string): boolean => /^(SECTION FAILED|FRESH START FAILED|EXIT )/m.test(run);
export function approvalRefusal(received: string | null, playedOver: string | null, fp: string): string | null {
  if (received === null) return "no run to approve: play it, and read what differs";
  if (playedOver === null) return "that was not a whole run: play it without STEPS";
  if (playedOver !== fp) return "what the run reads has changed since it played: play it again";
  if (failedRun(received)) return "a section of that run failed: play it again";
  return null;
}

export const DRIVERS = ["tools/helium-corner.ts", "tools/helium-bridge.ts", "tools/helium-reader.ts", "tools/helium-approve.ts"];
/* the code a run reads: its drivers and every file they reach through
   their relative imports, src/ as well as tools/; a hand-kept list of src/
   files missed one reached only through another's import (pin:
   heliumStamp.test › what a run reads of the code) */
const RELATIVE = /(?:from|import)\s*\(?\s*"(\.{1,2}\/[^"]+\.ts)"/g;
/* a type-only import or export is stripped before the run: the file it
   names is never loaded (pin: heliumStamp.test › a type-only import is no
   code a run reads) */
const TYPE_ONLY = /\b(?:import|export)\s+type\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+)\s*from\s*"[^"]+"/g;
export function readByDrivers(drivers: string[], read: (path: string) => string | null): string[] {
  const seen = new Set<string>(), todo = [...drivers];
  for (let f = todo.pop(); f !== undefined; f = todo.pop()) {
    const text = seen.has(f) ? null : read(f);
    if (text === null) continue;
    seen.add(f);
    for (const m of text.replace(TYPE_ONLY, "").matchAll(RELATIVE)) todo.push(posix.normalize(posix.join(posix.dirname(f), m[1])));
  }
  return [...seen].sort();
}
