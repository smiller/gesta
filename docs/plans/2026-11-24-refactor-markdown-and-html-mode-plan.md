# The two views are markdown mode and HTML mode (U22)

Asked 2026-11-24: "you say 'source view' where I say 'markdown mode' vs.
'html mode'. Can we put that in the glossary?", then 1(a): the reader's
words everywhere.

## Decisions

1. GLOSSARY.md defines Markdown mode and HTML mode; "source" stays for
   where a reference or a line comes from, "rendered" as a verb.
2. `tools/vocabulary.ts` retires the old names, case-blind: source view,
   rendered view or text, reading view, markdown view or source, mdView.
3. Renamed: the help, the alerts, the masthead's tooltip, the code (modules
   `markdownMode.ts`, `htmlMode.ts`, `markdownKeys.ts`; members, the CSS
   class `.markdown`), the Helium readings (the screen line's `markdown` /
   `html`, labels, keys). No stored name carried a view, so nothing
   migrates.
4. "markdown mode's" is the domain's word, not a module's role noun.

## Record

- 17:27 First play over the rename: corner read otherwise in every section
  (the screen line); a CSS rule left as `.source` (a regex without the
  multiline flag) lost the textarea its sizing: four scroll and layout
  readings broke. Fixed; the checker made case-blind for "THE SOURCE VIEW".
- 17:29 Second play: the corner's diff, net of the intended renames, was
  the renames alone; corner and reader approved; verify green.
- The checker, as a trial for S28: of its flags, none was a word in
  another sense; it missed the line-broken and the capitalised forms.
