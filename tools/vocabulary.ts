/* "noticed" stays: a reader noticing is plain English, the retired word the noun */
const RETIRED = new Set([
  "citation", "citations", "cite", "cites", "cited", "citing", "uncited", "miscited",
  "flash", "flashes", "flashed", "flashing", "notice", "notices", "whisper", "whispers", "whispered", "whispering",
]);
const words = (line: string): string[] => line.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g) ?? [];
/* a dated plan is a record: its name keeps the words it was written in */
const RECORD = /docs\/plans\/\S+/g;
export const retiredWord = (line: string): boolean => words(line.replace(RECORD, "")).some((w) => RETIRED.has(w.toLowerCase()));
/* the words stay for an act refused and a strip of images: only an
   alert's kind quoted and the area's CSS variables are its names before */
const ALERT_SENSE = /["'](failure|refusal|passing)["']|--strip-/;
export const retiredAlertSense = (line: string): boolean => ALERT_SENSE.test(line.replace(RECORD, ""));
