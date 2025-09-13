<script lang="ts">
  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()
</script>

<li class="rounded-lg aspect-square bg-white p-1.5 h-full">
  <header class="h-full flex flex-col justify-between @container">
    <h1 class="font-bold text-xl sm:text-2x">
      The latest maps georeferenced with <a
        class="underline"
        href="https://editor.allmaps.org">Allmaps Editor</a
      >
    </h1>
    {#if !uiState.loading}
      <div class="flex-row justify-between hidden @[200px]:flex">
        <div>{uiState.itemCount} maps</div>
        <div>{uiState.errorCount} with errors</div>
      </div>
    {/if}
  </header>
</li>
