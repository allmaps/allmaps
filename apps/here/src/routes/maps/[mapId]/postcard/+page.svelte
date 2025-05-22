<script lang="ts">
  import { Ruler as RulerIcon } from 'phosphor-svelte'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'

  import { positionToGeoJsonPoint } from '$lib/shared/position.js'
  import { coordinatesToGeoJsonPoint } from '$lib/shared/geojson.js'
  import { computeDistance, formatDistance } from '$lib/shared/distance.js'

  import Controls from '$lib/components/Controls.svelte'
  import Outside from '$lib/components/Outside.svelte'

  import type { PageProps } from './$types.js'

  const sensorsState = getSensorsState()

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
        <div
          class="bg-pink border-white border-3 text-white text-sm rounded-full
          px-3 py-1 place-self-center shadow-lg flex flex-row items-center gap-1"
        >
          <span class="border-white border-3 rounded-full size-3 inline-block"
          ></span>
          <span>
            You are <span class="font-bold">{formatDistance(distance)}</span> away</span
          >
        </div>
      {/if}
    </Controls>
  </div>
</div>
