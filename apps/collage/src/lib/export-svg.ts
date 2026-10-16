import type { Image } from '@allmaps/iiif-parser'
import type { Point, SizeObject, ImageRequest } from '@allmaps/types'
import { renderedMap, transformer, transformationType } from './model.ts'
import type { CollageMap } from './model.ts'
import { hueColor } from './control-layout.ts'
import { projectedToScreen } from './export-view.ts'
import type { ExportView } from './export-view.ts'

export const DEFAULT_SVG_SIZE = { width: 2048, height: 2048 }

export function validateSvgSize(size: SizeObject) {
  if (
    ![size.width, size.height].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 8192
    )
  )
    throw new Error('Choose maximum image dimensions between 1 and 8,192 px.')
}

export function svgImageSize(
  image: Image,
  maximum = DEFAULT_SVG_SIZE
): SizeObject {
  validateSvgSize(maximum)
  const ratio = Math.min(
    1,
    maximum.width / image.width,
    maximum.height / image.height,
    (image.maxWidth ?? Infinity) / image.width,
    (image.maxHeight ?? Infinity) / image.height,
    Math.sqrt(
      Math.min(image.maxArea ?? Infinity, 32_000_000) /
        (image.width * image.height)
    )
  )
  const width = Math.max(1, Math.floor(image.width * ratio))
  const height = Math.max(1, Math.round((width * image.height) / image.width))
  if (height > maximum.height || height > (image.maxHeight ?? Infinity))
    throw new Error(
      'These dimensions are too small for this image’s proportions.'
    )
  return { width, height }
}

export function svgImageRequest(
  image: Image,
  maximum = DEFAULT_SVG_SIZE
): ImageRequest {
  const size = svgImageSize(image, maximum)
  if (image.supportsAnyRegionAndSize) return { size }
  // Fixed renditions must fit the user's limits. The parser's thumbnail helper
  // may choose a declared size up to 1.5 times the requested width.
  const available = image.sizes
    ?.filter(
      (candidate) =>
        candidate.width <= size.width && candidate.height <= size.height
    )
    .sort((a, b) => b.width - a.width)[0]
  if (!available)
    throw new Error(
      'This image service does not offer a full-image link for SVG. Use Image export instead.'
    )
  return { size: available }
}

export function linkedImageUrl(
  image: Image,
  maximum = DEFAULT_SVG_SIZE
): string {
  const request = svgImageRequest(image, maximum)
  const url = image.getImageUrl(request, { preferredFormats: ['jpg', 'png'] })
  if (!['https:', 'http:'].includes(new URL(url).protocol))
    throw new Error('SVG requires an HTTP image service.')
  return url
}

const escapeXml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      })[c]!
  )
const number = (n: number) => {
  if (!Number.isFinite(n))
    throw new Error('The map has invalid SVG coordinates.')
  return String(Number(n.toPrecision(12)))
}

export function svgMatrix(item: CollageMap, view: ExportView): number[] {
  const map = renderedMap(item)
  if (!['helmert', 'polynomial1'].includes(transformationType(map))) {
    throw new Error(
      'SVG supports Helmert and first-order polynomial maps. Use Image export for this transformation.'
    )
  }
  const convert = transformer(map)
  const screen = (point: Point) =>
    projectedToScreen(convert.transformToProjectedGeo(point), view)
  const width = map.resource.width!
  const height = map.resource.height!
  const p = screen([0, 0])
  const x = screen([width, 0])
  const y = screen([0, height])
  return [
    (x[0] - p[0]) / width,
    (x[1] - p[1]) / width,
    (y[0] - p[0]) / height,
    (y[1] - p[1]) / height,
    ...p
  ]
}

export function validateSvgItems(items: CollageMap[], view: ExportView) {
  for (const item of items) {
    svgMatrix(item, view)
    if (item.appearance.removeBackground && item.appearance.backgroundColor)
      throw new Error(
        'SVG cannot preserve automatic background removal. Turn it off or use Image export.'
      )
  }
}

/** Native SVG geometry, following the approach in @allmaps/svg-warping. */
export function exportSvg(
  items: CollageMap[],
  images: Map<string, Image>,
  view: ExportView,
  options: { maximum?: SizeObject; sources?: Map<string, string> } = {}
): string {
  validateSvgItems(items, view)
  const defs: string[] = []
  const sourceIds = new Map<string, string>()
  const groups = items.map((item, i) => {
    const image = images.get(item.instanceId)
    if (!image) throw new Error('An image service could not be loaded.')
    const source =
      options.sources?.get(item.instanceId) ??
      linkedImageUrl(image, options.maximum)
    if (!/^(https?:|data:image\/(png|jpeg);base64,)/.test(source))
      throw new Error('The SVG image source is invalid.')
    const url = escapeXml(source)
    const matrix = svgMatrix(item, view).map(number).join(' ')
    const { applyMask, opacity, saturation, colorize, hue } = item.appearance
    if (applyMask)
      defs.push(
        `<clipPath id="mask-${i}" clipPathUnits="userSpaceOnUse"><polygon points="${item.resourceMask.map((point) => point.map(number).join(',')).join(' ')}"/></clipPath>`
      )
    const effects: string[] = []
    if (saturation !== 1) {
      const weights = [0.21, 0.71, 0.07]
      const values = weights.flatMap((_, row) => [
        ...weights.map(
          (weight, column) =>
            weight * (1 - saturation) + (row === column ? saturation : 0)
        ),
        0,
        0
      ])
      effects.push(
        `<feColorMatrix type="matrix" values="${[...values, 0, 0, 0, 1, 0].map(number).join(' ')}"/>`
      )
    }
    if (colorize) {
      const color = hueColor(hue)
      effects.push(
        `<feComponentTransfer>${['R', 'G', 'B'].map((c, index) => `<feFunc${c} type="linear" slope="1" intercept="${number(parseInt(color.slice(1 + index * 2, 3 + index * 2), 16) / 255)}"/>`).join('')}</feComponentTransfer>`
      )
    }
    if (effects.length)
      defs.push(
        `<filter id="color-${i}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">${effects.join('')}</filter>`
      )
    // Define each source once: duplicated maps share the same embedded pixels.
    let sourceId = sourceIds.get(source)
    if (!sourceId) {
      sourceId = `image-${sourceIds.size}`
      sourceIds.set(source, sourceId)
      defs.push(
        `<image id="${sourceId}" width="1" height="1" preserveAspectRatio="none" xlink:href="${url}"/>`
      )
    }
    return `<g transform="matrix(${matrix})" opacity="${number(opacity)}"><title>${escapeXml(item.title)}</title><g${applyMask ? ` clip-path="url(#mask-${i})"` : ''}${effects.length ? ` filter="url(#color-${i})"` : ''}><use xlink:href="#${sourceId}" transform="scale(${number(item.baseline.resource.width!)} ${number(item.baseline.resource.height!)})"/></g></g>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${view.width}" height="${view.height}" viewBox="0 0 ${view.width} ${view.height}"><title>Allmaps Collage</title><defs>${defs.join('')}</defs>${groups.join('')}</svg>\n`
}
