<script lang="ts">
  import type { Snippet } from 'svelte'
  import { afterNavigate } from '$app/navigation'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUrlState } from '$lib/state/url.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { setCompassState } from '$lib/state/compass.svelte.js'

  import Here from '$lib/components/Here.svelte'

  import type { LayoutProps } from './$types.js'

  interface Props {
    children?: Snippet
  }

  let { data, children }: LayoutProps & Props = $props()

  const uiState = getUiState()
  const compassState = setCompassState(
    getSensorsState(),
    getMapsState(),
    data.selectedMapId
  )

  afterNavigate(() => {
    compassState.selectedMapId = data.selectedMapId
  })
</script>

<!-- <svelte:head>
  <meta property="og:title" content="Allmaps Here" />
  <meta property="og:description" content="I am here!" />

  {#if data.from}
    <meta
      property="og:image"
      content="https://next.preview.allmaps.org/apps/here/maps/{data.allmapsMapId}.png?from={data.from.join(
        ','
      )}&color={uiState.color}"
    />
  {/if}

  <meta property="og:type" content="website" />
</svelte:head> -->

<div class="relative w-full h-full flex flex-col bg-pink-100">
  <Here selectedMapId={data.selectedMapId} geojsonRoute={data.geojsonRoute} />
  {@render children?.()}
</div>

<svelte:head>
  <meta property="og:description" content="Test nested layout head tag" />
</svelte:head>
