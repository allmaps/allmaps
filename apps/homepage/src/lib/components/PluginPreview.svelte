<script lang="ts">
  import { toolIdentities } from '$lib/data/tool-identities.js'
  import { onMount } from 'svelte'
  import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwiseIcon'
  import type { Map } from 'maplibre-gl'
  import type { WarpedMapLayer } from '@allmaps/maplibre'
  import { getScreenshotImage } from '$lib/data/screenshot-images.js'
  const previewImage = getScreenshotImage('holyoke-fallback')
  import { holyokeAnnotationUrl as annotationUrl } from '$lib/data/plugin-code-examples.js'

  let { compact = false }: { compact?: boolean } = $props()

  // Midpoint of Dwight Street’s bridges over Holyoke’s First and Second Level Canals.
  const initialCenter: [number, number] = [-72.604519, 42.205446]
  const initialZoom = 14
  const viewerUrl = `${toolIdentities.viewer.href}/?url=${encodeURIComponent(annotationUrl)}`
  const opacityId = $props.id()
  let container: HTMLDivElement
  let map: Map | undefined
  let layer: WarpedMapLayer | undefined
  let ready = $state(false)
  let error = $state(false)
  let opacity = $state(100)

  function resetView() {
    map?.jumpTo({
      center: initialCenter,
      zoom: initialZoom,
      bearing: 0,
      pitch: 0
    })
  }

  function updateOpacity(event: Event) {
    opacity = Number((event.currentTarget as HTMLInputElement).value)
    layer?.setOpacity(opacity / 100)
  }

  onMount(() => {
    const abortController = new AbortController()
    let disposed = false
    let resizeObserver: ResizeObserver | undefined
    let loadingTimeout: ReturnType<typeof setTimeout> | undefined

    async function initialize() {
      loadingTimeout = setTimeout(() => {
        error = true
      }, 20000)
      try {
        const [maplibre, allmaps, worker, response] = await Promise.all([
          import('maplibre-gl'),
          import('@allmaps/maplibre'),
          import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
          fetch(annotationUrl, { signal: abortController.signal }),
          import('maplibre-gl/dist/maplibre-gl.css')
        ])
        if (!response.ok) throw new Error('Annotation unavailable')
        const annotation = await response.json()
        if (disposed) return
        maplibre.setWorkerUrl(worker.default)
        map = new maplibre.Map({
          container,
          style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
          center: initialCenter,
          zoom: initialZoom,
          cooperativeGestures: true,
          maxPitch: 0
        })
        map.addControl(new maplibre.NavigationControl({ showCompass: false }))
        map.once('load', () => {
          if (disposed || !map) return
          try {
            layer = new allmaps.WarpedMapLayer()
            map.addLayer(layer)
            const results = layer.addGeoreferenceAnnotation(annotation)
            if (!results.length || results.some((result) => !result.ok)) {
              throw new Error('Map unavailable')
            }
            layer.setOpacity(opacity / 100)
            resetView()
            ready = true
            error = false
          } catch {
            error = true
          } finally {
            clearTimeout(loadingTimeout)
          }
        })
        resizeObserver = new ResizeObserver(() => map?.resize())
        resizeObserver.observe(container)
      } catch {
        if (!disposed) error = true
        clearTimeout(loadingTimeout)
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          void initialize()
        }
      },
      { rootMargin: '150px' }
    )
    observer.observe(container)

    return () => {
      disposed = true
      observer.disconnect()
      resizeObserver?.disconnect()
      clearTimeout(loadingTimeout)
      abortController.abort()
      map?.remove()
      map = undefined
      layer = undefined
    }
  })
</script>

<div class="overflow-hidden rounded-lg border border-[#121a1c]/15 bg-white">
  <div
    class={[
      'relative bg-[#edf4f5]',
      compact ? 'aspect-3/2' : 'h-[clamp(20rem,42vw,31rem)]'
    ]}
  >
    {#if !ready}
      <img
        class="absolute inset-0 size-full object-cover"
        {...previewImage}
        sizes="auto, (min-width: 768px) 704px, max(100vw, 480px)"
        alt="The 1911 atlas of Holyoke over a modern map, centered on the Dwight Street canal bridges"
        width="1494"
        height="1494"
      />
    {/if}
    <div
      class="absolute inset-0 size-full"
      class:opacity-0={!ready}
      bind:this={container}
    ></div>
    {#if error}
      <p
        class="absolute right-4 bottom-4 left-4 m-0 bg-white p-4"
        role="status"
      >
        The live example could not load. <a
          class="text-[#003653] underline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#003653]"
          href={viewerUrl}>Open this map in Allmaps Viewer →</a
        >
      </p>
    {/if}
  </div>
  <div
    class="flex min-w-0 items-center gap-2 px-3 py-3 text-sm sm:gap-3 sm:px-4"
  >
    <label
      class="shrink-0 font-bold whitespace-nowrap max-sm:text-xs"
      for={opacityId}>Map opacity</label
    >
    <input
      class="min-w-0 flex-1 accent-[#003653] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#003653]"
      id={opacityId}
      type="range"
      min="0"
      max="100"
      step="1"
      value={opacity}
      aria-valuetext={`${opacity}%`}
      oninput={updateOpacity}
      disabled={!ready}
    />
    <button
      class="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-[#121a1c]/20 bg-white disabled:cursor-default disabled:opacity-50 enabled:hover:bg-[#edf4f5] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#003653] coarse:size-11"
      type="button"
      aria-label="Reset view"
      title="Reset view"
      onclick={resetView}
      disabled={!ready}
    >
      <ArrowCounterClockwise size={20} aria-hidden="true" />
    </button>
  </div>
</div>
