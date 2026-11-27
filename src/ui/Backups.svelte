<!-- Recovery is unzipping an archive and importing the folder it makes into
     a fresh Gesta; there is no in-app restore. -->
<script lang="ts">
  import { onMount } from "svelte";
  import type { Screen } from "./screen.svelte.ts";
  import { backupsLines } from "./backupsModel.ts";
  let { backups, onSetup, onResume, onSweep, onOpen, onClose }: { backups: Screen["backups"]; onSetup: () => void; onResume: () => void; onSweep: () => void; onOpen: () => void; onClose: () => void } = $props();
  /* the panel stands exactly while this is mounted, however it is closed */
  onMount(() => { onOpen(); return onClose; });
  const lines = $derived(backupsLines(backups));
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<section class="helppanel backups" role="dialog" aria-label="Backups">
  <h2>Backups</h2>
  <div class="backups-auto">
    {#each lines.top as line (line.role)}
      {#if line.role === "setup"}<button type="button" data-role="setup" onclick={onSetup}>{line.text}</button>
      {:else if line.role === "resume"}<button type="button" data-role="resume" onclick={onResume}>{line.text}</button>
      {:else if line.role === "status"}<p class="backups-status" class:trouble={line.trouble} data-role="status">{line.text}{#if line.change}{" "}<button type="button" class="backups-change" onclick={onSetup}>change folder…</button>{/if}</p>
      {:else}<p class="backups-status" data-role="folder">{line.lead} <strong>{line.name}</strong>. <button type="button" class="backups-change" onclick={onSetup}>change folder…</button></p>{/if}
    {/each}
  </div>
  {#if lines.unused}
    <p class="backups-status" data-role="unused"><strong>{lines.unused.heading}</strong> {lines.unused.about}</p>
    <div class="backups-pictures">
      {#each backups.unused as p (p.key)}
        <figure>{#if p.src}<img src={p.src} alt="" />{:else}<div class="backups-picture-pending"></div>{/if}<figcaption>{p.name}</figcaption></figure>
      {/each}
    </div>
    <div class="backups-auto"><button type="button" data-role="sweep" onclick={onSweep}>{lines.unused.button}</button></div>
  {:else if lines.overHalf}
    <p class="backups-status" data-role="unused">{lines.overHalf.about}</p>
    <p class="backups-status trouble" data-role="over-half">{lines.overHalf.text}</p>
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
