/* Syntax highlighting: the tokenizer, pure. Ported 2026-09-08 from
   md.mjs's LANG_ALIAS, LANG_DEFS, compileLang and highlightCode, re-asked
   of ranges rather than HTML: one alternation pass over the raw text —
   comments | strings | numbers | keywords — yielding the token spans a
   decoration paints. A language the table lacks yields nothing, and the
   block stays plain. */
export const LANG_ALIAS: Record<string, string> = {
  rb: "ruby", js: "javascript", mjs: "javascript", ts: "javascript",
  tsx: "javascript", jsx: "javascript", py: "python", bash: "shell",
  sh: "shell", zsh: "shell", yml: "yaml", c: "clike", h: "clike",
  cpp: "clike", java: "clike", go: "clike", rust: "clike", rs: "clike",
  swift: "clike", kotlin: "clike", kt: "clike", cs: "clike", php: "clike",
  scala: "clike", htm: "html", xml: "html", erb: "html",
  scss: "css", less: "css", postgresql: "sql", mysql: "sql", sqlite: "sql",
};
interface LangDef { line?: string; block?: 1; tag?: 1; ci?: 1; kw: string; re?: RegExp; cls?: string[] }
export const LANG_DEFS: Record<string, LangDef> = {
  ruby: { line: "#", kw: "alias and begin break case class def do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield require require_relative lambda proc raise new puts attr_accessor attr_reader attr_writer include extend private protected public loop" },
  javascript: { line: "//", block: 1, kw: "async await break case catch class const continue debugger default delete do else export extends false finally for from function get if import in instanceof let new null of return set static super switch this throw true try typeof undefined var void while with yield" },
  python: { line: "#", kw: "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass print raise return self try while with yield" },
  shell: { line: "#", kw: "case do done echo elif else esac exit export fi for function if in local read return set shift source then unset until while" },
  clike: { line: "//", block: 1, kw: "abstract bool boolean break case catch char class const continue default delete do double else enum extends false final finally float fn for func goto if implements import include int interface let long mut namespace new nil null nullptr override package private protected pub public return self short sizeof static struct super switch this throw throws true try typedef union unsigned use using var virtual void while" },
  sql: { line: "--", block: 1, ci: 1, kw: "add all alter and as asc between by case create delete desc distinct drop else end exists foreign from group having in index inner insert into is join key left like limit not null offset on or order outer primary references right select set table then union unique update values when where" },
  css: { block: 1, kw: "" },
  yaml: { line: "#", kw: "true false null yes no on off" },
  json: { kw: "true false null" },
  html: { tag: 1, kw: "" },
};
function compileLang(def: LangDef): void {
  const groups: { cls: string; src: string }[] = [], cm: string[] = [];
  if (def.block) cm.push("/\\*[^]*?(?:\\*/|$)");
  if (def.line) cm.push(def.line + "[^\\n]*");
  if (def.tag) cm.push("<!--[^]*?(?:-->|$)");
  if (cm.length) groups.push({ cls: "c", src: cm.join("|") });
  if (def.tag) groups.push({ cls: "k", src: "</?[a-zA-Z][^>]*>?" });
  groups.push({ cls: "s", src: "\"(?:\\\\[^]|[^\"\\\\\\n])*\"|'(?:\\\\[^]|[^'\\\\\\n])*'|`(?:\\\\[^]|[^`\\\\])*`" });
  groups.push({ cls: "n", src: "\\b(?:0[xXbBoO][0-9a-fA-F_]+|\\d[\\d_]*(?:\\.\\d[\\d_]*)?(?:[eE][+-]?\\d+)?)\\b" });
  if (def.kw) groups.push({ cls: "k", src: "\\b(?:" + def.kw.trim().split(/\s+/).join("|") + ")\\b" });
  def.cls = groups.map((g) => g.cls);
  def.re = new RegExp(groups.map((g) => "(" + g.src + ")").join("|"), def.ci ? "gi" : "g");
}
export interface Token { from: number; to: number; cls: string }
export function tokenize(code: string, lang: string): Token[] {
  lang = (lang || "").toLowerCase();
  const def = LANG_DEFS[LANG_ALIAS[lang] || lang];
  if (!def) return [];
  if (!def.re) compileLang(def);
  const out: Token[] = [];
  const re = def.re!;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    let cls = "";
    for (let g = 1; g < m.length; g++) if (m[g] != null) { cls = def.cls![g - 1]; break; }
    if (m[0]) out.push({ from: m.index, to: m.index + m[0].length, cls });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}
