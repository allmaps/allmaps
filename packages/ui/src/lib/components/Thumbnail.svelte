<script lang="ts">
  import { Image, type ImageRequest } from '@allmaps/iiif-parser'

  import type { Fit } from '@allmaps/types'

  export let imageInfo: unknown
  export let width: number
  export let height = width
  export let mode: Fit = 'cover'
  export let borderColor: string | undefined = undefined
  export let alt: string | undefined = undefined

  let imageRequest: ImageRequest | ImageRequest[][] | undefined = undefined

  let parsedImage: Image

  function getTilesWidth(imageRequestGrid: ImageRequest[][]) {
    const firstRow = imageRequestGrid[0]
    return firstRow.reduce((acc, row) => acc + (row.size?.width || 0), 0)
  }

  function getTilesHeight(imageRequestGrid: ImageRequest[][]) {
    return imageRequestGrid.reduce(
      (acc, cells) => acc + (cells[0].size?.height || 0),
      0
    )
  }

  function getColumnPercentages(
    imageRequestGrid: ImageRequest[][],
    tilesWidth: number
  ) {
    const firstRow = imageRequestGrid[0]
    if (tilesWidth === 0) {
      return new Array(firstRow.length).fill(0)
    }

    return firstRow.map((row) => ((row.size?.width || 0) / tilesWidth) * 100)
  }

  function getLeftStyle(tilesWidth: number, tilesHeight: number) {
    return `${(100 - (tilesWidth / tilesHeight) * 100) / 2}%`
  }

  function getTopStyle(tilesWidth: number, tilesHeight: number) {
    return `${(100 - (tilesHeight / tilesWidth) * 100) / 2}%`
  }

  $: parsedImage = Image.parse(imageInfo)
  $: imageRequest = parsedImage.getImageRequest({ width, height }, mode)

  $: borderBoxWidth = mode === 'cover' ? width : parsedImage.width
  $: borderBoxHeight = mode === 'cover' ? height : parsedImage.height
  $: borderBoxAspectRatio = borderBoxWidth / borderBoxHeight
</script>

<div
  style:aspect-ratio="{width} / {height}"
  style="--border-color: {borderColor}; --border-box-aspect-ratio: {borderBoxAspectRatio}"
  class="flex overflow-hidden"
>
  {#if imageRequest && !Array.isArray(imageRequest)}
    <img
      class="w-full h-full {mode === 'cover'
        ? 'object-cover'
        : 'object-contain'}"
      alt={alt || `Thumbnail for ${parsedImage.uri}`}
      src={parsedImage.getImageUrl(imageRequest)}
    />
  {:else if imageRequest && Array.isArray(imageRequest)}
    {@const tilesWidth = getTilesWidth(imageRequest)}
    {@const tilesHeight = getTilesHeight(imageRequest)}

    <div
      class="relative grid"
      class:w-full={mode === 'contain'}
      class:h-full={mode === 'cover'}
      style:grid-template-columns={getColumnPercentages(
        imageRequest,
        tilesWidth
      )
        .map((percentage) => `${percentage}%`)
        .join(' ')}
      style:aspect-ratio="{tilesWidth} / {tilesHeight}"
      style:left={mode === 'cover' ? getLeftStyle(tilesWidth, tilesHeight) : ''}
      style:top={mode === 'contain' ? getTopStyle(tilesWidth, tilesHeight) : ''}
    >
      {#each imageRequest as row, rowIndex}
        {#each row as tile, columnIndex}
          <img
            class="h-auto max-w-full"
            src={parsedImage.getImageUrl(tile)}
            alt={alt ||
              `Thumbnail for ${parsedImage.uri} (${rowIndex}, ${columnIndex})`}
          />
        {/each}
      {/each}
    </div>
  {/if}
  {#if borderColor}
    <!-- TODO: make this a slot/snippet, so clients can render
      their own border box -->
    <div
      class="absolute left-0 top-0 w-full h-full flex justify-center items-center pointer-events-none"
    >
      <div
        class="{borderBoxAspectRatio < 1
          ? 'h-full'
          : 'w-full'} aspect-(--border-box-aspect-ratio)
      outline-4 outline-(--border-color)"
      ></div>
    </div>
  {/if}
</div>
