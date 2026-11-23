<!-- One highlight, which the pointer moves only by moving: the menu may
     open under a pointer at rest. A window resized closes the menu, as a Mac
     menu closes: its menu area was read for the window it opened in. -->
<script lang="ts">
  import type { MenuRow } from "./mastheadModel.ts";
  import { menuItems, type MenuName, type MenuAct, type CloseReason } from "./menuModel.ts";
  let { name, rows, empty, acts, sel, menus, onLeave }: {
    name: MenuName; rows: MenuRow[]; empty: string; acts: MenuAct[]; sel: number;
    menus: { onKey: (e: KeyboardEvent) => boolean; onHover: (i: number) => void; onChoose: (i: number) => void; onClose: (reason: CloseReason) => void; onMounted: (menuRight: number) => void };
    onLeave: (e: FocusEvent) => void;
  } = $props();
  const items = $derived(menuItems(rows, acts.map((a) => a.text)));
  const rowItem = $derived(new Map(items.flatMap((it, j) => (it.row === null ? [] : [[it.row, j] as const]))));
  const actItem = $derived(new Map(items.flatMap((it, j) => (it.act === null ? [] : [[it.act, j] as const]))));
  const els: HTMLElement[] = $state([]);
  let nav: HTMLElement | undefined = $state();
  /* the other menu opened over this one starts at its top
     (pin: menus › the commonplace icon over the bookshelf menu) */
  $effect(() => { void name; if (nav) nav.scrollTop = 0; });
  $effect(() => { els[sel]?.scrollIntoView({ block: "nearest" }); });
  function opened(el: HTMLElement): { destroy(): void } {
    el.focus({ preventScroll: true });
    menus.onMounted(el.getBoundingClientRect().right);
    const resized = (): void => menus.onClose("resize");
    window.addEventListener("resize", resized);
    /* taken down by a panel taking the slot, the menu is closed all the same */
    return { destroy: () => { window.removeEventListener("resize", resized); menus.onClose("displaced"); } };
  }
</script>

<nav class="menu" tabindex="-1" bind:this={nav} use:opened onkeydown={(e) => { if (menus.onKey(e)) e.preventDefault(); }} onfocusout={onLeave}>
  {#each rows as r, i (r.href || "shelf " + r.text)}
    {#if r.shelf}<span class="shelf">{r.text}</span>
    {:else}<a href={r.href} title={r.text} class:shelved={r.shelved} class:sel={rowItem.get(i) === sel} bind:this={els[rowItem.get(i)!]} onmousemove={() => menus.onHover(rowItem.get(i)!)} onclick={() => menus.onClose("chosen")}>{r.text}</a>{/if}
  {/each}
  {#if !rows.length && empty}<span class="menu-empty">{empty}</span>{/if}
  {#each acts as a, k (a.text)}
    <button class="menu-act" type="button" class:sel={actItem.get(k) === sel} bind:this={els[actItem.get(k)!]} onmousemove={() => menus.onHover(actItem.get(k)!)} onclick={() => menus.onChoose(actItem.get(k)!)}>{a.text}</button>
  {/each}
</nav>

<style>
  /* A MENU, hung off the bar's bottom edge at the gutter. The
     cap is the room below the masthead, in CSS rather than a measurement:
     a JS cap is taken at a MOMENT and the bar grows under an open menu.
     The 100% is the sticky bar's own height (a percentage against the
     containing block's padding box); 18px is the 6px hang plus a 12px
     breathing gap; dvh, not vh, under a phone's retracting URL bar; the
     floor is ONE ROW, since a floor above the room overhangs and strands
     the create row. ONE WIDTH for both menus, so a long name added to
     either changes neither: a longer name is cut, its whole in its title. */
  .menu {
    position: absolute;
    top: calc(100% + var(--alert-area-h, 0px) + 6px);
    left: var(--head-gutter);
    z-index: 80;
    width: 240px;
    background: var(--card-bg);
    border: 1px solid var(--rule);
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    padding: 6px;
    display: flex;
    flex-direction: column;
    max-height: max(48px, calc(100dvh - 100% - var(--alert-area-h, 0px) - 18px));
    overflow-y: auto;
    outline: none;
  }
  /* every line on one vertical rhythm, tight: every 10px off a line is
     another root on the screen; flex: none so the lines hold their size
     under the max-height and the menu scrolls */
  .menu a, .menu button, .menu .menu-empty { flex: none; line-height: 1.35; padding: 5px 12px; font-size: 0.95em; }
  .menu a, .menu button { text-align: left; background: none; border: none; font-family: var(--sans); color: var(--ink); border-radius: 4px; cursor: pointer; }
  .menu a { text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .menu .sel { background: var(--aside-bg); box-shadow: inset 3px 0 0 var(--accent); }
  .menu .menu-act { color: var(--accent); font-style: italic; }
  .menu .menu-act:first-of-type { margin-top: 6px; border-top: 1px solid var(--rule); border-radius: 0 0 4px 4px; padding-top: 9px; }
  /* a shelf's heading in the list's own type, its authors set in under it */
  .menu .shelf { flex: none; line-height: 1.35; padding: 8px 12px 2px; font-size: 0.95em; font-family: var(--sans); font-weight: 600; color: var(--ink); }
  .menu .shelf:first-child { padding-top: 5px; }
  .menu a.shelved { padding-left: 26px; }
  .menu .menu-empty { color: var(--muted); }
</style>
