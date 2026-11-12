/* HTML TYPED INTO AN ENTRY MADE MARKDOWN: a <br/> ending a line dropped,
   a line of a paragraph starting a new one already; <i> and <em> made
   italics a line at a time, spaces outside the marks, the form a parse
   reads (pin: htmlTags.test › htmlTags: <i> and <em>); a <blockquote> a quotation, a semicolon after it dropped, the quotation
   parting it from what follows; an entity its
   letter, an apostrophe curled as the text round it is. Code is left. */

const FENCE = /^\s*(?:>\s*)*(`{3,}|~{3,})/;

const NAMED: Record<string, string> = { aelig: "æ", AElig: "Æ", utilde: "ũ", eth: "ð", thorn: "þ", amp: "&", lt: "<", gt: ">", quot: "\"", nbsp: " ", mdash: "—", ndash: "–" };
const entity = (_: string, e: string): string => {
  const c = e.startsWith("#x") ? String.fromCodePoint(parseInt(e.slice(2), 16)) : e.startsWith("#") ? String.fromCodePoint(Number(e.slice(1))) : NAMED[e];
  if (c === undefined) throw new Error(`no letter for &${e};`);
  return c === "'" ? "’" : c;
};

function prose(text: string): string {
  return text
    .replace(/[ \t]*<br\s*\/?>[ \t]*$/gm, "")
    .replace(/<blockquote>([\s\S]*?)<\/blockquote>;?/g, (_, body: string) => body.split("\n").map((l) => "> " + l).join("\n"))
    .replace(/<(i|em)>([^<]*)<\/\1>/g, (_, _tag: string, inner: string) => inner.split("\n").map((l) => l.replace(/^(\s*)(.*?)(\s*)$/, (_m, a: string, t: string, z: string) => (t ? `${a}*${t}*${z}` : a + z))).join("\n"))
    /* last, so an entity spelling a tag is never read as one */
    .replace(/&(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, entity);
}

const closes = (open: string | undefined, fence: string): boolean => !!open && open[0] === fence[0] && open.length >= fence.length;

export function untag(md: string): string {
  const out: string[] = [];
  let run: string[] = [], fence = "";
  const flush = () => { if (run.length) out.push(prose(run.join("\n"))); run = []; };
  for (const line of md.split("\n")) {
    const open = FENCE.exec(line)?.[1];
    if (fence) { out.push(line); if (closes(open, fence)) fence = ""; continue; }
    if (open) { flush(); fence = open; out.push(line); continue; }
    run.push(line);
  }
  flush();
  return out.join("\n");
}

/* code pasted between <code> tags: a fenced block in the language given,
   the colouring's <span> tags dropped, a line markdown read as a quotation
   indented again with the blank lines it made gone */
export function codeTags(md: string, lang: string): string {
  return md.replace(/^<code>\n([\s\S]*?)\n<\/code>$/m, (_, body: string) =>
    "```" + lang + "\n" + body.replace(/<\/?span[^>]*>/g, "").replace(/\n\n> (.*)\n\n/g, "\n    $1\n") + "\n```");
}

/* code pasted as a quotation two deep: a fenced block, a third level its
   indent, a link folded round a <script> tag its address again, the
   semicolon after the fold dropped (pin: htmlTags.test › htmlTags: code
   pasted as a quotation) */
export function quotedCode(md: string, lang: string): string {
  const lines = md.split("\n"), from = lines.findIndex((l) => l.startsWith(">> ")), to = lines.findIndex((l, i) => i > from && !l.startsWith(">>")) - 1;
  if (from < 0) return md;
  const last = to < from ? lines.length - 1 : to;
  const body = lines.slice(from, last + 1)
    .map((l) => (l.startsWith(">>>") ? l.replace(/^>>> ?/, "     ") : l.replace(/^>> ?/, "")))
    .map((l) => (l.trim() === "</script> -->" ? "</script> -->" : l.trim() ? l : ""))
    .map((l) => l.replace(/"\[(https:\/\/[^"\]]+)"><\/script>\]\([^)]*\);?/g, "\"$1\"></script>"));
  return [...lines.slice(0, from), "```" + lang, ...body, "```", ...lines.slice(last + 1)].join("\n");
}
