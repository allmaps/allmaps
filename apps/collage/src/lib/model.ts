import { generateAnnotation, parseAnnotation } from '@allmaps/annotation'
import {
  ProjectedGcpTransformer,
  isEqualProjection,
  lonLatToWebMercator,
  webMercatorProjection,
  webMercatorToLonLat
} from '@allmaps/project'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { TransformationType } from '@allmaps/transform'
import type { Point } from '@allmaps/types'
import { bounds, packBoxes } from './geometry.ts'

export type Placement = { position: Point; rotation: number }
export type CollageMap = {
  instanceId: string
  baseline: GeoreferencedMap
  localGcps: Point[]
  localMask: Point[]
  localFullMask: Point[]
  sourceCenter: Point
  resourceMask: Point[]
  placement: Placement
  resetRotation: number
  title: string
  appearance: {
    applyMask: boolean
    opacity: number
    saturation: number
    colorize: boolean
    hue: number
    removeBackground: boolean
    backgroundColor?: string
  }
}

const MAX_LATITUDE = 85
const MAX_COORDINATE = 20000000

export function rotate(point: Point, angle: number): Point {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [cos * point[0] - sin * point[1], sin * point[0] + cos * point[1]]
}

export function place(point: Point, placement: Placement): Point {
  const rotated = rotate(point, placement.rotation)
  return [
    rotated[0] + placement.position[0],
    rotated[1] + placement.position[1]
  ]
}

export function rotatePlacement(
  start: Placement,
  pivot: Point,
  angle: number
): Placement {
  const offset = rotate(
    [start.position[0] - pivot[0], start.position[1] - pivot[1]],
    angle
  )
  return {
    position: [pivot[0] + offset[0], pivot[1] + offset[1]],
    rotation: start.rotation + angle
  }
}

export function center(points: Point[]): Point {
  if (!points.length || points.some((p) => !p.every(Number.isFinite))) {
    throw new Error('The annotation does not produce a valid map outline.')
  }
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2
  ]
}

function transformationType(map: GeoreferencedMap): TransformationType {
  const type = map.transformation?.type ?? 'polynomial'
  if (type === 'straight') {
    throw new Error(
      'Straight transformations cannot encode rotation. Use a Helmert or polynomial annotation for this prototype.'
    )
  }
  if (type === 'polynomial') {
    const order = map.transformation?.options?.order ?? 1
    if (order !== 1) {
      throw new Error(
        'Higher-order polynomial annotations need renderer support before they can be moved faithfully.'
      )
    }
    return ('polynomial' + order) as TransformationType
  }
  return type
}

export function transformer(map: GeoreferencedMap) {
  return new ProjectedGcpTransformer(map.gcps, transformationType(map))
}

function validateMap(map: GeoreferencedMap) {
  if (map.resource.type === 'Canvas') {
    throw new Error(
      'Use an annotation targeting a IIIF image service for this prototype.'
    )
  }
  if (
    map.resourceCrs &&
    (typeof map.resourceCrs.definition !== 'string' ||
      !isEqualProjection(
        { definition: map.resourceCrs.definition },
        webMercatorProjection
      ))
  ) {
    throw new Error(
      'This prototype supports Web Mercator annotations. Custom resource projections need a separate normalization step.'
    )
  }
  if (
    map.gcps.some(
      ({ geo, resource }) =>
        ![...geo, ...resource].every(Number.isFinite) ||
        Math.abs(geo[1]) > MAX_LATITUDE
    )
  ) {
    throw new Error(
      'Ground control points must be finite and between 85°S and 85°N.'
    )
  }
  // Solving and evaluating now catches underdetermined/invalid transformations
  // before replacing a document or handing its maps to the renderer.
  center(transformer(map).transformToProjectedGeo(map.resourceMask))
}

function label(map: GeoreferencedMap): string {
  const parts = [...(map.resource.partOf ?? [])]
  while (parts.length) {
    const part = parts.shift()!
    if (part.label) {
      const values = part.label.en ?? Object.values(part.label)[0]
      const text = values?.map(String).join(' ').trim()
      if (text && text !== '-' && !/^\d+$/.test(text)) return text
    }
    parts.push(...(part.partOf ?? []))
  }
  return 'Untitled map'
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

export function originalAnnotationUrl(
  map: GeoreferencedMap
): string | undefined {
  const metadata = map._allmaps
  if (!metadata || typeof metadata !== 'object') return
  if ('version' in metadata && isHttpUrl(metadata.version))
    return metadata.version
  if ('id' in metadata && isHttpUrl(metadata.id)) return metadata.id
}

function preserveSource(map: GeoreferencedMap, sourceUrl?: string) {
  if (originalAnnotationUrl(map)) return
  const url = isHttpUrl(map.id) ? map.id : sourceUrl
  if (!isHttpUrl(url)) return
  // Reuse the existing provenance convention; no Collage-specific metadata.
  map._allmaps = {
    ...(map._allmaps && typeof map._allmaps === 'object' ? map._allmaps : {}),
    id: url
  }
}

function makeItem(baseline: GeoreferencedMap): CollageMap {
  validateMap(baseline)
  const projected = baseline.gcps.map(({ geo }) => lonLatToWebMercator(geo))
  const mask = transformer(baseline).transformToProjectedGeo(
    baseline.resourceMask
  )
  const pivot = center(mask)
  return {
    instanceId: 'urn:uuid:' + crypto.randomUUID(),
    baseline,
    localGcps: projected.map((p) => [p[0] - pivot[0], p[1] - pivot[1]]),
    localMask: mask.map((p) => [p[0] - pivot[0], p[1] - pivot[1]]),
    localFullMask: transformer(baseline)
      .transformToProjectedGeo(
        baseline.resource.width && baseline.resource.height
          ? fullResourceMask(baseline)
          : baseline.resourceMask
      )
      .map((p) => [p[0] - pivot[0], p[1] - pivot[1]]),
    sourceCenter: pivot,
    resourceMask: structuredClone(baseline.resourceMask),
    placement: { position: pivot, rotation: 0 },
    resetRotation: 0,
    title: label(baseline),
    appearance: {
      applyMask: true,
      opacity: 1,
      saturation: 1,
      colorize: false,
      hue: 0,
      removeBackground: false
    }
  }
}

export function parseMaps(input: unknown): GeoreferencedMap[] {
  return parseAnnotation(input).map((map) => structuredClone(map))
}

/**
 * Normalize once at the source mask's center, in spherical ground meters.
 * This keeps the original Web Mercator warp up to a uniform similarity.
 * Subsequent translation/rotation never recomputes this latitude correction.
 */
export function normalizeMap(source: GeoreferencedMap): GeoreferencedMap {
  const map = structuredClone(source)
  if (!map.gcps.length)
    throw new Error('The annotation has no ground control points.')
  // Keep a dateline-crossing sheet continuous before fitting the transformation.
  const longitude = map.gcps[0].geo[0]
  map.gcps = map.gcps.map((gcp) => ({
    resource: gcp.resource,
    geo: [
      longitude + ((((gcp.geo[0] - longitude + 180) % 360) + 360) % 360) - 180,
      gcp.geo[1]
    ]
  }))
  validateMap(map)
  const pivot = center(
    transformer(map).transformToProjectedGeo(map.resourceMask)
  )
  const latitude = webMercatorToLonLat(pivot)[1]
  const scale = Math.cos((latitude * Math.PI) / 180)
  map.gcps = map.gcps.map(({ resource, geo }) => {
    const projected = lonLatToWebMercator(geo)
    return {
      resource,
      geo: webMercatorToLonLat([
        (projected[0] - pivot[0]) * scale,
        (projected[1] - pivot[1]) * scale
      ])
    }
  })
  return map
}

export function addMaps(
  input: unknown,
  at: Point = [0, 0],
  sourceUrl?: string,
  aspect = 1
): CollageMap[] {
  const sources = parseMaps(input)
  const items = sources.map((source) => {
    preserveSource(source, sources.length === 1 ? sourceUrl : undefined)
    const baseline = normalizeMap(source)
    baseline.id = 'urn:uuid:' + crypto.randomUUID()
    return makeItem(baseline)
  })
  arrangeMaps(items, at, aspect)
  return items
}

/** Opening never normalizes, recenters, sorts, or infers intent from location. */
export function openCollage(input: unknown): CollageMap[] {
  return parseMaps(input).map(makeItem)
}

export function placedMap(item: CollageMap): GeoreferencedMap {
  const gcps = item.baseline.gcps.map((gcp, i) => {
    const point = place(item.localGcps[i], item.placement)
    if (
      point.some(
        (value) => !Number.isFinite(value) || Math.abs(value) > MAX_COORDINATE
      )
    ) {
      throw new Error('Keep the collage within the MapLibre world extent.')
    }
    return {
      resource: [...gcp.resource] as Point,
      geo: webMercatorToLonLat(point)
    }
  })
  return {
    ...structuredClone(item.baseline),
    resourceMask: structuredClone(item.resourceMask),
    gcps
  }
}

export function exportCollage(items: CollageMap[]) {
  // Array order is the layer order, from back to front.
  const annotation = generateAnnotation(items.map(placedMap))
  if (annotation.type !== 'AnnotationPage')
    throw new Error('Expected an AnnotationPage.')
  return annotation
}

export function duplicateMaps(
  items: CollageMap[],
  offset: Point
): CollageMap[] {
  return items.map((item) => {
    const copy = structuredClone(item)
    copy.instanceId = 'urn:uuid:' + crypto.randomUUID()
    copy.baseline.id = 'urn:uuid:' + crypto.randomUUID()
    copy.placement.position = [
      copy.placement.position[0] + offset[0],
      copy.placement.position[1] + offset[1]
    ]
    // Validate the entire batch before adding anything to the renderer.
    placedMap(copy)
    return copy
  })
}

export function outline(item: CollageMap): Point[] {
  return (item.appearance.applyMask ? item.localMask : item.localFullMask).map(
    (p) => place(p, item.placement)
  )
}

/** Follow the current crop, while keeping its center rigid during rotation. */
export function mapCenter(item: CollageMap): Point {
  return place(
    center(item.appearance.applyMask ? item.localMask : item.localFullMask),
    item.placement
  )
}

export function contains(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside
  }
  return inside
}

/**
 * Fit only an angle between matching GCPs. Do not overwrite the loaded
 * collage's scale, shape, position, mask, or resource metadata.
 */
export function resetRotationFromOriginal(
  item: CollageMap,
  original: GeoreferencedMap
): number {
  if (item.baseline.resource.id !== original.resource.id) {
    throw new Error('The original annotation describes a different image.')
  }
  const normalized = normalizeMap(original)
  const byResource = new Map(
    normalized.gcps.map((gcp) => [
      gcp.resource.join(','),
      lonLatToWebMercator(gcp.geo)
    ])
  )
  const pairs = item.baseline.gcps.flatMap((gcp, i) => {
    const source = byResource.get(gcp.resource.join(','))
    return source ? [{ source, target: item.localGcps[i] }] : []
  })
  if (pairs.length < 2)
    throw new Error('The original annotation has no matching control points.')
  const mean = (points: Point[]): Point => [
    points.reduce((sum, p) => sum + p[0], 0) / points.length,
    points.reduce((sum, p) => sum + p[1], 0) / points.length
  ]
  const a = mean(pairs.map((p) => p.source))
  const b = mean(pairs.map((p) => p.target))
  let dot = 0
  let cross = 0
  for (const { source, target } of pairs) {
    const x = source[0] - a[0]
    const y = source[1] - a[1]
    const u = target[0] - b[0]
    const v = target[1] - b[1]
    dot += x * u + y * v
    cross += x * v - y * u
  }
  if (Math.hypot(dot, cross) < 1e-10)
    throw new Error('The original orientation is ambiguous.')
  return -Math.atan2(cross, dot)
}

export function fullResourceMask(map: GeoreferencedMap): Point[] {
  const { width, height } = map.resource
  if (!width || !height)
    throw new Error('The image needs dimensions to edit its mask.')
  return [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height]
  ]
}

export function resolveImageSize(
  item: CollageMap,
  width: number,
  height: number
) {
  item.baseline = {
    ...item.baseline,
    resource: { ...item.baseline.resource, width, height }
  }
  item.localFullMask = transformer(item.baseline)
    .transformToProjectedGeo(fullResourceMask(item.baseline))
    .map((p) => [p[0] - item.sourceCenter[0], p[1] - item.sourceCenter[1]])
}

/** Only selected placements change. Rotated/edited masks need their own bbox
 * offsets; the placement pivot is deliberately never redefined by a mask edit. */
export function arrangeMaps(items: CollageMap[], at: Point, aspect = 1) {
  const rectangles = items.map((item) => bounds(outline(item)))
  const positions = packBoxes(
    rectangles.map(([left, bottom, right, top]) => [
      right - left,
      top - bottom
    ]),
    aspect
  )
  items.forEach((item, i) => {
    const [left, bottom, right, top] = rectangles[i]
    item.placement = {
      ...item.placement,
      position: [
        item.placement.position[0] +
          at[0] +
          positions[i][0] -
          (left + right) / 2,
        item.placement.position[1] +
          at[1] +
          positions[i][1] -
          (bottom + top) / 2
      ]
    }
  })
}

export function setResourceMask(item: CollageMap, mask: Point[]) {
  validateResourceMask(
    mask,
    item.baseline.resource.width!,
    item.baseline.resource.height!
  )
  const localMask = transformer(item.baseline)
    .transformToProjectedGeo(mask)
    .map((p): Point => [
      p[0] - item.sourceCenter[0],
      p[1] - item.sourceCenter[1]
    ])
  center(localMask)
  item.resourceMask = structuredClone(mask)
  item.localMask = localMask
}

export function validateResourceMask(
  mask: Point[],
  width: number,
  height: number
) {
  if (
    mask.length < 3 ||
    mask.some(
      ([x, y]) =>
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 ||
        y < 0 ||
        x > width ||
        y > height
    )
  )
    throw new Error('Keep at least three mask points inside the image.')
  const cross = (a: Point, b: Point, c: Point) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const onSegment = (a: Point, b: Point, p: Point) =>
    Math.abs(cross(a, b, p)) < 1e-8 &&
    p[0] >= Math.min(a[0], b[0]) &&
    p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) &&
    p[1] <= Math.max(a[1], b[1])
  let area = 0
  for (let i = 0; i < mask.length; i++) {
    const a = mask[i],
      b = mask[(i + 1) % mask.length]
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6)
      throw new Error('Mask points must be distinct.')
    area += a[0] * b[1] - b[0] * a[1]
    for (let j = i + 2; j < mask.length; j++) {
      if (i === 0 && j === mask.length - 1) continue
      const c = mask[j],
        d = mask[(j + 1) % mask.length]
      if (
        (cross(a, b, c) * cross(a, b, d) < 0 &&
          cross(c, d, a) * cross(c, d, b) < 0) ||
        onSegment(a, b, c) ||
        onSegment(a, b, d) ||
        onSegment(c, d, a) ||
        onSegment(c, d, b)
      )
        throw new Error('The mask cannot cross itself.')
    }
  }
  if (Math.abs(area) < 1e-6) throw new Error('The mask must cover an area.')
}
