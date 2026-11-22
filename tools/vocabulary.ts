/* "noticed" stays: a reader noticing is plain English, the retired word the noun */
const RETIRED = new Set([
  "citation", "citations", "cite", "cites", "cited", "citing", "uncited", "miscited",
  "flash", "flashes", "flashed", "flashing", "notice", "notices", "whisper", "whispers", "whispered", "whispering",
]);
const words = (line: string): string[] => line.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g) ?? [];
/* a dated plan is a record: its name keeps the words it was written in */
const RECORD = /docs\/plans\/\S+/g;
export const retiredWord = (line: string): boolean => words(line.replace(RECORD, "")).some((w) => RETIRED.has(w.toLowerCase()));
/* the words stay for an act refused, a strip of images and a pin that
   checks a comment: only an alert's kind quoted, the area's CSS variables
   and a standing error's names in code are its names before */
const ALERT_SENSE = /["'](failure|refusal|passing)["']|--strip-|\.pinned\b|\bpinned\??:|\b(repin|unpin)\b|[a-z]Pins?\b|\bPins\b/;
export const retiredAlertSense = (line: string): boolean => ALERT_SENSE.test(line.replace(RECORD, ""));
