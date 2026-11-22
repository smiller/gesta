import { test, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { messageForms, raiseCalls, catalogued, catalogueGaps } from "./alertCatalogue.ts";
import { failMsg } from "../src/store/files.ts";

test("messageForms: a string is its words, a template or a concatenation its fixed text with … for each part that varies", () => {
  expect(messageForms('"no line numbers here"')).toEqual(["no line numbers here"]);
  expect(messageForms("'saved'")).toEqual(["saved"]);
  expect(messageForms("`backing up… ${done} / ${total}`")).toEqual(["backing up… … / …"]);
  expect(messageForms('"no bookmark " + k')).toEqual(["no bookmark …"]);
  expect(messageForms('"“" + alias + "” already goes to " + trimLabel(x, 40)')).toEqual(["“…” already goes to …"]);
});

test("messageForms: each branch of a choice is a form of its own, and a part that is all variable is …", () => {
  expect(messageForms('dir === "prev" ? "no earlier entry" : "no later entry"')).toEqual(["no earlier entry", "no later entry"]);
  expect(messageForms('n === 1 ? "1 word" : n + " words"')).toEqual(["1 word", "… words"]);
  expect(messageForms('(act === "code" && codeBlockRefusal(view.state)) || "nothing to change there"')).toEqual(["…", "nothing to change there"]);
  expect(messageForms("REFUSAL_TEXT[out.refused]")).toEqual(["…"]);
  expect(messageForms("text")).toEqual(["…"]);
});

test("raiseCalls: each call by its kind's name, its kind and its message's forms; never a console call or one in a comment or a string", () => {
  const src = [
    'warn("already bookmarked");',
    "alerts.error(`couldn’t read ${n}`, { caught: err });",
    "opts.info?.(n + \" entries stored\");",
    'p.ok("exported", 3000); p.fail(msg, detail);',
    'console.error("copy failed", err);',
    '/* warn("in a comment") */ const s = "succeed(\\"in a string\\")";',
    'const p = alerts.progress("exporting…");',
  ].join("\n");
  expect(raiseCalls(src).map((c) => [c.kind, c.forms])).toEqual([
    ["warning", ["already bookmarked"]],
    ["error", ["couldn’t read …"]],
    ["info", ["… entries stored"]],
    ["success", ["exported"]],
    ["error", ["…"]],
    ["info", ["exporting…"]],
  ]);
  expect(raiseCalls("p.fail(msg, detail);")[0].site).toBe("p.fail(msg)");
});

test("messageForms: failMsg's words are its operation, a dash and the error's text", () => {
  expect(messageForms('failMsg("couldn’t keep the backup", err)')).toEqual(["couldn’t keep the backup — …"]);
  expect(failMsg("couldn’t keep the backup", new Error("denied"))).toMatch(/^couldn’t keep the backup — .+/);
});

test("raiseCalls: progress's ends and the entry layer's are called on what holds them; a helper of the same name is none", () => {
  expect(raiseCalls("const ok = (a, b) => a < b;\nif (ok(x, y)) go();\nfail(z);\nprogress(1);").length).toBe(0);
});

test("raiseCalls: a call handing on its own parameter is wiring, not a raise", () => {
  const src = 'error: (text) => { alerts.error(text); },\nwarn: (why: string) => warn(why),\nok(msg, ms) { if (end()) succeed(msg, ms); },\nwarn(why);';
  expect(raiseCalls(src).map((c) => c.site)).toEqual(["warn(why)"]);
});

const MD = [
  "# Alerts", "", "## Error", "", "| Words | When |", "|---|---|",
  "| `not saved` | a save did not land |", "| `src/a.ts › p.fail(msg)` | the export, with `x` in passing |",
  "", "## Warning", "", "| Words | When |", "|---|---|", "| `no bookmark …` | no row has that number |",
].join("\n");

test("catalogued: each row's first cell, by the kind its heading names; the When column is free text", () => {
  expect(catalogued(MD)).toEqual([
    { kind: "error", entry: "not saved" },
    { kind: "error", entry: "src/a.ts › p.fail(msg)" },
    { kind: "warning", entry: "no bookmark …" },
  ]);
});

test("catalogueGaps: a raise's words or its variable call missing under its kind, and an entry nothing raises", () => {
  const raises = [
    { file: "src/a.ts", kind: "error" as const, forms: ["not saved"], site: "error(\"not saved\")", line: 1 },
    { file: "src/a.ts", kind: "error" as const, forms: ["…"], site: "p.fail(msg)", line: 2 },
    { file: "src/b.ts", kind: "error" as const, forms: ["no bookmark …"], site: "error(\"no bookmark \" + k)", line: 3 },
    { file: "src/b.ts", kind: "info" as const, forms: ["… words"], site: "info(n + \" words\")", line: 4 },
  ];
  expect(catalogueGaps(raises, catalogued(MD))).toEqual({
    missing: ["error: no bookmark … (src/b.ts:3)", "info: … words (src/b.ts:4)"],
    stale: ["warning: no bookmark …"],
  });
});

test("docs/alerts.md lists every alert src/ raises, under its kind, and nothing src/ no longer raises", () => {
  const files = readdirSync("src", { recursive: true, encoding: "utf8" }).map((f) => "src/" + f).filter((f) => /\.(ts|svelte)$/.test(f) && !f.endsWith(".test.ts"));
  const raises = files.flatMap((file) => raiseCalls(readFileSync(file, "utf8")).map((r) => ({ ...r, file })));
  expect(catalogueGaps(raises, catalogued(readFileSync("docs/alerts.md", "utf8")))).toEqual({ missing: [], stale: [] });
});

test("raiseCalls: a call inside a choice is a raise; a member's signature or a method's head is none", () => {
  const src = "copyError = opts.error ? opts.error(failText, { copy: t }) : 0;\n  warn(text: string): void;\n  ok(msg, ms) { done(); },\nfunction f(on: { warn(text: string): void }) {}";
  expect(raiseCalls(src).map((c) => c.site)).toEqual(["opts.error(failText)"]);
});

test("catalogued: a pipe in a cell is written escaped, as a markdown table needs, and read as itself", () => {
  expect(catalogued("## Warning\n\n| `src/a.ts › warn(a \\|\\| \"b\")` | when |")).toEqual([{ kind: "warning", entry: 'src/a.ts › warn(a || "b")' }]);
});
