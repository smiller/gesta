<!-- The masthead: the sticky dark bar, ported 2026-09-07 from the current
     app's .site-head (body.html, style.css) with the measurements its
     comments carry. THIS SLICE: the journal icon, the date line as a
     breadcrumb with the tag bar under it, the tools, the title row and the
     Line numbering row. Not yet: the books and pages icons (their panels),
     the tagged-entry and sub-page create, rename and delete, the Go to and
     Search rows, help, the mode pill, the ⌃⌘G bar. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  let { screen, onToday, onExport, onImport, onBackups, onClear, onInterval }: {
    screen: Screen;
    onToday: () => void; onExport: () => void; onImport: () => void; onBackups: () => void; onClear: () => void;
    onInterval: (n: number) => void;
  } = $props();
  const INTERVALS = [[0, "none"], [1, "every line"], [5, "every 5"], [10, "every 10"]] as const;
</script>

<header class="site-head">
  <nav class="site-home">
    <button class="datebtn" title="Go to today" aria-label="Go to today" onclick={onToday}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
        <rect x="2.5" y="3.5" width="11" height="10" rx="1.5"></rect>
        <path d="M2.5 6.5 h11"></path>
        <path d="M5.5 2 v3 M10.5 2 v3"></path>
      </svg>
    </button>
    <span class="date-stack">
      <span class="datelabel">
        {#each screen.masthead.crumbs as c, i (i)}{#if i}/{/if}{#if c.href}<a class="datelink date-unit" href={c.href} title={c.title}>{c.text}</a>{:else}<span class="date-unit">{c.text}</span>{/if}{/each}
        {#if screen.masthead.leaf !== null}{#if screen.masthead.crumbs.length}{" › "}{/if}<strong class="tag-current">{screen.masthead.leaf}</strong>{/if}
      </span>
      <span class="tagbar">{#each screen.masthead.tags as t (t.href)}<a href={t.href}>{t.text}</a>{/each}</span>
    </span>
  </nav>
  <div class="site-tools">
    <button class="toolbtn" type="button" title="Go to today" hidden={!screen.masthead.showToday} onclick={onToday}>today</button>
    <button class="toolbtn" type="button" title="Export every entry as Markdown files" onclick={onExport}>export</button>
    <button class="toolbtn" type="button" title="Import Markdown files from a folder" onclick={onImport}>import</button>
    <button class="toolbtn" type="button" title="Automatic folder backups" onclick={onBackups}>{screen.backupsLabel}</button>
    <button class="toolbtn" type="button" title="Delete every stored entry" onclick={onClear}>clear</button>
  </div>
  <span class="page-title" hidden={!screen.masthead.title}>{screen.masthead.title}</span>
  <details class="page-lines" hidden={!screen.gutter}>
    <summary>Line numbering</summary>
    <span class="page-lines-body">
      <select aria-label="Line numbering" value={screen.interval} onchange={(e) => onInterval(+e.currentTarget.value)}>
        {#each INTERVALS as [n, label] (n)}<option value={n}>{label}</option>{/each}
      </select>
    </span>
  </details>
</header>

<style>
  /* FLEX-WRAP, NOT A BREAKPOINT: the two slots sit side by side while they
     fit and the tools drop to their own line when they do not. A grid with
     `1fr auto` cannot do it — the 1fr column collapses past zero and the
     nowrap date prints straight over the tools. Grows past --masthead-h
     when a day's tag list wraps; the sage rule rides along as a box-shadow
     so it stays pinned to the bottom whatever the height. The side gutter
     is declared HERE so the panels hanging off the bar inherit it. */
  .site-head {
    position: sticky;
    top: 0;
    z-index: 60;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 24px;
    row-gap: 4px;
    min-height: var(--masthead-h);
    --head-gutter: 32px;
    padding: 0 var(--head-gutter);
    background: var(--bar-bg);
    color: var(--bar-ink);
    border-bottom: 1px solid var(--bar-shadow);
    box-shadow: 0 2px 0 var(--rule);
  }
  /* the serif face for the whole left slot, so the date reads the same
     whether or not it is a link, and matches the tag list */
  .site-home { display: flex; align-items: center; gap: 7px; min-width: 0; font-family: var(--serif); font-size: 0.9em; }
  .date-stack { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 0; }
  .site-home a, .datebtn, .toolbtn {
    color: var(--bar-link);
    text-decoration: none;
    font-family: var(--sans);
    font-size: 0.85em;
    white-space: nowrap;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .site-home a:hover, .datebtn:hover, .toolbtn:hover { color: var(--bar-ink); }
  .tagbar { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px; }
  .tagbar a { white-space: nowrap; font-family: var(--serif); color: var(--bar-link); text-decoration: none; }
  .tagbar a:hover { color: var(--bar-ink); text-decoration: underline; }
  /* the open entry's own label reads the same weight and colour in the
     crumb leaf and the title row, so retuning one cannot leave the other */
  .tag-current, .page-title { color: var(--bar-ink); font-weight: 600; }
  /* the leaf sizes to its text but caps at 60vw and WRAPS inside that: a
     day tag has no length rule, and an uncapped nowrap leaf ran off the bar */
  .tag-current { display: inline-block; width: max-content; max-width: 60vw; overflow-wrap: anywhere; white-space: normal; }
  .site-home a.datelink { color: inherit; font: inherit; }
  /* THE WHOLE CRUMB READS AT THE TITLE'S WEIGHT (measured 2026-08-04 in
     the current app: the play read as the least important thing) */
  .datelabel .date-unit { font-weight: 600; }
  .datelabel a:hover { text-decoration: underline; }
  .datelabel { white-space: nowrap; }
  /* on a wide bar the crumb may STACK a long date+tag onto its own line
     instead of painting over the toolbar; 900 prices the toolbar's width */
  @media (min-width: 900px) { .datelabel { white-space: normal; } }
  .date-unit { white-space: nowrap; }
  .datebtn { display: inline-flex; align-items: center; gap: 3px; }
  .datebtn svg { width: 17px; height: 17px; display: block; pointer-events: none; }
  .site-tools { flex: 1 1 auto; justify-content: flex-end; display: flex; align-items: center; gap: 10px; min-width: 0; }
  /* the full-width rows take a line each; min-width:0 is load-bearing so a
     long select option or an unbroken title cannot push the sticky bar
     wider than the viewport */
  .page-title, .page-lines { flex: 0 0 100%; min-width: 0; }
  /* the title WRAPS with `anywhere`, the only value that shrinks the flex
     item's min-content; the vh cap bounds an untrusted imported heading */
  .page-title { font-family: var(--serif); font-size: 0.9em; overflow-wrap: anywhere; max-height: 16vh; overflow: hidden; }
  .page-lines { font-family: var(--sans); font-size: 0.85em; }
  .page-lines > summary { color: var(--bar-link); cursor: pointer; width: fit-content; }
  .page-lines > summary:hover { color: var(--bar-ink); }
  .page-lines-body { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  /* ONE select rule for every masthead row; a new row joins this selector */
  .page-lines-body select {
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
  .page-lines-body select:focus { outline: none; border-color: var(--accent); }
</style>
