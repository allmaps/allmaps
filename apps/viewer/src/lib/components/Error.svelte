<script lang="ts">
  import AnnotationInput from '$lib/components/AnnotationInput.svelte'

  import type { ImageError, ImageErrorKind } from '$lib/state/images.svelte.js'
  import type { SourceError } from '$lib/state/source.svelte.js'

  type Props = {
    sourceError?: SourceError
    imageErrors?: ImageError[]
    sourceImageCount?: number
  }

  let { sourceError, imageErrors = [], sourceImageCount = 0 }: Props = $props()

  let sortedImageErrors = $derived(
    [...imageErrors].sort((a, b) => a.imageId.localeCompare(b.imageId))
  )
  let failedImageCount = $derived(sortedImageErrors.length)
  let displayedSourceImageCount = $derived(sourceImageCount || failedImageCount)
  let statusCodes = $derived(
    [
      ...new Set(
        sortedImageErrors
          .map((imageError) => imageError.status)
          .filter((status): status is number => status !== undefined)
      )
    ].sort((a, b) => a - b)
  )
  let errorKinds = $derived(
    new Set(sortedImageErrors.map((imageError) => imageError.kind))
  )
  let hasInfoJsonErrors = $derived(
    sortedImageErrors.some((imageError) => imageError.source === 'info-json')
  )
  let hasTileErrors = $derived(
    sortedImageErrors.some((imageError) => imageError.source === 'tile')
  )
  let corsLikely = $derived(
    sortedImageErrors.some((imageError) => imageError.corsLikely)
  )
  let title = $derived.by(() => getTitle(sourceError))
  let mainMessage = $derived.by(() =>
    sourceError
      ? sourceError.message
      : getImageErrorMessage(
          errorKinds,
          statusCodes,
          corsLikely,
          hasInfoJsonErrors,
          hasTileErrors
        )
  )

  function pluralize(count: number, singular: string) {
    return `${count} ${count === 1 ? singular : `${singular}s`}`
  }

  function getTitle(error?: SourceError) {
    if (!error) {
      return 'Could not load map images'
    }

    if (error.reason === 'data') {
      return 'Could not load source data'
    }

    return 'Could not load source'
  }

  function getKindLabel(kind: ImageErrorKind) {
    if (kind === 'network-or-cors') {
      return 'Network or CORS'
    } else if (kind === 'http') {
      return 'HTTP'
    } else if (kind === 'parse') {
      return 'Parse'
    }

    return 'Unknown'
  }

  function getImageErrorMessage(
    kinds: Set<ImageErrorKind>,
    statuses: number[],
    hasLikelyCorsError: boolean,
    hasInfoJsonErrors: boolean,
    hasTileErrors: boolean
  ) {
    if (hasLikelyCorsError) {
      if (hasInfoJsonErrors && !hasTileErrors) {
        return 'The image server may not allow Allmaps Viewer to read its IIIF Image API info.json files from this browser.'
      }

      return 'The image server may not allow Allmaps Viewer to read its IIIF image files or tiles from this browser.'
    } else if (statuses.length === 1) {
      return `The image server responded with HTTP ${statuses[0]} for every source image.`
    } else if (statuses.length > 1) {
      return `The image server responded with HTTP ${statuses.join(', ')}.`
    } else if (kinds.has('network-or-cors')) {
      return 'The image server could not be reached, or the browser blocked the image requests.'
    } else if (kinds.has('parse')) {
      return 'The image server responded, but Allmaps Viewer could not parse the image information.'
    } else if (hasTileErrors) {
      return 'The image information loaded, but Allmaps Viewer could not load the image files or tiles.'
    }

    return 'Allmaps Viewer could not load the image information for this source.'
  }

  function getImageErrorDetail(imageError: ImageError) {
    if (imageError.message) {
      return imageError.message
    } else if (imageError.status) {
      return `HTTP ${imageError.status}`
    }

    return getKindLabel(imageError.kind)
  }
</script>

<section
  class="bg-red/50 flex h-full w-full flex-1 items-center justify-center overflow-auto p-6 text-black"
>
  <div
    class="flex w-full max-w-2xl flex-col gap-6 bg-white p-3 rounded-lg shadow-lg"
  >
    <div class="space-y-3">
      <h2 class="text-3xl font-medium text-balance">{title}</h2>
      <div class="space-y-2 text-gray-700">
        {#if sourceError}
          <p>{mainMessage}</p>
        {:else}
          <p>
            All {pluralize(displayedSourceImageCount, 'source image')} for this source
            failed to load, so the map imagery cannot be displayed.
          </p>
          <p>{mainMessage}</p>
        {/if}
      </div>
    </div>

    {#if sourceError?.sourceUrl}
      <section class="space-y-2">
        <h3 class="text-sm font-medium text-gray-700">Source URL</h3>
        <a
          class="block overflow-x-auto rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-pink underline"
          href={sourceError.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {sourceError.sourceUrl}
        </a>
      </section>
    {/if}

    {#if sortedImageErrors.length > 0}
      <section class="space-y-2">
        <h3 class="text-sm font-medium text-gray-700">
          Failed {pluralize(failedImageCount, 'image')}
        </h3>

        <div
          class="max-h-72 divide-y divide-gray-200 overflow-auto rounded-md border border-gray-200"
        >
          {#each sortedImageErrors as imageError (imageError.imageId)}
            <div class="space-y-1 p-3">
              <div class="flex flex-wrap items-center gap-2">
                <p class="min-w-0 flex-1 truncate font-mono text-xs text-black">
                  {imageError.imageId}
                </p>
                <span
                  class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                >
                  {getKindLabel(imageError.kind)}
                </span>
                {#if imageError.status}
                  <span
                    class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                  >
                    HTTP {imageError.status}
                  </span>
                {/if}
                {#if imageError.corsLikely}
                  <span
                    class="rounded-full bg-pink/10 px-2 py-0.5 text-xs font-medium text-pink"
                  >
                    CORS likely
                  </span>
                {/if}
              </div>

              {#if imageError.source === 'info-json' && imageError.imageInfoUrl}
                <a
                  class="block truncate font-mono text-xs text-pink underline"
                  href={imageError.imageInfoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {imageError.imageInfoUrl}
                </a>
              {:else if imageError.source === 'tile'}
                <a
                  class="block truncate font-mono text-xs text-pink underline"
                  href={imageError.tileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {imageError.tileUrl}
                </a>
              {/if}

              <p class="text-xs text-gray-500">
                {getImageErrorDetail(imageError)}
              </p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <section class="space-y-3">
      <h3 class="text-sm font-medium text-gray-700">Try another source</h3>
      <AnnotationInput
        roundedFull={false}
        autoFocus={sourceError !== undefined}
      />
    </section>
  </div>
</section>
