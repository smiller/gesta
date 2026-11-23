import { writeFileSync } from "node:fs";
import { ALERTS, PHRASES, type AlertId, type Kind } from "../src/model/alertText.ts";

/* drawn as … once runs of it are one, so a … the words themselves write stays apart */
const VARY = "\uE000";
/* a parameter stands as …: whatever is read of it, called on it or joined
   from it is … again, and nothing is iterated out of it; a word looked up by it
   finds none, which shows as … too */
const varies: unknown = new Proxy(function () {}, {
  get: (_t, key) => (key === Symbol.toPrimitive ? () => VARY : key === Symbol.iterator ? function* () {} : varies),
  apply: () => varies,
});
type Words = string | ((p: never) => string);
export const shown = (words: Words): string =>
  (typeof words === "string" ? words : String((words as (p: unknown) => string)(varies))).replace(/\bundefined\b/g, VARY).replace(/\uE000(?:\s*\uE000)+/g, VARY).replace(/\uE000/g, "…").replace(/\n/g, " ⏎ ").replace(/\|/g, "\\|");

const KINDS: [Kind, string, string][] = [
  ["error", "Error", "Red. Something went wrong; it stays until what caused it is resolved or it is closed, and a click copies its detail."],
  ["warning", "Warning", "Amber. Why an act just tried did nothing. It fades after ten seconds, or goes when closed, replaced by the next, or another entry is opened."],
  ["info", "Info", "Blue. A count, a progress line or a note, telling of no outcome. It fades on its own; a progress line holds its place until the act ends."],
  ["success", "Success", "Green. Something done worked. It fades on its own; a click on it copies its words, but for a routine one such as “saved”."],
];
const HEAD = [
  "# Alerts",
  "",
  "Every alert Gesta raises, by kind (`GLOSSARY.md`, Alert), written from",
  "`src/model/alertText.ts` by `node tools/alertsPage.ts`; a test fails when",
  "this page is not what the table writes. `…` stands for a part that varies;",
  "⏎ starts another line.",
  "",
  "Every error and warning is kept three months in the alert log:",
  "`gesta.alerts()` in the developer console lists them, each with when it was",
  "raised, on which entry, and after which key or control.",
];
const row = (words: string, other: string): string => "| `" + words + "` | " + other + " |";
function kindSection([kind, title, about]: [Kind, string, string]): string[] {
  const ids = (Object.keys(ALERTS) as AlertId[]).filter((id) => ALERTS[id].kind === kind);
  return ["", "## " + title, "", about, "", "| Words | When |", "|---|---|", ...ids.map((id) => row(shown(ALERTS[id].words), ALERTS[id].when))];
}
function phraseSection(): string[] {
  const names = Object.keys(PHRASES) as (keyof typeof PHRASES)[];
  return ["", "## Phrases", "", "Words that stand inside the alerts above, never alone: the Go to popup’s, a refused fence’s reason, a directive’s trouble, a filename clash.", "", "| Words | Name |", "|---|---|", ...names.map((n) => row(shown(PHRASES[n]), "`" + n + "`"))];
}
export const alertsPage = (): string => [...HEAD, ...KINDS.flatMap(kindSection), ...phraseSection(), ""].join("\n");

if (import.meta.url === "file://" + process.argv[1]) writeFileSync("docs/alerts.md", alertsPage());
