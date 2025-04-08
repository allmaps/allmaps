<script lang="ts">
  import type { Snippet } from 'svelte'
  import { afterNavigate } from '$app/navigation'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { setCompassState } from '$lib/state/compass.svelte.js'

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
  <Here
    selectedMapId={data.selectedMapId}
    geojsonRoute={data.geojsonRoute}
    from={data.from}
  />
  {@render children?.()}
</div>
