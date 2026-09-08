<!-- The bookmarks card, ported 2026-09-08 from the current app's
     #bookmarkspanel (body.html, style.css, 22-bookmarks-b.js). The section
     holds focus itself so the bare keys — A, 1-9, a typed trigger — reach
     the page's handler while the card is up; the row editor is the one
     field here. Keyed rows first, then the numbered ones with whitespace
     between; the open entry's row says so, and the foot line then has
     nothing to ask. The keyed rows' column is MEASURED off a probe in a
     row, since a character count is not a width in a proportional face,
     with the floor and the ceiling stated in the cell's own rule. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  let { bookmarks, onKey, onAct, onDraft, onCommit }: {
    bookmarks: Screen["bookmarks"];
    onKey: (e: KeyboardEvent) => void;
    onAct: (key: string, what: "jump" | "del" | "key" | "link") => void;
    onDraft: (value: string) => void;
    onCommit: (value: string) => void;
  } = $props();
  let card: HTMLElement | undefined = $state();
  let list: HTMLElement | undefined = $state();
  let aliasCol = $state("");
  export function focusCard(): void {
    const inp = list?.querySelector<HTMLInputElement>(".bookmark-aliasinput");
    if (inp) { inp.focus(); if (bookmarks.opening) inp.select(); }
    else card?.focus({ preventScroll: true });
  }
  $effect(() => {
    const keyed = bookmarks.rows.filter((r) => r.keyed);
    const host = list?.querySelector("li.bookmark-keyed");
    if (!keyed.length || !host) { aliasCol = ""; return; }
    const probe = document.createElement("span");
    probe.className = "bookmark-key";
    probe.style.cssText = "position:absolute;visibility:hidden;min-width:0;white-space:nowrap";
    host.appendChild(probe);
    let wide = 0;
    for (const r of keyed) { probe.textContent = r.trigger; wide = Math.max(wide, Math.ceil(probe.getBoundingClientRect().width)); }
    probe.remove();
    if (wide) aliasCol = wide + "px";
  });
  const click = (e: MouseEvent, key: string): void => {
    const t = e.target as HTMLElement;
    e.stopPropagation();
    if (t.closest(".bookmark-del")) onAct(key, "del");
    else if (t.closest(".bookmark-setalias")) onAct(key, "key");
    else if (t.closest(".bookmark-link")) onAct(key, "link");
    else if (!t.closest(".bookmark-aliasinput")) onAct(key, "jump");
  };
</script>

<!-- the card holds focus itself so the bare keys reach the handler; the
     row editor is the one field -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_to_interactive_role, a11y_no_noninteractive_element_interactions -->
<section class="helppanel bookmarks" bind:this={card} tabindex="-1" role="dialog" aria-label="Bookmarks" onkeydown={onKey}>
  <h3>Bookmarks</h3>
  <ul class="search-results" bind:this={list} style={aliasCol ? "--alias-col: " + aliasCol : ""}>
    {#if bookmarks.unreadable}<li class="empty">your saved bookmarks are damaged — nothing has been changed</li>
    {:else if !bookmarks.rows.length}<li class="empty">No bookmarks yet.</li>{/if}
    {#each bookmarks.rows as r (r.key)}
      <!-- a row is the jump the pointer cursor promises; the keys reach it through the card -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
      <li class="hit" class:bookmark-keyed={r.keyed} class:bookmark-cut={r.cut} class:bookmark-typing={bookmarks.buf && r.keyed && r.trigger.indexOf(bookmarks.buf) === 0} data-key={r.key} onclick={(e) => click(e, r.key)}>
        <span class="bookmark-key">
          {#if bookmarks.editing === r.key}
            <input class="bookmark-aliasinput" type="text" value={bookmarks.draft} aria-label={"Key for " + r.label} oninput={(e) => onDraft(e.currentTarget.value)} onkeydown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onCommit(e.currentTarget.value); } }}>
          {:else}{r.trigger}{/if}
        </span>
        <span class="bookmark-label">{r.label}</span>
        {#if r.here}<span class="bookmark-here">you are here</span>{/if}
        {#if bookmarks.editing !== r.key}
          <button class="bookmark-setalias" type="button" aria-label={(r.keyed ? "Change the key for " : "Give a key to ") + r.label}>key</button>
          <button class="bookmark-link" type="button" aria-label={"Link to " + r.label}>link</button>
        {/if}
        <button class="bookmark-del" type="button" aria-label={"Delete bookmark " + r.label}>×</button>
      </li>
    {/each}
  </ul>
  {#if bookmarks.foot && !bookmarks.unreadable}
    <p class="bookmarks-add">
      {#if bookmarks.foot.full}<b>Bookmarks are full.</b> Delete one, or give one its own key.
      {:else}Press <code>A</code> to add bookmark for <b>{bookmarks.foot.name}</b>{/if}
    </p>
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
    display: flex;
    flex-direction: column;
  }
  .helppanel:focus { outline: none; }
  h3 { font-family: var(--sans); font-size: 0.75em; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin: 1.5em 0 0.4em; }
  ul { list-style: none; margin: 0; padding: 0; min-height: 0; overflow-y: auto; }
  li { display: flex; align-items: baseline; gap: 0.7em; padding: 8px 4px; border-top: 1px solid var(--rule); font-size: 0.85em; cursor: pointer; }
  li:first-child { border-top: none; }
  li.hit:hover { background: var(--aside-bg); }
  li.empty { color: var(--muted); font-style: italic; cursor: default; }
  .bookmark-key { font-family: var(--sans); font-weight: 600; color: var(--accent); font-variant-numeric: tabular-nums; min-width: 2.2em; }
  li.bookmark-keyed .bookmark-key { min-width: min(12em, max(2.2em, var(--alias-col, 0px))); max-width: 12em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  li.bookmark-cut { margin-top: 1.1em; }
  li.bookmark-typing .bookmark-key { background: var(--flash); border-radius: 3px; }
  .bookmark-aliasinput { width: 7.5em; font: inherit; font-family: var(--sans); font-weight: 600; padding: 0 3px; border: 1px solid var(--accent); border-radius: 3px; background: transparent; color: var(--accent); }
  .bookmark-setalias, .bookmark-link { flex: none; border: 0; background: none; cursor: pointer; padding: 0 0.2em; font: 0.9em/1 var(--sans); color: var(--rule); }
  li:hover .bookmark-setalias, li:hover .bookmark-link { color: var(--muted); }
  .bookmark-setalias:hover, .bookmark-link:hover { color: var(--accent); }
  .bookmark-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bookmark-here { flex: none; color: var(--muted); font-style: italic; font-size: 0.85em; }
  .bookmark-del { flex: none; border: 0; background: none; cursor: pointer; padding: 0 0.2em; font: 1.1em/1 var(--sans); color: var(--rule); }
  li:hover .bookmark-del { color: var(--muted); }
  .bookmark-del:hover { color: var(--accent); }
  .bookmarks-add { margin: 0.9em 0 0; padding-top: 0.7em; border-top: 1px solid var(--rule); font-size: 0.85em; color: var(--muted); }
  .bookmarks-add code { font-family: var(--sans); font-weight: 600; color: var(--accent); background: var(--aside-bg); border: 1px solid var(--rule); border-radius: 3px; padding: 0.05em 0.3em; }
</style>
