import { replay, type Event, type Item } from "./events.ts";
import { frame, head, KEY, longDay } from "./page.ts";

const pad = (n: number): string => String(n).padStart(2, "0");
const minutes = (at: string): number => +at.slice(11, 13) * 60 + +at.slice(14, 16);
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
const DONE = new Set(["done", "done, spawned open"]);
function standing(items: Item[]): [number, number, number] {
  const own = items.filter((i) => !i.movedFrom);
  return [own.filter((i) => DONE.has(i.status)).length, own.filter((i) => i.status === "in progress" || i.status === "paused").length, own.filter((i) => i.status === "unstarted").length];
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
export function slides(events: Event[], o: { day: string }): string {
  const times = frameTimes(events), snaps = times.map((t) => replay(events, o.day + "T" + t));
  const frames = snaps.map((items, i) => '<div class="frame" data-at="' + times[i] + '"' + (i ? " hidden" : "") + ">" + frame(items, i ? snaps[i - 1] : undefined) + "</div>").join("");
  const controls = '<div class="controls"><button id="pause" type="button">Pause</button><input id="when" type="range" min="0" max="' + (times.length - 1) + '" value="0" aria-label="the frame\'s time"><span id="clock">' + times[0] + "</span></div>";
  return head("Gesta Day Slides") + "<main><header><h1>" + longDay(o.day) + ", every half hour</h1></header>" + strip(snaps, times) + controls + KEY + frames + "</main>\n" + SCRIPT + "\n";
}
