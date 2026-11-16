/* node tools/progress/page.ts <day> [--at HH:MM | --slides | --terminal [HH:MM]] */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { slides } from "./slides.ts";
import { dayEvents } from "./day.ts";
import { replay, counts, isOpen, LISTS, type Event, type Item, type List, type Stamp, type Status, type Tally } from "./events.ts";

const NAME: Record<List, string> = { A: "Architecture queue", S: "Side list", L: "For later", B: "Bigger questions", P: "Process" };
const CHIP: Record<Status, [string, string]> = {
  "unstarted": ["s-open", "unstarted"], "in progress": ["s-prog", "in progress"], "paused": ["s-paused", "paused"], "done": ["s-done", "done"],
  "done, spawned open": ["s-part", "done · spawned open"], "moved": ["s-moved", "moved"], "dropped": ["s-dropped", "dropped"],
};
const ROW: Record<Status, string> = { "unstarted": "unstarted", "in progress": "now", "paused": "paused", "done": "done", "done, spawned open": "part", "moved": "moved", "dropped": "dropped" };
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
  const out = Object.fromEntries(LISTS.map((l) => [l, []])) as unknown as Record<List, Placed[]>;
  for (const root of items.filter((i) => !i.parent || !ids.has(i.parent))) out[root.list].push(...walk(root, 0));
  return out;
}
/* the frame being drawn, and the one before it in a slideshow */
interface Drawn { items: Item[]; before?: Map<string, Item> }
function change(it: Item, d: Drawn): [string, string] {
  if (!d.before) return ["", ""];
  const was = d.before.get(it.id);
  if (!was) return ['<span class="chip s-new">new</span>', ""];
  return was.status === it.status ? ["", ""] : ["", '<span class="chip s-was">was ' + CHIP[was.status][1] + "</span>"];
}
const statusWords = (it: Item, items: Item[]): string => {
  const to = it.movedTo ? items.find((i) => i.id === it.movedTo) : undefined;
  return CHIP[it.status][1] + (to ? " → " + lower(to.list) + " " + to.id : "");
};
function chips(it: Item, d: Drawn): string {
  const [isNew, was] = change(it, d);
  const status = '<span class="chip ' + CHIP[it.status][0] + '">' + esc(statusWords(it, d.items)) + "</span>";
  return isNew + status + was + (it.starting ? '<span class="chip s-start">starting item</span>' : "");
}
const tint = (it: Item, depth: number): string[] => [ROW[it.status], it.starting ? "sod" : "", depth ? "sub" : ""].filter(Boolean);
const rowClass = (it: Item, depth: number): string => [...tint(it, depth), ...(it.detail ? ["has-detail"] : [])].join(" ");
/* reported (a carried item's before the day), started, ended (a paused
   one's at its stop), and, where it spawned something, closed */
const closedCell = (it: Item, spawned: boolean): string => (!spawned ? "" : it.closed ? hm(it.closed) : "—");
const endedCell = (it: Item): string => (it.status === "paused" ? hm(it.stopped) : isOpen(it.status) ? "—" : hm(it.ended));
const times = (it: Item, spawned: boolean): string[] => [it.reported ? hm(it.reported) : "earlier", hm(it.started), endedCell(it), closedCell(it, spawned)];
function labelWords(it: Item): string {
  const from = it.movedFrom ? " (moved in from " + it.movedFrom + ")" : "";
  return it.title + from + (it.note ? " (" + it.note + ")" : "");
}
const label = (it: Item): string => esc(labelWords(it));
const opener = (it: Item): string => (it.detail ? ' tabindex="0" aria-expanded="false"' : "");
const indent = (depth: number): string => (depth ? ' style="--d:' + depth + '"' : "");
/* a row of its own, not a block in the label's cell, which wrapped it short
   of the time and commit columns; the tbody round the two carries the outline */
const HEADER = /\s*\b(Asked|Why|Done when|Paused \(\d\d:\d\d\)|Reactivates when):\s*/g;
function parts(detail: string): string {
  const pieces = esc(detail).split(HEADER);
  const lead = pieces[0], headed: string[] = [];
  for (let i = 1; i < pieces.length; i += 2) headed.push('<span class="part"><b>' + pieces[i] + ":</b> " + pieces[i + 1] + "</span>");
  return (lead ? (headed.length ? '<span class="part">' + lead + "</span>" : lead) : "") + headed.join("");
}
const detailRow = (it: Item, depth: number): string => !it.detail ? "" :
  '<tr class="' + ["detail", ...tint(it, depth)].join(" ") + '"' + indent(depth) + ' hidden><td></td><td colspan="6"><div class="detail-text">' + parts(it.detail) + "</div></td></tr>";
function row({ item: it, depth }: Placed, d: Drawn): string {
  const cells = times(it, d.items.some((i) => i.parent === it.id)).map((t) => '<td class="t">' + t + "</td>").join("");
  return '<tbody><tr class="' + rowClass(it, depth) + '"' + indent(depth) + opener(it) + '><td class="n">' + it.id + '</td><td><div class="item">' + chips(it, d) +
    '<span class="label">' + label(it) + "</span></div></td>" + cells + '<td class="c">' + it.commits.join(" ") + "</td></tr>" + detailRow(it, depth) + "</tbody>";
}
const HEAD = '<thead><tr><th class="n">#</th><th>Item</th><th class="t">reported</th><th class="t">started</th><th class="t">ended</th><th class="t">closed</th><th>commit</th></tr></thead>';
function section(list: List, placed: Placed[], d: Drawn): string {
  if (!placed.length) return "";
  const starting = placed.filter((p) => p.item.starting && !p.depth).length;
  return "<section><h2>" + NAME[list] + (starting ? " — " + starting + " at the start" : "") + '</h2><div class="scroll"><table>' + HEAD +
    placed.map((p) => row(p, d)).join("") + "</table></div></section>";
}
/* a count's change since the frame before, when there is one */
const delta = (now: number, was?: number): string => { const d = was === undefined ? 0 : now - was; return d > 0 ? " (+" + d + ")" : d < 0 ? " (−" + -d + ")" : ""; };
/* THE ONE WORDING of a count line, which the page marks up and the
   terminal copy prints: hand-tallied in a summary, the counts disagreed
   with the page's (pin: page.test › the terminal copy says the page's
   count lines) */
interface Counted { word: string; n: number; d: string; cls: string }
function tallyWords(lead: string, t: Tally, b?: Tally): { lead: string; n: number; d: string; lists: string; statuses: Counted[] } {
  const named = LISTS.filter((l) => t.byList[l]).map((l) => t.byList[l] + " " + lower(l)).join(", ");
  const lists = named ? " (" + named + ")" : "";
  const statuses = (Object.keys(CHIP) as Status[]).filter((s) => t.byStatus[s]).map((s) => ({ word: CHIP[s][1], n: t.byStatus[s]!, d: delta(t.byStatus[s]!, b && (b.byStatus[s] ?? 0)), cls: CHIP[s][0] }));
  return { lead, n: t.total, d: delta(t.total, b?.total), lists, statuses };
}
function tallyLine(lead: string, t: Tally, b?: Tally): string {
  const w = tallyWords(lead, t, b);
  const statuses = w.statuses.map((s) => '<span class="' + s.cls + '">' + s.word + " <b>" + s.n + "</b>" + s.d + "</span>");
  return '<div class="tally"><span>' + w.lead + " <b>" + w.n + "</b>" + w.d + w.lists + "</span>" + statuses.join("") + "</div>";
}
function tallyText(lead: string, t: Tally): string {
  const w = tallyWords(lead, t);
  return [w.lead + " " + w.n + w.lists, ...w.statuses.map((s) => "-- " + s.word + " " + s.n)].join("\n");
}
export const KEY = '<div class="key">' + (Object.keys(CHIP) as Status[]).map((s) => '<span><span class="chip ' + CHIP[s][0] + '">' + CHIP[s][1] + "</span></span>").join("") +
  '<span><span class="chip s-start">starting item</span> on the day\'s list when it began</span><span><span class="swatch"></span> unstarted</span></div>';

export const TOGGLE = `<script>
function toggle(r) { const open = r.getAttribute("aria-expanded") !== "true"; r.setAttribute("aria-expanded", String(open)); r.nextElementSibling.hidden = !open; }
document.addEventListener("click", (e) => { const r = e.target.closest("tr.has-detail"); if (r) toggle(r); });
const opening = new Set(["Enter", " "]);
document.addEventListener("keydown", (e) => { if (!opening.has(e.key)) return; if (e.target.matches("tr.has-detail")) { e.preventDefault(); toggle(e.target); } });
</script>`;
export const longDay = (day: string): string => new Date(day + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export function head(title: string): string {
  const css = readFileSync(new URL("./page.css", import.meta.url), "utf8");
  return "<title>" + title + "</title>\n<meta name=\"claude:viewport-fit-sides\" content=\"cover\">\n" +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">\n' +
    "<style>\n" + css + "</style>\n";
}
/* the counts and the lists as they stand in `items`, each row and count
   against `before` where a slideshow's frame has one */
export function frame(items: Item[], before?: Item[]): string {
  const c = counts(items), placed = trees(items), b = before && counts(before);
  const d: Drawn = { items, before: before && new Map(before.map((i) => [i.id, i])) };
  return '<div class="tallies">' + tallyLine("Started with", c.starting, b?.starting) + tallyLine("Spawned or added since", c.added, b?.added) + "</div>" +
    LISTS.map((l) => section(l, placed[l], d)).join("");
}
const asOf = (o: { day: string; at?: string }): string => longDay(o.day) + (o.at ? ", as it stood at " + o.at : "");
export function terminal(events: Event[], o: { day: string; at?: string }): string {
  const items = replay(events, o.at && o.day + "T" + o.at), c = counts(items), placed = trees(items);
  const line = ({ item: it, depth }: Placed): string => "  ".repeat(depth) + "-- " + it.id + "  " + statusWords(it, items) + (it.starting ? " · starting item" : "") + "  " + labelWords(it);
  const lists = LISTS.filter((l) => placed[l].length).map((l) => [NAME[l], ...placed[l].map(line)].join("\n"));
  return [asOf(o), "", tallyText("Started with", c.starting), "", tallyText("Spawned or added since", c.added), "", lists.join("\n\n")].join("\n");
}
export function page(events: Event[], o: { day: string; at?: string }): string {
  const items = replay(events, o.at && o.day + "T" + o.at);
  const title = asOf(o);
  return head("Gesta Day Ledger") + "<main><header><h1>" + title + "</h1></header>" + KEY + frame(items) + "</main>\n" + TOGGLE + "\n";
}

export const PUBLISHED = { day: "https://claude.ai/artifact/H7HDCNRgr91rJS6s21U8VM", slides: "https://claude.ai/artifact/2UpbtsA5SwPd4JoPRwZz2w" };
export function drawn(day: string, events: Event[], out = "tools/out/progress"): { path: string; url: string }[] {
  mkdirSync(out, { recursive: true });
  const paged = { path: join(out, day + ".html"), url: PUBLISHED.day }, slid = { path: join(out, day + "-slides.html"), url: PUBLISHED.slides };
  writeFileSync(paged.path, page(events, { day }));
  writeFileSync(slid.path, slides(events, { day }));
  return [paged, slid];
}

function main(argv: string[]): void {
  const [day, flag, at] = argv;
  const events = dayEvents(day);
  if (!flag) { for (const d of drawn(day, events)) console.log(d.path); return; }
  if (flag === "--terminal") { console.log(terminal(events, { day, at })); return; }
  const out = join("tools/out/progress", day + (flag === "--slides" ? "-slides" : "-" + (at ?? "").replace(":", "")) + ".html");
  mkdirSync("tools/out/progress", { recursive: true });
  writeFileSync(out, flag === "--slides" ? slides(events, { day }) : page(events, { day, at }));
  console.log(out);
}
if (import.meta.url === "file://" + process.argv[1]) main(process.argv.slice(2));
