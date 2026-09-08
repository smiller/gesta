<!-- The backups panel, ported 2026-09-08 from the current app's
     #backuppanel (body.html, 17-backups-panel.js): the setup or Change
     button, Resume when the last run stalled, and the status line — an
     unloaded journal outranking every other status, since a run declines
     on it and "Automatic backups are on." would be false exactly when the
     reader most needs it true. Recovery is unzipping an archive and
     importing the folder it makes into a fresh Gesta; there is no in-app
     restore. -->
<script lang="ts">
  import type { Screen } from "./screen.svelte.ts";
  let { backups, onSetup, onResume }: { backups: Screen["backups"]; onSetup: () => void; onResume: () => void } = $props();
  const status = $derived.by((): { text: string; trouble: boolean } | null => {
    const b = backups;
    if (!b.canPick) return { text: "Automatic folder backups need a Chromium browser (Helium or Chrome). Export needs one too, so here there is no way to write a copy out.", trouble: false };
    if (b.configured && b.warm !== "ok") return { text: b.warm === "failed" ? "Couldn’t load entries — backups are paused until you reload." : "Still loading — backups start once the journal is in.", trouble: true };
    if (b.configured && b.trouble) return { text: b.trouble, trouble: true };
    if (b.configured) return { text: "Automatic backups are on.", trouble: false };
    return null;
  });
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
  <p class="backups-note">A folder backup writes the whole journal to a folder you pick once — a live <code>current/</code> copy, plus an <code>archive/</code> folder of dated <code>.zip</code> archives of whatever changed that day. To recover an old version, read <code>archive/manifests/&lt;date&gt;.txt</code> for the archives that day held, unzip them and import the folder they make into a fresh, empty Gesta (a new browser profile — never over this journal), or copy one entry back from its <code>.md</code> file in any editor (a day sits under <code>journal/&lt;year&gt;/</code>, a page under <code>page/</code>).</p>
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
