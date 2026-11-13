<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { fade } from 'svelte/transition'
  import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwiseIcon'
  import * as Select from '@allmaps/ui/select'
  import { LoadingSmall } from '@allmaps/ui'

  import { annotationExamples } from '../../lib/examples/annotations.js'
  import { initializeView } from '../../lib/examples/initialize-view.js'
  import { createImageFetch } from '../../lib/examples/image-fetch.js'
  import { watchImageLoading } from '../../lib/examples/image-loading.js'
  import {
    exampleCode,
    transformations,
    viewModes,
    validateAnnotationUrl
  } from '../../lib/examples/source.js'

  import type {
    ExampleMap,
    ExampleBounds,
    ExampleViewMode,
    ExampleTransformation,
    MapExampleImplementationProps
  } from '../../lib/examples/types.js'

  type Props = MapExampleImplementationProps

  let {
    annotationUrl = $bindable(),
    opacity = $bindable(1),
    transformation = $bindable<ExampleTransformation>('annotation'),
    viewMode = $bindable<ExampleViewMode>('fit'),
    bounds: knownBounds,
    height = 400,
    examples = annotationExamples,
    library,
    packages,
    createExample,
    children
  }: Props = $props()

  const id = $props.id()
  let root: HTMLDivElement
  let container = $state<HTMLDivElement>()
  let visible = $state(false)
  let example = $state.raw<ExampleMap>()
  let bounds = $state<ExampleBounds>()
  let extentAnnotationUrl = $state('')
  let mapPositioned = $state(false)
  let status = $state('Loading map…')
  let error = $state('')
  let imageError = $state('')
  let imageLoaded = $state(false)
  let retry = $state(0)
  let draftUrl = $derived(annotationUrl)
  const selectedExample = $derived(
    examples.find((option) => option.annotationUrl === draftUrl.trim())
      ?.annotationUrl ?? ''
  )
  const code = $derived(
    exampleCode(
      { annotationUrl, opacity, transformation, viewMode, height },
      library,
      packages,
      bounds
    )
  )

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          visible = true
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(root)
    return () => observer.disconnect()
  })

  $effect(() => {
    if (!visible || !container) return
    const target = container
    const url = annotationUrl
    const mode = viewMode
    void retry
    const factory = createExample
    const settings = untrack(() => ({
      annotationUrl: url,
      opacity,
      transformation
    }))
    const initialBounds = untrack(
      () => knownBounds ?? (extentAnnotationUrl === url ? bounds : undefined)
    )
    const abortController = new AbortController()
    let current: ExampleMap | undefined
    let destroyed = false

    function destroy() {
      if (current && !destroyed) {
        destroyed = true
        current.destroy()
      }
    }

    example = undefined
    bounds = mode === 'bounds' ? initialBounds : undefined
    mapPositioned = false
    error = ''
    imageError = ''
    imageLoaded = false
    status = 'Loading map…'
    abortController.signal.addEventListener('abort', destroy, { once: true })

    void (async () => {
      try {
        status =
          mode === 'fit' || (mode === 'bounds' && initialBounds)
            ? 'Loading map…'
            : 'Loading annotation…'
        const imageInfoFetch = createImageFetch(
          abortController.signal,
          (message) => {
            imageError = message
            status = ''
          }
        )
        const initialized = await initializeView(
          (view) => factory(target, abortController.signal, view),
          settings,
          mode,
          abortController.signal,
          imageInfoFetch,
          (readyExample) => {
            current = readyExample
            mapPositioned = true
            if (!current.renderer)
              throw new Error('The map renderer did not initialize.')
            watchImageLoading(
              current.renderer,
              () => {
                imageLoaded = true
                status = 'Map loaded.'
              },
              (message) => {
                if (!imageError) imageError = message
                status = ''
              },
              abortController.signal
            )
            status = 'Loading map image…'
          },
          initialBounds
        )
        if (abortController.signal.aborted) return
        bounds = initialized.bounds
        extentAnnotationUrl = url
        example = initialized.example
      } catch (cause) {
        destroy()
        if (!abortController.signal.aborted) {
          error =
            cause instanceof Error ? cause.message : 'Could not load this map.'
          status = ''
        }
      }
    })()

    return () => {
      abortController.abort()
      destroy()
    }
  })

  $effect(() => {
    example?.warpedMapLayer.setOpacity(opacity)
  })

  $effect(() => {
    if (!example) return
    if (transformation === 'annotation') {
      example.warpedMapLayer.resetLayerOptions(['transformationType'])
    } else {
      example.warpedMapLayer.setLayerTransformationType(transformation)
    }
  })

  function changeOpacity(value: number) {
    if (Number.isFinite(value)) opacity = Math.min(1, Math.max(0, value))
  }

  function openAnnotation() {
    try {
      const url = validateAnnotationUrl(draftUrl.trim())
      draftUrl = url
      if (annotationUrl === url) retry += 1
      else annotationUrl = url
      error = ''
    } catch {
      error = 'Enter a valid HTTP or HTTPS annotation URL without credentials.'
    }
  }
</script>

{#snippet exampleLabel(label: string)}
  {@const separator = label.indexOf(' — ')}
  <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
    <span class="font-semibold"
      >{separator === -1 ? label : label.slice(0, separator)}</span
    >{#if separator !== -1}<span class="font-normal opacity-75"
        >{label.slice(separator)}</span
      >{/if}
  </span>
{/snippet}

<div
  bind:this={root}
  class="[--example-background:var(--sl-color-bg,#fff)] [--example-border:var(--sl-color-gray-5,#bac4c8)] [--example-text:var(--sl-color-text,#182a2f)] [--example-muted:var(--sl-color-gray-3,#495c62)] [--example-accent:var(--sl-color-accent,#ff56ba)] [font-family:inherit] text-[color:var(--example-text)]"
  data-map-example={library}
>
  <div
    class="overflow-hidden border border-solid border-[color:var(--example-border)] [border-top-width:var(--example-panel-top-border,1px)] rounded-[var(--example-panel-radius,14px)] [box-shadow:0_3px_12px_rgb(0_0_0_/_3%)] bg-[color:var(--example-background)] relative"
  >
    {#key library}
      <!-- Give each library a clean container without the previous library's classes or DOM state. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The map handles keyboard interaction; OpenLayers also requires a focusable target.) -->
      <div
        bind:this={container}
        class="isolate w-full bg-[color:#e7eff2] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--example-accent)] focus-visible:outline-offset-[-2px] [&_.ol-zoom]:left-auto [&_.ol-zoom]:right-[0.5em] [&:not([data-positioned=true])_.maplibregl-canvas]:invisible [&:not([data-positioned=true])_.leaflet-pane]:invisible [&:not([data-positioned=true])_.ol-viewport]:invisible"
        data-positioned={mapPositioned}
        style:height={`${height}px`}
        tabindex="0"
        role="application"
        aria-label={`${library} interactive georeferenced map`}
        aria-busy={!imageLoaded && !error && !imageError}
      ></div>
    {/key}
    {#if !imageLoaded && !error && !imageError}
      <div
        class="flex items-center gap-1.5 absolute top-4 left-4 py-1 px-2 m-0 border border-solid border-[color:var(--example-border)] rounded text-xs leading-[1.5] bg-[color:var(--example-background)] [&_img]:block [&_img]:w-4 [&_img]:h-4 [[data-theme='dark']_&_img]:invert"
        aria-hidden="true"
        transition:fade={{ duration: 150 }}
      >
        <LoadingSmall />
        <span>{status}</span>
      </div>
    {/if}

    <form
      class="grid grid-cols-[minmax(0,1fr)] gap-4 p-5 border-t border-solid border-t-[color:var(--example-border)] @container [&_[data-slot='select-trigger']]:w-full [&_[data-slot='select-trigger']]:min-w-0 [&_[data-slot='select-trigger']]:min-h-10.5 [&_[data-slot='select-trigger']]:h-auto [&_[data-slot='select-trigger']]:py-2.5 [&_[data-slot='select-trigger']]:px-3 [&_[data-slot='select-trigger']]:border [&_[data-slot='select-trigger']]:border-solid [&_[data-slot='select-trigger']]:border-[color:var(--example-border)] [&_[data-slot='select-trigger']]:rounded-lg [&_[data-slot='select-trigger']]:bg-[color:var(--example-background)] [&_[data-slot='select-trigger']]:text-[color:var(--example-text)] [&_[data-slot='select-trigger']]:text-sm [&_[data-slot='select-trigger']]:shadow-none"
      onsubmit={(event) => {
        event.preventDefault()
        openAnnotation()
      }}
    >
      {#if examples.length}
        <div class="[&_label]:mb-1">
          <label
            class="block text-xs font-medium"
            id={`${id}-example-label`}
            for={`${id}-example`}>Example map</label
          >
          <Select.Root
            type="single"
            items={examples.map(({ annotationUrl, label }) => ({
              value: annotationUrl,
              label
            }))}
            value={selectedExample}
            onValueChange={(value) => {
              if (!value) return
              draftUrl = value
              openAnnotation()
            }}
          >
            <Select.Trigger
              id={`${id}-example`}
              aria-labelledby={`${id}-example-label`}
            >
              {@render exampleLabel(
                examples.find(
                  (option) => option.annotationUrl === selectedExample
                )?.label ?? 'Custom URL'
              )}
            </Select.Trigger>
            <Select.Content>
              {#each examples as option (option.annotationUrl)}
                <Select.Item value={option.annotationUrl} label={option.label}>
                  {#snippet children()}
                    {@render exampleLabel(option.label)}
                  {/snippet}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      {/if}
      <div>
        <label class="block text-xs font-medium" for={`${id}-url`}
          >Annotation URL</label
        >
        <div
          class="flex gap-2 mt-1 [&_input]:min-w-0 [&_input]:w-full [&_input]:font-[family-name:var(--sl-font-mono,monospace)] [&_input]:text-xs"
        >
          <input
            class="[font-family:inherit] [font-size:inherit] [font-weight:inherit] [line-height:inherit] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--example-accent)] focus-visible:outline-offset-[2px] [&:not([type='range'])]:border [&:not([type='range'])]:border-solid [&:not([type='range'])]:border-[color:var(--example-border)] [&:not([type='range'])]:rounded-lg [&:not([type='range'])]:text-[color:var(--example-text)] [&:not([type='range'])]:bg-[color:var(--example-background)] [&:not([type='range'])]:py-2.5 [&:not([type='range'])]:px-3"
            id={`${id}-url`}
            type="url"
            bind:value={draftUrl}
            required
          />
          <button
            class="[font-family:inherit] [line-height:inherit] border border-solid border-[color:var(--example-border)] rounded-lg py-2.5 px-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--example-accent)] focus-visible:outline-offset-[2px] disabled:opacity-50 disabled:cursor-default shrink-0 px-4 border-[color:color-mix(in_srgb,#ff56ba_55%,var(--example-border))] bg-[color:color-mix(in_srgb,#ff56ba_10%,var(--example-background))] text-[color:#ff56ba] text-sm font-semibold whitespace-nowrap [transition:background-color_120ms,border-color_120ms] hover:border-[color:#ff56ba] hover:bg-[color:color-mix(in_srgb,#ff56ba_20%,var(--example-background))] [&:active]:bg-[color:color-mix(in_srgb,#ff56ba_28%,var(--example-background))]"
            type="submit">Load map</button
          >
        </div>
      </div>
      <div
        class="grid grid-cols-3 items-start gap-4 @max-[30rem]:grid-cols-2"
        data-part="map-settings"
      >
        <div class="[&_label]:mb-1 [[data-part~=map-settings]_>_&]:min-w-0">
          <label
            class="block text-xs font-medium"
            id={`${id}-view-mode-label`}
            for={`${id}-view-mode`}>Initial view</label
          >
          <Select.Root
            type="single"
            items={[...viewModes]}
            bind:value={viewMode}
          >
            <Select.Trigger
              id={`${id}-view-mode`}
              aria-labelledby={`${id}-view-mode-label`}
            >
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {#each viewModes as option (option.value)}
                <Select.Item value={option.value} label={option.label} />
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div class="[&_label]:mb-1 [[data-part~=map-settings]_>_&]:min-w-0">
          <label
            class="block text-xs font-medium"
            id={`${id}-transformation-label`}
            for={`${id}-transformation`}>Transformation</label
          >
          <Select.Root
            type="single"
            items={[...transformations]}
            bind:value={transformation}
          >
            <Select.Trigger
              id={`${id}-transformation`}
              aria-labelledby={`${id}-transformation-label`}
            >
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {#each transformations as option (option.value)}
                <Select.Item value={option.value} label={option.label} />
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div
          class="flex items-center self-end gap-2 [&_label]:flex-none [&_label]:whitespace-nowrap [&_input]:block [&_input]:flex-1 [&_input]:min-w-0 [&_input]:w-0 [&_input]:h-10.5 [&_input]:m-0 [&_input]:[accent-color:var(--example-accent)] @max-[30rem]:col-span-full [[data-part~=map-settings]_>_&]:min-w-0"
        >
          <label class="block text-xs font-medium" for={`${id}-opacity`}
            >Opacity</label
          >
          <input
            class="[font-family:inherit] [font-size:inherit] [font-weight:inherit] [line-height:inherit] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--example-accent)] focus-visible:outline-offset-[2px] [&:not([type='range'])]:border [&:not([type='range'])]:border-solid [&:not([type='range'])]:border-[color:var(--example-border)] [&:not([type='range'])]:rounded-lg [&:not([type='range'])]:text-[color:var(--example-text)] [&:not([type='range'])]:bg-[color:var(--example-background)] [&:not([type='range'])]:py-2.5 [&:not([type='range'])]:px-3"
            id={`${id}-opacity`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            aria-valuetext={`${Math.round(opacity * 100)}%`}
            oninput={(event) =>
              changeOpacity(event.currentTarget.valueAsNumber)}
          />
          <button
            class="[font-family:inherit] [font-size:inherit] [font-weight:inherit] [line-height:inherit] border border-solid border-[color:var(--example-border)] rounded-lg text-[color:var(--example-text)] bg-[color:var(--example-background)] cursor-pointer focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--example-accent)] focus-visible:outline-offset-[2px] hover:bg-[color:color-mix(in_srgb,var(--example-accent)_8%,var(--example-background))] disabled:opacity-50 disabled:cursor-default inline-flex flex-none items-center justify-center w-10.5 h-10.5 p-0 pointer-coarse:w-11 pointer-coarse:h-11"
            type="button"
            aria-label="Reset view"
            title="Reset view"
            disabled={!example}
            onclick={() => example?.fitBounds()}
          >
            <ArrowCounterClockwise size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
    <div
      class="flex items-center justify-between gap-4 py-3 px-5 border-t border-solid border-t-[color:var(--example-border)] text-[color:var(--example-muted)] text-xs"
    >
      <span>{library} example</span>
    </div>
  </div>

  <div
    class="text-sm [&:has([data-part~=error])]:my-3"
    role="status"
    aria-live="polite"
  >
    {#if error || imageError}
      <span class="me-3" data-part="error">{error || imageError}</span>
      <button
        class="[font-family:inherit] [font-size:inherit] [font-weight:inherit] [line-height:inherit] border border-solid border-[color:var(--example-border)] rounded-lg text-[color:var(--example-text)] bg-[color:var(--example-background)] py-2.5 px-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--example-accent)] focus-visible:outline-offset-[2px] hover:bg-[color:color-mix(in_srgb,var(--example-accent)_8%,var(--example-background))] disabled:opacity-50 disabled:cursor-default"
        type="button"
        onclick={openAnnotation}>Try again</button
      >
    {:else}
      <span
        class="absolute w-[1px] h-[1px] p-0 overflow-hidden [clip-path:inset(50%)] whitespace-nowrap"
        >{status}</span
      >
    {/if}
  </div>

  {@render children?.(code)}
</div>
