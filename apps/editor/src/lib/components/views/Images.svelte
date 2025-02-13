<script lang="ts">
  import { page } from '$app/state'

  import { Collection, Thumbnail } from '@allmaps/ui'
  import { Image as IIIFImage } from '@allmaps/iiif-parser'
  import { darkblue } from '@allmaps/tailwind'

  import Status from '$lib/components/Status.svelte'

  import { createRouteUrl, gotoRoute } from '$lib/shared/router'
  import { parseLanguageString } from '$lib/shared/iiif.js'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  const sourceState = getSourceState()
  const imageInfoState = getImageInfoState()

  function handleImageClick(event: Event, imageId: string) {
    gotoRoute(createRouteUrl(page, 'images', { image: imageId }))
    event.preventDefault()
  }

  function handleImageDblclick(event: Event, imageId: string) {
    gotoRoute(createRouteUrl(page, 'mask', { image: imageId }))
    event.preventDefault()
  }

  function isActive(imageId: string) {
    return imageId === sourceState.activeImageId
  }

  function handleError(err: Error) {
    console.log('KOEK', err.cause, err.name, err.message, err.stack)
  }

  async function fetchImageInfo(url: string) {
    const imageInfo = await imageInfoState.fetchImageInfo(url)

    IIIFImage.parse(imageInfo)

    return imageInfo
  }
</script>

<div class="max-w-(--breakpoint-lg) m-auto p-4">
  {#if sourceState.imageCount > 0}
    <Collection>
      {#each [...sourceState.images] as image (image.uri)}
        {@const canvas = sourceState.getCanvasByImageId(image.uri)}

        <a
          onclick={(event) => handleImageClick(event, image.uri)}
          ondblclick={(event) => handleImageDblclick(event, image.uri)}
          href={createRouteUrl(page, 'mask', { image: image.uri })}
          class="overflow-hidden bg-white/20 p-2 rounded-lg"
        >
          <div class="relative">
            <!-- TODO: move to load function? -->
            {#await fetchImageInfo(image.uri)}
              <div
                class="aspect-square animate-pulse bg-white/30 p-2 flex items-center justify-center text-sm text-gray-800 text-center"
              >
                <p>Loading…</p>
              </div>
            {:then imageInfo}
              <Thumbnail
                {imageInfo}
                width={300}
                mode="contain"
                borderColor={isActive(image.uri) ? darkblue : undefined}
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
        </a>
      {/each}
    </Collection>
  {/if}
</div>
