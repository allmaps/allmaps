<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'

  import {
    Map as MapLibreMap,
    addProtocol,
    type Evented,
    type StyleSpecification
  } from 'maplibre-gl'
  import getProtomapsTheme from 'protomaps-themes-base'
  import { Protocol } from 'pmtiles'

  import { WarpedMapLayer } from '@allmaps/maplibre'

  import { makeStyleTransparent } from '../../shared/maplibre.js'

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
    layers: getProtomapsTheme(
      'protomaps',
      'light'
    ) as unknown as StyleSpecification['layers']
  }

  $effect(() => {
    if (map && warpedMapLayer && showBasemap) {
      map.setStyle(style, { diff: true })
      map.moveLayer('warped-map-layer')

      const fitTimeout = window.setTimeout(() => {
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

      return () => window.clearTimeout(fitTimeout)
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

    const resizeObserver = new ResizeObserver(() => map?.resize())
    resizeObserver.observe(container)

    map.on('load', () => {
      if (map) {
        warpedMapLayer = new WarpedMapLayer()

        map.addLayer(warpedMapLayer)

        warpedMapLayer.addGeoreferencedMap(georeferencedMap)

        // Allmaps events extend the built-in MapLibre event names.
        const eventedMap = map as Evented
        eventedMap.on('allrequestedtilesloaded', () => dispatch('ready'))
      }
    })

    return () => {
      resizeObserver.disconnect()
      if (map) {
        map.remove()
      }
    }
  })
</script>

<div bind:this={container} class="w-full h-full"></div>
