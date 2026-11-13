<script lang="ts">
  import { onMount } from 'svelte'
  import LoadingSmall from '../../../../packages/ui/dist/components/LoadingSmall.svelte'
  import {
    createCoordinateExample,
    createImageTileGrid,
    initialImagePoint as defaultInitialImagePoint
  } from '../lib/coordinates.ts'
  import type {
    CoordinatePair,
    CoordinateSelection,
    CoordinateExampleInitialView
  } from '../lib/coordinates.ts'
  import type { GeojsonFeatureCollection } from '@allmaps/types'
  import type { Map as MapLibreMap } from 'maplibre-gl'

  let {
    annotationUrl,
    geojsonUrl,
    initialView,
    showPoint = true,
    showFooter = true,
    imageAttribution = 'Library of Congress'
  }: {
    annotationUrl: string
    geojsonUrl?: string
    initialView?: CoordinateExampleInitialView
    showPoint?: boolean
    showFooter?: boolean
    imageAttribution?: string
  } = $props()
  const id = $props.id()
  let imageContainer: HTMLDivElement
  let geographicContainer: HTMLDivElement
  let ready = $state(false)
  let error = $state('')
  let selection = $state<CoordinateSelection>()
  let reset: (() => void) | undefined
  let retry: (() => void) | undefined

  const mapClasses =
    'relative h-80 bg-[#e7eff2] [&_.maplibregl-ctrl-attrib]:text-[9px] [&_.maplibregl-canvas:focus-visible]:outline-2 [&_.maplibregl-canvas:focus-visible]:outline-[#ff56ba] [&_.maplibregl-canvas:focus-visible]:outline-offset-[-2px]'
  let initialImagePoint = $derived(
    initialView?.image ?? defaultInitialImagePoint
  )
  let initialGeographicZoom = $derived(initialView?.geographicZoom ?? 12)
  const pointClasses =
    'pointer-events-none absolute left-1/2 top-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-solid border-white bg-[#ff56ba] shadow-md'

  onMount(() => {
    let controller: AbortController
    let imageMap: MapLibreMap | undefined
    let geographicMap: MapLibreMap | undefined
    let resizeObserver: ResizeObserver | undefined
    let removeProtocol: (() => void) | undefined

    function dispose() {
      resizeObserver?.disconnect()
      imageMap?.remove()
      geographicMap?.remove()
      imageMap = undefined
      geographicMap = undefined
      removeProtocol?.()
      removeProtocol = undefined
    }

    async function load() {
      controller?.abort()
      controller = new AbortController()
      const request = controller
      dispose()
      ready = false
      error = ''
      try {
        const [maplibre, worker, response, geojsonResponse] = await Promise.all(
          [
            import('maplibre-gl'),
            import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
            fetch(annotationUrl, { signal: request.signal }),
            geojsonUrl
              ? fetch(geojsonUrl, { signal: request.signal })
              : undefined,
            import('maplibre-gl/dist/maplibre-gl.css')
          ]
        )
        if (!response.ok)
          throw new Error('Could not load the Georeference Annotation.')
        const model = createCoordinateExample(await response.json())
        let geojson: GeojsonFeatureCollection | undefined
        if (geojsonResponse) {
          if (!geojsonResponse.ok)
            throw new Error('Could not load the GeoJSON.')
          geojson = await geojsonResponse.json()
          if (geojson?.type !== 'FeatureCollection' || !geojson.features.length)
            throw new Error('The GeoJSON must contain polygon features.')
        }
        request.signal.throwIfAborted()
        const grid = createImageTileGrid(model.width, model.height)
        const initialImageZoom = initialView?.imageZoom ?? grid.initialZoom - 3
        // The photograph's display grid and the basemap use different zoom scales.
        const zoomOffset = initialGeographicZoom - initialImageZoom
        const maximumImageZoom = grid.maxZoom + 2
        const {
          Map,
          NavigationControl,
          LngLat,
          MercatorCoordinate,
          addProtocol,
          setWorkerUrl
        } = maplibre
        setWorkerUrl(worker.default)
        const protocol = `allmaps-image-${id.replace(/[^a-z0-9-]/gi, '').toLowerCase()}`
        let blank: Promise<ArrayBuffer> | undefined

        addProtocol(protocol, async ({ url }, abortController) => {
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
          const tileResponse = await fetch(
            `${model.imageId}/${tile.region.join(',')}/${tile.size[0]},/0/default.jpg`,
            {
              signal: AbortSignal.any([request.signal, abortController.signal])
            }
          )
          if (!tileResponse.ok)
            throw new Error('Could not load a photograph tile.')
          if (
            tile.size.every((size) => size === grid.tileSize) &&
            tile.offset.every((offset) => offset === 0)
          ) {
            return { data: await tileResponse.arrayBuffer() }
          }
          // Edge tiles need transparent padding to preserve their original pixel positions.
          const bitmap = await createImageBitmap(await tileResponse.blob())
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

        function imageCenter(point: CoordinatePair) {
          const [x, y] = grid.toWorld(point)
          return new MercatorCoordinate(x, y).toLngLat()
        }
        const imageGeojson: GeojsonFeatureCollection | undefined = geojson && {
          ...geojson,
          features: geojson.features.map((feature) => {
            if (feature.geometry.type !== 'Polygon')
              throw new Error('The GeoJSON must contain polygon features.')
            return {
              ...feature,
              geometry: {
                type: 'Polygon',
                coordinates: feature.geometry.coordinates.map((ring) =>
                  ring.map((point) =>
                    imageCenter(
                      model.fromGeographic([point[0], point[1]]).image
                    ).toArray()
                  )
                )
              }
            }
          })
        }
        const initial = model.fromPixels(initialImagePoint)
        selection = initial
        imageMap = new Map({
          container: imageContainer,
          center: imageCenter(initial.image),
          zoom: initialImageZoom,
          minZoom: 0,
          maxZoom: maximumImageZoom,
          maxPitch: 0,
          renderWorldCopies: false,
          cooperativeGestures: true,
          attributionControl: { compact: true },
          // Constrain the camera itself: jumpTo during a drag cancels the gesture.
          transformConstrain(center, zoom) {
            const world = MercatorCoordinate.fromLngLat(center)
            const constrained = model.fromPixels(
              grid.fromWorld([world.x, world.y]),
              true
            )
            return { center: imageCenter(constrained.image), zoom }
          },
          style: {
            version: 8,
            sources: {
              photograph: {
                type: 'raster',
                tiles: [`${protocol}://{z}/{x}/{y}`],
                tileSize: grid.tileSize,
                maxzoom: grid.maxZoom,
                attribution: imageAttribution
              }
            },
            layers: [
              {
                id: 'photograph',
                type: 'raster',
                source: 'photograph',
                paint: { 'raster-fade-duration': 0 }
              }
            ]
          }
        })
        geographicMap = new Map({
          container: geographicContainer,
          center: initial.geographic,
          zoom: initialGeographicZoom,
          minZoom: zoomOffset,
          maxZoom: maximumImageZoom + zoomOffset,
          maxPitch: 0,
          renderWorldCopies: false,
          cooperativeGestures: true,
          attributionControl: { compact: true },
          transformConstrain(center, zoom) {
            const constrained = model.fromGeographic(
              [center.lng, center.lat],
              true
            )
            return { center: new LngLat(...constrained.geographic), zoom }
          },
          style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
        })
        for (const map of [imageMap, geographicMap]) {
          map.addControl(
            new NavigationControl({ showCompass: false }),
            'top-right'
          )
          map.dragRotate.disable()
          map.touchZoomRotate.disableRotation()
        }
        imageMap
          .getCanvas()
          .setAttribute(
            'aria-label',
            'Original IIIF image. Pan to change the selected pixel.'
          )
        geographicMap
          .getCanvas()
          .setAttribute(
            'aria-label',
            'Modern map. Pan to change the selected geographic location.'
          )

        let synchronizing = false
        function synchronize(next: CoordinateSelection, source: MapLibreMap) {
          if (synchronizing || request.signal.aborted) return
          synchronizing = true
          try {
            selection = next
            const imageZoom =
              source === imageMap
                ? imageMap!.getZoom()
                : geographicMap!.getZoom() - zoomOffset
            const geographicZoom = imageZoom + zoomOffset
            const imageTarget = imageCenter(next.image)
            const currentImage = imageMap!.getCenter()
            if (
              source !== imageMap &&
              (Math.abs(currentImage.lng - imageTarget.lng) > 1e-9 ||
                Math.abs(currentImage.lat - imageTarget.lat) > 1e-9 ||
                Math.abs(imageMap!.getZoom() - imageZoom) > 1e-9)
            )
              imageMap!.jumpTo({ center: imageTarget, zoom: imageZoom })
            const currentGeographic = geographicMap!.getCenter()
            if (
              source !== geographicMap &&
              (Math.abs(currentGeographic.lng - next.geographic[0]) > 1e-9 ||
                Math.abs(currentGeographic.lat - next.geographic[1]) > 1e-9 ||
                Math.abs(geographicMap!.getZoom() - geographicZoom) > 1e-9)
            )
              geographicMap!.jumpTo({
                center: next.geographic,
                zoom: geographicZoom
              })
          } finally {
            synchronizing = false
          }
        }
        imageMap.on('move', () => {
          if (synchronizing) return
          const center = MercatorCoordinate.fromLngLat(imageMap!.getCenter())
          synchronize(
            model.fromPixels(grid.fromWorld([center.x, center.y]), true),
            imageMap!
          )
        })
        geographicMap.on('move', () => {
          if (synchronizing) return
          const center = geographicMap!.getCenter()
          synchronize(
            model.fromGeographic([center.lng, center.lat], true),
            geographicMap!
          )
        })
        reset = () => {
          synchronizing = true
          try {
            imageMap!.jumpTo({
              center: imageCenter(initial.image),
              zoom: initialImageZoom
            })
            geographicMap!.jumpTo({
              center: initial.geographic,
              zoom: initialGeographicZoom
            })
            selection = initial
          } finally {
            synchronizing = false
          }
        }
        resizeObserver = new ResizeObserver(() => {
          imageMap?.resize()
          geographicMap?.resize()
        })
        resizeObserver.observe(imageContainer)
        resizeObserver.observe(geographicContainer)
        await Promise.all(
          [imageMap, geographicMap].map(
            (map) =>
              new Promise<void>((resolve, reject) => {
                const cleanup = () => {
                  map.off('load', loaded)
                  map.off('error', failed)
                  request.signal.removeEventListener('abort', aborted)
                }
                const loaded = () => {
                  cleanup()
                  resolve()
                }
                const failed = (event: { error: unknown }) => {
                  cleanup()
                  reject(event.error)
                }
                const aborted = () => {
                  cleanup()
                  reject(request.signal.reason)
                }
                map.once('load', loaded)
                map.once('error', failed)
                request.signal.addEventListener('abort', aborted, {
                  once: true
                })
              })
          )
        )
        request.signal.throwIfAborted()
        if (geojson && imageGeojson) {
          for (const [map, data] of [
            [imageMap, imageGeojson],
            [geographicMap, geojson]
          ] as const) {
            map.addSource('annotations', { type: 'geojson', data })
            map.addLayer({
              id: 'annotation-fill',
              type: 'fill',
              source: 'annotations',
              paint: { 'fill-color': '#e83f46', 'fill-opacity': 0.18 }
            })
            map.addLayer({
              id: 'annotation-outline',
              type: 'line',
              source: 'annotations',
              paint: { 'line-color': '#e83f46', 'line-width': 2 }
            })
          }
        }
        ready = true
      } catch (cause) {
        if (!request.signal.aborted)
          error =
            cause instanceof Error
              ? cause.message
              : 'Could not load the coordinate example.'
      }
    }
    retry = () => {
      void load()
    }
    void load()
    return () => {
      controller?.abort()
      dispose()
    }
  })
</script>

<div
  class="not-content @container my-6 overflow-hidden rounded-[14px] border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] bg-[color:var(--sl-color-bg,#fff)] text-[color:var(--sl-color-text,#182a2f)]"
>
  <div class="relative grid grid-cols-1 lg:@min-[32rem]:grid-cols-2">
    <div
      class="relative order-1 border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] lg:@min-[32rem]:border-r"
    >
      <div class={mapClasses} bind:this={imageContainer}></div>
      {#if showPoint}<div class={pointClasses} aria-hidden="true"></div>{/if}
    </div>
    <div class="relative order-3 lg:@min-[32rem]:order-2">
      <div class={mapClasses} bind:this={geographicContainer}></div>
      {#if showPoint}<div class={pointClasses} aria-hidden="true"></div>{/if}
    </div>
    {#if showFooter}
      <div
        class="order-2 flex items-center gap-2 border-y border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] px-3 py-2 text-xs whitespace-nowrap lg:@min-[32rem]:order-3 lg:@min-[32rem]:border-r lg:@min-[32rem]:border-b-0"
      >
        <span class="font-medium">Image</span>
        <output class="font-mono" aria-label="Image coordinates" aria-live="off"
          >{selection?.image[0].toFixed(0) ?? initialImagePoint[0]}, {selection?.image[1].toFixed(
            0
          ) ?? initialImagePoint[1]} px</output
        >
      </div>
      <div
        class="order-4 flex items-center gap-2 border-t border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] px-3 py-2 text-xs whitespace-nowrap"
      >
        <span class="font-medium">Map</span>
        <output
          class="font-mono"
          aria-label="Geographic coordinates"
          aria-live="off"
          >{selection?.geographic[0].toFixed(5) ?? '—'}, {selection?.geographic[1].toFixed(
            5
          ) ?? '—'}°</output
        >
        <button
          class="ml-auto inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border-0 bg-transparent px-1 py-1 text-xs text-[color:var(--sl-color-gray-2,#495c62)] hover:text-[#ff56ba] focus-visible:outline-2 focus-visible:outline-[#ff56ba] focus-visible:outline-offset-2 disabled:opacity-50"
          aria-label="Reset point"
          title="Reset point"
          type="button"
          disabled={!ready}
          onclick={() => reset?.()}
        >
          <svg
            class="size-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 11a9 9 0 1 1 2.7 6.4M3 4v7h7" />
          </svg>
        </button>
      </div>
    {/if}
    {#if !ready}
      <div
        class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[color:color-mix(in_srgb,var(--sl-color-bg,#fff)_85%,transparent)] p-4 text-center text-sm"
      >
        {#if error}<p class="m-0" role="alert">{error}</p>
          <button
            class="cursor-pointer rounded border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] bg-transparent px-3 py-1.5 text-xs"
            type="button"
            onclick={() => retry?.()}>Try again</button
          >
        {:else}<div class="flex items-center gap-2" role="status">
            <LoadingSmall />Loading coordinate example…
          </div>{/if}
      </div>
    {/if}
  </div>
</div>
