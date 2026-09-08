<!-- The masthead's Search row, ported 2026-09-07 from the current app's
     .page-search (body.html, style.css, 27-the-masthead-search-line.js):
     a native <details> whose summary is the toggle, a scope select and the
     input side by side, and the results hanging BELOW the whole bar as an
     overlay — out of flow, so a long match set cannot grow the sticky bar
     until it swallows the viewport; its height is the window less the
     bar, in the containing block's own coordinates, so there is no moment
     at which it is measured and none at which it goes stale. The keys
     live on the INPUT: the arrows belong to whatever else has focus, and
     the select's arrows open its own list. A modified arrow is not a walk.
     The row ↑↓ landed on carries an inset bar a hover never paints, since
     the overlay drops onto wherever the pointer already rests. -->
<script lang="ts">
  import type { SearchState } from "./screen.svelte.ts";
  import { SEARCH_CAP } from "../store/search.ts";
  let { search, onToggle, onQuery, onScope, onWalk, onEnter, onPick }: {
    search: SearchState;
    onToggle: (open: boolean) => void;
    onQuery: (q: string) => void;
    onScope: (at: number) => void;
    onWalk: (dir: 1 | -1) => void;
    onEnter: () => void;
    onPick: (i: number) => void;
  } = $props();
  let input: HTMLInputElement | undefined = $state();
  export function focusInput(): void { input?.focus(); }
  const keydown = (e: KeyboardEvent): void => {
    if (e.key === "Enter") { e.preventDefault(); onEnter(); return; }
    if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (dir) { e.preventDefault(); onWalk(dir); }
  };
  const groups = $derived.by(() => {
    const out: { group: string | null; at: number[] }[] = [];
    search.options.forEach((o, i) => {
      const last = out[out.length - 1];
      if (last && last.group === o.group) last.at.push(i); else out.push({ group: o.group, at: [i] });
    });
    return out;
  });
</script>

<details class="page-search" open={search.open} ontoggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}>
  <summary>Search</summary>
  <div class="page-search-body">
    <select aria-label="Search scope" value={search.scopeAt} onchange={(e) => onScope(+e.currentTarget.value)}>
      {#each groups as g (g.at[0])}
        {#if g.group}<optgroup label={g.group}>{#each g.at as i (i)}<option value={i}>{search.options[i].label}</option>{/each}</optgroup>
        {:else}{#each g.at as i (i)}<option value={i}>{search.options[i].label}</option>{/each}{/if}
      {/each}
    </select>
    <input type="search" class="search-input" placeholder="Search" aria-label="Search entries" autocomplete="off"
      bind:this={input} value={search.query} oninput={(e) => onQuery(e.currentTarget.value)} onkeydown={keydown}>
    <ul class="search-results">
      {#if search.empty}<li class="empty">{search.empty}</li>{/if}
      {#each search.rows as r, i (i)}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
        <li class="hit" class:active={i === search.active} onclick={() => onPick(i)}>
          <span class="where">{r.where}</span>
          <span class="snip">{#each r.runs as run, k (k)}{#if run.mark}<mark>{run.text}</mark>{:else}{run.text}{/if}{/each}</span>
        </li>
      {/each}
      {#if search.capped}<li class="more">Showing the first {SEARCH_CAP} matches — narrow your search.</li>{/if}
    </ul>
  </div>
</details>

<style>
  .page-search { flex: 0 0 100%; min-width: 0; font-family: var(--sans); font-size: 0.85em; }
  .page-search > summary { color: var(--bar-link); cursor: pointer; width: fit-content; }
  .page-search > summary:hover { color: var(--bar-ink); }
  .page-search-body { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  .page-search-body select {
    min-height: var(--masthead-control-h);
    font-family: var(--sans);
    font-size: 1em;
    border: 1px solid var(--rule);
    border-radius: 4px;
    padding: 5px 7px;
    color: var(--ink);
    background: var(--card-bg);
    width: auto;
    max-width: 100%;
  }
  .page-search-body select:focus { outline: none; border-color: var(--accent); }
  /* min-width:0 lets the input shrink beside the select rather than hold
     its intrinsic width and wrap to a line of its own */
  .search-input {
    flex: 1 1 10em; min-width: 0; margin: 0;
    min-height: var(--masthead-control-h);
    box-sizing: border-box;
    padding: 8px 12px;
    font-family: var(--sans);
    font-size: 0.95em;
    color: var(--ink);
    background: var(--aside-bg);
    border: 1px solid var(--rule);
    border-radius: 5px;
  }
  .search-input:focus { outline: none; border-color: var(--accent); }
  .search-results {
    list-style: none; margin: 0; padding: 0;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: calc(100vh - 100% - 8px);
    overflow-y: auto;
    background: var(--card-bg);
    border-bottom: 1px solid var(--rule);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  }
  /* an empty list would hang a stray rule across the window */
  .search-results:empty { display: none; }
  .search-results li {
    display: block;
    padding: 8px var(--head-gutter);
    border-top: 1px solid var(--rule);
    font-size: 0.85em;
    cursor: pointer;
  }
  .search-results li:first-child { border-top: none; }
  .search-results li:hover { background: var(--aside-bg); }
  .search-results li.active { background: var(--aside-bg); box-shadow: inset 3px 0 0 var(--accent); }
  .search-results .where { display: block; font-family: var(--sans); font-variant-numeric: tabular-nums; color: var(--accent); margin-bottom: 2px; }
  .search-results .snip { color: var(--muted); }
  .search-results mark { background: var(--flash); color: inherit; }
  .search-results .empty, .search-results .more { color: var(--muted); font-style: italic; cursor: default; }
  .search-results .empty:hover, .search-results .more:hover { background: none; }
</style>
