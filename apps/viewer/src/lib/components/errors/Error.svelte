<script lang="ts">
  import { MapMonster } from '@allmaps/components'
  import { PencilSimple as PencilSimpleIcon } from 'phosphor-svelte'

  import AnnotationInput from '$lib/components/input/AnnotationInput.svelte'
  import ErrorBackground from './ErrorBackground.svelte'
  import { getSourceLoadErrorEditorUrl } from '$lib/shared/source-errors.js'

  import type { Snippet } from 'svelte'
  import type { ImageError, ImageErrorKind } from '$lib/state/images.svelte.js'
  import type { SourceError } from '$lib/state/source.svelte.js'
  import type { SourceLoadErrorCode } from '$lib/shared/source-errors.js'
  import type { FormattedValidationIssue } from '$lib/shared/validation-error.js'

  type Props = {
    sourceError?: SourceError
    imageErrors?: ImageError[]
    sourceImageCount?: number
    title?: string
    message?: string
    secondaryMessage?: string
    sourceUrl?: string | null
    validationIssues?: FormattedValidationIssue[]
    details?: string
    sourceLoadErrorCode?: SourceLoadErrorCode
    annotationInputInitialValue?: string
    annotationInputAutoFocus?: boolean
  }

  let {
    sourceError,
    imageErrors = [],
    sourceImageCount = 0,
    title: titleOverride,
    message,
    secondaryMessage,
    sourceUrl,
    validationIssues = [],
    details,
    sourceLoadErrorCode,
    annotationInputInitialValue,
    annotationInputAutoFocus
  }: Props = $props()

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
    !!sourceError?.corsLikely ||
      sortedImageErrors.some((imageError) => imageError.corsLikely)
  )
  let displayedSourceUrl = $derived(sourceError?.sourceUrl ?? sourceUrl)
  let displayedSecondaryMessage = $derived(
    secondaryMessage ?? sourceError?.details
  )
  let displayedDetails = $derived(
    sourceError?.details && sourceError.details !== displayedSecondaryMessage
      ? sourceError.details
      : details
  )
  let displayedSourceLoadErrorCode = $derived(
    sourceLoadErrorCode ?? sourceError?.code
  )
  let editorUrl = $derived(
    getSourceLoadErrorEditorUrl(
      displayedSourceLoadErrorCode,
      displayedSourceUrl
    )
  )
  let title = $derived.by(() => titleOverride ?? getTitle(sourceError))
  let mainMessage = $derived.by(() =>
    message
      ? message
      : sourceError
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

    if (error.title) {
      return error.title
    }

    if (error.reason === 'data') {
      return 'Could not load resource data'
    }

    return 'Could not load resource'
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
    const requestUrl = getImageErrorUrl(imageError)

    if (
      imageError.message &&
      (!requestUrl || !imageError.message.includes(requestUrl))
    ) {
      return imageError.status
        ? `${imageError.message} (HTTP ${imageError.status})`
        : imageError.message
    }

    if (imageError.status) {
      return `HTTP ${imageError.status}`
    }

    return undefined
  }

  function getImageErrorUrl(imageError: ImageError) {
    if (imageError.source === 'info-json') {
      return imageError.imageInfoUrl
    }

    return imageError.tileUrl
  }

  function getImageErrorLabel(imageError: ImageError) {
    if (imageError.source === 'info-json') {
      return 'Image information'
    }

    return 'Image tile'
  }
</script>

{#snippet detailsList(title: string, children: Snippet)}
  <section class="space-y-2">
    <h3 class="text-sm font-medium text-gray-700">{title}</h3>

    <div
      class="max-h-36 divide-y divide-gray-200 overflow-auto rounded-md border border-gray-200"
    >
      {@render children()}
    </div>
  </section>
{/snippet}

{#snippet badge(label: string, variant: 'default' | 'cors' = 'default')}
  <span
    class={[
      'rounded-full px-2 py-0.5 text-xs font-medium',
      variant === 'cors' ? 'bg-pink/10 text-pink' : 'bg-gray-100 text-gray-600'
    ]}
  >
    {label}
  </span>
{/snippet}

{#snippet validationIssueRows()}
  {#each validationIssues as issue (issue)}
    <div class="space-y-1 p-3">
      <p class="font-medium text-gray-900">{issue.message}</p>
      <p class="font-mono text-sm text-gray-600">
        {issue.path}
        {#if issue.code}
          <span class="font-sans text-gray-400"> ({issue.code})</span>
        {/if}
      </p>
    </div>
  {/each}
{/snippet}

{#snippet imageErrorRows()}
  {#each sortedImageErrors as imageError (imageError.imageId)}
    {@const imageErrorUrl = getImageErrorUrl(imageError)}
    {@const imageErrorDetail = getImageErrorDetail(imageError)}
    <div class="space-y-1 p-3">
      <div class="flex flex-wrap items-center gap-2">
        {#if imageErrorUrl}
          <a
            class="min-w-0 flex-1 truncate font-mono text-xs text-pink underline"
            href={imageErrorUrl}
            target="_blank"
            rel="noreferrer"
          >
            {imageErrorUrl}
          </a>
        {:else}
          <p class="min-w-0 flex-1 truncate font-mono text-xs text-black">
            {imageError.imageId}
          </p>
        {/if}
        {@render badge(getImageErrorLabel(imageError))}
        {#if imageError.kind !== 'unknown' && !(imageError.kind === 'network-or-cors' && imageError.corsLikely)}
          {@render badge(getKindLabel(imageError.kind))}
        {/if}
        {#if imageError.corsLikely}
          {@render badge('CORS likely', 'cors')}
        {/if}
      </div>

      {#if imageErrorDetail}
        <p class="text-xs text-gray-500">{imageErrorDetail}</p>
      {/if}
    </div>
  {/each}
{/snippet}

<ErrorBackground>
  <section
    class="flex max-h-[calc(100svh-8rem)] w-full max-w-2xl rounded-lg bg-white text-black shadow-lg"
  >
    <div class="w-full flex overflow-y-auto flex-col gap-6 p-4 sm:p-6">
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <div
            class="size-10 shrink-0 [&_svg]:block [&_svg]:size-full"
            aria-hidden="true"
          >
            <MapMonster color="red" mood="sad" />
          </div>
          <h2 class="text-3xl font-medium text-balance">{title}</h2>
        </div>
        <div class="space-y-2 text-gray-700">
          {#if sourceError}
            <p>{mainMessage}</p>
          {:else if message}
            <p>{mainMessage}</p>
          {:else}
            <p>
              All {pluralize(displayedSourceImageCount, 'source image')} for this
              source failed to load, so the map imagery cannot be displayed.
            </p>
            <p>{mainMessage}</p>
          {/if}
          {#if displayedSecondaryMessage}
            <p class="text-sm text-gray-500">{displayedSecondaryMessage}</p>
          {/if}
        </div>
      </div>

      {#if corsLikely}
        <section
          class="space-y-2 rounded-md border border-pink/20 bg-pink/5 p-3 text-sm text-gray-700"
        >
          <h3 class="font-medium text-gray-900">CORS may be blocking access</h3>
          <p>
            <a
              class="text-pink underline"
              href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS"
              target="_blank"
              rel="noreferrer">CORS</a
            >
            is a browser security rule that controls whether this page may read files
            from another server. Allmaps Viewer loads Georeference Annotations and
            IIIF resources directly in the browser, so those servers need permissive
            CORS headers that allow Allmaps Viewer to read their JSON, image information,
            and tiles.
          </p>
        </section>
      {/if}

      {#if displayedSourceUrl}
        <section class="space-y-2">
          <h3 class="text-sm font-medium text-gray-700">Source URL</h3>
          <a
            class="block overflow-x-auto rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-pink underline"
            href={displayedSourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {displayedSourceUrl}
          </a>
        </section>
      {/if}

      {#if editorUrl}
        <section
          class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-md border border-green/20 bg-green/5 p-2 text-sm text-gray-700"
        >
          <p>Open this URL in Allmaps Editor to georeference.</p>
          <a
            class="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-green px-3 py-2 font-medium text-white transition-colors hover:bg-green/90"
            href={editorUrl}
            target="_blank"
            rel="noreferrer"
          >
            <PencilSimpleIcon class="size-4" />
            Georeference in Allmaps Editor
          </a>
        </section>
      {/if}

      {#if validationIssues.length > 0}
        {@render detailsList('Validation details', validationIssueRows)}
      {/if}

      {#if displayedDetails && displayedDetails !== displayedSecondaryMessage}
        <details class="rounded-md border border-gray-200 bg-gray-50">
          <summary class="cursor-pointer px-3 py-2 text-sm font-medium">
            Raw error
          </summary>
          <pre
            class="overflow-x-auto border-t border-gray-200 p-3 text-sm whitespace-pre-wrap text-gray-800">{displayedDetails}</pre>
        </details>
      {/if}

      {#if sortedImageErrors.length > 0}
        {@render detailsList(
          `Failed ${pluralize(failedImageCount, 'image')}`,
          imageErrorRows
        )}
      {/if}

      <section class="space-y-3">
        <h3 class="text-sm font-medium text-gray-700">Try another URL</h3>
        <AnnotationInput
          autoFocus={annotationInputAutoFocus ?? sourceError !== undefined}
          initialValue={annotationInputInitialValue ?? ''}
        />
      </section>
    </div>
  </section>
</ErrorBackground>
