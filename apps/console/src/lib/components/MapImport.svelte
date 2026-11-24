<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Viewer is a separate app. */
  import { isHttpError } from '@sveltejs/kit'
  import { SvelteMap } from 'svelte/reactivity'
  import { generateAnnotation } from '@allmaps/annotation'
  import {
    FileArrowUp as FileArrowUpIcon,
    FileText as FileTextIcon
  } from 'phosphor-svelte'

  import {
    MAP_IMPORT_BATCH_SIZE,
    MAP_IMPORT_FILE_LIMIT,
    MAP_IMPORT_FILE_LIMIT_LABEL,
    MAP_IMPORT_PAGE_SIZE,
    prepareMapImport
  } from '$lib/map-import.js'
  import { importMaps, previewMapImport } from '$lib/map-import.remote.js'
  import MapImportThumbnail from './MapImportThumbnail.svelte'

  import type {
    ExistingMaps,
    MapImportImage,
    MapImportResult
  } from '$lib/map-import.js'

  type Props = {
    annotationsBaseUrl: string
    viewerBaseUrl: string
  }

  type ImageReview = {
    existing?: ExistingMaps
    reviewFailed?: boolean
    changed?: boolean
    importFailed?: boolean
    importedMapCount?: number
  }

  type ImportSummary = {
    total: number
    imported: number
    skipped: number
    failed: number
  }

  let { annotationsBaseUrl, viewerBaseUrl }: Props = $props()

  let confirmation: HTMLDialogElement
  let dragging = $state(false)
  let pending = $state<'preparing' | 'reviewing' | 'importing'>()
  let filename = $state('')
  let message = $state('')
  let images = $state.raw<MapImportImage[]>([])
  let page = $state(1)
  let summary = $state<ImportSummary>()

  const reviews = new SvelteMap<string, ImageReview>()
  const pageCount = $derived(Math.ceil(images.length / MAP_IMPORT_PAGE_SIZE))
  const pageImages = $derived(
    images.slice((page - 1) * MAP_IMPORT_PAGE_SIZE, page * MAP_IMPORT_PAGE_SIZE)
  )
  const remaining = $derived(
    images.filter(
      (image) =>
        !image.exceedsSaveLimit && !reviews.get(image.imageId)?.importedMapCount
    )
  )
  async function prepareFile(files: FileList) {
    if (pending || !files.length) return

    filename = ''
    images = []
    reviews.clear()
    message = ''
    summary = undefined
    page = 1

    if (files.length !== 1) {
      message = 'Choose one Georeference Annotation file at a time.'
      return
    }
    const file = files[0]
    filename = file.name
    if (file.size > MAP_IMPORT_FILE_LIMIT) {
      message = `Choose a file of ${MAP_IMPORT_FILE_LIMIT_LABEL} or less.`
      return
    }

    pending = 'preparing'
    try {
      images = await prepareMapImport(await file.text())
    } catch (cause) {
      message =
        cause instanceof Error ? cause.message : 'The file could not be read'
    } finally {
      pending = undefined
    }
    if (images.length) await reviewPage(1)
  }

  async function checkExistingMaps(imageIds: string[]) {
    for (
      let index = 0;
      index < imageIds.length;
      index += MAP_IMPORT_BATCH_SIZE
    ) {
      const results = await previewMapImport(
        imageIds.slice(index, index + MAP_IMPORT_BATCH_SIZE)
      )
      for (const { imageId, existing } of results) {
        const review = reviews.get(imageId)
        reviews.set(imageId, {
          ...review,
          existing: existing ?? review?.existing,
          reviewFailed: !existing
        })
      }
    }
  }

  async function reviewPage(nextPage: number) {
    if (pending) return
    page = nextPage
    message = ''
    const imageIds = pageImages
      .filter(({ imageId, exceedsSaveLimit }) => {
        const review = reviews.get(imageId)
        return (
          !exceedsSaveLimit &&
          !review?.importedMapCount &&
          (!review?.existing || review.reviewFailed)
        )
      })
      .map(({ imageId }) => imageId)
    if (!imageIds.length) return

    pending = 'reviewing'
    try {
      await checkExistingMaps(imageIds)
    } catch (cause) {
      message = isHttpError(cause)
        ? cause.body.message
        : 'Could not finish reviewing this page'
      for (const imageId of imageIds) {
        const review = reviews.get(imageId)
        if (!review?.existing)
          reviews.set(imageId, { ...review, reviewFailed: true })
      }
    } finally {
      pending = undefined
    }
  }

  function handleFileInput(event: Event & { currentTarget: HTMLInputElement }) {
    if (event.currentTarget.files) void prepareFile(event.currentTarget.files)
    event.currentTarget.value = ''
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    dragging =
      !pending && (event.dataTransfer?.types.includes('Files') ?? false)
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    dragging = false
    if (event.dataTransfer?.files) void prepareFile(event.dataTransfer.files)
  }

  function recordImportResult(outcome: MapImportResult) {
    const review = reviews.get(outcome.imageId)
    if (outcome.status === 'imported') {
      reviews.set(outcome.imageId, { importedMapCount: outcome.mapIds.length })
    } else if (outcome.status === 'conflict') {
      const changed =
        !!review?.existing &&
        review.existing.existingMapCount !== outcome.existingMapCount
      reviews.set(outcome.imageId, {
        ...review,
        existing: {
          existingMapCount: outcome.existingMapCount
        },
        changed: changed || review?.changed,
        reviewFailed: false,
        importFailed: false
      })
    } else {
      reviews.set(outcome.imageId, { ...review, importFailed: true })
    }
  }

  async function submitImport(overwriteExisting: boolean) {
    const queue = remaining
    if (pending || !queue.length) return

    pending = 'importing'
    message = ''
    summary = { total: queue.length, imported: 0, skipped: 0, failed: 0 }
    try {
      for (
        let index = 0;
        index < queue.length;
        index += MAP_IMPORT_BATCH_SIZE
      ) {
        const results = await importMaps({
          overwriteExisting,
          images: queue
            .slice(index, index + MAP_IMPORT_BATCH_SIZE)
            .map(({ imageId, maps }) => ({
              imageId,
              maps: JSON.stringify(maps)
            }))
        })
        for (const outcome of results) {
          recordImportResult(outcome)
          if (outcome.status === 'imported') summary.imported++
          else if (outcome.status === 'conflict') summary.skipped++
          else summary.failed++
        }
      }
    } catch (cause) {
      message = isHttpError(cause)
        ? cause.body.message
        : 'Could not finish the import. The counts below include the confirmed results.'
    } finally {
      pending = undefined
    }
  }

  function viewerUrl(image: MapImportImage, imported: boolean) {
    const viewer = `${viewerBaseUrl.replace(/\/+$/, '')}/`
    if (imported) {
      const annotationUrl = `${annotationsBaseUrl.replace(/\/+$/, '')}/images/${image.imageId}`
      return `${viewer}?url=${encodeURIComponent(annotationUrl)}`
    }
    const annotation = generateAnnotation(
      image.maps.length === 1 ? image.maps[0] : image.maps
    )
    return `${viewer}#${new URLSearchParams({ data: JSON.stringify(annotation) })}`
  }
</script>

<section
  aria-labelledby="map-import-heading"
  class="space-y-4 rounded-xl border border-gray-200 bg-white p-5"
>
  <h2 id="map-import-heading" class="font-medium text-black">
    Import Georeference Annotations
  </h2>

  <div
    role="group"
    ondragover={handleDragOver}
    ondragleave={() => (dragging = false)}
    ondrop={handleDrop}
  >
    <label
      class={[
        'group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-xl border border-dashed px-4 py-5 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5',
        pending
          ? 'cursor-not-allowed border-gray-200 bg-gray-50'
          : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50',
        !pending &&
          (dragging
            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
            : 'border-blue-200 bg-blue-50/40')
      ]}
    >
      <input
        type="file"
        accept=".json,.jsonld,application/json,application/ld+json"
        aria-label={filename
          ? 'Change Georeference Annotation file'
          : 'Choose Georeference Annotation file'}
        aria-describedby="map-import-drop-description"
        class="pointer-events-none sr-only"
        disabled={!!pending}
        onchange={handleFileInput}
      />
      <span
        class={[
          'pointer-events-none flex size-12 items-center justify-center rounded-xl transition-colors',
          dragging ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
        ]}
      >
        {#if filename && !dragging}
          <FileTextIcon size={24} weight="duotone" aria-hidden="true" />
        {:else}
          <FileArrowUpIcon size={24} weight="duotone" aria-hidden="true" />
        {/if}
      </span>
      <span class="pointer-events-none min-w-0" aria-live="polite">
        <span class="block break-all text-sm font-semibold text-gray-900">
          {dragging
            ? 'Release to review'
            : filename || 'Drop an annotation file here'}
        </span>
        <span
          id="map-import-drop-description"
          class="mt-0.5 block text-xs leading-5 text-gray-600"
        >
          {#if pending === 'preparing'}
            Reading annotations…
          {:else if pending === 'reviewing'}
            Reviewing page {page}…
          {:else if pending === 'importing'}
            Importing maps…
          {:else}
            Georeference Annotation or AnnotationPage · .json or .jsonld · Up to
            {MAP_IMPORT_FILE_LIMIT_LABEL}
          {/if}
        </span>
      </span>
      <span
        aria-hidden="true"
        class={[
          'pointer-events-none col-start-2 w-fit shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors sm:col-start-3',
          pending ? 'bg-gray-500' : 'bg-blue-600 group-hover:bg-blue-700'
        ]}
      >
        {filename ? 'Change file' : 'Choose file'}
      </span>
    </label>
  </div>

  {#if message}
    <p role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  {/if}

  {#if images.length}
    <div class="space-y-3 border-b border-gray-100 pb-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          class="min-h-10 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!!pending || !remaining.length}
          onclick={() => confirmation.showModal()}
        >
          Import everything
        </button>
        <button
          type="button"
          class="min-h-10 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!!pending || !remaining.length}
          onclick={() => void submitImport(false)}
        >
          Import only images without maps
        </button>
      </div>
      {#if summary}
        {@const processed = summary.imported + summary.skipped + summary.failed}
        <p
          aria-live="polite"
          class="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700"
        >
          Processed {processed} of {summary.total} · {summary.imported} imported
          {#if summary.skipped}
            · {summary.skipped} conflicts skipped
          {/if}
          · {summary.failed} failed
        </p>
      {/if}
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p aria-live="polite" class="text-sm text-gray-600">
        Images {(page - 1) * MAP_IMPORT_PAGE_SIZE + 1}–{Math.min(
          page * MAP_IMPORT_PAGE_SIZE,
          images.length
        )}
        of {images.length}
      </p>
      {#if pageCount > 1}
        <nav
          aria-label="Annotation review pages"
          class="flex items-center gap-2 text-sm"
        >
          <button
            type="button"
            class="rounded-md border border-gray-200 px-2.5 py-1.5 hover:border-blue-400 disabled:opacity-40"
            disabled={!!pending || page === 1}
            onclick={() => void reviewPage(page - 1)}
          >
            Previous
          </button>
          <span class="text-gray-600">Page {page} of {pageCount}</span>
          <button
            type="button"
            class="rounded-md border border-gray-200 px-2.5 py-1.5 hover:border-blue-400 disabled:opacity-40"
            disabled={!!pending || page === pageCount}
            onclick={() => void reviewPage(page + 1)}
          >
            Next
          </button>
        </nav>
      {/if}
    </div>

    {#if pageImages.some(({ imageId }) => reviews.get(imageId)?.reviewFailed)}
      <button
        type="button"
        class="text-sm font-medium text-blue-700 underline underline-offset-2 disabled:opacity-50"
        disabled={!!pending}
        onclick={() => void reviewPage(page)}
      >
        Retry page review
      </button>
    {/if}
    <ul
      aria-label="Images on this review page"
      class="divide-y divide-gray-200 rounded-lg border border-gray-200"
    >
      {#each pageImages as image (image.imageId)}
        {@const review = reviews.get(image.imageId)}
        {@const existingMapCount = review?.existing?.existingMapCount ?? 0}
        {@const incomingMapCount = image.maps.length}
        {@const importedMapCount = review?.importedMapCount}
        <li
          class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-3 py-3 text-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-4"
        >
          <MapImportThumbnail {image} />
          <div class="min-w-0">
            <p class="truncate text-gray-800" title={image.imageUri}>
              {image.imageUri}
            </p>
            {#if importedMapCount}
              <p class="mt-1 text-green-700">
                Imported {importedMapCount}
                {importedMapCount === 1 ? 'map' : 'maps'}
              </p>
            {:else if existingMapCount}
              <p class="mt-1 font-medium text-amber-800">
                Conflict · {existingMapCount} existing → {incomingMapCount} incoming
              </p>
            {:else}
              <p class="mt-1 text-gray-600">
                {incomingMapCount}
                {review?.existing ? 'new' : 'incoming'}
                {incomingMapCount === 1 ? 'map' : 'maps'}
              </p>
            {/if}
            {#if image.exceedsSaveLimit}
              <p class="mt-1 text-red-700">Exceeds the per-image save limit.</p>
            {:else if review?.changed}
              <p class="mt-1 text-amber-800">
                The maps changed after review. Check the updated counts before
                importing.
              </p>
            {:else if review?.importFailed}
              <p class="mt-1 text-red-700">
                Could not confirm the import for this image.
              </p>
            {:else if review?.reviewFailed}
              <p class="mt-1 text-red-700">Could not check for conflicts.</p>
            {/if}
          </div>
          <div
            class="col-start-2 flex flex-wrap items-center gap-3 sm:col-start-3 sm:flex-col sm:items-end sm:gap-1"
          >
            <a
              href={viewerUrl(image, !!importedMapCount)}
              class="font-medium text-blue-700 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
              title={importedMapCount
                ? 'New maps may take a moment to appear in Viewer'
                : 'Preview the incoming maps in Viewer'}
            >
              Open in Allmaps Viewer
            </a>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<dialog
  bind:this={confirmation}
  aria-labelledby="map-import-confirmation-heading"
  aria-describedby="map-import-confirmation-description"
  class="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl backdrop:bg-black/50"
>
  <h2
    id="map-import-confirmation-heading"
    class="text-lg font-semibold text-gray-900"
  >
    Import everything?
  </h2>
  <p
    id="map-import-confirmation-description"
    class="mt-2 text-sm leading-6 text-gray-700"
  >
    Import maps for {remaining.length}
    {remaining.length === 1 ? 'image' : 'images'}. Any existing maps for these
    images will be replaced with the maps from this file.
  </p>
  <form method="dialog" class="mt-5 flex flex-wrap justify-end gap-2">
    <button
      class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
    >
      Cancel
    </button>
    <button
      type="button"
      class="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
      onclick={() => {
        confirmation.close()
        void submitImport(true)
      }}
    >
      Import everything
    </button>
  </form>
</dialog>
