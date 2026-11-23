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
/* "header" stays for a table's first row, a zip member's, a step section's
   line and a detail's part: the band at the top, and its rows, are the
   masthead, a word no table shares */
const OTHER_HEADER = /first row the header|header['’]s column|to the header"|header pair|a header row, a <code>|table['’]s header row|header in bold|on a header of its own line/gi;
const BAND_SENSE = /\b(?:the|a) header(?:['’]s)?\b|\bheader rows?\b|underHeader/i;
export const headerForMasthead = (line: string): boolean => BAND_SENSE.test(line.replace(OTHER_HEADER, ""));
/* what works on the entry in front of a reader is a toolbar: the go to,
   the format and the replace toolbar; nothing in Gesta is a popup, a panel
   pops up too */
const OLD_TOOLBAR = /(?<![A-Za-z])(?:[Ll]ine|[Ff]ormat|[Rr]eplace)[ -]?[Bb]ar(?![a-z])|[Pp]opup|POPUP|\b(?:[Ss]election|[Ff]ormatting) toolbar\b/;
export const toolbarByOldName = (line: string): boolean => OLD_TOOLBAR.test(line.replace(RECORD, ""));
/* the two icons open menus; help, backups, bookmarks and shortcuts are
   panels, and a card is a box in an entry */
const OLD_MENU = /\b(?:dropdown|lists|books) panel\b|\b(?:bookshelf|commonplaces?) list\b|\b(?:bookmarks?|shortcuts|help) card\b/i;
export const menuOrPanelByOldName = (line: string): boolean => OLD_MENU.test(line.replace(RECORD, ""));
