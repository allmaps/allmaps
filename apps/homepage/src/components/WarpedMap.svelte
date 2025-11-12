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

  type Props = {
    georeferencedMap: GeoreferencedMap
    bounds: Bbox
    showBasemap?: boolean
  }

  const { georeferencedMap, bounds, showBasemap = false }: Props = $props()

  const dispatch = createEventDispatcher()

  let map = $state<MapLibreMap>()
  let warpedMapLayer = $state<WarpedMapLayer>()

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

  $effect(() => {
    if (map && warpedMapLayer && showBasemap) {
      map.setStyle(style, { diff: true })
      map.moveLayer('warped-map-layer')

      setTimeout(() => {
        if (map && warpedMapLayer) {
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
        }
      }, 500)
    }
  })

  onMount(() => {
    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)

    map = new MapLibreMap({
      container,
      style: makeStyleTransparent(style),
      bounds: bounds,
      maxPitch: 0,
      attributionControl: false
    })

    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()

    map.on('load', async () => {
      if (map) {
        warpedMapLayer = new WarpedMapLayer()

        // @ts-expect-error Incompatible with MapLibre types
        map.addLayer(warpedMapLayer)

        await warpedMapLayer.addGeoreferencedMap(georeferencedMap)

        map.on('allrequestedtilesloaded', () => dispatch('ready'))
      }
    })

    return () => {
      if (map) {
        map.remove()
      }
    }
  })
</script>

<div bind:this={container} class="w-full h-full"></div>
