<script lang="ts">
  import { fade } from 'svelte/transition'

  import { blue } from '@allmaps/tailwind'

  import { Loading, Collection } from '@allmaps/ui'

  import { getMapsState } from '$lib/state/maps.svelte.js'

  import Thumbnail from '$lib/components/Thumbnail.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'

  import type { PageProps } from './$types.js'

  let { data }: PageProps = $props()

  const mapsState = getMapsState()
</script>

<div class="h-full bg-blue/75">
  <DotsPattern color={blue}>
    {#if mapsState.maps.size > 0}
      <section class="p-3 overflow-hidden" transition:fade={{ duration: 120 }}>
        <Collection>
          {#each mapsState.mapsFromCoordinates as [mapId, map] (mapId)}
            <Thumbnail {mapId} {map} geojsonRoute={data.geojsonRoute} />
          {/each}
        </Collection>
      </section>
    {:else}
      <div class="h-full flex items-center justify-center">
        <Loading />
      </div>
    {/if}
  </DotsPattern>
</div>
