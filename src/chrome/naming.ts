/* What a typed name becomes, ported 2026-09-07 from the current app's
   promptTag and refuseName (15-tagged-sub-entries…js), pure: the prompt
   itself stays at the page. A pasted dated-article URL names the entry
   YYYY-MM-DD-slug so a book of essays stays chronological; a slash in a
   typed name becomes a dash (the slash is structure in a key); then the
   filename rule, and a name it cleans away to nothing is REFUSED with a
   reason — silence there reads as a broken button, where a cancelled
   prompt is silent on purpose. NOUN-FREE messages: one prompt serves days,
   pages, sub-pages and the bookshelf. */
import { pageName, nameFromUrl } from "../store/names.ts";

export const REFUSE_URL = "that link's title can't be a name — type one instead";
export const REFUSE_EMPTY = "that name leaves nothing a filename can keep";
export type Typed = { name: string } | { refuse: string } | null;
/* null is a cancelled or blank prompt: nothing to say */
export function typedName(raw: string | null | undefined): Typed {
  const s = (raw || "").trim();
  if (!s) return null;
  const derived = nameFromUrl(s);
  if (derived === "") return { refuse: REFUSE_URL };
  const name = pageName(derived || s.replace(/\//g, "-"));
  return name ? { name } : { refuse: REFUSE_EMPTY };
}
