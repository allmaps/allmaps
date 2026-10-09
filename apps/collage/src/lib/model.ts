import { generateAnnotation, parseAnnotation } from '@allmaps/annotation'
import { computeGeoreferencedMapBearing } from '@allmaps/bearing'
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
import { bounds } from './geometry.ts'
import { compactLayout } from './prism.ts'
import { CANVAS_SCALE, MAX_COLLAGE_COORDINATE } from './coordinates.ts'
import { nearestRotation } from './rotation.ts'

export type Placement = { position: Point; rotation: number }
export type Arrangement = 'compact' | 'geographic'
export type GeographicReference = {
  resource: Point
  geo: Point
  scale: number
}
export type CollageMap = {
  instanceId: string
  baseline: GeoreferencedMap
  localGcps: Point[]
  localMask: Point[]
  localFullMask: Point[]
  sourceCenter: Point
  mirrored: boolean
  resourceMask: Point[]
  placement: Placement
  geographicReference?: GeographicReference
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

const MAX_LATITUDE = webMercatorToLonLat([0, MAX_COLLAGE_COORDINATE])[1]

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

export function transformationType(map: GeoreferencedMap): TransformationType {
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
      'Ground control points must be finite and within the supported Mercator range.'
    )
  }
  // Solving and evaluating now catches underdetermined/invalid transformations
  // before replacing a document or handing its maps to the renderer.
  const transform = transformer(map)
  center(transform.transformToProjectedGeo(map.resourceMask))
  return transform
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
  // Keep provenance independent of the saved rotation.
  map._allmaps = {
    ...(map._allmaps && typeof map._allmaps === 'object' ? map._allmaps : {}),
    id: url
  }
}

/** Rotation is stored in counterclockwise degrees; old files start at zero. */
function savedRotation(map: GeoreferencedMap): number {
  const metadata = map._allmaps
  if (!metadata || typeof metadata !== 'object' || !('rotation' in metadata))
    return 0
  return typeof metadata.rotation === 'number' &&
    Number.isFinite(metadata.rotation)
    ? (metadata.rotation / 180) * Math.PI
    : 0
}

function localPoints(
  baseline: GeoreferencedMap,
  sourceCenter: Point,
  points: Point[]
): Point[] {
  const rotation = savedRotation(baseline)
  // Exported GCPs already contain the rotation. Factor it out of local geometry
  // before restoring placement.rotation, including masks edited after loading.
  return points.map((point) =>
    rotate([point[0] - sourceCenter[0], point[1] - sourceCenter[1]], -rotation)
  )
}

function readGeographicReference(
  map: GeoreferencedMap
): GeographicReference | undefined {
  const metadata = map._allmaps
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    !('geographicReference' in metadata)
  )
    return
  const reference = metadata.geographicReference
  if (!reference || typeof reference !== 'object') return
  const isPoint = (value: unknown): value is Point =>
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (coordinate) =>
        typeof coordinate === 'number' && Number.isFinite(coordinate)
    )
  if (
    'geo' in reference &&
    isPoint(reference.geo) &&
    Math.abs(reference.geo[1]) <= MAX_LATITUDE &&
    'resource' in reference &&
    isPoint(reference.resource) &&
    'scale' in reference &&
    typeof reference.scale === 'number' &&
    Number.isFinite(reference.scale) &&
    reference.scale > 0
  )
    return {
      geo: [...reference.geo],
      resource: [...reference.resource],
      scale: reference.scale
    }
}

function makeItem(
  baseline: GeoreferencedMap,
  geographicReference = readGeographicReference(baseline)
): CollageMap {
  const transform = validateMap(baseline)
  const projected = baseline.gcps.map(({ geo }) => lonLatToWebMercator(geo))
  const mask = transform.transformToProjectedGeo(baseline.resourceMask)
  const pivot = center(mask)
  return {
    instanceId: 'urn:uuid:' + crypto.randomUUID(),
    baseline,
    localGcps: localPoints(baseline, pivot, projected),
    localMask: localPoints(baseline, pivot, mask),
    localFullMask: localPoints(
      baseline,
      pivot,
      transform.transformToProjectedGeo(
        baseline.resource.width && baseline.resource.height
          ? fullResourceMask(baseline)
          : baseline.resourceMask
      )
    ),
    sourceCenter: pivot,
    mirrored: transformAxes(transform, baseline.resourceMask).mirrored,
    resourceMask: structuredClone(baseline.resourceMask),
    placement: { position: pivot, rotation: savedRotation(baseline) },
    geographicReference,
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
 * Fit Helmert once, then encode it with three non-collinear GCPs so mirroring
 * can also use an affine transformation without losing the fitted scale.
 * Subsequent translation/rotation never recomputes this latitude correction.
 */
function normalizeSource(source: GeoreferencedMap): {
  map: GeoreferencedMap
  geographicReference: GeographicReference
} {
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
  // Fit every original GCP before reducing to retain the whole map's scale.
  map.transformation = { type: 'helmert' }
  const transform = validateMap(map)
  const pivot = center(transform.transformToProjectedGeo(map.resourceMask))
  const latitude = webMercatorToLonLat(pivot)[1]
  const scale = Math.cos((latitude * Math.PI) / 180)
  // Tie the original geography to a stable image point, so mask edits and
  // export/reopen can change the placement pivot without losing the reference.
  const resource = center(map.resourceMask)
  const reference = readGeographicReference(source) ?? {
    resource,
    geo: webMercatorToLonLat(transform.transformToProjectedGeo(resource)),
    scale: 1
  }
  const [left, top, right, bottom] = bounds(map.resourceMask)
  const radius = Math.min(right - left, bottom - top) / 2
  if (!Number.isFinite(radius) || radius <= 0)
    throw new Error('The annotation does not produce a valid map outline.')
  const samples = resourceBasis(map.resourceMask)
  map.gcps = samples.map((resource) => {
    const projected = transform.transformToProjectedGeo(resource)
    return {
      resource,
      geo: webMercatorToLonLat([
        (projected[0] - pivot[0]) * scale,
        (projected[1] - pivot[1]) * scale
      ])
    }
  })
  return {
    map,
    geographicReference: { ...reference, scale: reference.scale * scale }
  }
}

export function normalizeMap(source: GeoreferencedMap): GeoreferencedMap {
  return normalizeSource(source).map
}

/** Normalize imports and seed their centers from geography before compaction. */
export function prepareMaps(
  input: unknown,
  at: Point = [0, 0],
  sourceUrl?: string
): CollageMap[] {
  const sources = parseMaps(input)
  const items = sources.map((source) => {
    preserveSource(source, sources.length === 1 ? sourceUrl : undefined)
    const { map: baseline, geographicReference } = normalizeSource(source)
    baseline.id = 'urn:uuid:' + crypto.randomUUID()
    return makeItem(baseline, geographicReference)
  })
  if (items.length) {
    items[0].placement.position = [...at]
    const placements = geographicPlacements(items, items[0], true)
    items.forEach((item, i) => {
      item.placement = placements[i]
    })
  }
  return items
}

export function addMaps(
  input: unknown,
  at: Point = [0, 0],
  sourceUrl?: string
): CollageMap[] {
  const items = prepareMaps(input, at, sourceUrl)
  arrangeMaps(items)
  return items
}

/** Opening never normalizes, recenters, sorts, or infers intent from location. */
export function openCollage(input: unknown): CollageMap[] {
  return parseMaps(input).map((map) => makeItem(map))
}

export function placedMap(item: CollageMap): GeoreferencedMap {
  return mapAtPlacement(item, 1)
}

/** Use the same drawing scale for every map; annotation export stays in meters. */
export function renderedMap(item: CollageMap): GeoreferencedMap {
  return mapAtPlacement(item, CANVAS_SCALE)
}

function mapAtPlacement(item: CollageMap, scale: number): GeoreferencedMap {
  const gcps = item.baseline.gcps.map((gcp, i) => {
    const point = place(item.localGcps[i], item.placement)
    if (
      point.some(
        (value) =>
          !Number.isFinite(value) || Math.abs(value) > MAX_COLLAGE_COORDINATE
      )
    ) {
      throw new Error('This placement exceeds the supported Mercator range.')
    }
    return {
      resource: [...gcp.resource] as Point,
      geo: webMercatorToLonLat([point[0] * scale, point[1] * scale] as Point)
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
  const annotation = generateAnnotation(
    items.map((item) => {
      const map = placedMap(item)
      map._allmaps = {
        ...(map._allmaps && typeof map._allmaps === 'object'
          ? map._allmaps
          : {}),
        rotation: (item.placement.rotation / Math.PI) * 180,
        ...(item.geographicReference
          ? { geographicReference: structuredClone(item.geographicReference) }
          : {})
      }
      return map
    })
  )
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

function resourceBasis(mask: Point[]): Point[] {
  const [, , right, bottom] = bounds(mask)
  const origin = center(mask)
  return [origin, [right, origin[1]], [origin[0], bottom]]
}

function transformAxes(transform: ProjectedGcpTransformer, mask: Point[]) {
  const samples = resourceBasis(mask)
  const [origin, right, bottom] = transform.transformToProjectedGeo(samples)
  const x = [
    (right[0] - origin[0]) / (samples[1][0] - samples[0][0]),
    (right[1] - origin[1]) / (samples[1][0] - samples[0][0])
  ]
  const y = [
    (bottom[0] - origin[0]) / (samples[2][1] - samples[0][1]),
    (bottom[1] - origin[1]) / (samples[2][1] - samples[0][1])
  ]
  const xx = x[0] ** 2 + x[1] ** 2
  const yy = y[0] ** 2 + y[1] ** 2
  return {
    // Resource Y points down: a normal map has a negative determinant.
    mirrored: x[0] * y[1] - x[1] * y[0] > 0,
    similarity:
      Math.abs(xx - yy) <= Math.max(xx, yy) * 1e-8 &&
      Math.abs(x[0] * y[0] + x[1] * y[1]) <= Math.max(xx, yy) * 1e-8
  }
}

/** Reflect an image axis, preserving its crop and visible center. Helmert cannot
 * encode a reflection, so mirrored similarities use three affine GCPs. The
 * determinant carries mirror state through ordinary annotations, no metadata. */
export function mirrorMap(
  item: CollageMap,
  direction: 'horizontal' | 'vertical' = 'horizontal'
) {
  const beforeCenter = mapCenter(item)
  const mask = item.appearance.applyMask
    ? item.resourceMask
    : fullResourceMask(item.baseline)
  const samples = resourceBasis(mask)
  const axis = direction === 'horizontal' ? 0 : 1
  const origin = samples[0][axis]
  const original = transformer(item.baseline)
  const helmert = transformationType(item.baseline) === 'helmert'
  const gcps = helmert
    ? samples.map((resource) => ({
        resource,
        geo: webMercatorToLonLat(original.transformToProjectedGeo(resource))
      }))
    : item.baseline.gcps
  const baseline: GeoreferencedMap = {
    ...structuredClone(item.baseline),
    gcps: gcps.map(({ resource, geo }) => ({
      resource: resource.map((value, i) =>
        i === axis ? 2 * origin - value : value
      ) as Point,
      geo: [...geo]
    })),
    ...(helmert
      ? { transformation: { type: 'polynomial', options: { order: 1 } } }
      : {})
  }
  let transform = validateMap(baseline)
  const axes = transformAxes(transform, mask)
  // Mirroring a similarity back restores its Helmert representation.
  if (
    transformationType(baseline) === 'polynomial1' &&
    !axes.mirrored &&
    axes.similarity
  ) {
    baseline.gcps = samples.map((resource) => ({
      resource,
      geo: webMercatorToLonLat(transform.transformToProjectedGeo(resource))
    }))
    baseline.transformation = { type: 'helmert' }
    transform = validateMap(baseline)
  }
  const next = {
    ...item,
    baseline,
    mirrored: axes.mirrored,
    localGcps: localPoints(
      baseline,
      item.sourceCenter,
      baseline.gcps.map(({ geo }) => lonLatToWebMercator(geo))
    ),
    localMask: localPoints(
      baseline,
      item.sourceCenter,
      transform.transformToProjectedGeo(item.resourceMask)
    ),
    localFullMask: localPoints(
      baseline,
      item.sourceCenter,
      transform.transformToProjectedGeo(
        baseline.resource.width && baseline.resource.height
          ? fullResourceMask(baseline)
          : item.resourceMask
      )
    )
  }
  const afterCenter = mapCenter(next)
  next.placement = {
    ...item.placement,
    position: [
      item.placement.position[0] + beforeCenter[0] - afterCenter[0],
      item.placement.position[1] + beforeCenter[1] - afterCenter[1]
    ]
  }
  placedMap(next)
  Object.assign(item, next)
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
  item.localFullMask = localPoints(
    item.baseline,
    item.sourceCenter,
    transformer(item.baseline).transformToProjectedGeo(
      fullResourceMask(item.baseline)
    )
  )
}

/** Only selected placements change. Rotated/edited masks need their own bbox
 * offsets; the placement pivot is deliberately never redefined by a mask edit. */
export function arrangeMaps(items: CollageMap[], anchor = items[0]): boolean {
  if (!items.length) return false
  if (!items.includes(anchor))
    throw new Error('The fixed map must be in the selection.')
  const ordered = [anchor, ...items.filter((item) => item !== anchor)]
  const rectangles = ordered.map((item) => bounds(outline(item)))
  const { positions, fallback } = compactLayout(
    rectangles.map(([left, bottom, right, top]) => ({
      x: (left + right) / 2,
      y: (bottom + top) / 2,
      w: right - left,
      h: top - bottom
    }))
  )
  const placements = ordered.map((item, i): Placement => {
    const [left, bottom, right, top] = rectangles[i]
    if (item === anchor) return item.placement
    return {
      ...item.placement,
      position: [
        item.placement.position[0] + positions[i][0] - (left + right) / 2,
        item.placement.position[1] + positions[i][1] - (bottom + top) / 2
      ]
    }
  })
  ordered.forEach((item, i) => placedMap({ ...item, placement: placements[i] }))
  ordered.forEach((item, i) => {
    item.placement = placements[i]
  })
  return fallback
}

/** Keep the anchor fixed, matching the others' original geographic offsets and
 * relative orientation. Each map retains its own normalized ground scale. */
export function arrangeGeographically(items: CollageMap[], anchor = items[0]) {
  if (!anchor || items.length < 2) return
  const placements = geographicPlacements(items, anchor)
  items.forEach((item, i) => placedMap({ ...item, placement: placements[i] }))
  items.forEach((item, i) => {
    item.placement = placements[i]
  })
}

function geographicPlacements(
  items: CollageMap[],
  anchor: CollageMap,
  preserveRotations = false
): Placement[] {
  if (!items.includes(anchor))
    throw new Error('The fixed map must be in the selection.')
  if (items.some((item) => !item.geographicReference))
    throw new Error(
      'Original geography is unavailable. Add the original annotations to use geographic arrangement.'
    )
  const localReference = (item: CollageMap) =>
    localPoints(item.baseline, item.sourceCenter, [
      transformer(item.baseline).transformToProjectedGeo(
        item.geographicReference!.resource
      )
    ])[0]
  const reference = anchor.geographicReference!
  const origin = lonLatToWebMercator(reference.geo)
  const fixed = place(localReference(anchor), anchor.placement)
  const rotation = anchor.placement.rotation
  return items.map((item): Placement => {
    if (item === anchor) return item.placement
    const geo = item.geographicReference!.geo
    // Nearby maps on opposite sides of the antimeridian must stay nearby.
    const longitude =
      reference.geo[0] +
      ((((geo[0] - reference.geo[0] + 180) % 360) + 360) % 360) -
      180
    const projected = lonLatToWebMercator([longitude, geo[1]])
    const offset = rotate(
      [
        (projected[0] - origin[0]) * reference.scale,
        (projected[1] - origin[1]) * reference.scale
      ],
      rotation
    )
    const mapRotation = preserveRotations ? item.placement.rotation : rotation
    const local = rotate(localReference(item), mapRotation)
    return {
      rotation: mapRotation,
      position: [
        fixed[0] + offset[0] - local[0],
        fixed[1] + offset[1] - local[1]
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
  const localMask = localPoints(
    item.baseline,
    item.sourceCenter,
    transformer(item.baseline).transformToProjectedGeo(mask)
  )
  center(localMask)
  item.resourceMask = structuredClone(mask)
  item.localMask = localMask
}

/** Absolute placement rotation that makes the image upright. Baseline GCPs
 * include a saved rotation, which local geometry has factored out. Compute
 * this once per gesture, never by rebuilding a transformer on every frame. */
export function bearingRotation(item: CollageMap): number {
  const bearing = computeGeoreferencedMapBearing(
    { ...item.baseline, resourceMask: item.resourceMask },
    {
      transformationType: transformationType(item.baseline),
      applyMask: item.appearance.applyMask,
      // Reflections reverse the horizontal axis. Align image-up instead of
      // averaging opposing axes, whose angular mean would be ambiguous.
      ...(item.mirrored ? { orientation: 'vertical' as const } : {})
    }
  )
  return savedRotation(item.baseline) + (bearing * Math.PI) / 180
}

/** Align each image around its current visible center. Validate the complete
 * selection before applying anything so the action can be one undo step. */
export function alignBearings(items: CollageMap[]) {
  const placements = items.map((item) =>
    rotatePlacement(
      item.placement,
      mapCenter(item),
      nearestRotation(item.placement.rotation, bearingRotation(item)) -
        item.placement.rotation
    )
  )
  items.forEach((item, i) => placedMap({ ...item, placement: placements[i] }))
  items.forEach((item, i) => {
    item.placement = placements[i]
  })
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
