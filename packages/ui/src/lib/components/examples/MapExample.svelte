<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { fade } from 'svelte/transition'
  import { ArrowCounterClockwise } from 'phosphor-svelte'
  import * as Select from '../ui/select/index.js'
  import LoadingSmall from '../LoadingSmall.svelte'

  import { annotationExamples } from '../../examples/annotations.js'
  import { initializeView } from '../../examples/initialize-view.js'
  import { createImageFetch } from '../../examples/image-fetch.js'
  import { watchImageLoading } from '../../examples/image-loading.js'
  import {
    exampleCode,
    transformations,
    viewModes,
    validateAnnotationUrl
  } from '../../examples/source.js'

  import type {
    ExampleMap,
    ExampleBounds,
    ExampleViewMode,
    ExampleTransformation,
    MapExampleImplementationProps
  } from '../../examples/types.js'

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
  <span class="example-label">
    <span class="example-title"
      >{separator === -1 ? label : label.slice(0, separator)}</span
    >{#if separator !== -1}<span class="example-institution"
        >{label.slice(separator)}</span
      >{/if}
  </span>
{/snippet}

<div bind:this={root} class="map-example" data-map-example={library}>
  <div class="map-panel">
    {#key library}
      <!-- Give each library a clean container without the previous library's classes or DOM state. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The map handles keyboard interaction; OpenLayers also requires a focusable target.) -->
      <div
        bind:this={container}
        class="map"
        class:positioned={mapPositioned}
        style:height={`${height}px`}
        tabindex="0"
        role="application"
        aria-label={`${library} interactive georeferenced map`}
        aria-busy={!imageLoaded && !error && !imageError}
      ></div>
    {/key}
    {#if !imageLoaded && !error && !imageError}
      <div
        class="loading"
        aria-hidden="true"
        transition:fade={{ duration: 150 }}
      >
        <LoadingSmall />
        <span>{status}</span>
      </div>
    {/if}

    <form
      class="controls"
      onsubmit={(event) => {
        event.preventDefault()
        openAnnotation()
      }}
    >
      {#if examples.length}
        <div class="example-control">
          <label id={`${id}-example-label`} for={`${id}-example`}
            >Example map</label
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
      <div class="url-control">
        <label for={`${id}-url`}>Annotation URL</label>
        <div class="url-input">
          <input id={`${id}-url`} type="url" bind:value={draftUrl} required />
          <button class="load" type="submit">Load map</button>
        </div>
      </div>
      <div class="map-settings">
        <div class="setting-control">
          <label id={`${id}-view-mode-label`} for={`${id}-view-mode`}
            >Initial view</label
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
        <div class="setting-control">
          <label id={`${id}-transformation-label`} for={`${id}-transformation`}
            >Transformation</label
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
        <label class="opacity-control" for={`${id}-opacity`}>
          <span>Opacity <output>{Math.round(opacity * 100)}%</output></span>
          <input
            id={`${id}-opacity`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            oninput={(event) =>
              changeOpacity(event.currentTarget.valueAsNumber)}
          />
        </label>
      </div>
    </form>
    <div class="map-footer">
      <span>{library} example</span>
      <button
        class="reset"
        type="button"
        disabled={!example}
        onclick={() => example?.fitBounds()}
      >
        <ArrowCounterClockwise size={16} aria-hidden="true" />
        Reset view
      </button>
    </div>
  </div>

  <div class="feedback" role="status" aria-live="polite">
    {#if error || imageError}
      <span class="error">{error || imageError}</span>
      <button type="button" onclick={openAnnotation}>Try again</button>
    {:else}
      <span class="visually-hidden">{status}</span>
    {/if}
  </div>

  {@render children?.(code)}
</div>

<style>
  .map-example {
    --example-background: var(--sl-color-bg, #fff);
    --example-border: var(--sl-color-gray-5, #bac4c8);
    --example-text: var(--sl-color-text, #182a2f);
    --example-muted: var(--sl-color-gray-3, #495c62);
    --example-accent: var(--sl-color-accent, #ff56ba);
    font-family: inherit;
    color: var(--example-text);
  }
  .map-panel {
    overflow: hidden;
    border: 1px solid var(--example-border);
    border-top-width: var(--example-panel-top-border, 1px);
    border-radius: var(--example-panel-radius, 14px);
    box-shadow: 0 3px 12px rgb(0 0 0 / 3%);
    background: var(--example-background);
    position: relative;
  }
  .map {
    isolation: isolate;
    width: 100%;
    background: #e7eff2;
  }
  .map:focus-visible {
    outline: 2px solid var(--example-accent);
    outline-offset: -2px;
  }
  .map:not(.positioned) :global(.maplibregl-canvas),
  .map:not(.positioned) :global(.leaflet-pane),
  .map:not(.positioned) :global(.ol-viewport) {
    visibility: hidden;
  }
  .loading {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    position: absolute;
    top: 1rem;
    left: 1rem;
    padding: 0.25rem 0.5rem;
    margin: 0;
    border: 1px solid var(--example-border);
    border-radius: 4px;
    font-size: 0.75rem;
    line-height: 1.5;
    background: var(--example-background);
  }
  .map :global(.ol-zoom) {
    left: auto;
    right: 0.5em;
  }
  .loading :global(img) {
    display: block;
    width: 1rem;
    height: 1rem;
  }
  :global([data-theme='dark']) .loading :global(img) {
    filter: invert(1);
  }
  .controls {
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
    border-top: 1px solid var(--example-border);
  }
  label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
  }
  input,
  button {
    font: inherit;
  }
  input:not([type='range']),
  button {
    border: 1px solid var(--example-border);
    border-radius: 8px;
    color: var(--example-text);
    background: var(--example-background);
    padding: 0.625rem 0.75rem;
  }
  input:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--example-accent);
    outline-offset: 2px;
  }
  button {
    cursor: pointer;
  }
  button:hover {
    background: color-mix(
      in srgb,
      var(--example-accent) 8%,
      var(--example-background)
    );
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .url-input {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  .example-control label,
  .setting-control label {
    margin-bottom: 0.25rem;
  }
  .example-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .example-title {
    font-weight: 600;
  }
  .example-institution {
    font-weight: 400;
    opacity: 0.75;
  }
  .url-input input {
    min-width: 0;
    width: 100%;
    font-family: var(--sl-font-mono, monospace);
    font-size: 0.75rem;
  }
  .load {
    flex-shrink: 0;
    padding-inline: 1rem;
    border-color: color-mix(in srgb, #ff56ba 55%, var(--example-border));
    background: color-mix(in srgb, #ff56ba 10%, var(--example-background));
    color: #ff56ba;
    font-size: 0.875rem;
    font-weight: 600;
    white-space: nowrap;
    transition:
      background-color 120ms,
      border-color 120ms;
  }
  .load:hover {
    border-color: #ff56ba;
    background: color-mix(in srgb, #ff56ba 20%, var(--example-background));
  }
  .load:active {
    background: color-mix(in srgb, #ff56ba 28%, var(--example-background));
  }
  .controls :global([data-slot='select-trigger']) {
    width: 100%;
    min-width: 0;
    min-height: 2.625rem;
    height: auto;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--example-border);
    border-radius: 8px;
    background: var(--example-background);
    color: var(--example-text);
    font-size: 0.875rem;
    box-shadow: none;
  }
  .map-settings {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    gap: 1rem;
  }
  .map-settings > label,
  .map-settings > .setting-control {
    min-width: 0;
  }

  .opacity-control span {
    display: flex;
    justify-content: space-between;
  }
  .opacity-control input {
    display: block;
    width: 100%;
    height: 2.625rem;
    margin: 0.25rem 0 0;
    accent-color: var(--example-accent);
  }
  .map-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--example-border);
    color: var(--example-muted);
    font-size: 0.75rem;
  }
  .reset {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
  }
  .controls {
    container-type: inline-size;
  }
  @container (max-width: 30rem) {
    .map-settings {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .opacity-control {
      grid-column: 1 / -1;
    }
  }
  .feedback {
    font-size: 0.875rem;
  }
  .feedback:has(.error) {
    margin-block: 0.75rem;
  }
  .error {
    margin-inline-end: 0.75rem;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
