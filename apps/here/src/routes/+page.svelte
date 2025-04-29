<script lang="ts">
  import { fade } from 'svelte/transition'

  import { blue } from '@allmaps/tailwind'

  import { Loading, Collection } from '@allmaps/ui'

  import { getMapsState } from '$lib/state/maps.svelte.js'

  import Title from '$lib/components/Title.svelte'
  import Thumbnail from '$lib/components/Thumbnail.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import Footer from '$lib/components/Footer.svelte'

  import type { PageProps } from './$types.js'

  let { data }: PageProps = $props()

  const mapsState = getMapsState()
</script>

<div class="flex flex-col items-center gap-4">
  <div
    class="absolute -z-10 top-0 w-full h-full overflow-hidden flex justify-center items-center sm:p-8"
  >
    <div
      id="pins"
      class="bg-no-repeat w-full max-w-5xl h-full scale-100 sm:scale-120 transition-transform"
    ></div>
  </div>
  <section
    class="max-w-2xl w-full flex flex-col p-4 gap-6 items-center justify-center bg-no-repeat my-2 sm:my-6"
  >
    <div class="max-w-md w-full flex flex-col gap-6 items-center">
      <Title name="Here" />

      <p class="text-black text-center">
        Find historic maps around your current GPS location.
      </p>
    </div>
  </section>
</div>

<section class="bg-blue-200">
  <DotsPattern color={blue}>
    {#if mapsState.maps.size > 0}
      <section
        class="px-3 py-6
         overflow-hidden max-w-4xl w-full m-auto"
        transition:fade={{ duration: 120 }}
      >
        <Collection>
          {#each mapsState.mapsFromCoordinates as [mapId, map] (mapId)}
            <Thumbnail {mapId} {map} geojsonRoute={data.geojsonRoute} />
          {/each}
        </Collection>
      </section>
    {:else}
      <div class="h-full flex items-center justify-center">
        <div class="bg-white p-2 rounded-xl drop-shadow-sm">
          <Loading />
        </div>
      </div>
    {/if}
  </DotsPattern>
</section>
<Footer />

<style scoped>
  #pins {
    background-image: url('$lib/images/pins.svg');
    background-position: center 0;
  }
</style>
