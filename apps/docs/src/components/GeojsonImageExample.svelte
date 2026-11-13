<script lang="ts">
  import { onMount } from 'svelte'
  import {
    createCoordinateExample,
    createImageTileGrid
  } from '../lib/coordinates.ts'
  import type { CoordinatePair } from '../lib/coordinates.ts'
  import type { GeojsonFeatureCollection } from '@allmaps/types'
  import type { Map as MapLibreMap } from 'maplibre-gl'

  let {
    annotationUrl,
    geojsonUrl
  }: {
    annotationUrl: string
    geojsonUrl: string
  } = $props()

  const id = $props.id()
  let container: HTMLDivElement
  let status = $state('Loading the photograph and Broadway…')

  onMount(() => {
    const controller = new AbortController()
    let map: MapLibreMap | undefined
    let resizeObserver: ResizeObserver | undefined
    let removeProtocol: (() => void) | undefined
    let photographLoaded = false

    async function load() {
      try {
        const [maplibre, worker, annotationResponse, geojsonResponse] =
          await Promise.all([
            import('maplibre-gl'),
            import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
            fetch(annotationUrl, { signal: controller.signal }),
            fetch(geojsonUrl, { signal: controller.signal }),
            import('maplibre-gl/dist/maplibre-gl.css')
          ])
        if (!annotationResponse.ok || !geojsonResponse.ok)
          throw new Error(
            'Could not load the photograph annotation or GeoJSON.'
          )
        const model = createCoordinateExample(await annotationResponse.json())
        const geojson: GeojsonFeatureCollection = await geojsonResponse.json()
        if (geojson.type !== 'FeatureCollection' || !geojson.features.length)
          throw new Error(
            'The Broadway example must contain a FeatureCollection.'
          )
        controller.signal.throwIfAborted()

        const grid = createImageTileGrid(model.width, model.height)
        const { Map, MercatorCoordinate, LngLatBounds, NavigationControl } =
          maplibre
        maplibre.setWorkerUrl(worker.default)
        const protocol = `allmaps-geojson-image-${id.replace(/[^a-z0-9-]/gi, '').toLowerCase()}`
        let blank: Promise<ArrayBuffer> | undefined

        maplibre.addProtocol(protocol, async ({ url }, tileController) => {
          const [zoom, column, row] = url
            .slice(url.indexOf('://') + 3)
            .split('/')
            .map(Number)
          const tile = grid.getRegion(zoom, column, row)
          if (!tile) {
            blank ??= new OffscreenCanvas(grid.tileSize, grid.tileSize)
              .convertToBlob({ type: 'image/png' })
              .then((blob) => blob.arrayBuffer())
            return { data: (await blank).slice(0) }
          }
          const response = await fetch(
            `${model.imageId}/${tile.region.join(',')}/${tile.size[0]},/0/default.jpg`,
            {
              signal: AbortSignal.any([
                controller.signal,
                tileController.signal
              ])
            }
          )
          if (!response.ok) throw new Error('Could not load a photograph tile.')
          if (
            tile.size.every((size) => size === grid.tileSize) &&
            tile.offset.every((offset) => offset === 0)
          )
            return { data: await response.arrayBuffer() }
          const bitmap = await createImageBitmap(await response.blob())
          try {
            const canvas = new OffscreenCanvas(grid.tileSize, grid.tileSize)
            const context = canvas.getContext('2d')!
            context.drawImage(bitmap, ...tile.offset, ...tile.size)
            return {
              data: await (
                await canvas.convertToBlob({ type: 'image/png' })
              ).arrayBuffer()
            }
          } finally {
            bitmap.close()
          }
        })
        removeProtocol = () => maplibre.removeProtocol(protocol)

        const bounds = new LngLatBounds()
        const features = geojson.features.map((feature) => {
          if (feature.geometry.type !== 'LineString')
            throw new Error(
              'The Broadway example must contain LineString features.'
            )
          return {
            ...feature,
            geometry: {
              type: 'LineString' as const,
              coordinates: feature.geometry.coordinates.map((point) => {
                const imagePoint = model.fromGeographic([
                  point[0],
                  point[1]
                ]).image
                const [x, y] = grid.toWorld(imagePoint)
                const position = new MercatorCoordinate(x, y).toLngLat()
                bounds.extend(position)
                return position.toArray()
              })
            }
          }
        })

        function imagePosition(point: CoordinatePair) {
          const [x, y] = grid.toWorld(point)
          return new MercatorCoordinate(x, y).toLngLat()
        }

        map = new Map({
          container,
          bounds,
          fitBoundsOptions: { padding: 40 },
          minZoom: 0,
          maxZoom: grid.maxZoom + 2,
          maxPitch: 0,
          renderWorldCopies: false,
          cooperativeGestures: true,
          attributionControl: { compact: true },
          transformConstrain(center, zoom) {
            const world = MercatorCoordinate.fromLngLat(center)
            const constrained = model.fromPixels(
              grid.fromWorld([world.x, world.y]),
              true
            )
            return { center: imagePosition(constrained.image), zoom }
          },
          style: {
            version: 8,
            sources: {
              photograph: {
                type: 'raster',
                tiles: [`${protocol}://{z}/{x}/{y}`],
                tileSize: grid.tileSize,
                maxzoom: grid.maxZoom,
                attribution:
                  '<a href="https://www.loc.gov/item/90680339/">Library of Congress</a>'
              },
              broadway: {
                type: 'geojson',
                data: { type: 'FeatureCollection', features }
              }
            },
            layers: [
              {
                id: 'photograph',
                type: 'raster',
                source: 'photograph',
                paint: { 'raster-fade-duration': 0 }
              },
              {
                id: 'broadway-outline',
                type: 'line',
                source: 'broadway',
                paint: { 'line-color': '#ffffff', 'line-width': 6 }
              },
              {
                id: 'broadway',
                type: 'line',
                source: 'broadway',
                paint: { 'line-color': '#e83f46', 'line-width': 3 }
              }
            ]
          }
        })
        map.addControl(
          new NavigationControl({ showCompass: false }),
          'top-right'
        )
        map.dragRotate.disable()
        map.touchZoomRotate.disableRotation()
        map
          .getCanvas()
          .setAttribute(
            'aria-label',
            'Complete Broadway route over the 1921 Manhattan aerial photograph. Pan and zoom to explore.'
          )
        resizeObserver = new ResizeObserver(() => map?.resize())
        resizeObserver.observe(container)
        map.on('error', (event) => {
          const aborted =
            'name' in event.error && event.error.name === 'AbortError'
          if (!controller.signal.aborted && !photographLoaded && !aborted)
            status = 'Photograph tiles could not be loaded.'
        })
        map.once('load', () => {
          photographLoaded = true
          status = ''
        })
      } catch (error) {
        if (!controller.signal.aborted)
          status =
            error instanceof Error
              ? error.message
              : 'Image preview unavailable.'
      }
    }

    void load()
    return () => {
      controller.abort()
      resizeObserver?.disconnect()
      map?.remove()
      removeProtocol?.()
    }
  })
</script>

<figure
  class="not-content my-6 overflow-hidden rounded-[14px] border border-solid border-[color:var(--sl-color-gray-5)]"
>
  <div class="relative">
    <div
      class="h-[26rem] bg-[#e7eff2] [&_.maplibregl-ctrl-attrib]:text-[9px] [&_.maplibregl-canvas:focus-visible]:outline-2 [&_.maplibregl-canvas:focus-visible]:outline-[#e83f46] [&_.maplibregl-canvas:focus-visible]:outline-offset-[-2px]"
      bind:this={container}
    ></div>
    {#if status}
      <p
        class="pointer-events-none absolute inset-0 m-0 grid place-items-center text-sm"
        role="status"
      >
        {status}
      </p>
    {/if}
  </div>
</figure>
