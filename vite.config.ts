import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";

/* One index.html, opened from file:// — the singlefile plugin inlines every
   script and stylesheet the build emits, so the RUNTIME rule the current app
   keeps (the browser loads index.html alone) survives the build step. The
   Svelte plugin compiles the chrome's components and the `.svelte.ts`
   modules holding their state; under Vitest's node environment it compiles
   them for the server, so a component test renders to a string
   (svelte/server) and a rune module's state is a plain object. */
export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  build: { target: "esnext", assetsInlineLimit: 100_000_000, cssCodeSplit: false },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
