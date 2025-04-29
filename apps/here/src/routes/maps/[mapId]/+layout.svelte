<script lang="ts">
  import type { Snippet } from 'svelte'
  import { afterNavigate } from '$app/navigation'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { setCompassState } from '$lib/state/compass.svelte.js'

  import Header from '$lib/components/Header.svelte'

  import Here from '$lib/components/Here.svelte'

  import type { LayoutProps } from './$types.js'

  interface Props {
    children?: Snippet
  }

  let { data, children }: LayoutProps & Props = $props()

  const compassState = setCompassState(
    getSensorsState(),
    getMapsState(),
    data.selectedMapId
  )

  afterNavigate(() => {
    compassState.selectedMapId = data.selectedMapId
  })
</script>

<div class="relative w-full h-full flex flex-col bg-pink-100">
  <div
    class="absolute top-0 z-10 w-full h-full flex flex-col pointer-events-none"
  >
    <div class="contents pointer-events-auto">
      <Header appName="Here" />
    </div>
    {@render children?.()}
  </div>
  <div class="relative w-full h-full flex flex-col bg-pink-100">
    <Here
      selectedMapId={data.selectedMapId}
      geojsonRoute={data.geojsonRoute}
      from={data.from}
    />
  </div>
</div>
