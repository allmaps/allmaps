<script lang="ts">
  import { page } from '$app/state'
  import { afterNavigate } from '$app/navigation'

  import { Grid, Thumbnail } from '@allmaps/components'
  import { Image as IIIFImage } from '@allmaps/iiif-parser'
  import { darkblue } from '@allmaps/tailwind'

  import Collection from '$lib/components/Collection.svelte'
  import Status from '$lib/components/Status.svelte'
  import Pagination from '$lib/components/Pagination.svelte'

  import { gotoRoute, getViewUrl } from '$lib/shared/router.js'
  import { parseLanguageString } from '$lib/shared/iiif.js'
  import { truncate } from '$lib/shared/strings.js'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'

  const sourceState = getSourceState()
  const imageInfoState = getImageInfoState()
  const urlState = getUrlState()

  const paginationPerPage = 20

  let itemWidth = $state(0)

  let beforeTimeoutActiveImageId = $state<string>()
  let clickTimer = $state<number>()

  type SearchParams = Parameters<typeof urlState.generateSearchParams>[0]

  function paramsToUrl(params: SearchParams) {
    return `${page.url.pathname}?${urlState.generateSearchParams(params).toString()}`
  }

  let breadcrumbs = $derived(
    sourceState.breadcrumbs.map(({ label, path, type, id }, index) => ({
      label: label || `Level ${index + 1}`,
      href: paramsToUrl({
        path,
        manifestId: type === 'manifest' ? id : undefined,
        imageId: null
      })
    }))
  )

  let lastPathItem = $derived(
    urlState.params.path[urlState.params.path.length - 1]
  )

  let paginationPage = $derived.by(() => {
    if (lastPathItem && lastPathItem.page !== undefined) {
      return lastPathItem.page
    }
    return 0
  })

  let images = $derived(
    [...sourceState.images].slice(
      paginationPage * paginationPerPage,
      (paginationPage + 1) * paginationPerPage
    )
  )

  function handlePageChange(newPage: number) {
    const newPath = [...urlState.params.path]
    newPath[newPath.length - 1].page = newPage
    urlState.params.path = newPath
  }

  function handleImageClick(event: MouseEvent, imageId: string) {
    event.preventDefault()
    window.clearTimeout(clickTimer)

    beforeTimeoutActiveImageId = imageId
    clickTimer = window.setTimeout(
      () => gotoRoute(urlState.generateUrl(getViewUrl('images'), { imageId })),
      600
    )
  }

  function handleImageDoubleClick(imageId: string) {
    window.clearTimeout(clickTimer)
    gotoRoute(urlState.generateUrl(getViewUrl('mask'), { imageId }))
  }

  function isActive(imageId: string) {
    return (
      (!beforeTimeoutActiveImageId && imageId === sourceState.activeImageId) ||
      imageId === beforeTimeoutActiveImageId
    )
  }

  async function fetchImageInfo(url: string) {
    const imageInfo = await imageInfoState.fetchImageInfo(url)

    IIIFImage.parse(imageInfo)

    return imageInfo
  }

  afterNavigate(() => (beforeTimeoutActiveImageId = undefined))
</script>

<div class="m-auto flex max-w-(--breakpoint-lg) flex-col gap-4 p-4">
  {#if sourceState.parsedIiif && sourceState.parsedIiif.type === 'collection'}
    <Collection
      parsedIiifAtPath={sourceState.parsedIiifAtPath}
      fetching={sourceState.fetchingInsideCollection}
      bind:page={urlState.params.page}
      bind:path={urlState.params.path}
      {breadcrumbs}
      {paramsToUrl}
    />
  {/if}

  {#if sourceState.imageCount > 0}
    <Grid childrenCount={Math.min(sourceState.imageCount, paginationPerPage)}>
      {#each images as image, index (image.uri)}
        {@const canvas = sourceState.getCanvasByImageId(image.uri)}
        <!-- TODO: don't bind ALL widths! -->
        <li
          bind:clientWidth={itemWidth}
          class="h-full w-full max-w-xl overflow-hidden rounded-lg bg-white/20 p-2"
        >
          <a
            class="flex flex-col gap-2"
            href={urlState.generateUrl(getViewUrl('mask'), {
              imageId: image.uri
            })}
            onclick={(event) => handleImageClick(event, image.uri)}
            ondblclick={() => handleImageDoubleClick(image.uri)}
          >
            <div class="relative aspect-square">
              {#await fetchImageInfo(image.uri)}
                <div
                  class="flex aspect-square animate-pulse items-center justify-center bg-white/30 p-2 text-center text-sm text-gray-800"
                >
                  <p>Loading…</p>
                </div>
              {:then imageInfo}
                <Thumbnail
                  {imageInfo}
                  width={Math.ceil((itemWidth * devicePixelRatio) / 100) * 100}
                  mode="contain"
                  borderColor={sourceState.imageCount > 1 && isActive(image.uri)
                    ? darkblue
                    : undefined}
                  alt={parseLanguageString(canvas?.label, 'en')}
                />
              {:catch error}
                <div>
                  <p
                    class="flex aspect-square items-center justify-center bg-white/30 p-2 text-center text-sm text-gray-800"
                  >
                    Error: {error.message}
                  </p>
                </div>
              {/await}
              <div class="absolute bottom-0 flex w-full justify-end p-2">
                <Status imageId={image.uri} />
              </div>
            </div>
            <div class="text-center text-sm text-blue-900">
              {canvas?.label
                ? truncate(parseLanguageString(canvas?.label, 'en'))
                : `Image ${index + 1}`}
            </div>
            {#if canvas?.width && canvas?.height}
              <div class="text-center text-xs text-blue-800">
                {canvas?.width} ×
                {canvas?.height} pixels
              </div>
            {/if}
          </a>
        </li>
      {/each}
    </Grid>

    {#if sourceState.imageCount > paginationPerPage}
      <Pagination
        bind:page={paginationPage}
        count={sourceState.imageCount}
        perPage={paginationPerPage}
        onPageChange={handlePageChange}
      />
    {/if}
  {/if}
</div>
