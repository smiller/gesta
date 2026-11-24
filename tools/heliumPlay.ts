import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { merged } from "./heliumShards.ts";
import { scrub } from "./heliumVerdict.ts";

export const profileOf = (name: string): string => resolve(tmpdir(), "gesta-helium-" + name + "-profile");
export const windowNames = (name: string, windows: number): string[] => (windows > 1 ? [...Array(windows).keys()].map((k) => name + "-" + k) : [name]);
/* a play's pages are slowed only by the rate it is given, never by a
   THROTTLE left in the shell (pin: heliumPlay.test › a play's pages run
   at the rate) */
export function playEnv(base: NodeJS.ProcessEnv, more: Record<string, string>, rate: number): Record<string, string> {
  const { THROTTLE: _shell, ...rest } = base;
  return { ...(rest as Record<string, string>), NODE_OPTIONS: "", ...more, ...(rate > 1 ? { THROTTLE: String(rate) } : {}) };
}
/* the page builds the plays read; a failed build ends the tool */
export function built(scripts: string[], env: Record<string, string>): void {
  for (const script of scripts) {
    const b = spawnSync("npm", ["run", script], { env, encoding: "utf8" });
    if (b.status !== 0) { console.error(b.stdout, b.stderr); process.exit(1); }
  }
}
/* the last run's browser may still be exiting: kill, then retry the
   delete for a few seconds rather than fail on a held directory */
export function clearProfile(name: string): void {
  spawnSync("pkill", ["-f", "gesta-helium-" + name + "-profile"]);
  for (let i = 0; i < 20; i++) { try { rmSync(profileOf(name), { recursive: true, force: true }); break; } catch { spawnSync("sleep", ["0.5"]); } }
}
export interface Printed { out: string; tail: string }
/* a driver's print, and after it, where it crashed, its exit and what it
   said; `shown`, what it says is passed on as it says it too */
export function playOne(script: string, args: string[], env: Record<string, string>, shown = false): Promise<Printed> {
  return new Promise((done) => {
    let out = "", err = "", settled = false;
    const finish = (tail: string): void => { if (!settled) { settled = true; done({ out, tail }); } };
    const child = spawn("node", [script, ...args], { env });
    child.stdout.on("data", (b) => { out += b; });
    child.stderr.on("data", (b) => { err += b; if (shown) process.stderr.write(b); });
    child.on("error", (e) => finish("\nEXIT " + e.message + "\n"));
    child.on("close", (code, signal) => { const bad = code || signal; finish(bad ? "\nEXIT " + bad + "\n" + err : ""); });
  });
}
export interface Dealt { name: string; script: string; windows: number; env: Record<string, string>; shown?: boolean }
/* the driver's sections dealt over the windows, each with its own browser
   and profile, their prints merged back as one window's and scrubbed, a
   crashed window's tail after */
export async function playDealt(d: Dealt): Promise<string> {
  const ws = windowNames(d.name, d.windows);
  const ps = await Promise.all(ws.map((w, k) => playOne(d.script, [profileOf(w)], { ...d.env, SHARD: k + "/" + ws.length }, d.shown)));
  return scrub(merged(ps.map((p) => p.out)) + ps.map((p) => p.tail).join(""));
}
