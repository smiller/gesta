<!-- A notice is transparent to the mouse while hidden and a click target
     only when shown. The white-space rule is what lets a pinned list (one
     refusal per line) render as lines. Each notice stays a span: a status
     line whose click is a mouse's convenience, never in the tab order — a
     button here would take focus from the editor on a Tab. -->
<script lang="ts">
  import { liveFlashes, type Notices, type Place } from "./notices.svelte.ts";
  let { notices, onResume }: { notices: Notices; onResume: () => void } = $props();
  $effect(() => { document.documentElement.dataset.flashes = JSON.stringify(liveFlashes(notices.state)); });
</script>

<div class="notices">
  {@render notice("failure")}
  {@render notice("refusal")}
  {@render notice("info")}
  {@render notice("success")}
</div>
<!-- the × is drawn by its style, so a notice's text is its words alone -->
{#snippet notice(place: Place)}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <span class="notice {place}" class:show={notices.state[place].shown} onclick={() => notices.click(place)}>{notices.state[place].text}<span class="close" title="Close" onclick={(e) => { e.stopPropagation(); notices.dismiss(place); }}></span></span>
{/snippet}
<button class="backup-paused" hidden={!notices.state.trouble} onclick={onResume}>{notices.state.trouble}</button>

<style>
  /* across the page under the masthead, however tall its open folds make
     it, by its anchor; a page with no masthead puts them at the top */
  .notices {
    position: fixed;
    position-anchor: --masthead;
    top: calc(anchor(--masthead bottom, 0px) + 10px);
    z-index: 80;
    left: 1.4rem;
    right: 1.4rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    pointer-events: none;
  }
  /* a flash message's box: tinted by kind, bordered in its text's colour, its × at the right */
  .notice {
    position: relative;
    white-space: pre-line;
    font-family: var(--sans);
    font-size: 0.8em;
    line-height: 1.35;
    padding: 0.8em 2.8em 0.8em 1.1em;
    border: 1px solid currentColor;
    border-radius: 4px;
    color: #468847;
    background: #dff0d8;
    user-select: none;
    pointer-events: none;
  }
  .failure { color: #b94a48; background: #f2dede; }
  .refusal { color: #8a6d3b; background: #fcf8e3; }
  .info { color: #3a87ad; background: #d9edf7; }
  /* a hidden notice takes no room in the stack */
  .notice:not(.show) { display: none; }
  .close { position: absolute; top: 0; right: 0; bottom: 0; width: 2.6em; cursor: pointer; }
  .close::before { content: "×"; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -52%); font-size: 1.4em; }
  .notice.show { cursor: pointer; pointer-events: auto; }
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
