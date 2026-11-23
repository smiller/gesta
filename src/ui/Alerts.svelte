<!-- An alert is transparent to the mouse while hidden and a click target
     only when shown. The white-space rule is what lets an error of several lines (one
     refused fence a line) render as lines. Each alert stays a span: a status
     line whose click is a mouse's convenience, never in the tab order — a
     button here would take focus from the editor on a Tab. -->
<script lang="ts">
  import { liveAlerts, type Alerts, type Kind } from "./alertLedger.svelte.ts";
  let { alerts, onResume }: { alerts: Alerts; onResume: () => void } = $props();
  $effect(() => { document.documentElement.dataset.alerts = JSON.stringify(liveAlerts(alerts.state)); });
</script>

<div class="alerts">
  {@render alert("error")}
  {@render alert("warning")}
  {@render alert("info")}
  {@render alert("success")}
</div>
<!-- the × is drawn by its style, so an alert's text is its words alone -->
{#snippet alert(kind: Kind)}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <span class="alert {kind}" class:show={alerts.state[kind].shown} onclick={() => alerts.click(kind)}>{alerts.state[kind].text}<span class="close" title="Close" onclick={(e) => { e.stopPropagation(); alerts.dismiss(kind); }}></span></span>
{/snippet}
<button class="backup-paused" hidden={!alerts.state.trouble} onclick={onResume}>{alerts.state.trouble}</button>

<style>
  /* the alert area: stuck under the masthead, and always one alert tall, so
     an alert moving in or out moves no text */
  .alerts {
    position: sticky;
    top: var(--alert-area-top, 0px);
    z-index: 55;
    padding: 10px 1.4rem;
    background: var(--bg);
    /* one alert and the area's own padding: the box is measured with it */
    min-height: calc(0.8em * (1.35 + 1.6) + 2px + 20px);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  /* an alert's box: tinted by kind, bordered in its text's colour, its × at the right */
  .alert {
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
  .error { color: #b94a48; background: #f2dede; }
  .warning { color: #8a6d3b; background: #fcf8e3; }
  .info { color: #3a87ad; background: #d9edf7; }
  /* a hidden alert takes no room in the stack */
  .alert:not(.show) { display: none; }
  .close { position: absolute; top: 0; right: 0; bottom: 0; width: 2.6em; cursor: pointer; }
  .close::before { content: "×"; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -52%); font-size: 1.4em; }
  .alert.show { cursor: pointer; pointer-events: auto; }
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
