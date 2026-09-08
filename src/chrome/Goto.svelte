<!-- The masthead's Go to row, ported 2026-09-07 from the current app's
     .page-goto (body.html, style.css, 19-the-consolidated-go-to-line…js):
     a native <details> whose summary is the toggle and whose body is a
     run of native selects — the browser owns each open list. A level with
     no preselect leads with a disabled placeholder, which under terminal
     navigation is SAFETY: a rebuilt select preselecting a real value would
     navigate on the first closed-select arrow-press. A sentinel is the
     pickable "← the thing itself" row, value "". Groups are minted on
     first use, so the ungrouped rows above keep their place. -->
<script lang="ts">
  import type { Level } from "./gotoModel.ts";
  let { goto, onToggle, onPick }: {
    goto: { open: boolean; levels: Level[] };
    onToggle: (open: boolean) => void;
    onPick: (level: number, value: string, ns?: string) => void;
  } = $props();
  let body: HTMLElement | undefined = $state();
  export function focusFirst(): void { body?.querySelector("select")?.focus(); }
  const grouped = (l: Level): { group: string | null; rows: Level["rows"] }[] => {
    const out: { group: string | null; rows: Level["rows"] }[] = [];
    for (const r of l.rows) {
      const g = r.group || null;
      const last = out[out.length - 1];
      if (last && last.group === g) last.rows.push(r); else out.push({ group: g, rows: [r] });
    }
    return out;
  };
  const selected = (l: Level, r: Level["rows"][number]): boolean => l.value !== null && r.v === l.value && (!l.valueNs || r.ns === l.valueNs);
  const pick = (l: Level, e: Event): void => {
    const s = e.currentTarget as HTMLSelectElement;
    const o = s.options[s.selectedIndex];
    if (!o || o.disabled) return;
    onPick(l.level, o.value, o.dataset.ns);
  };
</script>

<details class="page-goto" open={goto.open} ontoggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}>
  <summary>Go to</summary>
  <span class="page-goto-body" bind:this={body}>
    {#each goto.levels as l (l.level)}
      <select aria-label={l.aria} data-level={l.level} onchange={(e) => pick(l, e)}>
        {#if l.value === null}<option value="" disabled selected>— go to —</option>{/if}
        {#if l.sentinel !== null}<option value="" selected={l.value === ""}>{l.sentinel}</option>{/if}
        {#each grouped(l) as g (g.group ?? "")}
          {#if g.group}<optgroup label={g.group}>{#each g.rows as r (r.v)}<option value={r.v} data-ns={r.ns} selected={selected(l, r)}>{r.label}</option>{/each}</optgroup>
          {:else}{#each g.rows as r (r.v)}<option value={r.v} data-ns={r.ns} selected={selected(l, r)}>{r.label}</option>{/each}{/if}
        {/each}
      </select>
    {/each}
  </span>
</details>

<style>
  .page-goto { flex: 0 0 100%; min-width: 0; font-family: var(--sans); font-size: 0.85em; }
  .page-goto > summary { color: var(--bar-link); cursor: pointer; width: fit-content; }
  .page-goto > summary:hover { color: var(--bar-ink); }
  .page-goto-body { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  /* a select sizes its resting box to its widest option, capped at the
     row so one long title never scrolls the sticky bar sideways */
  .page-goto-body select {
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
  .page-goto-body select:focus { outline: none; border-color: var(--accent); }
</style>
