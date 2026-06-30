<script lang="ts">
  import { Image, type ImageRequest } from '@allmaps/iiif-parser'
  import { pink } from '@allmaps/tailwind'

  import type { Snippet } from 'svelte'
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

  type ThumbnailError =
    | string
    | Error
    | {
        title?: string
        message?: string
      }

  type ThumbnailLoadError = {
    url: string
    message: string
  }

  type ThumbnailErrorSnippetContext = {
    title: string
    message: string
    error?: ThumbnailError
    loadError?: ThumbnailLoadError
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
    padding?: number
    borderColor?: string
    resourceMasks?: (Ring | ThumbnailResourceMask)[]
    alt?: string
    error?: ThumbnailError
    errorSnippet?: Snippet<[ThumbnailErrorSnippetContext]>
    onImageError?: (error: ThumbnailLoadError) => void
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
    padding = 0,
    borderColor,
    resourceMasks = [],
    alt,
    error,
    errorSnippet,
    onImageError
  }: Props = $props()

  let canvas = $state<HTMLCanvasElement>()
  let loadError = $state<ThumbnailLoadError>()

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

  function getContentBox(
    renderWidth: number,
    renderHeight: number,
    padding: number
  ): ImageBox {
    const maxPadding = Math.max(
      0,
      (Math.min(renderWidth, renderHeight) - 1) / 2
    )
    const contentPadding = Math.min(Math.max(padding, 0), maxPadding)

    return {
      left: contentPadding,
      top: contentPadding,
      width: renderWidth - contentPadding * 2,
      height: renderHeight - contentPadding * 2
    }
  }

  function getBoxStyle(
    box: ImageBox,
    containingWidth: number,
    containingHeight: number
  ) {
    return [
      `left: ${(box.left / containingWidth) * 100}%`,
      `top: ${(box.top / containingHeight) * 100}%`,
      `width: ${(box.width / containingWidth) * 100}%`,
      `height: ${(box.height / containingHeight) * 100}%`
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

  function getThumbnailErrorTitle(error?: ThumbnailError) {
    if (error && typeof error === 'object' && !(error instanceof Error)) {
      return error.title
    }
  }

  function getThumbnailErrorMessage(error?: ThumbnailError) {
    if (!error) {
      return
    }

    if (typeof error === 'string') {
      return error
    }

    if (error instanceof Error) {
      return error.message
    }

    return error.message
  }

  function handleImageError(url: string) {
    loadError = {
      url,
      message: 'The thumbnail image request failed.'
    }
    onImageError?.(loadError)
  }

  let parsedImage = $derived(imageInfo ? Image.parse(imageInfo) : undefined)
  let sourceWidth = $derived(getSourceWidth())
  let sourceHeight = $derived(getSourceHeight())
  let displaySourceWidth = $derived(getDisplaySourceWidth())
  let displaySourceHeight = $derived(getDisplaySourceHeight())
  let renderWidth = $derived(getRenderWidth())
  let renderHeight = $derived(getRenderHeight())
  let contentBox = $derived(getContentBox(renderWidth, renderHeight, padding))
  let imageBox = $derived(
    getImageBox(
      displaySourceWidth,
      displaySourceHeight,
      contentBox.width,
      contentBox.height,
      mode
    )
  )
  let borderBox = $derived(
    mode === 'cover'
      ? { left: 0, top: 0, width: contentBox.width, height: contentBox.height }
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
            { width: contentBox.width, height: contentBox.height },
            mode
          )
  )
  let normalizedResourceMasks = $derived(
    resourceMasks.map(normalizeResourceMask)
  )
  let errorTitle = $derived(getThumbnailErrorTitle(error))
  let errorMessage = $derived(
    getThumbnailErrorMessage(error) ?? errorTitle ?? loadError?.message
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

  $effect(() => {
    // eslint-disable-next-line
    imageBitmap
    // eslint-disable-next-line
    imageInfo
    // eslint-disable-next-line
    imageRequest
    loadError = undefined
  })
</script>

<div
  style:aspect-ratio="{renderWidth} / {renderHeight}"
  style="--border-color: {borderColor}"
  class="relative flex w-full overflow-hidden"
>
  {#if errorMessage}
    {@const title = errorTitle || 'Could not load thumbnail'}
    {#if errorSnippet}
      {@render errorSnippet({
        title,
        message: errorMessage,
        error,
        loadError
      })}
    {:else}
      <div
        class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red/20 p-3 text-center text-red"
        role="status"
        aria-label={title}
      >
        <p class="max-w-full text-sm font-medium leading-tight">{title}</p>
        {#if errorMessage !== title}
          <p class="max-w-full text-xs leading-snug">
            {errorMessage}
          </p>
        {/if}
        <!-- {#if loadError?.url && !error}
          <p
            class="max-w-full truncate font-mono text-[0.65rem] leading-tight text-gray-400"
            title={loadError.url}
          >
            {loadError.url}
          </p>
        {/if} -->
      </div>
    {/if}
  {:else}
    <div
      class="absolute"
      style={getBoxStyle(contentBox, renderWidth, renderHeight)}
    >
      <div class="absolute inset-0 overflow-hidden">
        <div
          class="absolute"
          style={getBoxStyle(imageBox, contentBox.width, contentBox.height)}
        >
          {#if imageBitmap}
            <canvas bind:this={canvas} class="h-full w-full"></canvas>
          {:else if parsedImage && imageRequest && !Array.isArray(imageRequest)}
            {@const imageUrl = parsedImage.getImageUrl(imageRequest)}
            <img
              class="h-full w-full"
              alt={alt || `Thumbnail for ${parsedImage.uri}`}
              src={imageUrl}
              onerror={() => handleImageError(imageUrl)}
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
                  {@const tileUrl = parsedImage.getImageUrl(tile)}
                  <img
                    class="h-full w-full"
                    src={tileUrl}
                    alt={alt ||
                      `Thumbnail for ${parsedImage.uri} (${rowIndex}, ${columnIndex})`}
                    onerror={() => handleImageError(tileUrl)}
                  />
                {/each}
              {/each}
            </div>
          {/if}
        </div>

        {#if displaySourceWidth && displaySourceHeight && normalizedResourceMasks.length}
          <div
            class="pointer-events-none absolute"
            style={getBoxStyle(imageBox, contentBox.width, contentBox.height)}
          >
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
      </div>

      {#if borderColor}
        <div
          class="pointer-events-none absolute outline-4 outline-(--border-color)"
          style={getBoxStyle(borderBox, contentBox.width, contentBox.height)}
          aria-hidden="true"
        ></div>
      {/if}
    </div>
  {/if}

  {#if errorMessage && borderColor}
    <div
      class="pointer-events-none absolute outline-4 outline-(--border-color)"
      style={getBoxStyle(contentBox, renderWidth, renderHeight)}
      aria-hidden="true"
    ></div>
  {/if}
</div>
