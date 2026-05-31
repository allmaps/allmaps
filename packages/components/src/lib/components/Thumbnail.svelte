<script lang="ts">
  import { Image, type ImageRequest } from '@allmaps/iiif-parser'
  import { pink } from '@allmaps/tailwind'

  import type { Fit, Ring } from '@allmaps/types'

  type ThumbnailResourceMask = {
    resourceMask: Ring
    color?: string
    fill?: string
    fillOpacity?: number
    stroke?: string
    strokeOpacity?: number
    strokeWidth?: number
  }

  type ImageBox = {
    left: number
    top: number
    width: number
    height: number
  }

  type ThumbnailRegion = {
    x: number
    y: number
    width: number
    height: number
  }

  type Props = {
    imageInfo?: unknown
    imageBitmap?: ImageBitmap
    width?: number
    height?: number
    sourceWidth?: number
    sourceHeight?: number
    region?: ThumbnailRegion
    mode?: Fit
    borderColor?: string
    resourceMasks?: (Ring | ThumbnailResourceMask)[]
    alt?: string
  }

  let {
    imageInfo,
    imageBitmap,
    width,
    height,
    sourceWidth: sourceWidthProp,
    sourceHeight: sourceHeightProp,
    region,
    mode = 'cover',
    borderColor,
    resourceMasks = [],
    alt
  }: Props = $props()

  let canvas = $state<HTMLCanvasElement>()

  function getSourceWidth() {
    return sourceWidthProp || imageBitmap?.width || parsedImage?.width || 0
  }

  function getSourceHeight() {
    return sourceHeightProp || imageBitmap?.height || parsedImage?.height || 0
  }

  function getDisplaySourceWidth() {
    return region?.width || sourceWidth
  }

  function getDisplaySourceHeight() {
    return region?.height || sourceHeight
  }

  function getRenderWidth() {
    return width || imageBitmap?.width || parsedImage?.width || 1
  }

  function getRenderHeight() {
    return height || width || imageBitmap?.height || parsedImage?.height || 1
  }

  function getImageBox(
    sourceWidth: number,
    sourceHeight: number,
    renderWidth: number,
    renderHeight: number,
    mode: Fit
  ): ImageBox {
    if (!sourceWidth || !sourceHeight || !renderWidth || !renderHeight) {
      return { left: 0, top: 0, width: renderWidth, height: renderHeight }
    }

    if (mode === 'cover' || mode === 'contain') {
      const widthRatio = renderWidth / sourceWidth
      const heightRatio = renderHeight / sourceHeight
      const ratio =
        mode === 'cover'
          ? Math.max(widthRatio, heightRatio)
          : Math.min(widthRatio, heightRatio)
      const boxWidth = sourceWidth * ratio
      const boxHeight = sourceHeight * ratio

      return {
        left: (renderWidth - boxWidth) / 2,
        top: (renderHeight - boxHeight) / 2,
        width: boxWidth,
        height: boxHeight
      }
    }

    return { left: 0, top: 0, width: renderWidth, height: renderHeight }
  }

  function getBoxStyle(box: ImageBox) {
    return [
      `left: ${(box.left / renderWidth) * 100}%`,
      `top: ${(box.top / renderHeight) * 100}%`,
      `width: ${(box.width / renderWidth) * 100}%`,
      `height: ${(box.height / renderHeight) * 100}%`
    ].join('; ')
  }

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

  function getColumnPercentages(imageRequestGrid: ImageRequest[][]) {
    const firstRow = imageRequestGrid[0]
    const tilesWidth = getTilesWidth(imageRequestGrid)
    if (tilesWidth === 0) {
      return new Array(firstRow.length).fill(0)
    }

    return firstRow.map((row) => ((row.size?.width || 0) / tilesWidth) * 100)
  }

  function getRowPercentages(imageRequestGrid: ImageRequest[][]) {
    const tilesHeight = getTilesHeight(imageRequestGrid)
    if (tilesHeight === 0) {
      return new Array(imageRequestGrid.length).fill(0)
    }

    return imageRequestGrid.map(
      (row) => ((row[0].size?.height || 0) / tilesHeight) * 100
    )
  }

  function isThumbnailResourceMask(
    resourceMask: Ring | ThumbnailResourceMask
  ): resourceMask is ThumbnailResourceMask {
    return 'resourceMask' in resourceMask
  }

  function normalizeResourceMask(
    resourceMask: Ring | ThumbnailResourceMask
  ): ThumbnailResourceMask {
    if (isThumbnailResourceMask(resourceMask)) {
      return resourceMask
    }

    return { resourceMask }
  }

  function getMaskPoints(resourceMask: Ring) {
    return resourceMask
      .map((point) =>
        region ? [point[0] - region.x, point[1] - region.y] : point
      )
      .map((point) => point.join(','))
      .join(' ')
  }

  function getMaskFill(mask: ThumbnailResourceMask) {
    return mask.fill || 'none'
  }

  function getMaskFillOpacity(mask: ThumbnailResourceMask) {
    return mask.fillOpacity ?? 0.12
  }

  function getMaskStroke(mask: ThumbnailResourceMask) {
    return mask.stroke || mask.color || pink
  }

  function getMaskStrokeOpacity(mask: ThumbnailResourceMask) {
    return mask.strokeOpacity ?? 0.65
  }

  function getMaskStrokeWidth(mask: ThumbnailResourceMask) {
    return (
      mask.strokeWidth ?? Math.max(displaySourceWidth, displaySourceHeight) / 80
    )
  }

  let parsedImage = $derived(imageInfo ? Image.parse(imageInfo) : undefined)
  let sourceWidth = $derived(getSourceWidth())
  let sourceHeight = $derived(getSourceHeight())
  let displaySourceWidth = $derived(getDisplaySourceWidth())
  let displaySourceHeight = $derived(getDisplaySourceHeight())
  let renderWidth = $derived(getRenderWidth())
  let renderHeight = $derived(getRenderHeight())
  let imageBox = $derived(
    getImageBox(
      displaySourceWidth,
      displaySourceHeight,
      renderWidth,
      renderHeight,
      mode
    )
  )
  let borderBox = $derived(
    mode === 'cover'
      ? { left: 0, top: 0, width: renderWidth, height: renderHeight }
      : imageBox
  )
  let imageRequest = $derived(
    parsedImage && region
      ? {
          region,
          size: {
            width: imageBox.width,
            height: imageBox.height
          }
        }
      : parsedImage &&
          parsedImage.getImageRequest(
            { width: renderWidth, height: renderHeight },
            mode
          )
  )
  let normalizedResourceMasks = $derived(
    resourceMasks.map(normalizeResourceMask)
  )

  $effect(() => {
    if (!canvas || !imageBitmap) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    if (region && sourceWidth && sourceHeight) {
      const xScale = imageBitmap.width / sourceWidth
      const yScale = imageBitmap.height / sourceHeight
      const cropX = region.x * xScale
      const cropY = region.y * yScale
      const cropWidth = region.width * xScale
      const cropHeight = region.height * yScale
      const canvasWidth = Math.max(1, Math.round(cropWidth))
      const canvasHeight = Math.max(1, Math.round(cropHeight))

      canvas.width = canvasWidth
      canvas.height = canvasHeight
      context.clearRect(0, 0, canvasWidth, canvasHeight)
      context.drawImage(
        imageBitmap,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvasWidth,
        canvasHeight
      )
    } else {
      canvas.width = imageBitmap.width
      canvas.height = imageBitmap.height
      context.clearRect(0, 0, imageBitmap.width, imageBitmap.height)
      context.drawImage(imageBitmap, 0, 0)
    }
  })
</script>

<div
  style:aspect-ratio="{renderWidth} / {renderHeight}"
  style="--border-color: {borderColor}"
  class="relative flex w-full overflow-hidden"
>
  <div class="absolute" style={getBoxStyle(imageBox)}>
    {#if imageBitmap}
      <canvas bind:this={canvas} class="h-full w-full"></canvas>
    {:else if parsedImage && imageRequest && !Array.isArray(imageRequest)}
      <img
        class="h-full w-full"
        alt={alt || `Thumbnail for ${parsedImage.uri}`}
        src={parsedImage.getImageUrl(imageRequest)}
      />
    {:else if parsedImage && imageRequest && Array.isArray(imageRequest)}
      {@const columnPercentages = getColumnPercentages(imageRequest)}
      {@const rowPercentages = getRowPercentages(imageRequest)}

      <div
        class="grid h-full w-full"
        style:grid-template-columns={columnPercentages
          .map((percentage) => `${percentage}%`)
          .join(' ')}
        style:grid-template-rows={rowPercentages
          .map((percentage) => `${percentage}%`)
          .join(' ')}
      >
        {#each imageRequest as row, rowIndex (rowIndex)}
          {#each row as tile, columnIndex (columnIndex)}
            <img
              class="h-full w-full"
              src={parsedImage.getImageUrl(tile)}
              alt={alt ||
                `Thumbnail for ${parsedImage.uri} (${rowIndex}, ${columnIndex})`}
            />
          {/each}
        {/each}
      </div>
    {/if}
  </div>

  {#if displaySourceWidth && displaySourceHeight && normalizedResourceMasks.length}
    <div class="pointer-events-none absolute" style={getBoxStyle(imageBox)}>
      <svg
        class="h-full w-full"
        viewBox="0 0 {displaySourceWidth} {displaySourceHeight}"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {#each normalizedResourceMasks as mask, index (index)}
          <polygon
            class="transition-all"
            points={getMaskPoints(mask.resourceMask)}
            fill={getMaskFill(mask)}
            fill-opacity={getMaskFillOpacity(mask)}
            stroke={getMaskStroke(mask)}
            stroke-opacity={getMaskStrokeOpacity(mask)}
            stroke-width={getMaskStrokeWidth(mask)}
          />
        {/each}
      </svg>
    </div>
  {/if}

  {#if borderColor}
    <div
      class="pointer-events-none absolute outline-4 outline-(--border-color)"
      style={getBoxStyle(borderBox)}
      aria-hidden="true"
    ></div>
  {/if}
</div>
