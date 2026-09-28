/* The comment checker, over src/ with its tests.
   Usage: node tools/comments.ts             the working tree against HEAD
          node tools/comments.ts --commit R  what commit R added
          node tools/comments.ts --sweep     every block, a reading list
   Fails on a pin that does not resolve (the working tree only), and on an
   added or changed comment block that names another module or carries
   provenance; prints the ledger of every block the diff added or changed. */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { addedLines, commentBlocks, nameIndex, namesOther, pins, provenance, touched, unresolved, type Block, type PinSources } from "./commentRules.ts";

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const commit = args.includes("--commit") ? args[args.indexOf("--commit") + 1] : null;
const sweep = args.includes("--sweep");
const git = (...a: string[]): string => execFileSync("git", a, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
const SCANNED = /\.(ts|svelte|css|html)$/;

function worktree(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string): void => {
    for (const n of readdirSync(join(root, d))) {
      const p = d + "/" + n;
      if (statSync(join(root, p)).isDirectory()) walk(p);
      else if (SCANNED.test(n)) out.set(p, readFileSync(join(root, p), "utf8"));
    }
  };
  walk("src");
  return out;
}

function atRevision(rev: string): Map<string, string> {
  const names = git("ls-tree", "-r", "--name-only", rev, "--", "src").split("\n").filter((f) => SCANNED.test(f));
  const batch = execFileSync("git", ["cat-file", "--batch"], { cwd: root, input: names.map((f) => rev + ":" + f).join("\n") + "\n", maxBuffer: 1 << 28 });
  const out = new Map<string, string>();
  let at = 0;
  for (const f of names) {
    const nl = batch.indexOf(10, at);
    const size = +batch.subarray(at, nl).toString().split(" ")[2];
    out.set(f, batch.subarray(nl + 1, nl + 1 + size).toString("utf8"));
    at = nl + 1 + size + 1;
  }
  return out;
}

const files = commit ? atRevision(commit) : worktree();
const blocks = new Map<string, Block[]>();
for (const [f, src] of files) blocks.set(f, commentBlocks(f, src));
const index = nameIndex(files);
const show = (b: Block): string => b.file + ":" + b.start + (b.end > b.start ? "-" + b.end : "");
let failed = false;

if (!commit && !sweep) {
  const read = (p: string): string => readFileSync(join(root, p), "utf8");
  const tests = new Map<string, string[]>();
  for (const [f, src] of files) {
    const m = /([^/]+\.test)\.ts$/.exec(f);
    if (m) tests.set(m[1], [...(tests.get(m[1]) ?? []), src]);
  }
  const sources: PinSources = {
    steps: read("tools/helium-steps.mjs"),
    corner: read("tools/expected/corner.approved.txt"),
    bridge: read("tools/helium-bridge.mjs"),
    bridgeRun: read("tools/expected/bridge.approved.txt"),
    tests,
  };
  const bad: string[] = [];
  let count = 0;
  for (const bs of blocks.values()) for (const b of bs) for (const p of pins(b.body)) {
    count++;
    const why = unresolved(p, sources);
    if (why) bad.push("  " + show(b) + " (pin: " + p.text + ")\n    " + why);
  }
  if (bad.length) { failed = true; console.log("comments: FAILED — " + bad.length + " of " + count + " pins do not resolve:\n" + bad.join("\n")); }
  else console.log("comments: " + count + " pins, all resolve");
}

let changed: Block[];
if (sweep) changed = [...blocks.values()].flat();
else {
  const diff = commit ? git("diff", "--unified=0", "--no-color", "--no-ext-diff", "-M", commit + "^", commit, "--", "src") : git("diff", "--unified=0", "--no-color", "--no-ext-diff", "-M", "HEAD", "--", "src");
  const added = addedLines(diff);
  if (!commit) for (const f of git("ls-files", "--others", "--exclude-standard", "--", "src").split("\n").filter((f) => files.has(f))) added.set(f, new Set(files.get(f)!.split("\n").map((_, i) => i + 1)));
  changed = [...blocks].flatMap(([f, bs]) => touched(bs, added.get(f)));
}

const named = changed.map((b) => ({ b, hits: namesOther(b, index) })).filter((x) => x.hits.length);
const dated = changed.map((b) => ({ b, hits: provenance(b) })).filter((x) => x.hits.length);
if (sweep) {
  console.log("comments: " + changed.length + " blocks in " + files.size + " files; " + named.length + " name another module, " + dated.length + " carry provenance (a reading list):");
  for (const { b, hits } of named) console.log("  " + show(b) + " — " + hits.join(", "));
  console.log("comments: provenance:");
  for (const { b, hits } of dated) console.log("  " + show(b) + " — " + hits.join(", "));
} else {
  console.log("comments: the ledger — " + changed.length + " block" + (changed.length === 1 ? "" : "s") + " added or changed" + (changed.length ? ":" : ""));
  for (const b of changed) console.log("  " + show(b) + "\n" + b.raw.split("\n").map((l) => "    | " + l.trim()).join("\n"));
  if (named.length) {
    failed = true;
    console.log("comments: FAILED — " + named.length + " added or changed block" + (named.length === 1 ? " names" : "s name") + " another module; say it as this code's own decision, or make the contract a test:");
    for (const { b, hits } of named) console.log("  " + show(b) + " — " + hits.join(", "));
  }
  if (dated.length) {
    failed = true;
    console.log("comments: FAILED — " + dated.length + " added or changed block" + (dated.length === 1 ? " carries" : "s carry") + " provenance; dates, the reader and the review live in the plan's record alone (the app's user is \"a reader\"):");
    for (const { b, hits } of dated) console.log("  " + show(b) + " — " + hits.join(", "));
  }
}
process.exit(failed ? 1 : 0);
