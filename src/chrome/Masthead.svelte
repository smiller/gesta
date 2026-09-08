<!-- The masthead: the sticky dark bar, ported 2026-09-07 from the current
     app's .site-head (body.html, style.css) with the measurements its
     comments carry. BUILT: the three icons — the bookshelf and the pages
     lists, each a dropdown panel in the one slot the overlays share, and
     the journal icon that goes to today — the date line as a breadcrumb
     with the tag bar under it, the tools, the title row and the Line
     numbering row. The create, rename and delete of a tagged entry and a
     sub-page are the tools' first three buttons, worded per namespace.
     The mode pill leads the tools while the source view is on. The ⌃⌘G bar hangs off the bar's
     bottom edge at the right gutter, its own component; the help card is
     the panel slot's third value. The Go to and Search
     rows are their own components, drawn between the title row and the
     Line numbering row in the current app's order. A panel's rows are anchors, so ⌘-click and middle-click work; a
     row click closes the panel itself, since a click on the open entry's
     own row moves no hash. Attention leaving a panel (a Tab out) dismisses
     it like a click outside; relatedTarget, not activeElement, which is
     mid-flight during focusout. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  import Search from "./Search.svelte";
  import Goto from "./Goto.svelte";
  import LineBar from "./LineBar.svelte";
  import Help from "./Help.svelte";
  import Bookmarks from "./Bookmarks.svelte";
  import Shortcuts from "./Shortcuts.svelte";
  import Backups from "./Backups.svelte";
  let { screen, onToday, onExport, onImport, onInterval, onPanel, onClosePanel, onNewRoot, search, goto, lineBar, bookmarks, shortcuts, backups, onCreate, onRename, onDelete }: {
    screen: Screen;
    onToday: () => void; onExport: () => void; onImport: () => void;
    /* the sub-entry gestures: create under the open entry, rename and delete the open one */
    onCreate: () => void; onRename: () => void; onDelete: () => void;
    onInterval: (n: number) => void;
    /* the opener's click: the page's wiring toggles the slot and fills the rows */
    onPanel: (ns: "page" | "bookshelf" | "help" | "bookmarks" | "shortcuts" | "backups") => void;
    onClosePanel: () => void;
    onNewRoot: (ns: "page" | "bookshelf") => void;
    search: { onToggle: (open: boolean) => void; onQuery: (q: string) => void; onScope: (at: number) => void; onWalk: (dir: 1 | -1) => void; onEnter: () => void; onPick: (i: number) => void };
    goto: { onToggle: (open: boolean) => void; onPick: (level: number, value: string, ns?: string) => void };
    lineBar: { onInput: (kind: "line" | "page", value: string) => void; onEnter: (kind: "line" | "page", value: string, repeat: boolean) => void; onClose: () => void };
    bookmarks: { onKey: (e: KeyboardEvent) => void; onAct: (key: string, what: "jump" | "del" | "key" | "link") => void; onDraft: (value: string) => void; onCommit: (value: string) => void };
    shortcuts: { onQuery: (q: string) => void; onPick: (i: number) => void; onWalk: (dir: 1 | -1) => void; onEnter: () => void; onEdit: () => void; onDraft: (v: string) => void; onSave: () => void; onEscape: () => void };
    backups: { onSetup: () => void; onResume: () => void };
  } = $props();
  let shortcutsCard: { focusInput(): void } | undefined = $state();
  export function focusShortcuts(): void { shortcutsCard?.focusInput(); }
  let bookmarksCard: { focusCard(): void } | undefined = $state();
  export function focusBookmarks(): void { bookmarksCard?.focusCard(); }
  let lineBarEl: { focusAsk(): void } | undefined = $state();
  export function focusLineBar(): void { lineBarEl?.focusAsk(); }
  let gotoRow: { focusFirst(): void } | undefined = $state();
  export function focusGoto(): void { gotoRow?.focusFirst(); }
  let searchRow: { focusInput(): void } | undefined = $state();
  export function focusSearch(): void { searchRow?.focusInput(); }
  const NOUN = { page: "page", bookshelf: "author" } as const;
  const leave = (e: FocusEvent): void => {
    const panel = e.currentTarget as HTMLElement;
    if (!(e.relatedTarget instanceof Node && panel.contains(e.relatedTarget))) onClosePanel();
  };
  /* HOW OFTEN A LINE NUMBER IS DRAWN — the reader's choice, the current
     app's seven */
  const INTERVALS = [[0, "none"], [1, "every line"], [2, "every 2nd"], [3, "every 3rd"], [4, "every 4th"], [5, "every 5th"], [10, "every 10th"]] as const;
  let linesSelect: HTMLSelectElement | undefined = $state();
  export function focusLines(): void { linesSelect?.focus(); }
</script>

<header class="site-head">
  <nav class="site-home">
    <button class="datebtn opener" title="List the authors on the bookshelf" aria-label="List the authors on the bookshelf" onclick={() => onPanel("bookshelf")}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 4.6C6.5 3.6 4.8 3.4 3 3.7v8c1.8-.3 3.5-.1 5 .9 1.5-1 3.2-1.2 5-.9v-8c-1.8-.3-3.5-.1-5 .9z"></path>
        <path d="M8 4.6v8.9"></path>
      </svg>
      <span class="caret">▾</span>
    </button>
    <button class="datebtn opener" title="Open the pages list" aria-label="Open the pages list" onclick={() => onPanel("page")}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 1.8 h5.2 L12 4.6 v9.6 H4 z"></path>
        <path d="M9.2 1.8 v2.8 H12"></path>
      </svg>
      <span class="caret">▾</span>
    </button>
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
    <span class="mode" title="⌃⌘M toggles the markdown source view" hidden={!screen.mdView}>markdown</span>
    <button class="toolbtn" type="button" title="Go to today" hidden={!screen.masthead.showToday} onclick={onToday}>today</button>
    <button class="toolbtn" type="button" title={screen.masthead.buttons.createTitle} hidden={!screen.masthead.buttons.canCreate} onclick={onCreate}>{screen.masthead.buttons.create}</button>
    <button class="toolbtn" type="button" title={screen.masthead.buttons.renameTitle} hidden={!screen.masthead.buttons.canEdit} onclick={onRename}>rename</button>
    <button class="toolbtn" type="button" title={screen.masthead.buttons.deleteTitle} hidden={!screen.masthead.buttons.canEdit} onclick={onDelete}>delete</button>
    <button class="toolbtn" type="button" title="Export every entry as Markdown files" onclick={onExport}>export</button>
    <button class="toolbtn" type="button" title="Import Markdown files from a folder" onclick={onImport}>import</button>
    <button class="toolbtn opener" type="button" title="Automatic folder backups" onclick={() => onPanel("backups")}>backups</button>
    <button class="toolbtn opener" type="button" title="How Gesta works (⌃⌘H)" onclick={() => onPanel("help")}>help</button>
  </div>
  <span class="page-title" hidden={!screen.masthead.title}>{screen.masthead.title}</span>
  <Goto bind:this={gotoRow} goto={screen.goto} {...goto} />
  <Search bind:this={searchRow} search={screen.search} {...search} />
  <Help open={screen.panel === "help"} />
  {#if screen.panel === "bookmarks"}<Bookmarks bind:this={bookmarksCard} bookmarks={screen.bookmarks} {...bookmarks} />{/if}
  {#if screen.panel === "shortcuts"}<Shortcuts bind:this={shortcutsCard} shortcuts={screen.shortcuts} {...shortcuts} />{/if}
  {#if screen.panel === "backups"}<Backups backups={screen.backups} {...backups} />{/if}
  {#if screen.panel === "page" || screen.panel === "bookshelf"}
    <nav class="pages" onfocusout={leave}>
      {#each screen.panelRows as r (r.href)}<a href={r.href} title={r.text} onclick={onClosePanel}>{r.text}</a>{/each}
      {#if !screen.panelRows.length && screen.panelEmpty}<span class="panel-empty">{screen.panelEmpty}</span>{/if}
      <button class="panel-new" type="button" onclick={() => onNewRoot(screen.panel!)}>New {NOUN[screen.panel]}…</button>
    </nav>
  {/if}
  <LineBar bind:this={lineBarEl} lineBar={screen.lineBar} {...lineBar} />
  <details class="page-lines" hidden={!screen.gutter} open={screen.linesOpen} ontoggle={(e) => { screen.linesOpen = (e.currentTarget as HTMLDetailsElement).open; }}>
    <summary>Line numbering</summary>
    <span class="page-lines-body">
      <select aria-label="Line numbering" bind:this={linesSelect} value={screen.interval} onchange={(e) => onInterval(+e.currentTarget.value)}>
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
  .datebtn .caret { font-size: 0.7em; opacity: 0.8; pointer-events: none; }
  /* THE DROPDOWN PANEL, hung off the bar's bottom edge at the gutter. The
     cap is the room below the masthead, in CSS rather than a measurement:
     a JS cap is taken at a MOMENT and the bar grows under an open panel.
     The 100% is the sticky bar's own height (a percentage against the
     containing block's padding box); 18px is the 6px hang plus a 12px
     breathing gap; dvh, not vh, under a phone's retracting URL bar; the
     floor is ONE ROW, since a floor above the room overhangs and strands
     the create row. */
  .pages {
    position: absolute;
    top: calc(100% + 6px);
    left: var(--head-gutter);
    z-index: 80;
    min-width: 190px;
    max-width: 320px;
    background: var(--card-bg);
    border: 1px solid var(--rule);
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    padding: 6px;
    display: flex;
    flex-direction: column;
    max-height: max(48px, calc(100dvh - 100% - 18px));
    overflow-y: auto;
  }
  /* every line on one vertical rhythm, tight: every 10px off a line is
     another root on the screen; flex: none so the lines hold their size
     under the max-height and the panel scrolls */
  .pages a, .pages button, .pages .panel-empty { flex: none; line-height: 1.35; padding: 5px 12px; font-size: 0.95em; }
  .pages a, .pages button { text-align: left; background: none; border: none; font-family: var(--sans); color: var(--ink); border-radius: 4px; cursor: pointer; }
  .pages a:hover, .pages button:hover { background: var(--aside-bg); }
  /* a long name ellipsizes instead of widening the panel */
  .pages a { text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pages .panel-new { color: var(--bar-link); }
  .pages .panel-empty { color: var(--muted); }
  .site-tools { flex: 1 1 auto; justify-content: flex-end; display: flex; align-items: center; gap: 10px; min-width: 0; }
  /* the mode pill: the one sign the page is showing its source */
  .mode {
    font-family: var(--sans);
    font-size: 0.7em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--bar-link);
    border: 1px solid var(--bar-input-border);
    border-radius: 999px;
    padding: 3px 10px;
    user-select: none;
  }
  .mode[hidden] { display: none; }
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
