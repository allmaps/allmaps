<script lang="ts">
  import { onMount, tick } from 'svelte'
  import {
    Map as MapLibreMap,
    setWorkerUrl,
    type StyleSpecification
  } from 'maplibre-gl'
  import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { shades, themeColors } from '@allmaps/tailwind'

  import 'maplibre-gl/dist/maplibre-gl.css'

  import type {
    NarrationConfig,
    NarrationMap,
    NarrationSlide
  } from '../shared/map-narration'

  type Props = NarrationConfig & {
    slides: NarrationSlide[]
  }

  const {
    slides,
    basemapStyleUrl,
    backgroundColor = 'blue-100',
    interactive = false
  }: Props = $props()

  let index = $state(0)
  let ready = $state(false)
  let loading = $state(true)
  let error = $state('')
  let opacity = $state(100)
  const slide = $derived(slides[index])
  const mapInteractive = $derived(interactive && index > 0)
  const background = $derived(
    (themeColors as Record<string, string>)[backgroundColor] ?? shades.blue[0]
  )

  let container = $state<HTMLDivElement>()
  let caption = $state<HTMLDivElement>()
  let captionContent = $state<HTMLDivElement>()
  let descriptionElement = $state<HTMLDivElement>()
  let navigation = $state<HTMLElement>()
  let captionHeight = $state<number>()
  let map: MapLibreMap
  let layer: WarpedMapLayer
  let basemapLayers: StyleSpecification['layers'] = []
  let controller: AbortController
  let revision = 0
  let appliedSlide: NarrationSlide | undefined
  let framedSlide: NarrationSlide | undefined
  let framedLayout = ''
  let activeMapIds: string[] = []
  let reducedMotion = false
  let resizing = false

  // Keep annotations and IIIF tiles in one layer when moving between steps.
  const annotations = new Map<string, Promise<string[]>>()

  async function goToSlide(nextIndex: number) {
    const changingButtons =
      index === 0 ||
      index === slides.length - 1 ||
      nextIndex === 0 ||
      nextIndex === slides.length - 1
    index = nextIndex
    if (changingButtons) {
      await tick()
      const buttons = navigation?.querySelectorAll<HTMLButtonElement>('button')
      buttons?.[buttons.length - 1]?.focus({ preventScroll: true })
    }
  }

  async function loadAnnotation({ url }: NarrationMap): Promise<string[]> {
    let promise = annotations.get(url)
    if (!promise) {
      promise = (async () => {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) throw new Error('Could not load the map annotation.')
        const annotation = await response.json()
        controller.signal.throwIfAborted()
        const results = layer.addGeoreferenceAnnotation(annotation, {
          visible: false
        })
        const ids = results.flatMap((result) =>
          result.ok ? [result.mapId] : []
        )
        if (!ids.length)
          throw new Error('This annotation contains no usable maps.')
        return ids
      })().catch((cause) => {
        annotations.delete(url)
        throw cause
      })
      annotations.set(url, promise)
    }
    return promise
  }

  function measureCaption() {
    if (captionContent && navigation) {
      // Measure the natural content, not the animated outer box.
      // Preserve fractional pixels to avoid a small jump on the first measure.
      captionHeight =
        captionContent.getBoundingClientRect().height +
        navigation.getBoundingClientRect().height +
        2
    }
  }

  function frameSlide(duration = 0) {
    if (
      resizing ||
      !appliedSlide ||
      !activeMapIds.length ||
      !container ||
      !caption
    )
      return

    const layout = [
      container.clientWidth,
      container.clientHeight,
      caption.offsetWidth,
      captionHeight
    ].join(':')
    if (framedSlide === appliedSlide && framedLayout === layout) return

    // Reserve exactly the caption's final size, plus a small gap. Symmetric
    // fitting padding and a separate offset also work with Allmaps' bearing fit.
    const gap = 12
    const wide = container.clientWidth >= 760
    const left = wide ? caption.offsetLeft + caption.offsetWidth + gap : gap
    const captionBottom = parseFloat(getComputedStyle(caption).bottom)
    const bottom = wide
      ? gap
      : (captionHeight ?? caption.offsetHeight) + captionBottom + gap
    const padding = {
      left: (left + gap) / 2,
      right: (left + gap) / 2,
      top: (bottom + gap) / 2,
      bottom: (bottom + gap) / 2
    }
    const offset: [number, number] = [(left - gap) / 2, (gap - bottom) / 2]
    const bounds = layer.getMapsBounds(activeMapIds)
    const camera =
      appliedSlide.location ??
      (appliedSlide.useBearing
        ? layer.getMapsCenterZoomBearing(activeMapIds, { padding })
        : bounds && map.cameraForBounds(bounds, { padding, bearing: 0 }))

    if (camera) {
      framedSlide = appliedSlide
      framedLayout = layout
      map.stop()
      map.easeTo({
        ...camera,
        zoom: (camera.zoom ?? map.getZoom()) + (appliedSlide.zoomOffset ?? 0),
        bearing: camera.bearing ?? 0,
        padding: 0,
        offset,
        duration: reducedMotion ? 0 : duration
      })
    }
  }

  function updateOpacity(value: number) {
    if (!ready || appliedSlide !== slide) return
    opacity = value
    layer.setMapsOptions(
      activeMapIds,
      { opacity: value / 100 },
      { animate: false }
    )
    map.triggerRepaint()
  }

  async function showSlide(next: NarrationSlide) {
    const request = ++revision
    opacity = Math.round((next.warpedMaps[0]?.options?.opacity ?? 1) * 100)
    loading = next.warpedMaps.some(({ url }) => !annotations.has(url))
    error = ''
    try {
      const ids = await Promise.all(next.warpedMaps.map(loadAnnotation))
      if (controller.signal.aborted || request !== revision) return

      const optionsById = new Map(
        next.warpedMaps.flatMap((warpedMap, i) =>
          ids[i].map((id) => [id, warpedMap.options ?? {}] as const)
        )
      )
      layer.setMapsOptions(
        (id) => ({
          // Allmaps merges options: clear the preceding step's overrides.
          ...Object.fromEntries(
            Object.keys(layer.getMapMapOptions(id) ?? {}).map((key) => [
              key,
              undefined
            ])
          ),
          ...optionsById.get(id),
          visible: optionsById.has(id)
        }),
        { animate: !reducedMotion, duration: 500 }
      )
      activeMapIds = ids.flat()
      layer.bringMapsToFront(activeMapIds)
      for (const basemapLayer of basemapLayers) {
        map.setLayoutProperty(
          basemapLayer.id,
          'visibility',
          next.hideBasemap
            ? 'none'
            : (basemapLayer.layout?.visibility ?? 'visible')
        )
      }
      const first = !appliedSlide
      loading = false
      await tick()
      if (controller.signal.aborted || request !== revision) return
      measureCaption()
      appliedSlide = next
      frameSlide(first ? 0 : 900)
      map.triggerRepaint()
    } catch (cause) {
      if (controller.signal.aborted || request !== revision) return
      error = 'The map could not be loaded.'
      console.error('Map narration:', cause)
    } finally {
      if (!controller.signal.aborted && request === revision) loading = false
    }
  }

  $effect(() => {
    // HTML descriptions need the same link behavior as the templated credits.
    if (!slide?.description || !descriptionElement) return
    for (const link of descriptionElement.querySelectorAll<HTMLAnchorElement>(
      'a[href]'
    )) {
      link.target = '_blank'
      link.relList.add('noopener', 'noreferrer')
    }
  })

  $effect(() => {
    if (ready && slide) void showSlide(slide)
  })

  $effect(() => {
    if (!ready) return
    for (const handler of [
      map.dragPan,
      map.scrollZoom,
      map.boxZoom,
      map.doubleClickZoom,
      map.keyboard,
      map.touchZoomRotate
    ]) {
      if (mapInteractive) handler.enable()
      else handler.disable()
    }
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.getCanvas().tabIndex = mapInteractive ? 0 : -1
    map
      .getCanvasContainer()
      .classList.toggle('maplibregl-interactive', mapInteractive)
  })

  onMount(() => {
    const element = container
    const panel = caption
    const content = captionContent
    const buttons = navigation
    if (!element || !panel || !content || !buttons) return
    controller = new AbortController()

    let swipeStart:
      | { pointerId: number; x: number; y: number; time: number; index: number }
      | undefined
    const cancelSwipe = () => (swipeStart = undefined)
    const startSwipe = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return
      // Leave taps on controls, text selection and multi-touch gestures alone.
      if (
        !event.isPrimary ||
        (event.target instanceof Element &&
          event.target.closest('a, button, input, label, select, textarea'))
      ) {
        cancelSwipe()
        return
      }
      swipeStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        index
      }
      panel.setPointerCapture(event.pointerId)
    }
    const endSwipe = (event: PointerEvent) => {
      const start = swipeStart
      if (!start || event.pointerId !== start.pointerId) return
      cancelSwipe()
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (
        index !== start.index ||
        event.timeStamp - start.time > 750 ||
        Math.abs(dx) < 50 ||
        Math.abs(dx) < Math.abs(dy) * 1.5 ||
        window.getSelection()?.toString()
      )
        return
      const nextIndex = Math.max(
        0,
        Math.min(slides.length - 1, index + (dx < 0 ? 1 : -1))
      )
      if (nextIndex !== index) void goToSlide(nextIndex)
    }
    panel.addEventListener('pointerdown', startSwipe, { passive: true })
    panel.addEventListener('pointerup', endSwipe, { passive: true })
    panel.addEventListener('pointercancel', cancelSwipe, { passive: true })

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => (reducedMotion = motion.matches)
    updateMotion()
    motion.addEventListener('change', updateMotion)
    let resizeFrame = 0
    let resizeTimeout = 0
    let width = element.clientWidth
    let height = element.clientHeight
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width || element.clientHeight !== height) {
        width = element.clientWidth
        height = element.clientHeight
        if (!resizing && ready) map.stop()
        resizing = true
        // A drag can end at its starting size after interrupting a camera move.
        framedLayout = ''
        // Keep the canvas and camera viewport at the actual container size.
        // Redraw before the browser paints the newly resized (cleared) canvas.
        map?.resize().redraw()
        window.clearTimeout(resizeTimeout)
        resizeTimeout = window.setTimeout(() => {
          resizing = false
          measureCaption()
          // Only refit the bounds after the drag settles.
          if (ready && appliedSlide === slides[index]) frameSlide()
        }, 200)
      }
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        measureCaption()
        // Caption-only changes still animate with the next story step.
        if (ready && appliedSlide === slides[index]) frameSlide(900)
      })
    })
    measureCaption()
    observer.observe(element)
    observer.observe(content)
    observer.observe(buttons)

    const initialize = async () => {
      try {
        const response = await fetch(basemapStyleUrl, {
          signal: controller.signal
        })
        if (!response.ok) throw new Error('Could not load the basemap style.')
        const style: StyleSpecification = await response.json()
        controller.signal.throwIfAborted()
        basemapLayers = structuredClone(style.layers)
        if (slide?.hideBasemap) {
          style.layers = style.layers.map((entry) => ({
            ...entry,
            layout: { ...entry.layout, visibility: 'none' }
          }))
        }
        setWorkerUrl(maplibreWorkerUrl)
        map = new MapLibreMap({
          container: element,
          style,
          maxPitch: 0,
          interactive: mapInteractive,
          dragRotate: false,
          touchPitch: false,
          trackResize: false,
          attributionControl: false,
          renderWorldCopies: false
        })
        map.dragRotate.disable()
        map.touchZoomRotate.disableRotation()
        map.once('load', () => {
          if (controller.signal.aborted) return
          layer = new WarpedMapLayer()
          map.addLayer(layer)
          ready = true
        })
      } catch (cause) {
        if (controller.signal.aborted) return
        loading = false
        error = 'The map could not be loaded. Please reload to try again.'
        console.error('Map narration:', cause)
      }
    }
    void initialize()

    return () => {
      controller.abort()
      revision++
      observer.disconnect()
      cancelAnimationFrame(resizeFrame)
      window.clearTimeout(resizeTimeout)
      motion.removeEventListener('change', updateMotion)
      panel.removeEventListener('pointerdown', startSwipe)
      panel.removeEventListener('pointerup', endSwipe)
      panel.removeEventListener('pointercancel', cancelSwipe)
      map?.remove()
    }
  })
</script>

{#if slide}
  <section
    id="map-narration"
    class="narration not-content"
    aria-label="Map narration"
    style:--paper={background}
    style:--accent={shades.pink[4]}
    style:--glow-from={shades.yellow[4]}
  >
    <div class="map" bind:this={container} aria-busy={loading}></div>
    {#if loading && !error}
      <p class="loading-status" role="status">Loading map…</p>
    {/if}
    <div
      class="caption"
      bind:this={caption}
      style:height={captionHeight === undefined
        ? undefined
        : `${captionHeight}px`}
    >
      <div class="caption-body">
        <div class="caption-content" bind:this={captionContent}>
          <div aria-live="polite" aria-atomic="true">
            <h3>{slide.title}</h3>
            <div class="description" bind:this={descriptionElement}>
              {@html slide.description}
            </div>
            {#if slide.links?.length}
              <p class="links">
                {#each slide.links as link}
                  <a href={link.href} target="_blank" rel="noopener noreferrer"
                    >{link.label}</a
                  >
                {/each}
              </p>
            {/if}
            {#if slide.attributions?.length}
              <p class="attributions">
                {#each slide.attributions as attribution}
                  <a
                    href={attribution.href}
                    target="_blank"
                    rel="noopener noreferrer">{attribution.label}</a
                  >
                {/each}
              </p>
            {/if}
          </div>
          {#if slide.showOpacitySlider}
            <label class="opacity-control">
              <span class="opacity-label">
                <span>Map opacity</span>
                <span class="opacity-value" aria-hidden="true">{opacity}%</span>
              </span>
              <input
                class="opacity-slider"
                type="range"
                min="0"
                max="100"
                step="1"
                value={opacity}
                aria-valuetext={`${opacity}%`}
                disabled={!ready || loading || !!error}
                style:--opacity={`${opacity}%`}
                oninput={(event) =>
                  updateOpacity(event.currentTarget.valueAsNumber)}
              />
            </label>
          {/if}
          {#if error}
            <p class="status" role="alert">
              {error}
              {#if ready}<button onclick={() => showSlide(slide)}>Retry</button
                >{/if}
            </p>
          {/if}
        </div>
      </div>
      <nav aria-label="Narration steps" bind:this={navigation}>
        {#if index === 0}
          <span class="start-glow"
            ><button class="start" onclick={() => goToSlide(1)}>Start</button
            ></span
          >
        {:else}
          {#if index === slides.length - 1}
            <button onclick={() => goToSlide(0)}>View again</button>
          {:else}
            <button
              aria-label="Previous slide"
              onclick={() => goToSlide(index - 1)}
              ><span aria-hidden="true">←</span> Previous</button
            >
          {/if}
          <span
            class="count"
            aria-label={`Slide ${index} of ${slides.length - 1}`}
          >
            {index} / {slides.length - 1}
          </span>
          {#if index < slides.length - 1}
            <button aria-label="Next slide" onclick={() => goToSlide(index + 1)}
              >Next <span aria-hidden="true">→</span></button
            >
          {/if}
        {/if}
      </nav>
    </div>
  </section>
{/if}

<style>
  .narration {
    position: relative;
    height: 36rem;
    margin-block: 2rem 3rem;
    overflow: hidden;
    border-radius: 0.75rem;
    background-color: var(--paper);
    color: #222;
    isolation: isolate;
    container-type: inline-size;
  }

  .map {
    position: absolute;
    inset: 0;
    background: transparent;
  }

  .loading-status {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.35rem 0.65rem;
    border-radius: 0.375rem;
    background: rgb(255 255 255 / 90%);
    pointer-events: none;
  }

  .caption {
    --caption-padding: 1.25rem;
    position: absolute;
    left: 1.25rem;
    bottom: 1.25rem;
    width: min(21rem, calc(100% - 2.5rem));
    box-sizing: border-box;
    overflow: hidden;
    border: 1px solid #e0e0e0;
    border-radius: 0.75rem;
    background: rgb(255 255 255 / 90%);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    touch-action: pan-y pinch-zoom;
    box-shadow: 0 2px 12px #22222212;
    transition: height 400ms cubic-bezier(0.22, 1, 0.36, 1);
    display: flex;
    flex-direction: column;
  }

  .caption-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .caption-content {
    padding: var(--caption-padding);
    padding-bottom: 1rem;
  }

  h3 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.3;
  }

  p,
  .description {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .description :global(p) {
    margin: 0;
  }

  .description :global(p + p) {
    margin-top: 0.5rem;
  }

  .description :global(b),
  .description :global(strong) {
    font-weight: 600;
  }

  .description :global(i),
  .description :global(em) {
    font-style: italic;
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    margin-top: 0.75rem;
    font-size: 0.8rem;
  }

  .links a,
  .description :global(a) {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }

  .links a:hover,
  .description :global(a:hover) {
    text-decoration-color: var(--accent);
  }

  .attributions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
    margin-top: 0.5rem;
    color: #6a6a6a;
    font-size: 0.7rem;
    font-weight: 400;
  }

  .attributions a {
    color: inherit;
    text-decoration: none;
  }

  .attributions a:hover {
    color: #222;
  }

  .opacity-control {
    display: block;
    max-width: 18rem;
    margin-top: 0.875rem;
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .opacity-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .opacity-value {
    color: #6a6a6a;
    font-variant-numeric: tabular-nums;
  }

  .opacity-slider {
    display: block;
    appearance: none;
    width: 100%;
    height: 2.75rem;
    margin: 0;
    border: 0;
    border-radius: 0.375rem;
    background: transparent;
    cursor: pointer;
    touch-action: pan-y;
  }

  .opacity-slider::-webkit-slider-runnable-track {
    height: 0.25rem;
    border-radius: 1rem;
    background: linear-gradient(
      to right,
      var(--accent) var(--opacity),
      #e0e0e0 var(--opacity)
    );
  }

  .opacity-slider::-moz-range-track {
    height: 0.25rem;
    border-radius: 1rem;
    background: linear-gradient(
      to right,
      var(--accent) var(--opacity),
      #e0e0e0 var(--opacity)
    );
  }

  .opacity-slider::-webkit-slider-thumb {
    appearance: none;
    box-sizing: border-box;
    width: 1.125rem;
    height: 1.125rem;
    margin-top: -0.4375rem;
    border: 2px solid var(--accent);
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px #22222220;
  }

  .opacity-slider::-moz-range-thumb {
    box-sizing: border-box;
    width: 1.125rem;
    height: 1.125rem;
    border: 2px solid var(--accent);
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px #22222220;
  }

  .opacity-slider:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .opacity-slider:disabled {
    opacity: 0.35;
    cursor: default;
  }

  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-shrink: 0;
    padding: 0 var(--caption-padding) var(--caption-padding);
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid #e0e0e0;
    border-radius: 0.375rem;
    background: #fff;
    color: inherit;
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 10%, white);
  }

  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  .start-glow {
    position: relative;
    isolation: isolate;
    display: inline-flex;
  }

  .start-glow::before {
    content: '';
    position: absolute;
    z-index: -1;
    inset: -4px;
    border-radius: 0.5rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--glow-from) 40%, transparent),
      color-mix(in srgb, var(--accent) 40%, transparent)
    );
    filter: blur(10px);
  }

  .start {
    padding-inline: 1.25rem;
    border-color: color-mix(in srgb, var(--accent) 35%, white);
  }

  button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .count,
  .status,
  .loading-status {
    font-size: 0.8rem;
    color: #6a6a6a;
  }

  .status {
    margin-top: 0.75rem;
  }

  @media (max-width: 759px) {
    .narration {
      height: 38rem;
    }
  }

  @container (max-width: 759px) {
    .caption {
      --caption-padding: 1rem;
      left: 0.75rem;
      bottom: 0.75rem;
      width: calc(100% - 1.5rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .caption {
      transition: none;
    }
  }
</style>
