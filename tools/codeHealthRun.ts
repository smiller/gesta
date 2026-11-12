import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { cacheKey, changedFiles, findingLines, refusals, scoreOf, type Changed, type Scored } from "./codeHealth.ts";

const CACHE = "tools/out/code-health-cache.json";
const RULES = ".codescene/code-health-rules.json";
const WARN_UNMEASURED = process.argv.includes("--warn-unmeasured");
interface Result { score: number; findings: string[] }

function findCli(): string | null {
  if (process.env.CS_CLI) return process.env.CS_CLI;
  const root = join(homedir(), "Library/Caches/codehealth-mcp");
  if (!existsSync(root)) return null;
  const found = readdirSync(root).map((d) => join(root, d, "cs")).filter(existsSync);
  return found.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] ?? null;
}

function unmeasured(why: string): never {
  console.log("code health: COULD NOT MEASURE — " + why);
  console.log("sign the CLI in with `! " + (findCli() ?? "cs") + " auth login`, or set CS_CLI to the CLI's path");
  process.exit(WARN_UNMEASURED ? 0 : 1);
}

const git = (...args: string[]): string => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const atHead = (path: string): string => git("show", "HEAD:" + path);

const changed = changedFiles(git("diff", "--name-status", "-M", "HEAD"), git("ls-files", "--others", "--exclude-standard").split("\n"));
if (!changed.length) {
  console.log("code health: no TypeScript under src/ moved from HEAD");
  process.exit(0);
}
const cli = findCli() ?? unmeasured("the CodeScene CLI was not found under ~/Library/Caches/codehealth-mcp");
const env = { ...process.env, CS_DISABLE_VERSION_CHECK: "1" };
function cliVersion(): string {
  try { return execFileSync(cli, ["version"], { encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] }).split("\n")[0]!; }
  catch (e) { return unmeasured(cli + " did not run: " + (e as Error).message.split("\n")[0]); }
}
const version = cliVersion();
const rules = existsSync(RULES) ? readFileSync(RULES, "utf8") : "";
const cache: Record<string, Result> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

function review(text: string, path: string): Promise<Result> {
  return new Promise((resolve, reject) => {
    const child = execFile(cli, ["review", "--file-name", path, "--output-format", "json"], { env, maxBuffer: 1 << 26 }, (err, out) => {
      if (err) return reject(new Error(path + ": " + (out || err.message).trim().split("\n")[0]));
      const result = JSON.parse(out);
      resolve({ score: scoreOf(result), findings: findingLines(result.review ?? []) });
    });
    child.stdin!.end(text);
  });
}

async function scored(text: string, path: string): Promise<Result> {
  const key = cacheKey(text, path, rules, version);
  cache[key] ??= await review(text, path);
  return cache[key];
}

async function measure(c: Changed): Promise<Scored> {
  const [after, before] = await Promise.all([scored(readFileSync(c.path, "utf8"), c.path), c.was ? scored(atHead(c.was), c.was) : null]);
  return { path: c.path, before: before?.score ?? null, after: after.score, findings: after.findings };
}

const rows = await Promise.all(changed.map(measure)).catch((e: Error) => unmeasured(e.message));
mkdirSync("tools/out", { recursive: true });
writeFileSync(CACHE, JSON.stringify(cache));

const shown = (r: Scored): string => "  " + r.path + "  " + (r.before === null ? "new" : r.before.toFixed(2)) + " → " + r.after.toFixed(2);
const refused = refusals(rows);
if (!refused.length) {
  console.log("code health: " + rows.length + " file(s) measured, none below its score at HEAD, none new below 10");
  for (const r of rows) console.log(shown(r));
  process.exit(0);
}
console.log("code health: FAIL — a changed file may not score below HEAD's copy, and a new file must score 10:");
for (const r of refused) {
  console.log(shown(r));
  for (const f of r.findings) console.log("      " + f);
}
console.log("restructure until each scores at least its HEAD score (10 for a new file), the suite still green; `npm run test:health` re-reads");
process.exit(1);
