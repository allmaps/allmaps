import { Viewport } from '@allmaps/render'
import { changeDpiBlob } from 'changedpi'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { CANVAS_SCALE } from './coordinates.ts'
import type { ExportableMapLayer } from './export-layer.ts'
import { imageDimensions, validateImageSize } from './export-view.ts'
import type { ExportView } from './export-view.ts'
import { modeVisibility } from './mode-visibility.ts'

export function printViewport(view: ExportView, ratio = 1) {
  return new Viewport(
    [view.width * ratio, view.height * ratio],
    view.center,
    (view.metersPerPixel * CANVAS_SCALE) / ratio,
    { rotation: (-view.bearing * Math.PI) / 180, devicePixelRatio: 1 }
  )
}

export function visibleExportMaps(
  layer: ExportableMapLayer,
  view: ExportView,
  mapIds?: ReadonlySet<string>
) {
  return layer
    .renderer!.warpedMapList.getWarpedMaps({
      projectedGeoBbox: printViewport(view).projectedGeoRectangleBbox,
      applyMask: false
    })
    .filter(
      (map) => (!mapIds || mapIds.has(map.mapId)) && map.shouldRenderMap()
    )
}

export function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const aborted = () => reject(signal.reason)
    if (signal.aborted) return aborted()
    signal.addEventListener('abort', aborted, { once: true })
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', aborted))
  })
}

function untilEvent(
  target: EventTarget,
  events: string[],
  done: () => boolean,
  signal: AbortSignal
) {
  return new Promise<void>((resolve, reject) => {
    function cleanup() {
      events.forEach((event) => target.removeEventListener(event, check))
      signal.removeEventListener('abort', abort)
    }
    function abort() {
      cleanup()
      reject(signal.reason)
    }
    function check() {
      if (done()) {
        cleanup()
        resolve()
      }
    }
    events.forEach((event) => target.addEventListener(event, check))
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    else check()
  })
}

export async function loadExportImages(
  layer: ExportableMapLayer,
  view: ExportView,
  signal: AbortSignal,
  mapIds?: ReadonlySet<string>
) {
  const maps = visibleExportMaps(layer, view, mapIds)
  await Promise.all(
    maps.map(async (map) => {
      // WebGL maps declare their eventual image type. Widen this type guard to
      // a boolean so TypeScript also permits loading their initial empty state.
      const hasImage = (): boolean => map.hasImage()
      if (map.fetchingImageInfo) {
        await untilEvent(
          map,
          ['imageloaded', 'imageinfofetcherror'],
          () => !!map.imageInfoError || map.hasImage(),
          signal
        )
      }
      if (!hasImage())
        await abortable(
          map.loadImage(layer.renderer!.warpedMapList.imagesById),
          signal
        )
      if (!hasImage())
        throw new Error(
          'An image service could not be loaded. Try again when the maps have loaded.'
        )
    })
  )
  return maps
}

/** Capture within the render event: WebGL may discard its buffer afterwards. */
function renderedFrame(
  map: MapLibreMap,
  signal: AbortSignal,
  capture = () => {}
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      map.off('render', rendered)
      signal.removeEventListener('abort', abort)
    }
    const abort = () => {
      cleanup()
      reject(signal.reason)
    }
    const rendered = () => {
      cleanup()
      try {
        capture()
        resolve()
      } catch (error) {
        reject(error)
      }
    }
    if (signal.aborted) return abort()
    signal.addEventListener('abort', abort, { once: true })
    map.on('render', rendered)
    map.triggerRepaint()
  })
}

export async function exportImage(
  map: MapLibreMap,
  layer: ExportableMapLayer,
  view: ExportView,
  options: {
    format: 'png' | 'jpg'
    dpi: number
    scale: number
    backgroundColor?: string
    mapIds?: ReadonlySet<string>
  },
  signal: AbortSignal
): Promise<Blob> {
  const renderer = layer.renderer!
  const canvas = map.getCanvas()
  const { width, height, ratio } = imageDimensions(
    view,
    options.scale,
    options.dpi
  )
  const gl = renderer.gl
  const maxDimensions = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array
  const maxSide = Math.min(
    8192,
    gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    gl.getParameter(gl.MAX_TEXTURE_SIZE),
    ...maxDimensions
  )
  validateImageSize(width, height, maxSide)
  const originalRatio = map.getPixelRatio()
  const originalVisibility = canvas.style.visibility
  const cover = document.createElement('canvas')
  cover.className = 'export-cover'
  cover.setAttribute('aria-hidden', 'true')
  cover.width = canvas.width
  cover.height = canvas.height
  const coverContext = cover.getContext('2d')
  if (!coverContext) throw new Error('Could not prepare the image export.')
  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const context = output.getContext('2d')
  if (!context)
    throw new Error('Could not allocate the export image. Try a smaller size.')
  let changed = false
  let visibility: ReturnType<typeof modeVisibility> | undefined
  try {
    map.stop()
    await renderedFrame(map, signal, () => coverContext.drawImage(canvas, 0, 0))
    canvas.parentElement!.append(cover)
    canvas.style.visibility = 'hidden'
    changed = true
    if (options.mapIds) {
      visibility = modeVisibility(
        layer,
        renderer.warpedMapList.getMapIds({ onlyVisible: false }),
        [...options.mapIds]
      )
      // Hide unselected maps only behind the frozen cover, preserving their
      // renderer instances, order and previous visibility for cleanup.
      visibility.showOthers(false)
    }
    const maps = await loadExportImages(layer, view, signal, options.mapIds)
    const viewport = printViewport(
      { ...view, width: width / ratio, height: height / ratio },
      ratio
    )
    layer.exportViewport = viewport
    renderer.previousSignificantViewport = undefined
    // Resize only the backing buffer. The export viewport supplies its own
    // transform, so the camera, CSS size and surrounding controls stay still
    // even when exporting a different aspect ratio or the entire collage.
    canvas.width = width
    canvas.height = height
    if (
      Math.abs(canvas.width - width) > 1 ||
      Math.abs(canvas.height - height) > 1 ||
      gl.drawingBufferWidth !== canvas.width ||
      gl.drawingBufferHeight !== canvas.height
    ) {
      throw new Error(
        'This device cannot render the requested image size. Lower the DPI or increase the scale denominator.'
      )
    }
    // Tile preparation is throttled. A fresh significant viewport marks the
    // first completed preparation, so a previously idle cache cannot finish us
    // early. Use export pixels as viewport pixels to request print-detail tiles.
    while (maps.length && renderer.previousSignificantViewport !== viewport) {
      await renderedFrame(map, signal)
    }
    if (maps.length) {
      await untilEvent(
        renderer.tileCache,
        ['allrequestedtilesloaded'],
        () => renderer.tileCache.finished,
        signal
      )
    }
    // That event also fires after failed requests. Require every requested
    // detail tile to be cached, including failures left over from earlier views.
    for (const warpedMap of visibleExportMaps(layer, view, options.mapIds)) {
      if (
        warpedMap.fetchableTilesForViewport.some(
          (tile) =>
            !renderer.tileCache.getCacheableTile(tile.tileUrl)?.isCachedTile()
        )
      ) {
        throw new Error(
          'Some image tiles could not be loaded. The image was not exported; try again or use a lower DPI.'
        )
      }
    }
    await renderedFrame(map, signal, () => {
      if (options.format === 'jpg') {
        context.fillStyle = options.backgroundColor ?? '#ffffff'
        context.fillRect(0, 0, width, height)
      }
      context.drawImage(canvas, 0, 0, width, height)
    })
  } catch (error) {
    output.width = output.height = 0
    throw error
  } finally {
    if (changed) {
      layer.exportViewport = undefined
      renderer.previousSignificantViewport = undefined
      try {
        visibility?.restore()
        map.setPixelRatio(originalRatio)
        await renderedFrame(map, AbortSignal.timeout(2000))
      } finally {
        canvas.style.visibility = originalVisibility
        cover.remove()
        cover.width = cover.height = 0
      }
    }
  }
  try {
    const blob = await abortable(
      new Promise<Blob>((resolve, reject) => {
        output.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error('Image encoding failed. Try a smaller size.')),
          options.format === 'jpg' ? 'image/jpeg' : 'image/png',
          0.95
        )
      }),
      signal
    )
    return await abortable(changeDpiBlob(blob, options.dpi), signal)
  } finally {
    output.width = output.height = 0
  }
}
