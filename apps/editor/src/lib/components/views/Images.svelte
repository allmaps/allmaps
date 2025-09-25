<script lang="ts">
  import { page } from '$app/state'
  import { afterNavigate } from '$app/navigation'

  import { Grid, Thumbnail } from '@allmaps/components'
  import { Image as IIIFImage } from '@allmaps/iiif-parser'
  import { darkblue } from '@allmaps/tailwind'

  import Status from '$lib/components/Status.svelte'

  import { createRouteUrl, gotoRoute } from '$lib/shared/router.js'
  import { parseLanguageString } from '$lib/shared/iiif.js'
  import { truncate } from '$lib/shared/strings.js'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  const sourceState = getSourceState()
  const imageInfoState = getImageInfoState()

  let itemWidth = $state(0)

  let beforeTimeoutActiveImageId = $state<string>()
  let clickTimer = $state<number>()

  function handleImageClick(event: MouseEvent, imageId: string) {
    event.preventDefault()
    window.clearTimeout(clickTimer)

    beforeTimeoutActiveImageId = imageId
    clickTimer = window.setTimeout(
      () => gotoRoute(createRouteUrl(page, 'images', { image: imageId })),
      600
    )
  }

  function handleImageDoubleClick(imageId: string) {
    window.clearTimeout(clickTimer)
    gotoRoute(createRouteUrl(page, 'mask', { image: imageId }))
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

<div class="max-w-(--breakpoint-lg) m-auto p-4">
  {#if sourceState.imageCount > 0}
    <Grid childrenCount={sourceState.imageCount}>
      {#each [...sourceState.images] as image, index (image.uri)}
        {@const canvas = sourceState.getCanvasByImageId(image.uri)}
        <!-- TODO: don't bind ALL widths! -->
        <li
          bind:clientWidth={itemWidth}
          class="overflow-hidden bg-white/20 p-2 rounded-lg w-full h-full max-w-xl"
        >
          <a
            class="flex flex-col gap-2"
            href={createRouteUrl(page, 'mask', { image: image.uri })}
            onclick={(event) => handleImageClick(event, image.uri)}
            ondblclick={(event) => handleImageDoubleClick(image.uri)}
          >
            <div class="relative aspect-square">
              {#await fetchImageInfo(image.uri)}
                <div
                  class="aspect-square animate-pulse bg-white/30 p-2 flex items-center justify-center text-sm text-gray-800 text-center"
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
                    class="aspect-square bg-white/30 p-2 flex items-center justify-center text-sm text-gray-800 text-center"
                  >
                    Error: {error.message}
                  </p>
                </div>
              {/await}
              <div class="absolute bottom-0 w-full flex justify-end p-2">
                <Status imageId={image.uri} />
              </div>
            </div>
            <div class="text-center text-blue-900 text-xs">
              {canvas?.label
                ? truncate(parseLanguageString(canvas?.label, 'en'))
                : `Image ${index + 1}`}
            </div>
          </a>
        </li>
      {/each}
    </Grid>
  {/if}
</div>
