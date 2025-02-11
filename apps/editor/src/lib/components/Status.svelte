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
  <div class="flex items-center flex-row gap-2" transition:fade>
    {#if mapsCounted.complete > 0}
      <div
        class="bg-green rounded-full px-2 py-0.5 drop-shadow-md text-xs font-bold flex items-center flex-row gap-2"
      >
        <span>{mapsCounted.complete}</span>
        <MapTrifoldIcon class="size-4" weight="bold" />
      </div>
    {/if}
    {#if mapsCounted.incomplete > 0}
      <div
        class="bg-yellow rounded-full px-2 py-0.5 drop-shadow-md text-xs font-bold flex items-center flex-row gap-2"
      >
        <span>{mapsCounted.incomplete}</span>
        <WarningIcon class="size-4" weight="bold" />
      </div>
    {/if}
  </div>
{/if}
