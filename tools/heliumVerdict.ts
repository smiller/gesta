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

/* today is pinned, not scrubbed: a scrub of today's key, its crumb label
   and its day number missed the day number until a verify on another day
   went red on it */
export function scrub(text: string): string {
  return text
    .replace(/"opacity":"[0-9.e-]+"/g, '"opacity":"[fading]"')
    /* the corner's text in the screen line is an info's clock against
       the tool's waits: the steps that care read the corner themselves */
    .replace(/· corner \\"(?:[^"\\]|\\.)*\\"/g, "· corner [whatever stood]")
    .replace(/file:\/\/\/[^"\\ ]*\/dist\/index\.html/g, "file:///[app]/index.html")
    /* a logged Error's frames are the minified build's line and column,
       moved by any change elsewhere in the bundle */
    .replace(/^ +at .*\n/gm, "");
}

export const READ_OTHERWISE = "section read otherwise — ";
/* each section a failed comparison read otherwise, a line of its own:
   the section's name alone heads every run's print, passed or not
   (pin: heliumVerdict.test › a run that differs names each section) */
export function readOtherwise(name: string, c: Compared, received: string, baseline: string | null): string[] {
  const sections = "order" in c ? c.order : "differs" in c && baseline !== null ? orderDifferences(baseline, received) : [];
  return sections.map((s) => name + ": " + READ_OTHERWISE + s);
}

/* order differs only where two plays of the same steps disagreed: a
   reading changed on purpose differs alike in both and leaves order ok.
   Both are played again, unchanged, to put the pair on record. Bridge,
   reader and a failed section have no second play to tell them by */
export function replayed(results: Record<string, string>, steps: boolean, asked: string[]): string[] {
  const both = ["corner", "order"];
  return !steps && results.order === "differs" && both.every((n) => asked.includes(n)) ? both : [];
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
    reusable: (n: string, fp: string, steps: boolean): boolean => mayReuse(read(stamp(n)), fp, { steps }),
    clear(n: string): void { remove(stamp(n)); remove(played(n)); },
    /* a run of some steps is never stamped nor noted as played, so it can
       be neither reused nor approved (pin: heliumVerdict.test › after a
       fail the received copy is kept) */
    after(n: string, run: Played, c: Compared): void {
      if (c.pass) { remove(received(n)); if (!run.steps) write(stamp(n), run.fp); return; }
      write(received(n), run.received);
      if (!run.steps && !run.held) write(played(n), run.fp);
    },
    refusal: (n: string, fp: string): string | null => approvalRefusal(read(received(n)), read(played(n)), fp),
    /* the stamp is taken after the approved copy is written, the copy being
       one of the run's inputs: taken before, the next run replayed whole
       (pin: heliumVerdict.test › a run is approved only when) */
    approve(n: string, stampAfter: () => string): string {
      const text = read(received(n))!;
      write(approved(n), text);
      remove(received(n));
      remove(played(n));
      write(stamp(n), stampAfter());
      return text;
    },
  };
}
