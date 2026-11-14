<!-- An unloaded journal outranks every other status: a run declines on it,
     and "Automatic backups are on." would be false exactly when a reader
     most needs it true. Recovery is unzipping an archive and importing the
     folder it makes into a fresh Gesta; there is no in-app restore. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  import { backupsStatus } from "./backupsModel.ts";
  import { counted } from "./counted.ts";
  let { backups, onSetup, onResume, onSweep }: { backups: Screen["backups"]; onSetup: () => void; onResume: () => void; onSweep: () => void } = $props();
  const status = $derived(backupsStatus(backups));
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<section class="helppanel backups" role="dialog" aria-label="Backups">
  <h2>Backups</h2>
  <div class="backups-auto">
    {#if backups.canPick}
      <button type="button" onclick={onSetup}>{backups.configured ? "Change backup folder…" : "Set up automatic backups…"}</button>
      {#if backups.configured && backups.trouble}<button type="button" onclick={onResume}>Resume backups</button>{/if}
    {/if}
    {#if status}<p class="backups-status" class:trouble={status.trouble}>{status.text}</p>{/if}
  </div>
  {#if backups.unused}
    <div class="backups-auto"><button type="button" onclick={onSweep}>Remove {counted(backups.unused, " unused picture", " unused pictures")}</button></div>
  {:else if backups.overHalf}
    <p class="backups-status trouble">{backups.overHalf} pictures no entry names — more than half of them, so none are removed.</p>
  {/if}
  <p class="backups-note">A folder backup writes the whole journal to a folder you pick once — a live <code>current/</code> copy, plus an <code>archive/</code> folder of dated <code>.zip</code> archives of whatever changed that day. To recover an old version, read <code>archive/manifests/&lt;date&gt;.txt</code> for the archives that day held, unzip them and import the folder they make into a fresh, empty Gesta (a new browser profile — never over this journal), or copy one entry back from its <code>.md</code> file in any editor (a day sits under <code>journal/&lt;year&gt;/</code>, a commonplace under <code>commonplace/</code>).</p>
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
  h2 { font-size: 1.25em; margin: 0.9em 0 0.1em; }
  .backups-auto { margin: 0 0 1em; }
  .backups-auto button { margin-right: 0.5em; font-family: var(--sans); font-size: 0.85em; color: var(--accent); background: none; border: 1px solid var(--rule); border-radius: 4px; padding: 3px 10px; cursor: pointer; }
  .backups-auto button:hover { border-color: var(--accent); }
  .backups-status { font-size: 0.85em; color: var(--muted); margin: 0.6em 0 0; }
  .backups-status.trouble { color: var(--accent); }
  .backups-note { font-size: 0.85em; color: var(--muted); margin: 0.4em 0 1em; }
  code { font-family: var(--mono); font-size: 0.85em; background: var(--aside-bg); border: 1px solid var(--rule); border-radius: 3px; padding: 0.05em 0.3em; }
</style>
