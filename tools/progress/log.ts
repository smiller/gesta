/* node tools/progress/log.ts <command> … — one event appended to the day's
   log, stamped with the time:
     begin                       the day's start: yesterday's open items carried in
     add <list> <title…>         [--parent ID]; prints the number it took
     start | stop | done | drop <id>   [--commits a,b] [--note text]
     move <id> <list>
   --at HH:MM for a time other than now, --approx for one not known exactly,
   --day YYYY-MM-DD for another day's log */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { replay, type Event, type List } from "./events.ts";

const LISTS: List[] = ["A", "S", "L", "B"];
const rootNumber = (id: string, list: List): number => { const m = new RegExp("^" + list + "(\\d+)$").exec(id); return m ? +m[1] : 0; };
const ids = (events: Event[]): string[] => events.flatMap((e) => (e.ev === "move" ? [e.id, e.to] : "id" in e ? [e.id] : []));
/* the list's next number, never one used before: the day's begin keeps the
   highest any earlier day reached */
function nextRoot(events: Event[], list: List): number {
  const begun = events.find((e) => e.ev === "begin");
  const kept = begun && begun.ev === "begin" ? begun.next[list] ?? 1 : 1;
  return Math.max(kept, ...ids(events).map((id) => rootNumber(id, list) + 1));
}
export function nextId(events: Event[], list: List, parent?: string): string {
  if (!parent) return list + nextRoot(events, list);
  const under = ids(events).filter((id) => id.startsWith(parent + ".") && !id.slice(parent.length + 1).includes("."));
  return parent + "." + (Math.max(0, ...under.map((id) => +id.slice(parent.length + 1))) + 1);
}
/* a new day's first events: what the last day left unstarted or in progress,
   carried in as its starting items, each list's next number kept */
export function beginning(last: Event[], at: string): Event[] {
  const next: Partial<Record<List, number>> = {};
  for (const l of LISTS) { const n = nextRoot(last, l); if (n > 1) next[l] = n; }
  const open = replay(last).filter((i) => i.status === "unstarted" || i.status === "in progress" || i.status === "paused");
  const carried = new Set(open.map((i) => i.id));
  const under = (p?: string) => (p && carried.has(p) ? { parent: p } : {});
  return [{ at, ev: "begin", next }, ...open.map((i): Event => ({ at, ev: "carry", id: i.id, list: i.list, title: i.title, ...under(i.parent) }))];
}

/* ---------- the command ---------- */
const DIR = "docs/progress";
const read = (day: string): Event[] => { const p = join(DIR, day + ".jsonl"); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Event) : []; };
const lastDay = (day: string): string | undefined => readdirSync(DIR).map((f) => f.replace(/\.jsonl$/, "")).filter((d) => d < day).sort().pop();
const pad = (n: number): string => String(n).padStart(2, "0");
const today = (d = new Date()): string => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const clock = (d = new Date()): string => pad(d.getHours()) + ":" + pad(d.getMinutes());
function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf("--" + name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, v === undefined || v.startsWith("--") ? 1 : 2);
  return v === undefined || v.startsWith("--") ? "" : v;
}
interface Asked { rest: string[]; base: { at: string; approx?: boolean }; events: Event[]; parent?: string; commits?: string; note?: string }
const noted = (a: Asked) => (a.note ? { note: a.note } : {});
const plain = (ev: "start" | "stop" | "drop") => (a: Asked): Event => ({ ...a.base, ev, id: a.rest[0], ...noted(a) });
const BUILT: Record<string, (a: Asked) => Event> = {
  add: (a) => { const list = a.rest[0] as List; return { ...a.base, ev: "add", id: nextId(a.events, list, a.parent), list, title: a.rest.slice(1).join(" "), ...(a.parent ? { parent: a.parent } : {}) }; },
  move: (a) => ({ ...a.base, ev: "move", id: a.rest[0], to: nextId(a.events, a.rest[1] as List), list: a.rest[1] as List }),
  done: (a) => ({ ...a.base, ev: "done", id: a.rest[0], ...(a.commits ? { commits: a.commits.split(",") } : {}), ...noted(a) }),
  start: plain("start"), stop: plain("stop"), drop: plain("drop"),
};
function commandLine(argv: string[]): { day: string; cmd: string; asked: Omit<Asked, "events"> } {
  const args = [...argv];
  const day = flag(args, "day") || today(), hm = flag(args, "at") || clock(), approx = flag(args, "approx") !== undefined;
  const parent = flag(args, "parent"), commits = flag(args, "commits"), note = flag(args, "note");
  const [cmd, ...rest] = args;
  return { day, cmd, asked: { rest, base: { at: day + "T" + hm, ...(approx ? { approx: true } : {}) }, parent, commits, note } };
}
function main(argv: string[]): void {
  const { day, cmd, asked } = commandLine(argv);
  mkdirSync(DIR, { recursive: true });
  /* begun twice, a day carried its items in twice */
  if (cmd === "begin" && read(day).some((e) => e.ev === "begin")) { console.error(day + " has begun already"); process.exit(1); }
  const before = lastDay(day), build = BUILT[cmd];
  const events = cmd === "begin" ? beginning(before ? read(before) : [], asked.base.at) : [build ? build({ ...asked, events: read(day) }) : null];
  if (events.some((e) => !e)) { console.error("unknown command: " + cmd); process.exit(1); }
  appendFileSync(join(DIR, day + ".jsonl"), events.map((e) => JSON.stringify(e) + "\n").join(""));
  for (const e of events) console.log(JSON.stringify(e));
}
if (import.meta.url === "file://" + process.argv[1]) main(process.argv.slice(2));
