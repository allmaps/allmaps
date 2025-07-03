<script lang="ts">
  import { getMapsState } from '$lib/state/maps.svelte.js'

  import Thumbnail from '$lib/components/Thumbnail.svelte'
  import SwitchFollow from '$lib/components/SwitchFollow.svelte'

  import type { GeojsonRoute } from '$lib/shared/types.js'

  type Props = {
    showFollow: boolean
    geojsonRoute?: GeojsonRoute
  }

  let { showFollow, geojsonRoute }: Props = $props()

  const mapsState = getMapsState()

  let closestMaps = $derived(
    [...mapsState.mapsFromCoordinates.values()].slice(0, 2)
  )
</script>

<div class="bg-white rounded p-2 shadow-lg outline-0 max-w-2xs">
  <a href="/">Find more maps</a>
  {#if mapsState.maps.size >= 1}
    <ol>
      {#each closestMaps as map (map.id)}
        {#if map.id}
          <li>
            <Thumbnail mapId={map.id} {map} {geojsonRoute} />
          </li>
        {/if}
      {/each}
    </ol>
  {/if}
  {#if showFollow}
    <div><SwitchFollow /></div>
  {/if}
</div>
