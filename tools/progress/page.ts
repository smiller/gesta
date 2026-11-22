/* node tools/progress/page.ts <day> [--at HH:MM | --slides | --terminal [HH:MM]] */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dayEvents, today, clock as wallClock, neighbours, logNames, type Days } from "./day.ts";
import { inOrder, minutes, type Gap, type Order, type Piece, type Span } from "./spans.ts";
import { replay, counts, isOpen, isDone, isUnderway, own, LISTS, type Event, type Item, type List, type Stamp, type Status, type Tally } from "./events.ts";

const NAME: Record<List, string> = { U: "User requests", A: "Architecture queue", S: "Side list", L: "For later", B: "Bigger questions", P: "Process" };
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
const KEY = '<div class="key">' + (Object.keys(CHIP) as Status[]).map((s) => '<span><span class="chip ' + CHIP[s][0] + '">' + CHIP[s][1] + "</span></span>").join("") +
  '<span><span class="chip s-start">starting item</span> on the day\'s list when it began</span><span><span class="swatch"></span> unstarted</span></div>';

const TOGGLE = `<script>
function toggle(r) { const open = r.getAttribute("aria-expanded") !== "true"; r.setAttribute("aria-expanded", String(open)); r.nextElementSibling.hidden = !open; }
document.addEventListener("click", (e) => { const r = e.target.closest("tr.has-detail"); if (r) toggle(r); });
const opening = new Set(["Enter", " "]);
document.addEventListener("keydown", (e) => { if (!opening.has(e.key)) return; if (e.target.matches("tr.has-detail")) { e.preventDefault(); toggle(e.target); } });
</script>`;
const longDay = (day: string): string => new Date(day + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
function documentOf(title: string, body: string): string {
  const css = readFileSync(new URL("./page.css", import.meta.url), "utf8");
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>' + title + "</title>\n" +
    '<meta name="claude:viewport-fit-sides" content="cover">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">\n' +
    "<style>\n" + css + "</style>\n</head>\n<body>\n" + body + "</body>\n</html>\n";
}
/* the counts and the lists as they stand in `items`, each row and count
   against `before` where a slideshow's frame has one */
function frame(items: Item[], before?: Item[]): string {
  const c = counts(items), placed = trees(items), b = before && counts(before);
  const d: Drawn = { items, before: before && new Map(before.map((i) => [i.id, i])) };
  return '<div class="tallies">' + tallyLine("Started with", c.starting, b?.starting) + tallyLine("Spawned or added since", c.added, b?.added) + "</div>" +
    LISTS.map((l) => section(l, placed[l], d)).join("");
}
const shortDay = (day: string): string => new Date(day + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
function dayLinks(days: Days | undefined, file: (day: string) => string): string {
  const link = (rel: string, words: (d: string) => string, d?: string): string => (d ? '<a rel="' + rel + '" href="' + file(d) + '">' + words(shortDay(d)) + "</a>" : "<span></span>");
  if (!days?.before && !days?.after) return "";
  return '<nav class="days">' + link("prev", (d) => "← Previous day, " + d, days.before) + link("next", (d) => "Next day, " + d + " →", days.after) + "</nav>";
}
const pageFile = (day: string): string => day + ".html", slidesFile = (day: string): string => day + "-slides.html";
const asOf = (o: { day: string; at?: string }): string => longDay(o.day) + (o.at ? ", as it stood at " + o.at : "");
export function terminal(events: Event[], o: { day: string; at?: string }): string {
  const items = replay(events, o.at && o.day + "T" + o.at), c = counts(items), placed = trees(items);
  const line = ({ item: it, depth }: Placed): string => "  ".repeat(depth) + "-- " + it.id + "  " + statusWords(it, items) + (it.starting ? " · starting item" : "") + "  " + labelWords(it);
  const lists = LISTS.filter((l) => placed[l].length).map((l) => [NAME[l], ...placed[l].map(line)].join("\n"));
  return [asOf(o), "", tallyText("Started with", c.starting), "", tallyText("Spawned or added since", c.added), "", lists.join("\n\n")].join("\n");
}
export function page(events: Event[], o: { day: string; at?: string; now?: string; days?: Days }): string {
  const items = replay(events, o.at && o.day + "T" + o.at);
  const title = asOf(o);
  return documentOf("Gesta Day Ledger", "<main><header><h1>" + title + "</h1>" + dayLinks(o.days, pageFile) + "</header>" + KEY + frame(items) + dayInOrder(events, items, o) + "</main>\n" + TOGGLE + "\n");
}

const took = (m: number): string => (m < 60 ? m + " min" : Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : ""));
const ownTime = (s: Span): number => s.own.reduce((n, [a, b]) => n + b - a, 0);
const share = (o: Order, m: number): number => (m / Math.max(1, o.to - o.from)) * 100;
const placedAt = (o: Order, [a, b]: Piece): string => ' style="left:' + share(o, a - o.from).toFixed(2) + "%;width:" + Math.max(0.6, share(o, b - a)).toFixed(2) + '%"';
function lane(s: Span, o: Order): string {
  const start = minutes(s.from.at), whole: Piece = [start, start + s.whole];
  const faint = ownTime(s) < s.whole ? ['<span class="whole"' + placedAt(o, whole) + "></span>"] : [];
  return '<div class="lane ' + CHIP[s.ending][0] + '">' + [...faint, ...s.own.map((p) => "<span" + placedAt(o, p) + "></span>")].join("") + "</div>";
}
const tookCell = (s: Span): string => (ownTime(s) < s.whole ? took(ownTime(s)) + '<span class="of">of ' + took(s.whole) + "</span>" : took(s.whole));
const depthOf = (it: Item, items: Map<string, Item>): number => (it.parent && items.has(it.parent) ? 1 + depthOf(items.get(it.parent)!, items) : 0);
interface Ordered { o: Order; items: Map<string, Item> }
function spanRow(s: Span, d: Ordered): string {
  const it = d.items.get(s.id)!, depth = depthOf(it, d.items);
  const what = '<span class="chip ' + CHIP[s.ending][0] + '">' + CHIP[s.ending][1] + '</span><span class="what"><span class="label">' + esc(it.title) + "</span>" + (s.note ? '<span class="note">' + esc(s.note) + "</span>" : "") + "</span>";
  const times = [hm(s.from), s.to ? hm(s.to) : "—"].map((t) => '<td class="t">' + t + "</td>").join("") + '<td class="t took">' + tookCell(s) + "</td>";
  return '<tbody><tr class="' + [ROW[s.ending], depth ? "sub" : ""].filter(Boolean).join(" ") + '"' + indent(depth) + ">" + times + '<td class="n">' + s.id + '</td><td><div class="item">' + what +
    '</div></td><td class="day">' + lane(s, d.o) + '</td><td class="c">' + (s.ending === "done" ? it.commits.join(" ") : "") + "</td></tr></tbody>";
}
const gapRow = (g: Gap): string =>
  '<tbody><tr class="gap"><td class="t">' + clock(g.from) + '</td><td class="t">' + clock(g.to) + '</td><td class="t took">' + took(g.to - g.from) + '</td><td></td><td colspan="3">nothing started or ended</td></tr></tbody>';
function orderHead(o: Order): string {
  const hours: string[] = [];
  for (let h = Math.ceil(o.from / 60) * 60; h <= o.to; h += 60) hours.push('<span style="left:' + share(o, h - o.from).toFixed(2) + '%">' + h / 60 + "</span>");
  return '<thead><tr><th class="t">start</th><th class="t">finish</th><th class="t">took</th><th class="n">#</th><th>What</th><th class="day"><div class="ticks">' + hours.join("") + "</div></th><th>commit</th></tr></thead>";
}
function orderTotals(o: Order, until: string): string {
  const spans = o.rows.filter((r): r is Span => r.kind === "span");
  const tally = '<div class="tally"><span>Spans <b>' + spans.length + '</b></span><span class="s-done">ended done <b>' + spans.filter((s) => s.ending === "done").length + "</b></span><span>started inside another span <b>" + o.inside + "</b></span></div>";
  return tally + '<div class="times"><div>from ' + clock(o.from) + " to " + clock(o.to) + until + "</div><div>working for <b>" + took(o.working) + "</b></div><div>nothing started or ended for <b>" + took(o.idle) + "</b></div></div>";
}
function dayInOrder(events: Event[], items: Item[], o: { day: string; at?: string; now?: string }): string {
  const end = o.at ?? o.now, shown = o.at ? events.filter((e) => e.at <= o.day + "T" + o.at) : events;
  const d: Ordered = { o: inOrder(shown, end && o.day + "T" + end), items: new Map(items.map((i) => [i.id, i])) };
  if (!d.o.rows.length) return "";
  const rows = d.o.rows.map((r) => (r.kind === "gap" ? gapRow(r) : spanRow(r, d))).join("");
  return '<section class="in-order"><h2>The day in order — each span from its start to its stop, done or drop</h2>' + orderTotals(d.o, !o.at && o.now ? " (now)" : "") +
    '<div class="scroll"><table>' + orderHead(d.o) + rows + "</table></div></section>";
}

const pad = (n: number): string => String(n).padStart(2, "0");
const clock = (m: number): string => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
/* the day's start, every clock half hour after it, and its last event */
export function frameTimes(events: Event[]): string[] {
  if (!events.length) return [];
  const first = Math.min(...events.map((e) => minutes(e.at))), last = Math.max(...events.map((e) => minutes(e.at)));
  const out = [clock(first)];
  for (let m = Math.floor(first / 30) * 30 + 30; m <= last; m += 30) out.push(clock(m));
  if (out[out.length - 1] !== clock(last)) out.push(clock(last));
  return out;
}

/* each frame's items done, in progress or paused, and unstarted, a moved
   item counted once, where it started */
function standing(items: Item[]): [number, number, number] {
  const counted = own(items), n = (f: (i: Item) => boolean): number => counted.filter(f).length;
  return [n((i) => isDone(i.status)), n((i) => isUnderway(i.status)), n((i) => i.status === "unstarted")];
}
const BAR = 26, TALL = 90;
function strip(snaps: Item[][], times: string[]): string {
  const counts = snaps.map(standing), most = Math.max(1, ...counts.map((c) => c[0] + c[1] + c[2]));
  const bars = counts.map((c, i) => {
    let y = TALL;
    const rects = (["done", "prog", "open"] as const).map((k, j) => { const h = (c[j] / most) * (TALL - 14); y -= h; return '<rect class="bar ' + k + '" x="' + (i * BAR + 3) + '" y="' + y.toFixed(1) + '" width="' + (BAR - 6) + '" height="' + h.toFixed(1) + '"></rect>'; }).join("");
    return '<g data-i="' + i + '"><title>' + times[i] + ": " + c[0] + " done, " + c[1] + " in progress, " + c[2] + " unstarted</title>" + rects + "</g>";
  }).join("");
  return '<svg class="strip" viewBox="0 0 ' + snaps.length * BAR + " " + TALL + '" preserveAspectRatio="none" role="img" aria-label="items done, in progress and unstarted at each frame">' + bars + "</svg>";
}
const SCRIPT = `<script>
const frames = [...document.querySelectorAll(".frame")], when = document.getElementById("when"), clockEl = document.getElementById("clock");
const pause = document.getElementById("pause"), bars = [...document.querySelectorAll(".strip g")];
let i = 0, timer = null;
function show(n) { i = n; frames.forEach((f, k) => { f.hidden = k !== n; }); when.value = n; clockEl.textContent = frames[n].dataset.at; bars.forEach((b, k) => b.classList.toggle("here", k === n)); }
function stop(label) { if (timer) clearInterval(timer); timer = null; pause.textContent = label; }
function play() { stop("Pause"); timer = setInterval(() => { if (i >= frames.length - 1) { stop("Play again"); return; } show(i + 1); }, 5000); }
pause.addEventListener("click", () => { if (timer) { stop("Resume"); return; } if (i >= frames.length - 1) show(0); play(); });
when.addEventListener("input", () => { stop("Resume"); show(+when.value); });
bars.forEach((b, k) => b.addEventListener("click", () => { stop("Resume"); show(k); }));
const steps = { ArrowRight: 1, ArrowLeft: -1 };
addEventListener("keydown", (e) => { const step = e.target === when ? 0 : steps[e.key] || 0; if (!step) return; stop("Resume"); show(Math.max(0, Math.min(frames.length - 1, i + step))); });
show(0); play();
</script>`;

/* the day as a slideshow: a frame at each of its times, each marked
   against the one before */
export function slides(events: Event[], o: { day: string; days?: Days }): string {
  const times = frameTimes(events), snaps = times.map((t) => replay(events, o.day + "T" + t));
  const frames = snaps.map((items, i) => '<div class="frame" data-at="' + times[i] + '"' + (i ? " hidden" : "") + ">" + frame(items, i ? snaps[i - 1] : undefined) + dayInOrder(events, items, { day: o.day, at: times[i] }) + "</div>").join("");
  const controls = '<div class="controls"><button id="pause" type="button">Pause</button><input id="when" type="range" min="0" max="' + (times.length - 1) + '" value="0" aria-label="the frame\'s time"><span id="clock">' + times[0] + "</span></div>";
  return documentOf("Gesta Day Slides", "<main><header><h1>" + longDay(o.day) + ", every half hour</h1>" + dayLinks(o.days, slidesFile) + "</header>" + strip(snaps, times) + controls + KEY + frames + "</main>\n" + SCRIPT + "\n" + TOGGLE + "\n");
}
export const PUBLISHED = { day: "https://claude.ai/artifact/H7HDCNRgr91rJS6s21U8VM", slides: "https://claude.ai/artifact/2UpbtsA5SwPd4JoPRwZz2w" };
interface Drawing { out: string; names: string[]; read: (day: string) => Event[]; now?: string }
function drawOne(day: string, events: Event[], w: Drawing): [string, string] {
  const days = neighbours(w.names, day), paths: [string, string] = [join(w.out, pageFile(day)), join(w.out, slidesFile(day))];
  writeFileSync(paths[0], page(events, { day, now: w.now, days }));
  writeFileSync(paths[1], slides(events, { day, days }));
  return paths;
}
/* a page links to its neighbours as files published beside it: the day's
   own is published there for the next day's link back, and the day
   before's is redrawn, as its link to this day appears only once this day
   has a log */
export function drawn(day: string, events: Event[], o: Partial<Drawing> = {}): { path: string; url: string; beside: string[] }[] {
  const w: Drawing = { out: o.out ?? "tools/out/progress", names: o.names ?? logNames(), read: o.read ?? dayEvents, now: o.now ?? (day === today() ? wallClock() : undefined) };
  mkdirSync(w.out, { recursive: true });
  const before = neighbours(w.names, day).before, own = drawOne(day, events, w);
  const earlier = before ? drawOne(before, w.read(before), { ...w, now: undefined }) : undefined;
  return [PUBLISHED.day, PUBLISHED.slides].map((url, i) => ({ path: own[i], url, beside: [...(earlier ? [earlier[i]] : []), own[i]] }));
}

function main(argv: string[]): void {
  const [day, flag, at] = argv;
  const events = dayEvents(day);
  if (!flag) { for (const d of drawn(day, events)) console.log(d.path); return; }
  if (flag === "--terminal") { console.log(terminal(events, { day, at })); return; }
  const days = neighbours(logNames(), day);
  const out = join("tools/out/progress", day + (flag === "--slides" ? "-slides" : "-" + (at ?? "").replace(":", "")) + ".html");
  mkdirSync("tools/out/progress", { recursive: true });
  writeFileSync(out, flag === "--slides" ? slides(events, { day, days }) : page(events, { day, at, days }));
  console.log(out);
}
if (import.meta.url === "file://" + process.argv[1]) main(process.argv.slice(2));
