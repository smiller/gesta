import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

/* One index.html, opened from file:// — the singlefile plugin inlines every
   script and stylesheet the build emits, so the RUNTIME rule the current app
   keeps (the browser loads index.html alone) survives the build step. */
export default defineConfig({
  plugins: [viteSingleFile()],
  build: { target: "esnext", assetsInlineLimit: 100_000_000, cssCodeSplit: false },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
