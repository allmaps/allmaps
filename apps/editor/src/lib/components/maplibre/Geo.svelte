<script lang="ts">
  import { onMount } from 'svelte'

  import { Map, addProtocol } from 'maplibre-gl'
  import maplibregl from 'maplibre-gl'
  import { Protocol } from 'pmtiles'

  import { basemapStyle, addTerrain } from '@allmaps/basemap'

  import type { Viewport } from '$lib/types/shared.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  let geoMapContainer: HTMLDivElement

  type Props = {
    initialViewport?: Viewport
    terrain?: boolean

    geoMap?: Map
  }

  let {
    initialViewport,
    terrain = true,
    geoMap = $bindable<Map | undefined>()
  }: Props = $props()

  const defaultViewport = {
    center: [0, 0],
    zoom: 1,
    bearing: 0
  }

  const viewport = {
    center: initialViewport?.center || defaultViewport.center,
    zoom: initialViewport?.zoom || defaultViewport.zoom,
    bearing: initialViewport?.bearing || defaultViewport.bearing
  }

  onMount(() => {
    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)

    const newGeoMap = new Map({
      container: geoMapContainer,
      // @ts-expect-error incorrect MapLibre types
      style: basemapStyle('en'),
      ...viewport,
      maxPitch: 0,
      hash: false,
      attributionControl: false,
      canvasContextAttributes: {
        preserveDrawingBuffer: true
      }
    })

    if (terrain) {
      // @ts-expect-error incorrect MapLibre types
      addTerrain(newGeoMap, maplibregl)
    }

    newGeoMap.once('load', () => {
      geoMap = newGeoMap
    })
  })
</script>

<div bind:this={geoMapContainer} class="w-full h-full"></div>
