/* Phase 0's only screen: markdown in, the ProseMirror document rendered, and
   the markdown the serializer writes back beside it — enough to see the round
   trip from file:// and nothing more. The editor is phase 1. */
import { DOMSerializer } from "prosemirror-model";
import { schema } from "./model/schema.ts";
import { parseMarkdown } from "./model/parse.ts";
import { serializeMarkdown } from "./model/serialize.ts";

const src = document.getElementById("src") as HTMLTextAreaElement;
const out = document.getElementById("out") as HTMLElement;
const view = document.getElementById("view") as HTMLElement;
const same = document.getElementById("same") as HTMLElement;
const render = DOMSerializer.fromSchema(schema);

src.value = [
  "# Canto 1",
  "",
  "::: verse",
  "Nel mezzo del cammin di nostra vita | Midway upon the journey of our life",
  "mi ritrovai per una selva oscura, | I found myself within a forest dark,",
  "",
  "⟨2⟩Ahi quanto a dir qual era è cosa dura | Ah me! how hard a thing it is to say",
  ":::",
  "",
  "A **bold** word, an *italic* one, and `code`.",
].join("\n");

function run(): void {
  const doc = parseMarkdown(src.value);
  const md = serializeMarkdown(doc);
  out.textContent = md;
  view.replaceChildren(render.serializeFragment(doc.content));
  const ok = md === src.value;
  same.textContent = ok ? "(byte-identical)" : "(differs)";
  same.className = ok ? "" : "no";
}
src.addEventListener("input", run);
/* a file from disk into the textarea — the one way to look at a corpus file
   here until phase 2 brings the import */
const file = document.getElementById("file") as HTMLInputElement;
file.addEventListener("change", async () => {
  const f = file.files?.[0];
  if (!f) return;
  src.value = await f.text();
  (document.getElementById("name") as HTMLElement).textContent = f.name;
  run();
});
run();
