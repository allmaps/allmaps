<script lang="ts">
  import { onMount } from 'svelte'

  import { blue } from '@allmaps/tailwind'

  import { Loading, Collection } from '@allmaps/ui'

  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getErrorState } from '$lib/state/error.svelte.js'

  import Title from '$lib/components/Title.svelte'
  import Thumbnail from '$lib/components/Thumbnail.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import Footer from '$lib/components/Footer.svelte'
  import GeolocationError from '$lib/components/GeolocationError.svelte'

  import type { PageProps } from './$types.js'

  let { data }: PageProps = $props()

  const mapsState = getMapsState()
  const sensorState = getSensorsState()
  const errorState = getErrorState()

  let waitingForPositionTimeout = $state(false)
  let waitingForPosition = $derived(
    !sensorState.position &&
      !errorState.geolocationPositionError &&
      !waitingForPositionTimeout
  )

  onMount(() => {
    window.setTimeout(() => {
      waitingForPositionTimeout = true
    }, 5000)
  })
</script>

<div class="flex flex-col items-center gap-4">
  <div
    class="absolute -z-10 top-0 w-full h-full overflow-hidden flex justify-center items-center"
  >
    <div
      id="pins"
      class="bg-no-repeat w-3xl min-w-2xl h-full
      bg-size-[80%] sm:bg-size-[100%]
      bg-position-[center_40px] sm:bg-position-[center_0px]
      transition-all"
    ></div>
  </div>
  <section
    class="max-w-2xl w-full flex flex-col p-4 gap-6 items-center justify-center my-2 sm:my-6"
  >
    <div class="max-w-md w-full flex flex-col gap-6 items-center">
      <Title name="Here" />
      <p class="text-black text-center max-w-xs">
        Find historic maps around your current GPS location.
      </p>
    </div>
  </section>
</div>

<section class="bg-blue-200 shrink-0 grow p-2">
  <DotsPattern color={blue}>
    {#if waitingForPosition || mapsState.loading}
      <div class="h-full flex items-center justify-center">
        <div class="bg-white p-2 rounded-xl drop-shadow-sm">
          <Loading />
        </div>
      </div>
    {:else if mapsState.maps.size > 0}
      <div>
        <section
          class="px-3 py-6
         overflow-hidden max-w-4xl w-full m-auto"
        >
          <Collection>
            {#each mapsState.mapsFromCoordinates as [mapId, map] (mapId)}
              <Thumbnail {mapId} {map} geojsonRoute={data.geojsonRoute} />
            {/each}
          </Collection>
        </section>
        <Footer />
      </div>
    {:else if errorState.geolocationPositionError}
      <div class="h-full flex items-center justify-center">
        <GeolocationError />
      </div>
    {:else}
      <div class="h-full flex items-center justify-center">
        <div
          class="bg-white px-3 py-2 rounded-xl drop-shadow-sm max-w-xs text-center"
        >
          No maps found around your location
        </div>
      </div>
    {/if}
  </DotsPattern>
</section>

<style scoped>
  #pins {
    background-image: url('$lib/images/pins.svg');
  }
</style>
