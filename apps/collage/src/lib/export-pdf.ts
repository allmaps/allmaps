import PDFDocument from 'pdfkit'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { CollageMap } from './model.ts'
import { viewerUrl, originalAnnotationUrl } from './model.ts'
import type { Point } from '@allmaps/types'
import { projectedToScreen } from './export-view.ts'
import { exportAppearance } from './export-effects.ts'
import type { ExportEffects } from './export-effects.ts'
import { pdfImageEffects } from './export-pdf-image.ts'
import type { ExportableMapLayer } from './export-layer.ts'
import type { ExportView } from './export-view.ts'
import { exportImage, loadExportImages } from './export-image.ts'
import { embeddedSvgSources } from './export-svg-images.ts'
import { svgMatrix } from './export-svg.ts'
import { MapExportError } from './export-errors.ts'
import {
  pdfMapNeedsRaster,
  pdfRasterFrame,
  pdfImageMaximum,
  validatePdfDpi
} from './pdf-layout.ts'
import type { PdfLayout } from './pdf-layout.ts'

/** Collect PDFKit's browser stream without a Node stream polyfill. This module
 * is lazy-loaded only when a PDF is requested. No fonts are needed. */
export async function writePdf(
  layout: PdfLayout,
  background: string,
  draw: (doc: PDFKit.PDFDocument) => Promise<void> | void,
  signal: AbortSignal
): Promise<Blob> {
  signal.throwIfAborted()
  if (!/^#[0-9a-f]{6}$/i.test(background))
    throw new Error('Choose a valid background color.')
  const doc = new PDFDocument({
    size: [layout.page.width, layout.page.height],
    margin: 0,
    // PDFKit 0.20 supports font:null; @types still describes the 0.17 API.
    // @ts-expect-error Skip the default Helvetica font in this image-only PDF.
    font: null,
    pdfVersion: '1.4',
    info: { Title: 'Allmaps Collage', Creator: 'Allmaps Collage' }
  })
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let bytes = 0
  let fail: (reason: unknown) => void = () => {}
  let complete: (blob: Blob) => void = () => {}
  const abort = () => fail(signal.reason)
  const data = (chunk: Uint8Array) => {
    bytes += chunk.byteLength
    if (bytes > 150_000_000) {
      fail(new Error('The PDF exceeds 150 MB. Choose a lower DPI.'))
      return
    }
    chunks.push(new Uint8Array(chunk))
  }
  const end = () => complete(new Blob(chunks, { type: 'application/pdf' }))
  const output = new Promise<Blob>((resolve, reject) => {
    fail = reject
    complete = resolve
    doc.on('data', data)
    doc.on('end', end)
    doc.on('error', fail)
    signal.addEventListener('abort', abort, { once: true })
  })
  // Drawing can await image downloads before we await the completed stream.
  void output.catch(() => {})
  try {
    doc.rect(0, 0, layout.page.width, layout.page.height).fill(background)
    doc.save().translate(...layout.offset)
    doc.rect(0, 0, layout.view.width, layout.view.height).clip()
    await draw(doc)
    signal.throwIfAborted()
    doc.restore().end()
    return await output
  } finally {
    signal.removeEventListener('abort', abort)
    doc.off('data', data)
    doc.off('end', end)
    doc.off('error', fail)
    chunks.length = 0
  }
}

export function drawPdfMap(
  doc: PDFKit.PDFDocument,
  item: CollageMap,
  view: ExportView,
  source: string,
  effects?: ExportEffects
) {
  const appearance = exportAppearance(item, effects)
  const matrix = svgMatrix(item, view)
  doc.save()
  doc.transform(
    matrix[0],
    matrix[1],
    matrix[2],
    matrix[3],
    matrix[4],
    matrix[5]
  )
  if (appearance.applyMask) {
    const [first, ...rest] = item.resourceMask
    doc.moveTo(...first)
    for (const point of rest) doc.lineTo(...point)
    doc.closePath().clip()
  }
  doc.opacity(appearance.opacity)
  doc.image(source, 0, 0, {
    width: item.baseline.resource.width!,
    height: item.baseline.resource.height!
  })
  doc.restore()
}

/** Link rectangles are clipped to the exported page frame and follow stack order. */
export function drawPdfMapLink(
  doc: PDFKit.PDFDocument,
  item: CollageMap,
  view: ExportView,
  projectedMask: Point[]
) {
  const url =
    viewerUrl(item) ??
    viewerUrl({ ...item, sourceUrl: originalAnnotationUrl(item.baseline) })
  if (!url || !projectedMask.length) return
  const points = projectedMask.map((p) => projectedToScreen(p, view))
  const left = Math.max(0, Math.min(...points.map((p) => p[0])))
  const top = Math.max(0, Math.min(...points.map((p) => p[1])))
  const right = Math.min(view.width, Math.max(...points.map((p) => p[0])))
  const bottom = Math.min(view.height, Math.max(...points.map((p) => p[1])))
  if (right <= left || bottom <= top) return
  doc.link(left, top, right - left, bottom - top, url, {
    // PDF literal strings must be wrapped; primitive strings encode PDF names.
    Contents: new String(
      `${item.title || 'Map'} — Open in Allmaps Viewer`
    ) as unknown as string
  })
}

export async function exportPdf(
  map: MapLibreMap,
  layer: ExportableMapLayer,
  items: CollageMap[],
  layout: PdfLayout,
  options: { dpi: number; background: string; effects?: ExportEffects },
  signal: AbortSignal,
  sourceCache?: Map<string, string>
) {
  validatePdfDpi(options.dpi)
  const mapIds = new Set(items.map((item) => item.instanceId))
  const maps = await loadExportImages(layer, layout.view, signal, mapIds)
  const images = new Map(maps.map((map) => [map.mapId, map.image]))
  const warpedMaps = new Map(maps.map((map) => [map.mapId, map]))
  const targets = items.filter((item) => images.has(item.instanceId))
  if (!targets.length) throw new Error('No maps remain in the export area.')
  // Duplicates share one source at the highest detail any copy needs.
  const maximums = new Map<string, number>()
  const nativeTargets = targets.filter((item) => !pdfMapNeedsRaster(item))
  const nativeIds = new Set(nativeTargets.map((item) => item.instanceId))
  for (const item of nativeTargets) {
    const image = images.get(item.instanceId)!
    const maximum = pdfImageMaximum(
      svgMatrix(item, layout.view),
      image,
      options.dpi
    )
    maximums.set(
      image.uri,
      Math.max(maximums.get(image.uri) ?? 0, maximum.width)
    )
  }
  return writePdf(
    layout,
    options.background,
    async (doc) => {
      const sources = new Map<string, string>()
      const effectSources = new Map<string, string>()
      const embedded = new Set<string>()
      let bytes = 0
      for (const item of targets) {
        signal.throwIfAborted()
        const appearance = exportAppearance(item, options.effects)
        const warpedMap = warpedMaps.get(item.instanceId)!
        // Snapshot the applied mask before temporarily rendering a full image.
        const projectedMask = warpedMap.projectedGeoAppliedMask
        if (pdfMapNeedsRaster(item)) {
          const frame = pdfRasterFrame(
            layout.view,
            warpedMap.projectedGeoFullMask,
            options.dpi,
            false
          )
          if (!frame) continue
          let pixels: ArrayBuffer
          try {
            // Non-affine maps need warped pixels, but retain a vector mask
            // and native opacity around the full, unmasked rendering.
            const image = await exportImage(
              map,
              layer,
              frame.view,
              {
                dpi: options.dpi,
                scale: layout.scale,
                format: 'png',
                mapIds: new Set([item.instanceId]),
                renderOptions: {
                  opacity: 1,
                  applyMask: false,
                  saturation: appearance.saturation,
                  colorize: appearance.colorize,
                  removeColor:
                    appearance.removeBackground && !!appearance.backgroundColor
                }
              },
              signal
            )
            pixels = await image.arrayBuffer()
          } catch (cause) {
            signal.throwIfAborted()
            if (cause instanceof MapExportError) throw cause
            throw new MapExportError([item.instanceId], cause, false)
          }
          bytes += pixels.byteLength
          if (bytes > 100_000_000)
            throw new Error(
              'Embedded images exceed 100 MB. Choose a lower DPI.'
            )
          try {
            doc.save()
            if (appearance.applyMask) {
              const [first, ...rest] = projectedMask.map((p) =>
                projectedToScreen(p, layout.view)
              )
              doc.moveTo(...first)
              for (const point of rest) doc.lineTo(...point)
              doc.closePath().clip()
            }
            doc.opacity(appearance.opacity)
            doc.image(pixels, ...frame.offset, {
              width: frame.view.width,
              height: frame.view.height
            })
            doc.restore()
          } catch (cause) {
            throw new MapExportError([item.instanceId], cause, false)
          }
          drawPdfMapLink(doc, item, layout.view, projectedMask)
          continue
        }
        const image = images.get(item.instanceId)!
        let source = sources.get(image.uri)
        if (!source) {
          const dimension = maximums.get(image.uri)!
          const copies = new Map(
            [...images].filter(
              ([id, copy]) => nativeIds.has(id) && copy.uri === image.uri
            )
          )
          const embedded = await embeddedSvgSources(
            layer,
            copies,
            { width: dimension, height: dimension },
            signal,
            sourceCache
          )
          source = embedded.get(item.instanceId)!
          sources.set(image.uri, source)
        }
        const effectKey = JSON.stringify([
          image.uri,
          appearance.saturation,
          appearance.colorize,
          appearance.hue,
          appearance.removeBackground,
          appearance.backgroundColor
        ])
        let pixels = effectSources.get(effectKey)
        if (!pixels) {
          try {
            pixels = await pdfImageEffects(source, appearance, signal)
          } catch (cause) {
            signal.throwIfAborted()
            throw new MapExportError(
              [item.instanceId],
              new Error(
                'Could not apply color effects to this image. Disable the effects or reduce the DPI.',
                { cause }
              ),
              false
            )
          }
          effectSources.set(effectKey, pixels)
        }
        if (!embedded.has(pixels)) {
          embedded.add(pixels)
          bytes += pixels.length
          if (bytes > 100_000_000)
            throw new Error(
              'Embedded images exceed 100 MB. Choose a lower DPI.'
            )
        }
        try {
          drawPdfMap(doc, item, layout.view, pixels, options.effects)
          drawPdfMapLink(doc, item, layout.view, projectedMask)
        } catch (cause) {
          signal.throwIfAborted()
          throw new MapExportError(
            [item.instanceId],
            new Error(
              'PDFKit could not embed this image. Try Image export instead.',
              { cause }
            )
          )
        }
        // Let the browser paint progress and respond to cancellation between maps.
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    },
    signal
  )
}
