<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'

  import { Loading } from '@allmaps/ui'
  import { pink } from '@allmaps/tailwind'

  import { getAllmapsId } from '$lib/shared/ids.js'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { setCompassState } from '$lib/state/compass.svelte.js'
  import { setResourceTransformerState } from '$lib/state/resource-transformer.svelte.js'
  import { setIiifState } from '$lib/state/iiif.svelte.js'
  import { setMapState } from '$lib/state/map.svelte.js'

  import Header from '$lib/components/Header.svelte'
  import Info from '$lib/components/Info.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'

  import Here from '$lib/components/Here.svelte'

  import type { Snippet } from 'svelte'

  import type { LayoutProps } from './$types.js'

  import { PUBLIC_PREVIEW_URL } from '$env/static/public'

  import { OG_IMAGE_SIZE } from '$lib/shared/constants.js'

  let timeout = $state(false)

  interface Props {
    children?: Snippet
  }

  let { data, children }: LayoutProps & Props = $props()

  const sensorsState = getSensorsState()
  const mapState = setMapState(data.selectedMapWithImageInfo.map)

  setIiifState(mapState)
  setResourceTransformerState(sensorsState, mapState)
  setCompassState(sensorsState, mapState)

  $effect.pre(() => {
    mapState.map = data.selectedMapWithImageInfo.map
  })

  let positionOrTimeout = $derived(
    sensorsState.position !== undefined || timeout
  )

  let title = $derived(`${data.title} / Allmaps Here`)

  onMount(() => {
    window.setTimeout(() => {
      timeout = true
    }, 500)
  })
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="title" content={title} />
  <meta property="og:title" content="Look where I am on this map!" />
  <meta
    name="description"
    content="Visit Allmaps Here and find out where you are on digitized maps from your area."
  />
  <meta
    property="og:description"
    content="Visit Allmaps Here and find out where you are on digitized maps from your area."
  />

  {#if data.mapId && data.from}
    <meta
      property="og:image"
      content="{PUBLIC_PREVIEW_URL}/{getAllmapsId(
        data.mapId
      )}.jpg?from={data.from.join(',')}"
    />
    <meta property="og:image:width" content={String(OG_IMAGE_SIZE.width)} />
    <meta property="og:image:height" content={String(OG_IMAGE_SIZE.height)} />
  {/if}

  <meta property="og:url" content={page.url.href} />
  <meta property="og:site_name" content="Allmaps Here" />
  <meta property="og:locale" content="en" />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="relative w-full h-full flex flex-col bg-pink-100">
  <div
    class="absolute top-0 z-10 w-full h-full flex flex-col pointer-events-none"
  >
    <div class="contents pointer-events-auto">
      <Header appName="Here">
        {#if data.selectedMapWithImageInfo && data.selectedMapWithImageInfo.map}
          <Info map={data.selectedMapWithImageInfo.map} />
        {/if}
      </Header>
    </div>
    {@render children?.()}
  </div>
  <DotsPattern color={pink} opacity={0.5}>
    {#if positionOrTimeout}
      <Here
        mapWithImageInfo={data.selectedMapWithImageInfo}
        geojsonRoute={data.geojsonRoute}
        from={data.from}
      />
    {:else}
      <div class="h-full flex items-center justify-center">
        <div class="bg-white p-2 rounded-xl drop-shadow-sm">
          <Loading />
        </div>
      </div>
    {/if}
  </DotsPattern>
</div>
