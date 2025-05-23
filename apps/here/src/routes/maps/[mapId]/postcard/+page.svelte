<script lang="ts">
  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getErrorState } from '$lib/state/error.svelte.js'

  import { positionToGeoJsonPoint } from '$lib/shared/position.js'
  import { coordinatesToGeoJsonPoint } from '$lib/shared/geojson.js'
  import { computeDistance, formatDistance } from '$lib/shared/distance.js'

  import Controls from '$lib/components/Controls.svelte'
  import Outside from '$lib/components/Outside.svelte'
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

<div class="w-full h-full flex flex-col justify-end items-center">
  <Outside />

  <div class="z-50 bottom-0 w-full p-2 pointer-events-none">
    <Controls selectedMapId={data.selectedMapId}>
      {#if distance && distance > 100}
        <!-- <Popover
          >{#snippet button()} -->
        <div
          class="bg-pink border-white border-3 text-white text-sm rounded-full
          px-3 py-1 place-self-end shadow-lg flex flex-row items-center gap-1"
        >
          <span class="border-white border-3 rounded-full size-3 inline-block"
          ></span>
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
          class="bg-red border-white border-3 text-white text-sm rounded-full
          px-3 py-1 place-self-end shadow-lg flex flex-row items-center gap-1"
        >
          Enable location services in your browser to see your location
        </div>
      {:else}
        <div></div>
      {/if}
    </Controls>
  </div>
</div>
