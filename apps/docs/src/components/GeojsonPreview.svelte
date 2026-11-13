<script lang="ts">
  import { onMount } from 'svelte'
  import type { GeojsonFeatureCollection } from '@allmaps/types'
  import type { Map as MapLibreMap } from 'maplibre-gl'

  let {
    url,
    showLabels = false,
    padding = 24,
    ariaLabel = 'Geographic preview. Pan and zoom to explore.',
    reset = $bindable()
  }: {
    url: string
    showLabels?: boolean
    padding?: number
    ariaLabel?: string
    reset?: () => void
  } = $props()
  let container: HTMLDivElement
  let status = $state('Loading the map preview…')

  onMount(() => {
    const controller = new AbortController()
    let map: MapLibreMap | undefined
    let resizeObserver: ResizeObserver | undefined
    let loaded = false

    async function load() {
      try {
        const [maplibre, worker, response] = await Promise.all([
          import('maplibre-gl'),
          import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
          fetch(url, { signal: controller.signal }),
          import('maplibre-gl/dist/maplibre-gl.css')
        ])
        if (!response.ok) throw new Error('Could not load the GeoJSON.')
        const geojson: GeojsonFeatureCollection = await response.json()
        if (geojson.type !== 'FeatureCollection' || !geojson.features.length)
          throw new Error('The GeoJSON must contain polygon features.')
        controller.signal.throwIfAborted()

        const { Map, LngLatBounds, NavigationControl } = maplibre
        maplibre.setWorkerUrl(worker.default)
        const bounds = new LngLatBounds()
        for (const feature of geojson.features) {
          if (feature.geometry.type !== 'Polygon')
            throw new Error('The GeoJSON must contain polygon features.')
          for (const ring of feature.geometry.coordinates) {
            for (const point of ring) bounds.extend([point[0], point[1]])
          }
        }

        map = new Map({
          container,
          bounds,
          fitBoundsOptions: { padding, maxZoom: 20 },
          maxPitch: 0,
          cooperativeGestures: true,
          attributionControl: { compact: true },
          style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
        })
        map.addControl(
          new NavigationControl({ showCompass: false }),
          'top-right'
        )
        map.dragRotate.disable()
        map.touchZoomRotate.disableRotation()
        map.getCanvas().setAttribute('aria-label', ariaLabel)
        reset = () =>
          map?.fitBounds(bounds, { padding, maxZoom: 20, duration: 0 })
        resizeObserver = new ResizeObserver(() => map?.resize())
        resizeObserver.observe(container)
        map.on('error', (event) => {
          const aborted =
            'name' in event.error && event.error.name === 'AbortError'
          if (!controller.signal.aborted && !loaded && !aborted)
            status = 'The map preview could not be loaded.'
        })
        map.once('load', () => {
          if (!map || controller.signal.aborted) return
          map.addSource('features', { type: 'geojson', data: geojson })
          map.addLayer({
            id: 'features-fill',
            type: 'fill',
            source: 'features',
            paint: { 'fill-color': '#e83f46', 'fill-opacity': 0.18 }
          })
          map.addLayer({
            id: 'features-outline',
            type: 'line',
            source: 'features',
            paint: { 'line-color': '#e83f46', 'line-width': 2 }
          })
          if (showLabels) {
            map.addLayer({
              id: 'features-text',
              type: 'symbol',
              source: 'features',
              layout: {
                'text-field': ['get', 'text'],
                'text-font': ['Open Sans Regular'],
                'text-size': 13,
                'text-anchor': 'bottom',
                'text-offset': [0, -0.7]
              },
              paint: {
                'text-color': '#8d1724',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2
              }
            })
          }
          loaded = true
          status = ''
        })
      } catch (error) {
        if (!controller.signal.aborted)
          status =
            error instanceof Error ? error.message : 'Map preview unavailable.'
      }
    }

    void load()
    return () => {
      controller.abort()
      resizeObserver?.disconnect()
      map?.remove()
      reset = undefined
    }
  })
</script>

<div
  class="absolute! inset-0 bg-[#e7eff2] [&_.maplibregl-ctrl-attrib]:text-[9px] [&_.maplibregl-canvas:focus-visible]:outline-2 [&_.maplibregl-canvas:focus-visible]:outline-[#e83f46] [&_.maplibregl-canvas:focus-visible]:outline-offset-[-2px]"
  bind:this={container}
  role="region"
  aria-label={ariaLabel}
></div>
{#if status}
  <p
    class="pointer-events-none absolute inset-0 m-0 grid place-items-center text-sm"
    role="status"
  >
    {status}
  </p>
{/if}
