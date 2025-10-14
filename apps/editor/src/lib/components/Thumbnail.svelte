<script lang="ts">
  import type {
    Collection as IIIFCollection,
    EmbeddedCollection as IIIFEmbeddedCollection,
    Manifest as IIIFManifest,
    EmbeddedManifest as IIIFEmbeddedManifest,
    Image as IIIFImage,
    EmbeddedImage as IIIFEmbeddedImage,
    ImageRequest
  } from '@allmaps/iiif-parser'

  import type { Fit } from '@allmaps/types'

  type IIIFResource =
    | IIIFCollection
    | IIIFEmbeddedCollection
    | IIIFManifest
    | IIIFEmbeddedManifest
    | IIIFImage
    | IIIFEmbeddedImage

  type Props = {
    parsedIiif: IIIFResource
    width?: number
    height?: number
    mode: Fit
    onclick?: (event: MouseEvent) => void
  }

  let {
    parsedIiif,
    width = 250,
    height = width,
    mode = 'cover',
    onclick
  }: Props = $props()

  let firstThumbnail = $derived.by(() => {
    if ('thumbnail' in parsedIiif) {
      return parsedIiif.thumbnail?.[0]
    }
  })

  let imageWidth = $derived(firstThumbnail?.width ?? width)
  let imageHeight = $derived(firstThumbnail?.height ?? height)

  // let parsedImage = $derived(Image.parse(imageInfo))
  // let imageRequest = $derived(
  //   parsedImage && parsedImage.getImageRequest({ width, height }, mode)
  // )

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
      class="w-full h-full {mode === 'cover'
        ? 'object-cover'
        : 'object-contain'}"
      alt={`Thumbnail for`}
      src={firstThumbnail.id}
    />
  {/if}
</div>
