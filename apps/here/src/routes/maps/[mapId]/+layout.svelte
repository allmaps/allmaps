<script lang="ts">
  import { onMount } from 'svelte'

  import { Loading } from '@allmaps/ui'
  import { pink } from '@allmaps/tailwind'

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

  onMount(() => {
    window.setTimeout(() => {
      timeout = true
    }, 500)
  })
</script>

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
