<script lang="ts">
  import { Thumbnail } from '@allmaps/ui'

  import type { MapImportImage } from '$lib/map-import.js'

  let { image }: { image: MapImportImage } = $props()

  const resource = $derived(image.maps[0].resource)
  const masks = $derived(image.maps.map(({ resourceMask }) => resourceMask))
  let imageInfo = $state.raw<unknown>()
  let failed = $state(false)
  let directLoaded = $state(false)
  let directFailed = $state(false)

  function imageRequestUrl(id: string, request: string) {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- The URL is local to this request.
    const url = new URL(id)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return
    url.hash = ''
    if (url.searchParams.has('IIIF')) {
      // IIPImage puts the image identifier and request inside the query value.
      return url.href.replace(
        /([?&]IIIF=)([^&]*)/,
        (_, parameter, identifier) =>
          parameter +
          identifier.replace(/\/+$/, '').replace(/\/info\.json$/, '') +
          '/' +
          request
      )
    }
    url.pathname =
      url.pathname.replace(/\/+$/, '').replace(/\/info\.json$/, '') +
      '/' +
      request
    return url.href
  }

  const directUrl = $derived.by(() => {
    const { id, type, width, height } = resource
    if (!width || !height || type === 'Canvas') return
    const thumbnailWidth = Math.min(width, 144)
    const thumbnailHeight = Math.max(
      1,
      Math.round((thumbnailWidth * height) / width)
    )
    const size =
      type === 'ImageService3'
        ? `${thumbnailWidth},${thumbnailHeight}`
        : `${thumbnailWidth},`
    const quality = type === 'ImageService1' ? 'native' : 'default'
    return imageRequestUrl(id, `full/${size}/0/${quality}.jpg`)
  })

  $effect(() => {
    if (directUrl && !directFailed) return
    const infoUrl = imageRequestUrl(resource.id, 'info.json')
    if (!infoUrl || resource.type === 'Canvas') {
      failed = true
      return
    }
    const controller = new AbortController()
    void fetch(infoUrl, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)])
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load IIIF image info')
        const info: unknown = await response.json()
        if (!info || typeof info !== 'object')
          throw new Error('Invalid IIIF image info')
        if (!controller.signal.aborted) imageInfo = info
      })
      .catch(() => {
        if (!controller.signal.aborted) failed = true
      })
    return () => controller.abort()
  })
</script>

{#snippet unavailable()}
  <span
    class="grid h-full place-content-center px-1 text-center text-[0.65rem] text-gray-600"
  >
    Thumbnail unavailable
  </span>
{/snippet}

<div
  class="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100"
>
  {#if directUrl && !directFailed}
    <img
      src={directUrl}
      alt="IIIF preview with incoming map masks"
      loading="lazy"
      referrerpolicy="no-referrer"
      class="h-full w-full object-contain"
      onload={() => (directLoaded = true)}
      onerror={() => (directFailed = true)}
    />
    {#if directLoaded && resource.width && resource.height}
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 {resource.width} {resource.height}"
        aria-hidden="true"
      >
        {#each masks as mask, index (index)}
          <polygon
            points={mask.map((point) => point.join(',')).join(' ')}
            class="fill-pink-500/15 stroke-pink-600"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        {/each}
      </svg>
    {/if}
  {:else if failed}
    {@render unavailable()}
  {:else if imageInfo}
    <svelte:boundary>
      <Thumbnail
        {imageInfo}
        width={96}
        height={64}
        sourceWidth={resource.width}
        sourceHeight={resource.height}
        mode="contain"
        resourceMasks={masks}
        alt="IIIF preview with incoming map masks"
        errorSnippet={unavailable}
      />
      {#snippet failed()}
        {@render unavailable()}
      {/snippet}
    </svelte:boundary>
  {:else}
    <span class="grid h-full place-content-center text-[0.65rem] text-gray-500">
      Loading preview…
    </span>
  {/if}
</div>
