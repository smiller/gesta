<!-- A press anywhere but a box or its label is swallowed, so a click on
     Skip, Replace or Replace All leaves the cursor in the box it was in. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  let { replace, onFind, onWith, onNext, onOne, onAll, onClose }: {
    replace: Screen["replace"];
    onFind: (value: string) => void;
    onWith: (value: string) => void;
    onNext: (back: boolean) => void;
    onOne: () => void;
    onAll: () => void;
    onClose: () => void;
  } = $props();
  let findInput: HTMLInputElement | undefined = $state();
  let withInput: HTMLInputElement | undefined = $state();
  export function focusFind(): void { findInput?.focus(); findInput?.select(); }
  export function focusWith(): void { withInput?.focus(); }
  const findKey = (e: KeyboardEvent): void => {
    if (e.key !== "Enter" || e.isComposing) return;
    e.preventDefault();
    onNext(e.shiftKey);
  };
  const withKey = (e: KeyboardEvent): void => {
    if (e.key !== "Enter" || e.isComposing) return;
    e.preventDefault();
    onOne();
  };
  const press = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;
    if (t.tagName !== "INPUT" && t.tagName !== "LABEL") e.preventDefault();
  };
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="replacebar" hidden={!replace.open} onmousedown={press} role="search">
  <div class="rows">
    <label for="replacefind">Find</label>
    <input id="replacefind" type="text" autocomplete="off" spellcheck="false" bind:this={findInput} value={replace.find} oninput={(e) => onFind(e.currentTarget.value)} onkeydown={findKey}>
    <span class="after"><span class="count" class:none={replace.count === "none"}>{replace.count}</span></span>
    <label for="replacewith">Replace with</label>
    <input id="replacewith" type="text" autocomplete="off" spellcheck="false" bind:this={withInput} value={replace.with} oninput={(e) => onWith(e.currentTarget.value)} onkeydown={withKey}>
    <span class="after">
      <button type="button" class="word" title="Leave this one and go to the next (Enter in Find)" disabled={!replace.any} onclick={() => onNext(false)}>Skip</button>
      <button type="button" class="word" title="Replace this one and go to the next (Enter in this box)" disabled={!replace.any} onclick={onOne}>Replace</button>
      <button type="button" class="word" title="Replace every one in this entry" disabled={!replace.any} onclick={onAll}>Replace All</button>
    </span>
  </div>
  <button type="button" class="x" title="Close (Esc)" onclick={onClose}>×</button>
</div>

<style>
  .replacebar {
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
  .replacebar[hidden] { display: none; }
  /* ONE GRID for both rows, so the two boxes share their left and right
     edges (pin: replace › ⌃⌘E in the rendered view) */
  .rows { display: grid; grid-template-columns: auto 13rem auto; align-items: center; gap: 4px 8px; }
  .after { display: flex; align-items: center; gap: 8px; }
  input {
    width: 100%;
    box-sizing: border-box;
    font: 13px var(--mono);
    letter-spacing: normal;
    color: var(--bar-ink);
    background: var(--bar-input-bg);
    border: 1px solid var(--bar-input-border);
    border-radius: 4px;
    padding: 4px 6px;
  }
  input:focus { outline: none; border-color: var(--accent); }
  .count { min-width: 5.5em; font-weight: 400; color: var(--bar-link); white-space: nowrap; }
  .count.none { color: #e9a3a3; }
  button {
    font: inherit;
    background: none;
    border: none;
    color: inherit;
    height: 2rem;
    padding: 0 8px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
  }
  button:hover:not(:disabled) { background: var(--bar-input-bg); }
  button:disabled { opacity: 0.4; cursor: default; }
  button.word { border: 1px solid var(--bar-input-border); }
  button.x { width: 2rem; padding: 0; }
</style>
