<!-- ONE fixed button over whichever block the mouse is nearest inside,
     ported 2026-09-08 from the current app's #copybtn (body.html,
     style.css, 11-copy-a-code-block…js). Its mousedown is swallowed so the
     editor's selection stays; the page places it and names what it copies. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  let { copy, onCopy }: { copy: Screen["copy"]; onCopy: () => void } = $props();
</script>

<button class="copybtn" class:show={copy.show} type="button" title={copy.title} style="top: {copy.top}px; right: {copy.right}px; min-width: {copy.minWidth ? copy.minWidth + 'px' : ''}" onmousedown={(e) => e.preventDefault()} onclick={onCopy}>{copy.label}</button>

<style>
  .copybtn {
    position: fixed;
    z-index: 65;
    display: none;
    font-family: var(--sans);
    font-size: 0.72em;
    letter-spacing: 0.08em;
    color: var(--muted);
    background: var(--aside-bg);
    border: 1px solid var(--rule);
    border-radius: 3px;
    padding: 2px 8px;
    cursor: pointer;
  }
  .copybtn:hover { color: var(--accent); border-color: var(--accent); }
  .copybtn.show { display: block; }
</style>
