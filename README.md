# Gesta

[![CodeScene Average Code Health](https://codescene.io/projects/87675/status-badges/average-code-health)](https://codescene.io/projects/87675)

[![CodeScene Hotspot Code Health](https://codescene.io/projects/87675/status-badges/hotspot-code-health)](https://codescene.io/projects/87675)

The next version, the continuation, of https://github.com/smiller/writer: a
single-file journal app rebuilt on ProseMirror and Svelte with a build step.
Read `CLAUDE.md` first, then the plan it points to.

    npm install          # into a Dropbox-ignored node_modules (see CLAUDE.md)
    npm test             # Vitest, the model's suites
    npm run check        # tsc
    npm run corpus       # the whole-corpus round trip over the export mirror
    npm run build        # dist/index.html, one file
    npm run dev          # the phase-0 playground
