import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/* the source parseMarkdown and flattenDocText are built from, comments out,
   with the versions of the two libraries they parse through: __PARSER__
   changes when that code does, and not for a comment or a module outside it */
const MODEL = "src/model/";
const closure = (seed: string[]): string[] => {
  const seen = new Set<string>(), todo = [...seed];
  while (todo.length) {
    const f = todo.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of readFileSync(MODEL + f, "utf8").matchAll(/from "\.\/([\w.]+\.ts)"/g)) todo.push(m[1]);
  }
  return [...seen].sort();
};
const uncommented = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const pkg = JSON.parse(readFileSync("package.json", "utf8")), deps = { ...pkg.dependencies, ...pkg.devDependencies };
const PARSER = createHash("sha256")
  .update([deps["markdown-it"], deps["prosemirror-model"], ...closure(["parse.ts", "flatten.ts"]).map((f) => f + "\0" + uncommented(readFileSync(MODEL + f, "utf8")))].join("\0"))
  .digest("hex").slice(0, 12);

export default defineConfig(({ mode }) => ({
  plugins: [svelte(), viteSingleFile()],
  define: { __PARSER__: JSON.stringify(PARSER) },
  build: { target: "esnext", assetsInlineLimit: 100_000_000, cssCodeSplit: false, outDir: mode === "reader" ? "dist-reader" : "dist" },
  test: { include: ["src/**/*.test.ts", "tools/**/*.test.ts", "one-offs/**/*.test.ts"], environment: "node" },
}));
