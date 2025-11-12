<script lang="ts">
  import { Image, type ImageRequest } from '@allmaps/iiif-parser'

  import type { Fit } from '@allmaps/types'

  type Props = {
    imageInfo: unknown
    width: number
    height?: number
    mode: Fit
    borderColor?: string
    alt?: string
  }

  let {
    imageInfo,
    width,
    height = width,
    mode = 'cover',
    borderColor,
    alt
  }: Props = $props()

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

  let parsedImage = $derived(Image.parse(imageInfo))
  let imageRequest = $derived(
    parsedImage && parsedImage.getImageRequest({ width, height }, mode)
  )

  let borderBoxWidth = $derived(mode === 'cover' ? width : parsedImage?.width)
  let borderBoxHeight = $derived(
    mode === 'cover' ? height : parsedImage?.height
  )
  let borderBoxAspectRatio = $derived(
    borderBoxWidth && borderBoxHeight ? borderBoxWidth / borderBoxHeight : 0
  )
</script>

<div
  style:aspect-ratio="{width} / {height}"
  style="--border-color: {borderColor}; --border-box-aspect-ratio: {borderBoxAspectRatio}"
  class="flex overflow-hidden"
>
  {#if parsedImage && imageRequest && !Array.isArray(imageRequest)}
    <img
      class="w-full h-full {mode === 'cover'
        ? 'object-cover'
        : 'object-contain'}"
      alt={alt || `Thumbnail for ${parsedImage.uri}`}
      src={parsedImage.getImageUrl(imageRequest)}
    />
  {:else if parsedImage && imageRequest && Array.isArray(imageRequest)}
    {@const tilesWidth = getTilesWidth(imageRequest)}
    {@const tilesHeight = getTilesHeight(imageRequest)}
    {@const orientationPortrait =
      (mode === 'contain' && parsedImage.width > parsedImage.height) ||
      (mode === 'cover' && parsedImage.width < parsedImage.height)}
    {@const columnPercentages = getColumnPercentages(imageRequest, tilesWidth)}

    <!-- style:left={!orientationPortrait
        ? getLeftStyle(tilesWidth, tilesHeight)
        : ''}
      style:top={orientationPortrait
        ? getTopStyle(tilesWidth, tilesHeight)
        : ''} -->
    <div
      class="relative grid"
      class:w-full={orientationPortrait}
      class:h-full={!orientationPortrait}
      style:grid-template-columns={columnPercentages
        .map((percentage) => `${percentage}%`)
        .join(' ')}
      style:aspect-ratio="{tilesWidth} / {tilesHeight}"
      style:left={mode === 'cover' ? getLeftStyle(tilesWidth, tilesHeight) : ''}
      style:top={mode === 'contain' ? getTopStyle(tilesWidth, tilesHeight) : ''}
      style:height="{(borderBoxHeight / borderBoxWidth) * 100}%"
    >
      {#each imageRequest as row, rowIndex (rowIndex)}
        {#each row as tile, columnIndex (columnIndex)}
          <img
            class="max-w-full h-full"
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
