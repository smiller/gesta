<!-- The custom shortcuts popup, ported 2026-09-08 from the current app's
     #shortcutspanel (body.html, style.css, 21-custom-shortcuts-text-
     expander.js): a code box that filters the table by prefix, the rows
     with the first highlighted, Enter or a mousedown inserting the
     highlighted expansion, and the editor beneath — one shortcut per
     line as code: expansion. A row takes the MOUSEDOWN, not the click,
     so focus never leaves the box. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  let { shortcuts, onQuery, onPick, onWalk, onEnter, onEdit, onDraft, onSave, onEscape }: {
    shortcuts: Screen["shortcuts"];
    onQuery: (q: string) => void; onPick: (i: number) => void; onWalk: (dir: 1 | -1) => void; onEnter: () => void;
    onEdit: () => void; onDraft: (v: string) => void; onSave: () => void; onEscape: () => void;
  } = $props();
  let input: HTMLInputElement | undefined = $state();
  export function focusInput(): void { input?.focus(); }
  const keydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") { onEscape(); return; }
    const t = e.target as HTMLElement;
    if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON") return;
    if (e.key === "Enter") { e.preventDefault(); onEnter(); return; }
    if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (dir) { e.preventDefault(); onWalk(dir); }
  };
</script>

<!-- the keys reach the popup through the section; the box is the one field -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_element_to_interactive_role -->
<section class="helppanel shortcuts" role="dialog" aria-label="Shortcuts" onkeydown={keydown}>
  <input type="search" class="search-input" placeholder="Type a code…" aria-label="Find a shortcut" autocomplete="off" spellcheck="false" bind:this={input} value={shortcuts.query} oninput={(e) => onQuery(e.currentTarget.value)}>
  <ul class="search-results">
    {#if shortcuts.empty}<li class="empty">{shortcuts.empty}</li>{/if}
    {#each shortcuts.rows as s, i (i)}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li class="hit" class:active={i === shortcuts.active} onmousedown={(e) => { e.preventDefault(); onPick(i); }}>
        <span class="shortcut-code">{s.code}</span><span class="shortcut-exp">{s.expansion}</span>
      </li>
    {/each}
  </ul>
  <button class="toolbtn" type="button" onclick={onEdit}>Edit</button>
  {#if shortcuts.editing}
    <div class="editbox">
      <p class="note">One shortcut per line, as <code>code: expansion</code>. Lines starting with # are ignored. Codes are case-sensitive.</p>
      <textarea class="shortcut-edit" rows="8" spellcheck="false" aria-label="Shortcut list" value={shortcuts.draft} oninput={(e) => onDraft(e.currentTarget.value)}></textarea>
      <button class="toolbtn" type="button" onclick={onSave}>Save</button>
    </div>
  {/if}
</section>

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
  .search-input { width: 100%; box-sizing: border-box; margin: 12px 0 6px; padding: 8px 12px; font-family: var(--sans); font-size: 0.95em; color: var(--ink); background: var(--aside-bg); border: 1px solid var(--rule); border-radius: 5px; }
  .search-input:focus { outline: none; border-color: var(--accent); }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: block; padding: 8px 4px; border-top: 1px solid var(--rule); font-size: 0.85em; cursor: pointer; }
  li:first-child { border-top: none; }
  li.hit:hover { background: var(--aside-bg); }
  li.active { background: var(--aside-bg); box-shadow: inset 3px 0 0 var(--accent); }
  li.empty { color: var(--muted); font-style: italic; cursor: default; }
  .shortcut-code { font-family: var(--sans); font-weight: 600; color: var(--accent); margin-right: 0.6em; }
  .shortcut-exp { color: var(--muted); }
  .toolbtn { margin-top: 8px; font-family: var(--sans); font-size: 0.85em; color: var(--accent); background: none; border: 1px solid var(--rule); border-radius: 4px; padding: 3px 10px; cursor: pointer; }
  .toolbtn:hover { border-color: var(--accent); }
  .note { font-size: 0.85em; color: var(--muted); margin: 0.4em 0 1em; }
  .note code { font-family: var(--mono); font-size: 0.85em; background: var(--aside-bg); border: 1px solid var(--rule); border-radius: 3px; padding: 0.05em 0.3em; }
  .shortcut-edit { display: block; width: 100%; box-sizing: border-box; margin: 4px 0 8px; padding: 8px; font: 0.85em var(--mono, monospace); color: var(--ink); background: var(--aside-bg); border: 1px solid var(--rule); border-radius: 5px; resize: vertical; }
  .shortcut-edit:focus { outline: none; border-color: var(--accent); }
</style>
