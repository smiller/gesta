<!-- The floating format bar, ported 2026-09-07 from the current app's
     .fmt (body.html, style.css, 14-floating-format-toolbar.js): a fixed
     bar floating over the selection, placed by the page on every
     selection change and scroll and clamped under the masthead. Inside a
     code block it offers ONE thing, the toggle back out. A mousedown on
     the bar is swallowed so the editor's selection survives the click. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  let { bar, onAct }: { bar: Screen["bar"]; onAct: (act: string) => void } = $props();
</script>

<!-- a mouse's surface: focus stays in the editor, whose selection the
     bar acts on, so the bar itself takes none -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div class="fmt" class:show={bar.show} class:incode={bar.incode} style="left: {bar.left}px; top: {bar.top}px" onmousedown={(e) => e.preventDefault()} role="toolbar" aria-label="Formatting">
  <button class="b" class:on={bar.on.bold} title="Bold (⌘B)" onclick={() => onAct("bold")}>B</button>
  <button class="i" class:on={bar.on.italic} title="Italic (⌘I)" onclick={() => onAct("italic")}>I</button>
  <button class="u" class:on={bar.on.underline} title="Underline (⌘U)" onclick={() => onAct("underline")}>U</button>
  <button class="s" class:on={bar.on.strike} title="Strikethrough" onclick={() => onAct("strike")}>S</button>
  <button class="h" class:on={bar.on.heading} title="Heading" onclick={() => onAct("heading")}>H</button>
  <button class:on={bar.on.quote} title="Quote" onclick={() => onAct("quote")}>❝</button>
  <button class="code" class:on={bar.on.code} title="Code block" onclick={() => onAct("code")}>&lt;/&gt;</button>
  <button title="Curl straight quotes (⌘')" onclick={() => onAct("curl")}>‘’</button>
  <button class="ct" title="Copy a reference to this passage (⌃⌘R)" onclick={() => onAct("reference")}>Ref</button>
  <button class="wc" title="Word count of the selection (⌃⌘W)" onclick={() => onAct("words")}>Words</button>
  <button class="t" title="Move selection to a new sub-entry" hidden={!bar.canTag} onclick={() => onAct("tag")}>Tag</button>
</div>

<style>
  .fmt {
    position: fixed;
    z-index: 70;
    display: flex;
    background: var(--bar-bg);
    color: var(--bar-ink);
    border-radius: 6px;
    box-shadow: 0 6px 24px -6px rgba(0, 0, 0, 0.45);
    padding: 3px;
    transform: translate(-50%, calc(-100% - 10px));
    opacity: 0;
    pointer-events: none;
    transition: opacity .12s ease;
  }
  .fmt.show { opacity: 1; pointer-events: auto; }
  .fmt.incode button:not(.code) { display: none; }
  .fmt::after { content: ""; position: absolute; left: 50%; top: 100%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: var(--bar-bg); }
  .fmt button {
    background: none;
    border: none;
    color: inherit;
    font-family: var(--serif);
    font-size: 0.9em;
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 4px;
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .fmt button:hover { background: var(--bar-input-bg); }
  .fmt button.on { color: var(--gold); }
  .fmt button[hidden] { display: none; }
  .fmt .b { font-weight: 700; }
  .fmt .i { font-style: italic; }
  .fmt .u { text-decoration: underline; }
  .fmt .s { text-decoration: line-through; }
  .fmt .h { font-family: var(--sans); font-size: 0.75em; font-weight: 600; }
  /* the word-pill buttons: a serif label would be crammed into the square */
  .fmt .ct, .fmt .wc, .fmt .t { font-family: var(--sans); font-size: 0.72em; font-weight: 600; letter-spacing: 0.06em; width: auto; padding: 0 10px; }
  .fmt .t { border-left: 1px solid var(--bar-input-border); border-radius: 0 4px 4px 0; }
</style>
