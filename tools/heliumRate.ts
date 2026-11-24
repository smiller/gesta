// `node tools/heliumRate.ts [from-day] [to-day]`
import { readLedger, rateOf, readTwoWays, type Rate } from "./heliumLedger.ts";

const [from = "0000", to = "9999"] = process.argv.slice(2);
const lines = readLedger().filter((l) => l.at.slice(0, 10) >= from && l.at.slice(0, 10) <= to);
const shown = (r: Rate): string => r.flaky + " of " + r.plays + " plays read a section otherwise" +
  (r.plays ? " (" + Object.entries(r.byWindows).map(([w, x]) => w + " windows " + x.flaky + "/" + x.plays).join(", ") + ")" : "");
for (const d of [...new Set(lines.map((l) => l.at.slice(0, 10)))]) console.log(d + ": " + shown(rateOf(lines.filter((l) => l.at.startsWith(d)))));
const all = rateOf(lines);
console.log("all: " + shown(all));
for (const [s, n] of Object.entries(all.bySection).sort((a, b) => b[1] - a[1])) console.log("  " + n + " × " + s);
const { playedAgain, twoWays } = readTwoWays(lines);
console.log("same inputs played again: " + playedAgain + " runs, " + twoWays.length + " read more than one way");
for (const t of twoWays) console.log("  " + t.run + " " + t.inputs + " (" + t.first + " to " + t.last + "): " + Object.entries(t.ways).map(([w, n]) => n + " × " + w).join(", "));
