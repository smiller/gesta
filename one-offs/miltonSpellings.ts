/* the spellings and names the Harvard Classics' Milton leaves old, as the
   bookshelf gives them */
/* a spelling the edition keeps old, given the one the bookshelf's Milton
   has, or where it has none the modern one (asked for Paradise Regained:
   perfect, not perfet; jubilee as the Oxford edition has it); a form the
   metre or a rhyme rests on stays, and so do the forms the bookshelf keeps
   (dropt, wrapt) */
export const SPELLINGS: { from: string; to: string }[] = [
  { from: "shew", to: "show" }, { from: "perfet", to: "perfect" }, { from: "antick", to: "antic" }, { from: "battail", to: "battle" }, { from: "battail’s", to: "battle’s" },
  { from: "chauntress", to: "chantress" }, { from: "encrease", to: "increase" }, { from: "hearb", to: "herb" }, { from: "hearbs", to: "herbs" },
  { from: "inchantments", to: "enchantments" }, { from: "intirely", to: "entirely" }, { from: "jocond", to: "jocund" }, { from: "lanthorn", to: "lantern" },
  { from: "lantskip", to: "landscape" }, { from: "weept", to: "wept" }, { from: "wisards", to: "wizards" }, { from: "swindges", to: "swinges" },
  { from: "chamberlin", to: "chamberlain" }, { from: "jubily", to: "jubilee" },
  { from: "inchanted", to: "enchanted" }, { from: "injoyment", to: "enjoyment" }, { from: "ingaged", to: "engaged" }, { from: "travailler", to: "traveller" },
  { from: "travailler’s", to: "traveller’s" }, { from: "imbroidered", to: "embroidered" }, { from: "inchanting", to: "enchanting" }, { from: "uninchanted", to: "unenchanted" },
  { from: "encline", to: "incline" }, { from: "wisard", to: "wizard" }, { from: "furder", to: "further" }, { from: "inchanter", to: "enchanter" },
  { from: "pretious", to: "precious" }, { from: "oiser", to: "osier" }, { from: "intranced", to: "entranced" }, { from: "spheary", to: "sphery" }, { from: "crystallin", to: "crystalline" },
  { from: "unimployed", to: "unemployed" }, { from: "enclined", to: "inclined" }, { from: "shipwracked", to: "shipwrecked" },
];
export const KEPT_FORMS = ["adventrous", "ventrous", "wandring", "strook", "eyn", "chieftest", "dropt", "wrapt", "kerchieft", "un’wares", "yclep’d", "ychained", "ypointing", "sovran"];
/* a name the edition leaves in Milton's spelling, given its modern one (asked) */
export const NAMES: { from: string; to: string }[] = [
  { from: "Pharao", to: "Pharaoh" }, { from: "Seon", to: "Sihon" }, { from: "Sevren", to: "Severn" }, { from: "Juda", to: "Judah" },
];
export const KEPT_NAMES = ["Amorrean", "Libyc", "Hammon", "Orus", "Thammuz", "Thame", "Delphos"];

/* a line respelled, each change noted under `at` */
export function respell(text: string, at: string, spelt: string[], respelled: string[]): string {
  for (const n of SPELLINGS) text = text.replace(new RegExp(`(?<![\\p{L}’])${n.from}(?![\\p{L}’])`, "giu"), (old) => { const to = /^\p{Lu}/u.test(old) ? n.to[0].toUpperCase() + n.to.slice(1) : n.to; spelt.push(`${at}: ${old} → ${to}`); return to; });
  for (const n of NAMES) text = text.replace(new RegExp(`\\b${n.from}\\b`, "g"), () => { respelled.push(`${at}: ${n.from} → ${n.to}`); return n.to; });
  return text;
}
