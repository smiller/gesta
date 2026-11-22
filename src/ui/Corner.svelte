<!-- The indicator is transparent to the mouse while hidden and a click
     target only when shown; the pill sits bottom-right so it never covers
     the indicator. The white-space rule is what lets a pinned list (one
     refusal per line) render as lines. -->
<script lang="ts">
  import type { Notices } from "./notices.svelte.ts";
  let { notices, onResume }: { notices: Notices; onResume: () => void } = $props();
</script>

<!-- the indicator stays a span: a status line whose
     click is a mouse's convenience, never in the tab order — a button here
     would take focus from the editor on a Tab. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<span class="saved" class:show={notices.state.shown} onclick={() => notices.click()}>{notices.state.text}</span>
<button class="backup-paused" hidden={!notices.state.trouble} onclick={onResume}>{notices.state.trouble}</button>

<style>
  .saved {
    position: fixed;
    left: 1.4rem;
    bottom: 1.2rem;
    white-space: pre-line;
    font-family: var(--sans);
    font-size: 0.7em;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    background: var(--bg);
    padding: 0.3em 0.6em;
    margin: -0.3em -0.6em;
    border-radius: 3px;
    z-index: 80;
    opacity: 0;
    transition: opacity .4s ease;
    user-select: none;
    pointer-events: none;
  }
  /* fully opaque: drawn over the text, any less let the lines beneath show through its words */
  .saved.show { opacity: 1; cursor: pointer; pointer-events: auto; }
  .backup-paused {
    position: fixed;
    right: 1.4rem;
    bottom: 1.2rem;
    z-index: 80;
    font-family: var(--sans);
    font-size: 0.7em;
    letter-spacing: 0.04em;
    padding: 0.35em 0.7em;
    border: 1px solid var(--accent);
    border-radius: 999px;
    background: var(--aside-bg);
    color: var(--accent);
    cursor: pointer;
  }
  .backup-paused:hover { background: var(--accent); color: var(--aside-bg); }
</style>
