import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { changedUnderSameTitle, fingerprint, testsOf, type Listed } from "./testTitles.ts";

const STAMP = "tools/out/test-titles-read";
const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  if (name === "out" || name === "node_modules") return [];
  return statSync(p).isDirectory() ? walk(p) : /\.test\.[a-z]+$/.test(name) ? [p] : [];
});
const atHead = (file: string): string | null => {
  try { return execFileSync("git", ["show", "HEAD:" + file], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 28 }); } catch { return null; }
};
const listed: Listed[] = [...walk("src"), ...walk("tools")].flatMap((file) => {
  const before = atHead(file);
  if (before === null) return [];
  const after = readFileSync(file, "utf8"), bodies = testsOf(after);
  return changedUnderSameTitle(before, after).map((title) => ({ file, title, body: bodies.get(title)! }));
});
const print = (): void => { for (const l of listed) console.log("  " + l.file + " › " + l.title); };
const seal = fingerprint(listed);
if (process.argv.includes("--read")) {
  mkdirSync("tools/out", { recursive: true });
  writeFileSync(STAMP, seal);
  console.log("test titles: " + listed.length + " recorded as read:");
  print();
} else if (!listed.length) {
  console.log("test titles: no test changed under the same description");
} else if (existsSync(STAMP) && readFileSync(STAMP, "utf8") === seal) {
  console.log("test titles: " + listed.length + " changed under the same description, each recorded as read");
} else {
  console.log("test titles: FAIL — these tests' code changed and their descriptions did not:");
  print();
  console.log("read each description against its assertions; fix any that is out of step, then `npm run titles:read`");
  process.exit(1);
}
