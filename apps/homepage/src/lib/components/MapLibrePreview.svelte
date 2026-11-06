<script lang="ts">
  import { toolIdentities } from '$lib/data/tool-identities.js'
  import { onMount } from 'svelte'
  import { exampleLibraries } from '@allmaps/ui/examples/source'

  let { annotationUrl }: { annotationUrl: string } = $props()

  type Example = Awaited<
    ReturnType<typeof exampleLibraries.MapLibre.createExample>
  >

  let container: HTMLDivElement
  let ready = $state(false)
  let error = $state(false)
  const viewerUrl = $derived(
    `${toolIdentities.viewer.href}/?url=${encodeURIComponent(annotationUrl)}`
  )

  onMount(() => {
    const abortController = new AbortController()
    let example: Example | undefined
    let loadingTimeout: ReturnType<typeof setTimeout> | undefined

    function destroy() {
      example?.destroy()
      example = undefined
    }

    async function initialize() {
      loadingTimeout = setTimeout(() => {
        error = true
        abortController.abort()
        destroy()
      }, 20000)

      try {
        example = await exampleLibraries.MapLibre.createExample(
          container,
          abortController.signal,
          {}
        )
        abortController.signal.throwIfAborted()
        await example.ready
        abortController.signal.throwIfAborted()

        const response = await fetch(annotationUrl, {
          signal: abortController.signal
        })
        if (!response.ok) throw new Error('Annotation unavailable')
        const annotation = await response.json()
        abortController.signal.throwIfAborted()

        const results =
          example.warpedMapLayer.addGeoreferenceAnnotation(annotation)
        if (!results.length || results.some((result) => !result.ok)) {
          throw new Error('Map unavailable')
        }
        example.fitBounds()
        ready = true
      } catch {
        if (!abortController.signal.aborted) error = true
        destroy()
      } finally {
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
      { rootMargin: '200px' }
    )
    observer.observe(container)

    return () => {
      observer.disconnect()
      clearTimeout(loadingTimeout)
      abortController.abort()
      destroy()
    }
  })
</script>

<div
  class="relative min-h-50 flex-1 border-t border-[#bac4c8] bg-[#edf4f5]"
  role="region"
  aria-label="Live MapLibre example of Amsterdam"
>
  <div
    class="absolute inset-0 size-full"
    class:opacity-0={!ready}
    bind:this={container}
  ></div>
  {#if error}
    <p
      class="absolute inset-x-4 bottom-4 m-0 bg-white p-4 text-sm"
      role="status"
    >
      The preview could not load.
      <a
        class="text-[#003653] underline focus-visible:outline-3 focus-visible:outline-offset-3"
        href={viewerUrl}>Open this map in Allmaps Viewer →</a
      >
    </p>
  {:else if !ready}
    <p
      class="pointer-events-none absolute inset-0 m-0 grid place-items-center text-sm text-[#46565c]"
      role="status"
    >
      Loading map…
    </p>
  {/if}
</div>
