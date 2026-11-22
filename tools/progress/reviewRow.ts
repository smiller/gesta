/* node tools/progress/reviewRow.ts < a hook's input. It never blocks the
   prompt: whatever goes wrong, it exits 0 */
import { mkdirSync, readFileSync } from "node:fs";
import { replay, type Event, type Item } from "./events.ts";
import { nextId, opened, logged } from "./log.ts";
import { DIR, dayEvents, lastDayEvents, today, clock } from "./day.ts";

export interface Typed { name: string; args: string }
const field = (o: Record<string, unknown>, k: string): string | null => (typeof o[k] === "string" ? (o[k] as string) : null);
const bare = (name: string): string => name.slice(name.lastIndexOf(":") + 1);
/* an expansion gives the command's name and arguments, a submitted prompt
   only its line */
export function typed(input: unknown): Typed | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>, name = field(o, "command_name");
  if (name) return { name: bare(name), args: (field(o, "command_args") ?? "").trim() };
  const m = /^\/([\w:-]+)[ \t]*(.*)/.exec((field(o, "prompt") ?? "").trim());
  return m ? { name: bare(m[1]), args: m[2].trim() } : null;
}

const LEVELS = new Set(["low", "medium", "high", "xhigh", "max", "ultra"]);
const REVIEW = "The batch review: ";
const RUN = "The architecture run over the batch's files";
function reviewTitle(args: string): string {
  const words = args.split(/\s+/).filter((w) => w && !w.startsWith("--"));
  const level = words[0] && LEVELS.has(words[0]) ? words.shift()! : null;
  return REVIEW + "/code-review" + (level ? " at " + level.toUpperCase() : "") + " over " + (words.join(" ") || "the current diff");
}
const hm = (at: string): string => at.slice(11, 16);
const asked = (c: Typed, at: string, why: string, done: string): string =>
  "Asked: /" + c.name + (c.args ? " " + c.args : "") + ", typed at " + hm(at) + ". Why: " + why + " Done when: " + done;
const REVIEW_WHY = "CLAUDE.md's batch review, owed when a batch touches a DOM seam or closes a phase.";
const REVIEW_DONE = "its findings land in one fix commit and its cost is recorded in the plan.";
const RUN_WHY = "CLAUDE.md's architecture run, beside each batch's review.";
const RUN_DONE = "every candidate built or refused as an ADR, its cost recorded.";

function started(it: Item, at: string): Event[] {
  return it.status === "unstarted" ? [{ at, ev: "start", id: it.id }] : [];
}
interface Row { title: string; detail: string; parent?: string }
function added(events: Event[], at: string, { title, detail, parent }: Row): Event[] {
  const id = nextId(events, "A", parent);
  return [{ at, ev: "add", id, list: "A", title, ...(parent ? { parent } : {}), detail }, { at, ev: "start", id }];
}
function reviewRow(c: Typed, events: Event[], at: string): Event[] {
  const title = reviewTitle(c.args), items = replay(events);
  const open = items.find((i) => i.title === title && i.status !== "done" && i.status !== "dropped");
  return open ? started(open, at) : added(events, at, { title, detail: asked(c, at, REVIEW_WHY, REVIEW_DONE) });
}
function runRow(c: Typed, events: Event[], at: string): Event[] {
  const items = replay(events);
  const review = items.filter((i) => i.list === "A" && i.title.startsWith(REVIEW)).pop();
  const waiting = review && items.find((i) => i.parent === review.id && i.title === RUN && i.status === "unstarted");
  return waiting ? started(waiting, at) : added(events, at, { title: RUN, detail: asked(c, at, RUN_WHY, RUN_DONE), parent: review?.id });
}
const ROWS: Record<string, (c: Typed, events: Event[], at: string) => Event[]> = {
  "code-review": reviewRow,
  "improve-codebase-architecture": runRow,
};
export const rowEvents = (c: Typed, events: Event[], at: string): Event[] => ROWS[c.name]?.(c, events, at) ?? [];

function main(): void {
  const c = typed(JSON.parse(readFileSync(0, "utf8") || "null"));
  if (!c || !ROWS[c.name]) return;
  mkdirSync(DIR, { recursive: true });
  const day = today(), at = day + "T" + clock(), logs = dayEvents(day);
  const owed = opened(logs, () => lastDayEvents(day), at);
  const rows = rowEvents(c, [...logs, ...owed], at);
  if (!rows.length) return;
  const out = logged(day, [...owed, ...rows]);
  console.log("progress rows written for /" + c.name + ":");
  for (const l of "refused" in out ? ["refused: " + out.refused] : out.lines) console.log(l);
}
if (import.meta.url === "file://" + process.argv[1]) {
  try { main(); } catch (e) { console.error("reviewRow: " + (e as Error).message); }
}
