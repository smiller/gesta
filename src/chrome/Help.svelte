<!-- The help panel: an overlay card, not a route — entries keep sole
     ownership of the hash. Ported 2026-09-08 from the current app's
     .helppanel (body.html, style.css, 16-help-panel.js). The text is
     help.html beside this file, the current app's help section carried
     whole: it is phase 3's acceptance list, and what it promises that is
     not yet built is recorded in CLAUDE.md. ⌃⌘H and the button toggle
     it; it takes the one panel slot, so opening it closes every other
     overlay and any of them opening closes it. -->
<script lang="ts">
  import text from "./help.html?raw";
  let { open }: { open: boolean } = $props();
</script>

<section class="helppanel" hidden={!open}>{@html text}</section>

<style>
  .helppanel {
    position: fixed;
    z-index: 80;
    top: calc(var(--masthead-h) + 20px);
    left: 50%;
    transform: translateX(-50%);
    width: min(680px, calc(100% - 28px));
    max-height: calc(100vh - var(--masthead-h) - 52px);
    overflow: auto;
    background: var(--card-bg);
    border: 1px solid var(--rule);
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    padding: 6px 28px 22px;
    font-family: var(--serif);
    color: var(--ink);
  }
  .helppanel[hidden] { display: none; }
  .helppanel :global(h2) { font-size: 1.25em; margin: 0.9em 0 0.1em; }
  .helppanel :global(h3) { font-family: var(--sans); font-size: 0.75em; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin: 1.5em 0 0.4em; }
  .helppanel :global(ul) { margin: 0; padding-left: 1.2em; }
  .helppanel :global(li) { margin: 0.35em 0; font-size: 0.85em; }
  .helppanel :global(li::marker) { color: var(--accent); }
  .helppanel :global(table) { border-collapse: collapse; margin: 0.4em 0; font-size: 0.85em; }
  .helppanel :global(th), .helppanel :global(td) { border: 1px solid var(--rule); padding: 0.25em 0.7em; text-align: left; vertical-align: top; }
  .helppanel :global(th) { font-weight: 600; background: var(--aside-bg); }
  .helppanel :global(code) { font-family: var(--mono); font-size: 0.85em; background: var(--aside-bg); border: 1px solid var(--rule); border-radius: 3px; padding: 0.05em 0.3em; }
</style>
