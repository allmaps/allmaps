<script lang="ts">
  import { fade } from 'svelte/transition'

  import {
    Warning as WarningIcon,
    MapTrifold as MapTrifoldIcon
  } from 'phosphor-svelte'

  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'

  import { isComplete } from '$lib/shared/analyze.js'

  const mapsMergedState = getMapsMergedState()

  let { imageId }: { imageId: string } = $props()

  const mapsForImageId = $derived(mapsMergedState.mapsByImageId[imageId])

  const mapsCounted = $derived.by(() => {
    let complete = 0
    let incomplete = 0

    if (mapsForImageId) {
      for (const map of mapsForImageId) {
        if (isComplete(map)) {
          complete++
        } else {
          incomplete++
        }
      }
    }

    return { complete, incomplete }
  })
</script>

{#if mapsMergedState.fetched}
  <div class="flex flex-row items-center gap-2" transition:fade>
    {#if mapsCounted.complete > 0}
      <div
        class="flex flex-row items-center gap-2 rounded-full bg-green px-2 py-0.5 text-xs font-bold drop-shadow-md"
      >
        <span>{mapsCounted.complete}</span>
        <MapTrifoldIcon class="size-4" weight="bold" />
      </div>
    {/if}
    {#if mapsCounted.incomplete > 0}
      <div
        class="flex flex-row items-center gap-2 rounded-full bg-yellow px-2 py-0.5 text-xs font-bold drop-shadow-md"
      >
        <span>{mapsCounted.incomplete}</span>
        <WarningIcon class="size-4" weight="bold" />
      </div>
    {/if}
  </div>
{/if}
