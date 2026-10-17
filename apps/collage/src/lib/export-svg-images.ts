import type { Image } from '@allmaps/iiif-parser'
import type { ImageRequest, Region, SizeObject } from '@allmaps/types'
import type { ExportableMapLayer } from './export-layer.ts'
import { abortable } from './export-image.ts'
import { linkedImageUrl, svgImageSize } from './export-svg.ts'
import {
  MapExportError,
  imageHttpError,
  imageNetworkMessage
} from './export-errors.ts'

type CachedPixels = {
  data: ImageData
  fetchableTile: { options?: { imageRequest?: ImageRequest } }
}
type ImagePiece = { pixels: ImageData; region: Region; size: SizeObject }

/** A cached image is usable only if every source pixel is covered at the
 * requested detail. Tiles may overlap or come from different zoom levels. */
export function cachedImagePieces(
  image: SizeObject,
  output: SizeObject,
  tiles: CachedPixels[]
): ImagePiece[] | undefined {
  const pieces = tiles.flatMap(({ data, fetchableTile }) => {
    const request = fetchableTile.options?.imageRequest
    if (!request?.size) return []
    const region = request.region ?? { x: 0, y: 0, ...image }
    const size = request.size
    if (
      region.width <= 0 ||
      region.height <= 0 ||
      region.x < 0 ||
      region.y < 0 ||
      region.x + region.width > image.width ||
      region.y + region.height > image.height ||
      data.width < size.width ||
      data.height < size.height ||
      size.width / region.width + 1e-9 < output.width / image.width ||
      size.height / region.height + 1e-9 < output.height / image.height
    )
      return []
    return [{ pixels: data, region, size }]
  })
  const edges = [
    ...new Set([
      0,
      image.width,
      ...pieces.flatMap(({ region: r }) => [r.x, r.x + r.width])
    ])
  ].sort((a, b) => a - b)
  for (let i = 1; i < edges.length; i++) {
    const intervals = pieces
      .filter(
        ({ region: r }) => r.x <= edges[i - 1] && r.x + r.width >= edges[i]
      )
      .map(({ region: r }) => [r.y, r.y + r.height])
      .sort((a, b) => a[0] - b[0])
    let covered = 0
    for (const [start, end] of intervals) {
      if (start > covered) return undefined
      covered = Math.max(covered, end)
    }
    if (covered < image.height) return undefined
  }
  // Paint finer detail last where levels overlap.
  return pieces.sort(
    (a, b) => a.size.width / a.region.width - b.size.width / b.region.width
  )
}

function blobDataUrl(blob: Blob, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const abort = () => {
      signal.removeEventListener('abort', abort)
      reader.abort()
      reject(signal.reason)
    }
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () =>
      reject(new Error('The browser could not read the downloaded image.'))
    reader.onloadend = () => signal.removeEventListener('abort', abort)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    else reader.readAsDataURL(blob)
  })
}

async function canvasBlob(canvas: HTMLCanvasElement, signal: AbortSignal) {
  return abortable(
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(
                new Error(
                  'The browser could not encode the image. Reduce the export resolution.'
                )
              ),
        'image/png'
      )
    }),
    signal
  )
}

async function embedImage(
  image: Image,
  maximum: SizeObject,
  tiles: CachedPixels[],
  signal: AbortSignal
) {
  const size = svgImageSize(image, maximum)
  const pieces = cachedImagePieces(image, size, tiles)
  signal.throwIfAborted()
  if (pieces) {
    const canvas = document.createElement('canvas')
    const tileCanvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    try {
      const context = canvas.getContext('2d')
      const tileContext = tileCanvas.getContext('2d')
      if (!context || !tileContext)
        throw new Error(
          'The browser could not allocate memory for this image. Reduce the export resolution.'
        )
      for (const { pixels, region, size: tileSize } of pieces) {
        tileCanvas.width = pixels.width
        tileCanvas.height = pixels.height
        tileContext.putImageData(pixels, 0, 0)
        // Shared edges must land on the same output pixel. Fractional tile
        // rectangles otherwise antialias against transparency and leave seams.
        const left = Math.round((region.x * size.width) / image.width)
        const top = Math.round((region.y * size.height) / image.height)
        const right = Math.round(
          ((region.x + region.width) * size.width) / image.width
        )
        const bottom = Math.round(
          ((region.y + region.height) * size.height) / image.height
        )
        if (right > left && bottom > top)
          context.drawImage(
            tileCanvas,
            0,
            0,
            tileSize.width,
            tileSize.height,
            left,
            top,
            right - left,
            bottom - top
          )
      }
      return await blobDataUrl(await canvasBlob(canvas, signal), signal)
    } finally {
      canvas.width = canvas.height = tileCanvas.width = tileCanvas.height = 0
    }
  }
  // Partial or lower-detail caches cannot supply a complete editable image.
  // Fetch a bounded full rendition rather than embedding transparent gaps.
  const url = linkedImageUrl(image, maximum)
  // A per-image timeout identifies the failed map and leaves time to offer
  // omission before the overall export deadline.
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)])
  let blob: Blob
  try {
    let response: Response
    try {
      response = await fetch(url, { signal: requestSignal })
    } catch (cause) {
      signal.throwIfAborted()
      requestSignal.throwIfAborted()
      throw new Error(imageNetworkMessage, { cause })
    }
    if (!response.ok) throw imageHttpError(response.status)
    try {
      blob = await response.blob()
    } catch (cause) {
      signal.throwIfAborted()
      requestSignal.throwIfAborted()
      throw new Error('The image download was interrupted. Try again.', {
        cause
      })
    }
  } catch (cause) {
    signal.throwIfAborted()
    if (requestSignal.reason?.name === 'TimeoutError')
      throw new Error(
        'The image service took too long to return this image. Try again later.',
        { cause }
      )
    throw cause
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch (cause) {
    signal.throwIfAborted()
    throw new Error(
      'The image service returned an unreadable image. Try again or check the service.',
      { cause }
    )
  }
  try {
    signal.throwIfAborted()
    if (
      bitmap.width > maximum.width ||
      bitmap.height > maximum.height ||
      bitmap.width * bitmap.height > 32_000_000
    )
      throw new Error(
        'The image service returned an image larger than the requested dimensions. Reduce the export resolution or use Image export.'
      )
    if (['image/jpeg', 'image/png'].includes(blob.type))
      return await blobDataUrl(blob, signal)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    try {
      const context = canvas.getContext('2d')
      if (!context)
        throw new Error(
          'The browser could not allocate memory for this image. Reduce the export resolution.'
        )
      context.drawImage(bitmap, 0, 0)
      return await blobDataUrl(await canvasBlob(canvas, signal), signal)
    } finally {
      canvas.width = canvas.height = 0
    }
  } finally {
    bitmap.close()
  }
}

/** Process sources sequentially to bound peak memory; duplicate maps share one
 * embedded image and can contribute tiles to the same source's coverage. */
export async function embeddedSvgSources(
  layer: ExportableMapLayer,
  images: Map<string, Image>,
  maximum: SizeObject,
  signal: AbortSignal,
  cache?: Map<string, string>
): Promise<Map<string, string>> {
  const sources = new Map<string, string>()
  const byImage = new Map<string, string>()
  let bytes = 0
  for (const [mapId, image] of images) {
    signal.throwIfAborted()
    let source = byImage.get(image.uri)
    if (!source) {
      const tiles = [...images]
        .filter(([, candidate]) => candidate.uri === image.uri)
        .flatMap(([id]) => layer.renderer!.tileCache.getMapCachedTiles(id))
      const key = JSON.stringify([image.uri, maximum.width, maximum.height])
      source = cache?.get(key)
      if (!source) {
        try {
          source = await embedImage(image, maximum, [...new Set(tiles)], signal)
        } catch (cause) {
          signal.throwIfAborted()
          throw new MapExportError(
            [...images]
              .filter(([, copy]) => copy.uri === image.uri)
              .map(([id]) => id),
            cause
          )
        }
        // Bound retained sources across retries as well as a single attempt.
        if (
          cache &&
          [...cache.values()].reduce((sum, value) => sum + value.length, 0) +
            source.length <=
            100_000_000
        )
          cache.set(key, source)
      }
      bytes += source.length
      if (bytes > 100_000_000)
        throw new Error(
          'Embedded images exceed 100 MB. Reduce the export resolution.'
        )
      byImage.set(image.uri, source)
    }
    sources.set(mapId, source)
  }
  return sources
}
