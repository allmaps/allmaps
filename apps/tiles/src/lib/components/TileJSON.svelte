<script lang="ts">
  import { onMount } from 'svelte'

  import { Map, NavigationControl, AttributionControl } from 'maplibre-gl'
  import { basemapStyle } from '@allmaps/basemap'

  import type { StyleSpecification } from 'maplibre-gl'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import type { TileJSON } from '$lib/types.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  type Props = {
    tileJson: TileJSON
  }

  let { tileJson }: Props = $props()

  const uiState = getUiState()
  let container: HTMLDivElement

  onMount(() => {
    // The shared basemap uses a separate version of the style-spec types.
    const style = basemapStyle('en') as unknown as StyleSpecification
    style.sources.allmaps = {
      type: 'raster',
      tiles: [tileJson.tiles[0]],
      tileSize: 256,
      maxzoom: 19,
      bounds: tileJson.bounds
    }
    style.layers.push({ id: 'allmaps', type: 'raster', source: 'allmaps' })

    const map = new Map({
      container,
      style,
      attributionControl: false,
      bounds: [
        [tileJson.bounds[0], tileJson.bounds[1]],
        [tileJson.bounds[2], tileJson.bounds[3]]
      ],
      fitBoundsOptions: { padding: 25 },
      maxPitch: 0
    })

    map.addControl(new NavigationControl(), 'top-left')
    map.addControl(new AttributionControl(), 'bottom-left')

    function updateViewport() {
      // OpenHistoricalMap uses 256px zoom levels; MapLibre uses 512px.
      uiState.zoom = map.getZoom() + 1
      uiState.center = map.getCenter().toArray()
    }

    updateViewport()
    map.on('moveend', updateViewport)

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      map.remove()
    }
  })
</script>

<div class="absolute inset-0">
  <div bind:this={container} class="w-full h-full"></div>
</div>
