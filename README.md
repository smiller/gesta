# Gesta

The successor to `../writer`: a single-file journal app rebuilt on ProseMirror
and Svelte with a build step. Read `CLAUDE.md` first, then the plan it points
to.

    npm install          # into a Dropbox-ignored node_modules (see CLAUDE.md)
    npm test             # Vitest, the model's suites
    npm run check        # tsc
    npm run corpus       # the whole-corpus round trip over the export mirror
    npm run build        # dist/index.html, one file
    npm run dev          # the phase-0 playground
