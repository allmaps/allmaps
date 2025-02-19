<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'

  import {
    Map as MapLibreMap,
    addProtocol,
    type StyleSpecification
  } from 'maplibre-gl'
  import getProtomapsTheme from 'protomaps-themes-base'
  import { Protocol } from 'pmtiles'

  import { WarpedMapLayer } from '@allmaps/maplibre'

  import { makeStyleTransparent } from '../shared/maplibre.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Bbox } from '@allmaps/types'

  export let georeferencedMap: GeoreferencedMap
  export let bounds: Bbox
  export let showBasemap = false

  const dispatch = createEventDispatcher()

  let map: MapLibreMap
  let warpedMapLayer: WarpedMapLayer

  let container: HTMLElement

  const style: StyleSpecification = {
    version: 8 as const,
    glyphs:
      'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sources: {
      protomaps: {
        type: 'vector',
        tiles: [
          'https://api.protomaps.com/tiles/v3/{z}/{x}/{y}.mvt?key=ca7652ec836f269a'
        ],
        maxzoom: 14,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
      }
    },
    layers: getProtomapsTheme('protomaps', 'light')
  }

  $: {
    if (map && warpedMapLayer && showBasemap) {
      map.setStyle(style, { diff: true })
      map.moveLayer('warped-map-layer')

      setTimeout(() => {
        const bounds = warpedMapLayer.getBounds()
        if (bounds) {
          map.fitBounds(bounds, {
            padding: {
              top: 50,
              bottom: 100,
              right: 50,
              left: 50
            }
          })
        }
      }, 500)
    }
  }

  onMount(() => {
    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)

    map = new MapLibreMap({
      container,
      style: makeStyleTransparent(style),
      bounds: bounds,
      maxPitch: 0,
      preserveDrawingBuffer: true,
      attributionControl: false
    })

    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()

    map.on('load', async () => {
      warpedMapLayer = new WarpedMapLayer()

      map.addLayer(warpedMapLayer)

      await warpedMapLayer.addGeoreferencedMap(georeferencedMap)

      map.on('allrequestedtilesloaded', () => dispatch('ready'))
    })

    return () => {
      map.remove()
    }
  })
</script>

<div bind:this={container} class="w-full h-full"></div>
