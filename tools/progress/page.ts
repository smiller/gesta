/* node tools/progress/page.ts <day> [--at HH:MM] — the day's page, or a
   snapshot of it at a time, written under tools/out/progress/ */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { replay, counts, type Event, type Item, type List, type Stamp, type Status, type Tally } from "./events.ts";

const LISTS: List[] = ["A", "S", "L", "B"];
const NAME: Record<List, string> = { A: "Architecture queue", S: "Side list", L: "For later", B: "Bigger questions" };
const CHIP: Record<Status, [string, string]> = {
  "unstarted": ["s-open", "unstarted"], "in progress": ["s-prog", "in progress"], "done": ["s-done", "done"],
  "done, spawned open": ["s-part", "done · spawned open"], "moved": ["s-moved", "moved"], "dropped": ["s-dropped", "dropped"],
};
const ROW: Record<Status, string> = { "unstarted": "unstarted", "in progress": "now", "done": "done", "done, spawned open": "part", "moved": "moved", "dropped": "dropped" };
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hm = (s?: Stamp): string => (s ? (s.approx ? "≈" : "") + s.at.slice(11, 16) : "—");
const lower = (l: List): string => NAME[l].toLowerCase();

interface Placed { item: Item; depth: number }
/* each list's items in their tree's order: a root, then what it spawned,
   depth first, every level in the order reported */
function trees(items: Item[]): Record<List, Placed[]> {
  const ids = new Set(items.map((i) => i.id));
  const children = (id: string): Item[] => items.filter((i) => i.parent === id);
  const walk = (it: Item, depth: number): Placed[] => [{ item: it, depth }, ...children(it.id).flatMap((c) => walk(c, depth + 1))];
  const out = { A: [], S: [], L: [], B: [] } as Record<List, Placed[]>;
  for (const root of items.filter((i) => !i.parent || !ids.has(i.parent))) out[root.list].push(...walk(root, 0));
  return out;
}
function chips(it: Item, items: Item[]): string {
  const [cls, text] = CHIP[it.status];
  const to = it.movedTo ? items.find((i) => i.id === it.movedTo) : undefined;
  const status = '<span class="chip ' + cls + '">' + text + (to ? " → " + lower(to.list) + " " + to.id : "") + "</span>";
  return status + (it.starting ? '<span class="chip s-start">starting item</span>' : "");
}
const rowClass = (it: Item, depth: number): string => [ROW[it.status], it.starting ? "sod" : "", depth ? "sub" : ""].filter(Boolean).join(" ");
const open = (s: Status): boolean => s === "unstarted" || s === "in progress";
/* reported (a carried item's before the day), started, ended */
const times = (it: Item): string[] => [it.reported ? hm(it.reported) : "earlier", hm(it.started), open(it.status) ? "—" : hm(it.ended)];
function label(it: Item): string {
  const from = it.movedFrom ? " (moved in from " + it.movedFrom + ")" : "";
  return esc(it.title) + from + (it.note ? " (" + esc(it.note) + ")" : "");
}
function row({ item: it, depth }: Placed, items: Item[]): string {
  const cells = times(it).map((t) => '<td class="t">' + t + "</td>").join("");
  return '<tr class="' + rowClass(it, depth) + '"' + (depth ? ' style="--d:' + depth + '"' : "") + '><td class="n">' + it.id + '</td><td><div class="item">' + chips(it, items) +
    '<span class="label">' + label(it) + "</span></div></td>" + cells + '<td class="c">' + it.commits.join(" ") + "</td></tr>";
}
const HEAD = '<thead><tr><th class="n">#</th><th>Item</th><th class="t">reported</th><th class="t">started</th><th class="t">ended</th><th>commit</th></tr></thead>';
function section(list: List, placed: Placed[], items: Item[]): string {
  if (!placed.length) return "";
  const starting = placed.filter((p) => p.item.starting && !p.depth).length;
  return "<section><h2>" + NAME[list] + (starting ? " — " + starting + " at the start" : "") + '</h2><div class="scroll"><table>' + HEAD + "<tbody>" +
    placed.map((p) => row(p, items)).join("") + "</tbody></table></div></section>";
}
function tallyLine(lead: string, t: Tally): string {
  const lists = LISTS.filter((l) => t.byList[l]).map((l) => t.byList[l] + " " + lower(l)).join(", ");
  const statuses = (Object.keys(CHIP) as Status[]).filter((s) => t.byStatus[s]).map((s) => '<span class="' + CHIP[s][0] + '">' + CHIP[s][1] + " <b>" + t.byStatus[s] + "</b></span>");
  return '<div class="tally"><span>' + lead + " <b>" + t.total + "</b>" + (lists ? ": " + lists : "") + "</span>" + statuses.join("") + "</div>";
}
const KEY = '<div class="key">' + (Object.keys(CHIP) as Status[]).map((s) => '<span><span class="chip ' + CHIP[s][0] + '">' + CHIP[s][1] + "</span></span>").join("") +
  '<span><span class="chip s-start">starting item</span> on the day\'s list when it began</span><span><span class="swatch"></span> unstarted</span></div>';
const longDay = (day: string): string => new Date(day + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function page(events: Event[], o: { day: string; at?: string }): string {
  const items = replay(events, o.at && o.day + "T" + o.at);
  const c = counts(items), placed = trees(items);
  const title = longDay(o.day) + (o.at ? ", as it stood at " + o.at : "");
  const css = readFileSync(new URL("./page.css", import.meta.url), "utf8");
  return "<title>Gesta Day Ledger</title>\n<meta name=\"claude:viewport-fit-sides\" content=\"cover\">\n" +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">\n' +
    "<style>\n" + css + "</style>\n<main><header><h1>" + title + "</h1></header>" +
    '<div class="tallies">' + tallyLine("Started with", c.starting) + tallyLine("Spawned or added since", c.added) + "</div>" + KEY +
    LISTS.map((l) => section(l, placed[l], items)).join("") + "</main>\n";
}

function main(argv: string[]): void {
  const [day, flag, at] = argv;
  const events = readFileSync(join("docs/progress", day + ".jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Event);
  const out = join("tools/out/progress", day + (flag === "--at" && at ? "-" + at.replace(":", "") : "") + ".html");
  mkdirSync("tools/out/progress", { recursive: true });
  writeFileSync(out, page(events, { day, at: flag === "--at" ? at : undefined }));
  console.log(out);
}
if (import.meta.url === "file://" + process.argv[1]) main(process.argv.slice(2));
