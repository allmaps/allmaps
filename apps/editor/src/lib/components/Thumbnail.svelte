<script lang="ts">
  import { fetchImageInfo } from '@allmaps/stdlib'

  import { Image as IIIFImage } from '@allmaps/iiif-parser'

  import type { Fit } from '@allmaps/types'

  import type { IIIFResource } from '$lib/types/shared.js'

  type Props = {
    parsedIiif: IIIFResource
    width?: number
    height?: number
    mode: Fit
    // onclick?: (event: MouseEvent) => void
  }

  let {
    parsedIiif,
    width = 250,
    height = width,
    mode = 'cover'
    // onclick
  }: Props = $props()

  async function fetchAndParseImageInfo(imageId: string) {
    const imageInfo = await fetchImageInfo(imageId)
    return IIIFImage.parse(imageInfo)
  }

  let firstThumbnail = $derived.by(() => {
    if ('thumbnail' in parsedIiif) {
      return parsedIiif.thumbnail?.[0]
    }
  })

  let imageWidth = $derived(firstThumbnail?.width ?? width)
  let imageHeight = $derived(firstThumbnail?.height ?? height)

  let borderBoxWidth = $derived(mode === 'cover' ? width : imageWidth)
  let borderBoxHeight = $derived(mode === 'cover' ? height : imageHeight)
  let borderBoxAspectRatio = $derived(
    borderBoxWidth && borderBoxHeight ? borderBoxWidth / borderBoxHeight : 0
  )
</script>

<div
  style:aspect-ratio="{width} / {height}"
  style="--border-box-aspect-ratio: {borderBoxAspectRatio}"
  class="flex overflow-hidden"
>
  {#if firstThumbnail}
    <img
      class="h-full w-full {mode === 'cover'
        ? 'object-cover'
        : 'object-contain'}"
      alt={`Thumbnail for ${firstThumbnail.id}`}
      src={firstThumbnail.id}
    />
  {:else if parsedIiif.type === 'image'}
    {#await fetchAndParseImageInfo(parsedIiif.uri) then parsedImage}
      {@const imageRequest = parsedImage.getImageRequest(
        { width, height },
        mode
      )}
      {#if !Array.isArray(imageRequest)}
        <img
          class="h-full w-full {mode === 'cover'
            ? 'object-cover'
            : 'object-contain'}"
          alt={`Thumbnail for ${parsedImage.uri}`}
          src={parsedImage.getImageUrl(imageRequest)}
        />
      {:else}
        <div class="flex h-full w-full items-center justify-center">
          <span>Cannot display tiled images yet</span>
        </div>
      {/if}
    {/await}
  {:else}
    <div class="flex h-full w-full items-center justify-center">
      <span>No Thumbnail Available</span>
    </div>
  {/if}
</div>
