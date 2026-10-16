import { lonLatToWebMercator } from '@allmaps/project'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Point } from '@allmaps/types'
import { CANVAS_SCALE } from './coordinates.ts'

export type ExportView = {
  width: number
  height: number
  center: Point
  metersPerPixel: number
  bearing: number
}

/** Expand a frame without cropping. Points use the projected canvas coordinates.
 * Margin is a percentage of the shorter side, added on each edge. */
export function frameExportView(
  view: ExportView,
  points?: Point[],
  margin = 0,
  aspect?: number
): ExportView {
  if (!Number.isFinite(margin) || margin < 0 || margin > 100)
    throw new Error('Choose a margin between 0 and 100%.')
  if (aspect !== undefined && (!Number.isFinite(aspect) || aspect <= 0))
    throw new Error('Enter a width and height greater than zero.')
  let left = 0,
    top = 0,
    right = view.width,
    bottom = view.height
  if (points) {
    if (!points.length)
      throw new Error('Add maps before exporting the entire collage.')
    left = top = Infinity
    right = bottom = -Infinity
    for (const point of points) {
      const [x, y] = projectedToScreen(point, view)
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  }
  let width = right - left
  let height = bottom - top
  if (!Number.isFinite(width + height) || width <= 0 || height <= 0)
    throw new Error('The export area is empty or invalid.')
  const padding = (Math.min(width, height) * margin) / 100
  width += padding * 2
  height += padding * 2
  if (aspect !== undefined) {
    width = Math.max(width, height * aspect)
    height = Math.max(height, width / aspect)
  }
  const x = (left + right - view.width) / 2
  const y = (top + bottom - view.height) / 2
  const angle = (view.bearing * Math.PI) / 180
  const units = view.metersPerPixel * CANVAS_SCALE
  // Keep virtual dimensions within the display size; print dimensions are
  // calculated separately from ground extent, scale and DPI.
  const fit = Math.min(view.width / width, view.height / height)
  return {
    ...view,
    center: [
      view.center[0] + (x * Math.cos(angle) - y * Math.sin(angle)) * units,
      view.center[1] - (x * Math.sin(angle) + y * Math.cos(angle)) * units
    ],
    width: width * fit,
    height: height * fit,
    metersPerPixel: view.metersPerPixel / fit
  }
}

export function exportView(map: MapLibreMap): ExportView {
  const canvas = map.getCanvas()
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const project = (x: number): Point => {
    const p = map.unproject([x, height / 2])
    return lonLatToWebMercator([p.lng, p.lat])
  }
  const a = project(0)
  const b = project(width)
  const center = map.getCenter()
  return {
    width,
    height,
    center: lonLatToWebMercator([center.lng, center.lat]),
    metersPerPixel: Math.hypot(b[0] - a[0], b[1] - a[1]) / width / CANVAS_SCALE,
    bearing: map.getBearing()
  }
}

export function imageDimensions(view: ExportView, scale: number, dpi: number) {
  if (!Number.isFinite(scale) || scale <= 0)
    throw new Error('Enter a map scale greater than zero.')
  if (!Number.isInteger(dpi) || dpi < 1 || dpi > 2400)
    throw new Error('Choose a DPI between 1 and 2,400.')
  const ratio = (view.metersPerPixel * dpi) / (0.0254 * scale)
  const width = Math.round(view.width * ratio)
  const height = Math.round(view.height * ratio)
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new Error('This scale produces an empty or excessively large image.')
  }
  return { width, height, ratio }
}

export function validateImageSize(
  width: number,
  height: number,
  maxSide = 8192
) {
  // Bound peak WebGL + encoding memory, especially on tablets. Never silently
  // reduce resolution: that would make the printed scale incorrect.
  if (width > maxSide || height > maxSide || width * height > 32_000_000) {
    throw new Error(
      `Image too large. Increase the scale denominator or lower the DPI (maximum ${maxSide.toLocaleString()} px per side and 32 megapixels).`
    )
  }
}

export function defaultExportScale(view: ExportView): number {
  const scale = (view.metersPerPixel * 96) / 0.0254
  const step = 10 ** Math.floor(Math.log10(scale))
  return Math.max(1, Math.round(scale / step) * step)
}

/** Project to SVG coordinates without converting through geographic latitude. */
export function projectedToScreen(point: Point, view: ExportView): Point {
  const x = (point[0] - view.center[0]) / (view.metersPerPixel * CANVAS_SCALE)
  const y = -(point[1] - view.center[1]) / (view.metersPerPixel * CANVAS_SCALE)
  const angle = (-view.bearing * Math.PI) / 180
  return [
    view.width / 2 + x * Math.cos(angle) - y * Math.sin(angle),
    view.height / 2 + x * Math.sin(angle) + y * Math.cos(angle)
  ]
}
