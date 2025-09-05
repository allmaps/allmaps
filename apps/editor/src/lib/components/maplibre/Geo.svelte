<script lang="ts">
  import { onMount } from 'svelte'

  import { Map, addProtocol } from 'maplibre-gl'
  import maplibregl from 'maplibre-gl'
  import { Protocol } from 'pmtiles'

  import { basemapStyle, addTerrain } from '@allmaps/basemap'

  import type { Point } from '@allmaps/types'

  import 'maplibre-gl/dist/maplibre-gl.css'

  let geoMapContainer: HTMLDivElement

  type Props = {
    terrain?: boolean
    center?: Point
    zoom?: number
    bearing?: number
    geoMap?: Map
  }

  let {
    terrain = true,
    center,
    zoom,
    bearing,
    geoMap = $bindable<Map | undefined>()
  }: Props = $props()

  const defaultView = {
    center: [0, 0],
    zoom: 7,
    bearing: 0
  }

  const view = {
    center: center || defaultView.center,
    zoom: zoom || defaultView.zoom,
    bearing: bearing || defaultView.bearing
  }

  onMount(() => {
    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)

    const newGeoMap = new Map({
      container: geoMapContainer,
      // @ts-expect-error incorrect MapLibre types
      style: basemapStyle('en'),
      ...view,
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
