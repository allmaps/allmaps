<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'

  import { blue } from '@allmaps/tailwind'

  import { Loading, Collection } from '@allmaps/ui'

  import { getTitle, getDescription } from '$lib/shared/head.js'

  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getErrorState } from '$lib/state/error.svelte.js'

  import Title from '$lib/components/Title.svelte'
  import Thumbnail from '$lib/components/Thumbnail.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import Footer from '$lib/components/Footer.svelte'
  import GeolocationError from '$lib/components/GeolocationError.svelte'
  import Route from '$lib/components/Route.svelte'

  import type { PageProps } from './$types.js'

  import { OG_IMAGE_SIZE } from '$lib/shared/constants.js'

  let { data }: PageProps = $props()

  const mapsState = getMapsState()
  const sensorsState = getSensorsState()
  const errorState = getErrorState()

  let waitingForPositionTimeout = $state(false)
  let waitingForPosition = $derived(
    !sensorsState.position &&
      !errorState.geolocationPositionError &&
      !waitingForPositionTimeout
  )

  let waitingForFetch = $derived(
    mapsState.fetchCount === 0 && !waitingForPositionTimeout
  )

  let ogImageUrl = $derived(`${page.url.href}allmaps-here.jpg`)

  onMount(() => {
    window.setTimeout(() => {
      waitingForPositionTimeout = true
    }, 5000)
  })
</script>

<svelte:head>
  <title>Allmaps Here</title>
  <meta name="title" content="Allmaps Here" />
  <meta property="og:title" content={getTitle()} />
  <meta name="description" content={getDescription()} />
  <meta property="og:description" content={getDescription()} />

  <meta property="og:image" content={ogImageUrl} />
  <meta name="og:image:secure_url" content={ogImageUrl} />
  <meta property="og:image:width" content={String(OG_IMAGE_SIZE.width)} />
  <meta property="og:image:height" content={String(OG_IMAGE_SIZE.height)} />

  <meta property="og:url" content={page.url.href} />
  <meta property="og:site_name" content="Allmaps Here" />
  <meta property="og:locale" content="en" />
  <meta property="og:type" content="website" />
</svelte:head>

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
    <div class="max-w-md w-full flex flex-col gap-2 items-center text-center">
      <div class="mb-4">
        <Title name="Here" />
      </div>
      <h2 class="text-lg font-bold">
        Find historic maps around your current location
      </h2>
      <p class="text-black max-w-md">
        Drop a pin on any map and send a digital postcard to share your location
        with a friend!
      </p>
    </div>
  </section>
</div>

<section class="bg-blue-200 shrink-0 grow">
  <DotsPattern color={blue}>
    {#if waitingForPosition || waitingForFetch}
      <div class="h-full flex items-center justify-center">
        <div class="bg-white p-2 rounded-xl drop-shadow-sm">
          <Loading />
        </div>
      </div>
    {:else if mapsState.maps.size > 0}
      <div class="h-full flex flex-col">
        <section
          class="h-full px-3 py-6 flex flex-col gap-6 justify-between
            overflow-hidden max-w-4xl w-full m-auto"
        >
          <Collection>
            {#each mapsState.mapsFromCoordinates as [mapId, map] (mapId)}
              <Thumbnail {mapId} {map} geojsonRoute={data.geojsonRoute} />
            {/each}
          </Collection>

          {#if mapsState.mapsWithImageInfo.length}
            <div class="place-self-center">
              <Route geojsonRoute={data.geojsonRoute} />
            </div>
          {/if}
        </section>
        {#if mapsState.mapsWithImageInfo.length}
          <Footer />
        {/if}
      </div>
    {:else if errorState.geolocationPositionError}
      <div class="h-full flex items-center justify-center p-2">
        <GeolocationError />
      </div>
    {:else}
      <div class="h-full flex items-center justify-center p-2">
        <div
          class="bg-white px-3 py-2 rounded-xl drop-shadow-sm max-w-xs text-center space-y-2"
        >
          <p>No maps found around your location.</p>
          <p class="text-gray-700 italic">
            You can use <a class="underline" href="https://editor.allmaps.org/"
              >Allmaps Editor</a
            > to georeference maps and add them to Allmaps.
          </p>
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
