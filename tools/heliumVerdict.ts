import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { mayReuse, approvalRefusal, failedRun } from "./heliumStamp.ts";
import { orderDifferences } from "./heliumOrder.ts";

export type Compared = { pass: true } | { pass: false; failed: string } | { pass: false; order: string[] } | { pass: false; differs: "new" | "changed" };
/* two runs failing alike read the same, so a run held to another fails
   on a failed run of its own (pin: heliumVerdict.test › a run held to
   another fails on a failed run) */
export function compared(received: string, baseline: string | null, held: boolean): Compared {
  if (held) {
    const failed = received.split("\n").find((l) => failedRun(l));
    if (failed !== undefined) return { pass: false, failed };
    const order = baseline === null ? ["(no approved copy)"] : orderDifferences(baseline, received);
    return order.length ? { pass: false, order } : { pass: true };
  }
  if (baseline === received) return { pass: true };
  return { pass: false, differs: baseline === null ? "new" : "changed" };
}

export interface Played { received: string; fp: string; steps: boolean; held: boolean }
/* a run's four files: its approved copy and its received copy under
   `expected`, its pass stamp and its played print under `stamps` */
export function ledger(at: { expected: string; stamps: string }) {
  const approved = (n: string) => join(at.expected, n + ".approved.txt"), received = (n: string) => join(at.expected, n + ".received.txt");
  const stamp = (n: string) => join(at.stamps, n + ".txt"), played = (n: string) => join(at.stamps, n + ".played.txt");
  const read = (p: string): string | null => (existsSync(p) ? readFileSync(p, "utf8") : null);
  const write = (p: string, text: string): void => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
  const remove = (p: string): void => rmSync(p, { force: true });
  return {
    approvedPath: approved, receivedPath: received,
    baseline: (n: string): string | null => read(approved(n)),
    received: (n: string): string | null => read(received(n)),
    plays(n: string, fp: string, steps: boolean): boolean {
      if (mayReuse(read(stamp(n)), fp, { steps })) return false;
      remove(stamp(n));
      remove(played(n));
      return true;
    },
    /* a run of some steps is never stamped nor noted as played, so it can
       be neither reused nor approved (pin: heliumVerdict.test › after a
       fail the received copy is kept) */
    after(n: string, run: Played, c: Compared): void {
      if (c.pass) { remove(received(n)); if (!run.steps) write(stamp(n), run.fp); return; }
      write(received(n), run.received);
      if (!run.steps && !run.held) write(played(n), run.fp);
    },
    refusal: (n: string, fp: string): string | null => approvalRefusal(read(received(n)), read(played(n)), fp),
    approve(n: string, fp: string): string {
      const text = read(received(n))!;
      write(approved(n), text);
      remove(received(n));
      remove(played(n));
      write(stamp(n), fp);
      return text;
    },
  };
}
