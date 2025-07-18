<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'

  import { Loading } from '@allmaps/ui'
  import { pink } from '@allmaps/tailwind'

  import { getAllmapsId } from '$lib/shared/ids.js'
  import { getTitle, getDescription } from '$lib/shared/head.js'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { setCompassState } from '$lib/state/compass.svelte.js'
  import { setResourceTransformerState } from '$lib/state/resource-transformer.svelte.js'
  import { setIiifState } from '$lib/state/iiif.svelte.js'
  import { setMapState } from '$lib/state/map.svelte.js'

  import Header from '$lib/components/Header.svelte'
  import Info from '$lib/components/Info.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import Here from '$lib/components/Here.svelte'
  import Controls from '$lib/components/Controls.svelte'
  import Outside from '$lib/components/Outside.svelte'

  import type { Snippet } from 'svelte'

  import type { LayoutProps } from './$types.js'

  import { env } from '$env/dynamic/public'

  import { OG_IMAGE_SIZE } from '$lib/shared/constants.js'

  let timeout = $state(false)

  type Props = {
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

  let showHereFrom = $derived(page.route.id === '/maps/[mapId]/postcard')

  let ogImageUrl = $derived(
    data.from &&
      data.mapId &&
      `${env.PUBLIC_PREVIEW_URL}/${getAllmapsId(
        data.mapId
      )}.jpg?from=${data.from.join(',')}`
  )

  onMount(() => {
    window.setTimeout(() => {
      timeout = true
    }, 500)
  })
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="title" content={title} />
  <meta property="og:title" content={getTitle()} />
  <meta name="description" content={getDescription()} />
  <meta property="og:description" content={getDescription()} />

  {#if data.mapId && data.from}
    <meta property="og:image" content={ogImageUrl} />
    <meta property="og:image:secure_url" content={ogImageUrl} />
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

    <div class="w-full h-full flex flex-col justify-end items-center">
      <Outside />

      <div class="absolute z-50 bottom-0 w-full p-2 pointer-events-none">
        <Controls mapId={data.mapId}>
          {@render children?.()}
        </Controls>
      </div>
    </div>
  </div>
  <DotsPattern color={pink} opacity={0.5}>
    {#if positionOrTimeout}
      <Here
        mapWithImageInfo={data.selectedMapWithImageInfo}
        geojsonRoute={data.geojsonRoute}
        from={showHereFrom ? data.from : undefined}
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
