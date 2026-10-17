import type { Point, SizeObject } from '@allmaps/types'
import type { CollageMap } from './model.ts'
import { renderedMap, transformationType } from './model.ts'
import { projectedToScreen } from './export-view.ts'
import { CANVAS_SCALE } from './coordinates.ts'
import type { ExportView } from './export-view.ts'

export const pdfPageSizes = {
  A0: [841, 1189],
  A1: [594, 841],
  A2: [420, 594],
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
  Tabloid: [279.4, 431.8]
} as const
export type PdfPageSize = keyof typeof pdfPageSizes | 'custom'
export type PdfLayout = {
  page: SizeObject
  offset: [number, number]
  view: ExportView
  scale: number
}
const pointsPerMm = 72 / 25.4

/** Page and content dimensions are PDF points. Scale is ground distance / paper
 * distance; DPI only affects embedded pixels, never the printed geometry. */
export function pdfLayout(
  view: ExportView,
  size: SizeObject,
  margin = 10,
  scale?: number
): PdfLayout {
  if (
    ![size.width, size.height].every(
      (n) => Number.isFinite(n) && n >= 10 && n <= 5000
    )
  )
    throw new Error('Choose page dimensions between 10 and 5,000 mm.')
  if (!Number.isFinite(margin) || margin < 0 || margin >= 50)
    throw new Error('Choose a margin from 0 to less than 50%.')
  if (
    ![view.width, view.height, view.metersPerPixel].every(
      (n) => Number.isFinite(n) && n > 0
    )
  )
    throw new Error('The export area is empty or invalid.')
  const page = {
    width: size.width * pointsPerMm,
    height: size.height * pointsPerMm
  }
  const padding = (Math.min(page.width, page.height) * margin) / 100
  const available = {
    width: page.width - 2 * padding,
    height: page.height - 2 * padding
  }
  const fit = Math.min(
    available.width / view.width,
    available.height / view.height
  )
  if (scale !== undefined && (!Number.isFinite(scale) || scale <= 0))
    throw new Error('Enter a map scale greater than zero.')
  const ratio =
    scale === undefined ? fit : (view.metersPerPixel * 72) / (0.0254 * scale)
  if (ratio > fit * (1 + 1e-9))
    throw new Error(
      'The collage does not fit at this scale. Increase the denominator, choose a larger page, or use Fit to page.'
    )
  const width = view.width * ratio
  const height = view.height * ratio
  return {
    page,
    offset: [(page.width - width) / 2, (page.height - height) / 2],
    view: {
      ...view,
      width,
      height,
      metersPerPixel: view.metersPerPixel / ratio
    },
    scale: (view.metersPerPixel * 72) / (0.0254 * ratio)
  }
}

/** Affine maps keep their complete source image, even with color effects. */
export function pdfMapNeedsRaster(item: CollageMap): boolean {
  return !['helmert', 'polynomial1'].includes(
    transformationType(renderedMap(item))
  )
}

/** Crop an individual rendering to its visible footprint, on the page's pixel
 * grid. Keep one pixel of padding for antialiasing and the same ground scale. */
export function pdfRasterFrame(
  view: ExportView,
  projectedMask: Point[],
  dpi: number,
  clipToPage = true
): { view: ExportView; offset: Point } | undefined {
  validatePdfDpi(dpi)
  if (!projectedMask.length) return undefined
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity
  for (const point of projectedMask) {
    const [x, y] = projectedToScreen(point, view)
    left = Math.min(left, x)
    top = Math.min(top, y)
    right = Math.max(right, x)
    bottom = Math.max(bottom, y)
  }
  if (![left, top, right, bottom].every(Number.isFinite))
    throw new Error('This map has invalid export coordinates.')
  if (
    clipToPage &&
    (right <= 0 || bottom <= 0 || left >= view.width || top >= view.height)
  )
    return undefined
  const ratio = dpi / 72
  left =
    Math.max(clipToPage ? 0 : -Infinity, Math.floor(left * ratio) - 1) / ratio
  top =
    Math.max(clipToPage ? 0 : -Infinity, Math.floor(top * ratio) - 1) / ratio
  right =
    Math.min(
      clipToPage ? Math.ceil(view.width * ratio) : Infinity,
      Math.ceil(right * ratio) + 1
    ) / ratio
  bottom =
    Math.min(
      clipToPage ? Math.ceil(view.height * ratio) : Infinity,
      Math.ceil(bottom * ratio) + 1
    ) / ratio
  const x = (left + right - view.width) / 2
  const y = (top + bottom - view.height) / 2
  const angle = (view.bearing * Math.PI) / 180
  const units = view.metersPerPixel * CANVAS_SCALE
  return {
    offset: [left, top],
    view: {
      ...view,
      width: right - left,
      height: bottom - top,
      center: [
        view.center[0] + (x * Math.cos(angle) - y * Math.sin(angle)) * units,
        view.center[1] - (x * Math.sin(angle) + y * Math.cos(angle)) * units
      ]
    }
  }
}

export function validatePdfDpi(dpi: number) {
  if (!Number.isInteger(dpi) || dpi < 1 || dpi > 2400)
    throw new Error('Choose a DPI between 1 and 2,400.')
}

/** The largest singular value covers skewed image directions too. Request only
 * the detail needed at the chosen print scale, bounded per source image. */
export function pdfImageMaximum(
  matrix: number[],
  image: SizeObject,
  dpi: number
) {
  validatePdfDpi(dpi)
  const [a, b, c, d] = matrix
  const x = a * a + b * b
  const y = c * c + d * d
  const dot = a * c + b * d
  const stretch = Math.sqrt((x + y + Math.hypot(x - y, 2 * dot)) / 2)
  const dimension = Math.min(
    8192,
    Math.max(
      1,
      Math.ceil((Math.max(image.width, image.height) * stretch * dpi) / 72)
    )
  )
  return { width: dimension, height: dimension }
}
