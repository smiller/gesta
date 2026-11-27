<!-- An unloaded journal outranks every other status: a run declines on it,
     and "Automatic backups are on." would be false exactly when a reader
     most needs it true. Recovery is unzipping an archive and importing the
     folder it makes into a fresh Gesta; there is no in-app restore. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  import { backupsStatus, backupsFolder, offersChange } from "./backupsModel.ts";
  import { counted } from "./counted.ts";
  let { backups, onSetup, onResume, onSweep }: { backups: Screen["backups"]; onSetup: () => void; onResume: () => void; onSweep: () => void } = $props();
  const status = $derived(backupsStatus(backups));
  const folder = $derived(backupsFolder(backups));
  const change = $derived(offersChange(backups));
  const UNUSED = "Pictures stored in Gesta that no entry shows — most often one pasted and then deleted from the text. No backup holds them, so removing them is for good.";
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<section class="helppanel backups" role="dialog" aria-label="Backups">
  <h2>Backups</h2>
  <div class="backups-auto">
    {#if backups.canPick && !backups.configured}<button type="button" onclick={onSetup}>Set up automatic backups…</button>{/if}
    {#if backups.canPick && backups.configured && backups.trouble}<button type="button" onclick={onResume}>Resume backups</button>{/if}
    {#if status}<p class="backups-status" class:trouble={status.trouble}>{status.text}{#if change && !folder}{" "}<button type="button" class="backups-change" onclick={onSetup}>change folder…</button>{/if}</p>{/if}
    {#if folder}<p class="backups-status">{folder.lead} <strong>{folder.name}</strong>. <button type="button" class="backups-change" onclick={onSetup}>change folder…</button></p>{/if}
  </div>
  {#if backups.unused.length}
    <p class="backups-status"><strong>{counted(backups.unused.length, " unused picture", " unused pictures")}.</strong> {UNUSED}</p>
    <div class="backups-pictures">
      {#each backups.unused as p (p.name)}
        <figure>{#if p.src}<img src={p.src} alt="" />{:else}<div class="backups-picture-pending"></div>{/if}<figcaption>{p.name}</figcaption></figure>
      {/each}
    </div>
    <div class="backups-auto"><button type="button" onclick={onSweep}>Remove {backups.unused.length === 1 ? "this picture" : "these " + backups.unused.length + " pictures"}</button></div>
  {:else if backups.overHalf}
    <p class="backups-status">{UNUSED}</p>
    <p class="backups-status trouble">{backups.overHalf} such pictures — more than half of all stored, which looks like a journal read short rather than a tidy-up, so none are offered for removal.</p>
  {/if}
  <p class="backups-note">A folder backup writes the whole journal to a folder you pick once — a live <code>current/</code> copy, plus an <code>archive/</code> folder of dated <code>.zip</code> archives of whatever changed that day. To recover an old version, read <code>archive/manifests/&lt;date&gt;.txt</code> for the archives that day held, unzip them and import the folder they make into a fresh, empty Gesta (a new browser profile — never over this journal), or copy one entry back from its <code>.md</code> file in any editor (a day sits under <code>journal/&lt;year&gt;/</code>, a commonplace under <code>commonplace/</code>).</p>
</section>

<style>
  .helppanel {
    position: fixed;
    z-index: 80;
    top: calc(var(--alert-area-bottom, var(--masthead-h)) + 20px);
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
  .backups-auto button.backups-change { border: none; padding: 0; margin: 0 0 0 0.1em; font-size: 1em; text-decoration: underline; }
  .backups-status { font-size: 0.85em; color: var(--muted); margin: 0.6em 0 0; }
  .backups-status.trouble { color: var(--accent); }
  .backups-pictures { display: flex; flex-wrap: wrap; gap: 12px; margin: 0.5em 0 0.7em; }
  .backups-pictures figure { margin: 0; width: 150px; }
  .backups-pictures img, .backups-picture-pending { width: 150px; height: 100px; object-fit: cover; border: 1px solid var(--rule); border-radius: 4px; display: block; }
  .backups-pictures figcaption { font-size: 0.72em; color: var(--muted); margin-top: 3px; word-break: break-all; }
  .backups-note { font-size: 0.85em; color: var(--muted); margin: 0.4em 0 1em; }
  code { font-family: var(--mono); font-size: 0.85em; background: var(--aside-bg); border: 1px solid var(--rule); border-radius: 3px; padding: 0.05em 0.3em; }
</style>
