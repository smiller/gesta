import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

/* the model's source, hashed: a kept search text is used only under the
   parser that made it, and a build that changes nothing there keeps the
   index (and the page's fingerprint) as it was */
const PARSER = createHash("sha256")
  .update(readdirSync("src/model").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).sort().map((f) => f + "\0" + readFileSync("src/model/" + f, "utf8")).join("\0"))
  .digest("hex").slice(0, 12);

/* One index.html, opened from file:// — the singlefile plugin inlines every
   script and stylesheet the build emits, so the RUNTIME rule the current app
   keeps (the browser loads index.html alone) survives the build step. The
   Svelte plugin compiles the UI's components and the `.svelte.ts`
   modules holding their state; under Vitest's node environment it compiles
   them for the server, so a component test renders to a string
   (svelte/server) and a rune module's state is a plain object. */
export default defineConfig(({ mode }) => ({
  plugins: [svelte(), viteSingleFile()],
  define: { __PARSER__: JSON.stringify(PARSER) },
  build: { target: "esnext", assetsInlineLimit: 100_000_000, cssCodeSplit: false, outDir: mode === "reader" ? "dist-reader" : "dist" },
  test: { include: ["src/**/*.test.ts", "tools/**/*.test.ts"], environment: "node" },
}));
