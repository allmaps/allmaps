<script lang="ts">
  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getErrorState } from '$lib/state/error.svelte.js'

  import { positionToGeoJsonPoint } from '$lib/shared/position.js'
  import { coordinatesToGeoJsonPoint } from '$lib/shared/geojson.js'
  import { computeDistance, formatDistance } from '$lib/shared/distance.js'

  // import Popover from '$lib/components/Popover.svelte'
  // import NearbyMapsPopover from '$lib/components/NearbyMapsPopover.svelte'

  import type { PageProps } from './$types.js'

  const sensorsState = getSensorsState()
  const errorState = getErrorState()

  let { data }: PageProps = $props()

  let distance = $derived.by(() => {
    if (data.from && sensorsState.position) {
      return computeDistance(
        positionToGeoJsonPoint(sensorsState.position),
        coordinatesToGeoJsonPoint([data.from[1], data.from[0]])
      )
    }
  })
</script>

{#if distance && distance > 100}
  <!-- <Popover>{#snippet button()} -->
  <div
    class="bg-pink border-white border-3 text-white text-sm rounded-full
      px-3 py-1 shadow-lg flex flex-row items-center gap-1"
  >
    <span class="border-white border-3 rounded-full size-3 inline-block"></span>
    <span>
      You are <span class="font-bold">{formatDistance(distance)}</span> away</span
    >
  </div>
  <!-- {/snippet}
    {#snippet contents()}
      <NearbyMapsPopover
        showFollow={false}
        geojsonRoute={data.geojsonRoute}
      />
    {/snippet}
  </Popover> -->
{:else if errorState.geolocationPositionError}
  <div
    class="bg-red border-white border-3 text-white text-sm rounded-4xl
          min-w-0 shrink px-3 py-1 place-self-end shadow-lg text-center"
  >
    Enable location services in your browser to see your location.
  </div>
{:else}
  <div></div>
{/if}
