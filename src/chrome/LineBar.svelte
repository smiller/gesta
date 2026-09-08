<!-- ⌃⌘G's find bar, ported 2026-09-07 from the current app's .linebar
     (body.html, style.css, 20-g-go-to-a-line.js): top right under the
     masthead, hung off its bottom edge like the panels. ONE PAIR PER KIND
     OF NUMBER, label and box together so the entry can hide either as a
     unit — a box with a fixed label cannot lie about what it wants — and
     an "or" between them where there are two, so the pair reads as a
     choice. No press on the bar may move focus except into a box: a
     mousedown anywhere but an input or its label is swallowed. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  let { lineBar, onInput, onEnter, onClose }: {
    lineBar: Screen["lineBar"];
    onInput: (kind: "line" | "page", value: string) => void;
    onEnter: (kind: "line" | "page", value: string, repeat: boolean) => void;
    onClose: () => void;
  } = $props();
  let lineInput: HTMLInputElement | undefined = $state();
  let pageInput: HTMLInputElement | undefined = $state();
  /* the box the entry offers first: the Line box where it stands */
  export function focusAsk(): void {
    const el = lineBar.kind === "page" ? pageInput : lineInput;
    el?.focus(); el?.select();
  }
  const key = (kind: "line" | "page") => (e: KeyboardEvent): void => {
    if (e.key !== "Enter" || e.isComposing) return;
    e.preventDefault();
    onEnter(kind, (e.currentTarget as HTMLInputElement).value, e.repeat);
  };
  const press = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;
    if (t.tagName !== "INPUT" && t.tagName !== "LABEL") e.preventDefault();
  };
</script>

<!-- the mousedown is swallowed everywhere but the boxes and their
     labels, so a press on the bar's padding cannot blur the box -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="linebar" hidden={!lineBar.open} onmousedown={press} role="search">
  <span class="ask" hidden={lineBar.kind === "page"}>
    <label for="lineinput">Line</label>
    <input id="lineinput" type="text" autocomplete="off" spellcheck="false" bind:this={lineInput} value={lineBar.line} oninput={(e) => onInput("line", e.currentTarget.value)} onkeydown={key("line")}>
  </span>
  <span class="askor" hidden={lineBar.kind !== "both"}>, or</span>
  <span class="ask" hidden={lineBar.kind === "line"}>
    <label for="folioinput">Page</label>
    <input id="folioinput" type="text" autocomplete="off" spellcheck="false" bind:this={pageInput} value={lineBar.page} oninput={(e) => onInput("page", e.currentTarget.value)} onkeydown={key("page")}>
  </span>
  <button type="button" title="Close (Esc)" onclick={onClose}>×</button>
</div>

<style>
  .linebar {
    position: absolute;
    top: calc(100% + 8px);
    right: var(--head-gutter);
    z-index: 70;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bar-bg);
    color: var(--bar-ink);
    border-radius: 6px;
    box-shadow: 0 6px 24px -6px rgba(0, 0, 0, 0.45);
    padding: 4px 4px 4px 12px;
    font-family: var(--sans);
    font-size: 0.72em;
    font-weight: 600;
    letter-spacing: 0.06em;
  }
  .linebar[hidden] { display: none; }
  .ask { display: flex; align-items: center; gap: 8px; }
  .ask[hidden] { display: none; }
  .askor { margin-left: -5px; }
  .askor[hidden] { display: none; }
  input {
    width: 4.5rem;
    font: inherit;
    letter-spacing: normal;
    color: var(--bar-ink);
    background: var(--bar-input-bg);
    border: 1px solid var(--bar-input-border);
    border-radius: 4px;
    padding: 4px 6px;
  }
  input:focus { outline: none; border-color: var(--accent); }
  button {
    font: inherit;
    background: none;
    border: none;
    color: inherit;
    width: 2rem;
    height: 2rem;
    border-radius: 4px;
    cursor: pointer;
  }
  button:hover { background: var(--bar-input-bg); }
</style>
