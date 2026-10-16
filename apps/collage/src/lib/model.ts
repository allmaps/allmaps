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
import {
  applyMatrix,
  invertMatrix,
  matrixValues,
  multiplyMatrices,
  transformMatrix,
  decomposeTransform,
  neutralTransform,
  reflectedValues
} from './affine-transform.ts'
import type { Matrix, TransformValues } from './affine-transform.ts'
import { compactLayout } from './prism.ts'
import { CANVAS_SCALE, MAX_COLLAGE_COORDINATE } from './coordinates.ts'
import { nearestRotation } from './rotation.ts'
import {
  readCollageSettings,
  exportCollageSettings
} from './annotation-state.ts'

export type Placement = { position: Point; rotation: number }
export type Arrangement = 'compact' | 'geographic'
export type ImportTransformation = 'helmert' | 'polynomial'
export type MapImportOptions = {
  additionalInputs?: unknown[]
  groupImportedMaps?: boolean
}
export type GeographicReference = {
  resource: Point
  geo: Point
  scale: number
}
export type CollageMap = {
  instanceId: string
  // Optional editing state is stored in the annotation’s _allmaps.collage field.
  groupId?: string
  locked?: boolean
  sourceUrl?: string
  // Shared selector shape, retained across Transform sessions. Member rotation
  // lets the selector follow subsequent rigid rotations of the selection.
  selectionTransform?: {
    id: string
    values: TransformValues
    rotation: number
    mapRotation: number
  }
  affine?: {
    values: TransformValues
    imported: TransformValues
    polynomial: boolean
    reference: GeoreferencedMap
  }
  baseline: GeoreferencedMap
  localGcps: Point[]
  localMask: Point[]
  localFullMask: Point[]
  sourceCenter: Point
  mirrored: boolean
  resourceMask: Point[]
  originalResourceMask?: Point[]
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

export function label(map: GeoreferencedMap): string {
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

/** Only an actual URL import enables Viewer; IDs in pasted JSON do not. */
export function viewerUrl(
  item: CollageMap,
  baseUrl = 'https://viewer.allmaps.org'
): string | undefined {
  if (!isHttpUrl(item.sourceUrl)) return
  const url = new URL(baseUrl)
  url.searchParams.set('url', item.sourceUrl)
  return url.href
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
  geographicReference = readGeographicReference(baseline),
  restoreTransform = true
): CollageMap {
  const transform = validateMap(baseline)
  const projected = baseline.gcps.map(({ geo }) => lonLatToWebMercator(geo))
  const mask = transform.transformToProjectedGeo(baseline.resourceMask)
  const pivot = center(mask)
  const saved = readCollageSettings(baseline)
  const item: CollageMap = {
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
    title: saved.title ?? label(baseline),
    appearance: saved.appearance,
    ...(saved.groupId ? { groupId: saved.groupId } : {}),
    ...(saved.locked !== undefined ? { locked: saved.locked } : {}),
    sourceUrl: saved.sourceUrl
  }
  if (saved.originalResourceMask) {
    try {
      validateResourceMask(
        saved.originalResourceMask,
        baseline.resource.width ?? Infinity,
        baseline.resource.height ?? Infinity
      )
      item.originalResourceMask = saved.originalResourceMask
    } catch {
      /* Ignore invalid optional reset masks. */
    }
  }
  try {
    initializeMapTransform(item, restoreTransform ? saved.transform : undefined)
  } catch {
    // Optional reset metadata must never prevent opening valid map geometry.
    if (restoreTransform && saved.transform) initializeMapTransform(item)
  }
  if (restoreTransform && saved.selectionTransform)
    item.selectionTransform = saved.selectionTransform
  return item
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
function normalizeSource(
  source: GeoreferencedMap,
  importTransformation: ImportTransformation = 'helmert'
): {
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
  map.transformation =
    importTransformation === 'polynomial' && map.gcps.length >= 3
      ? { type: 'polynomial', options: { order: 1 } }
      : { type: 'helmert' }
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

export function normalizeMap(
  source: GeoreferencedMap,
  importTransformation: ImportTransformation = 'helmert'
): GeoreferencedMap {
  return normalizeSource(source, importTransformation).map
}

/** Normalize imports and seed their centers from geography before compaction. */
export function prepareMaps(
  input: unknown,
  at: Point = [0, 0],
  sourceUrl?: string,
  importTransformation: ImportTransformation = 'helmert',
  { additionalInputs = [], groupImportedMaps = true }: MapImportOptions = {}
): CollageMap[] {
  const items = [input, ...additionalInputs].flatMap((input) => {
    const sources = parseMaps(input)
    const groups = new Map<string, string>()
    const documentItems = sources.map((source) => {
      preserveSource(source, sources.length === 1 ? sourceUrl : undefined)
      const { map: baseline, geographicReference } = normalizeSource(
        source,
        importTransformation
      )
      baseline.id = 'urn:uuid:' + crypto.randomUUID()
      const item = makeItem(baseline, geographicReference, false)
      if (item.groupId) {
        if (!groups.has(item.groupId))
          groups.set(item.groupId, crypto.randomUUID())
        item.groupId = groups.get(item.groupId)
      }
      if (isHttpUrl(sourceUrl)) item.sourceUrl = sourceUrl
      return item
    })
    // Respect a saved collage's group structure; otherwise group each source
    // document independently, including when several files are dropped at once.
    if (
      groupImportedMaps &&
      documentItems.length > 1 &&
      !documentItems.some((item) => item.groupId)
    ) {
      const groupId = crypto.randomUUID()
      for (const item of documentItems) item.groupId = groupId
    }
    return documentItems
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
  sourceUrl?: string,
  importTransformation: ImportTransformation = 'helmert'
): CollageMap[] {
  const items = prepareMaps(input, at, sourceUrl, importTransformation)
  arrangeMaps(items)
  return items
}

/** Opening never normalizes, recenters, sorts, or infers intent from location. */
export function openCollage(input: unknown, sourceUrl?: string): CollageMap[] {
  return parseMaps(input).map((map) => {
    const item = makeItem(map)
    item.sourceUrl ??= isHttpUrl(sourceUrl) ? sourceUrl : undefined
    return item
  })
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
      const metadata: Record<string, unknown> = {
        ...(map._allmaps && typeof map._allmaps === 'object'
          ? map._allmaps
          : {})
      }
      delete metadata.collage
      const settings = exportCollageSettings(item, label(item.baseline))
      if (settings) metadata.collage = settings
      map._allmaps = {
        ...metadata,
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
  offset: Point,
  { editingGroup }: { editingGroup?: string } = {}
): CollageMap[] {
  const groups = new Map<string, string>()
  return items.map((item) => {
    const copy = structuredClone(item)
    if (editingGroup) copy.groupId = editingGroup
    else if (copy.groupId) {
      if (!groups.has(copy.groupId))
        groups.set(copy.groupId, crypto.randomUUID())
      copy.groupId = groups.get(copy.groupId)
    }
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
    x,
    y,
    // Resource Y points down: a normal map has a negative determinant.
    mirrored: x[0] * y[1] - x[1] * y[0] > 0,
    similarity:
      Math.abs(xx - yy) <= Math.max(xx, yy) * 1e-8 &&
      Math.abs(x[0] * y[0] + x[1] * y[1]) <= Math.max(xx, yy) * 1e-8
  }
}

/** Recover a uniform-scale reference from the affine fit, or saved editing
 * values. Only small numeric settings are serialized; the GCPs carry geometry. */
function initializeMapTransform(
  item: CollageMap,
  saved?: Pick<
    NonNullable<CollageMap['affine']>,
    'values' | 'imported' | 'polynomial'
  >
) {
  const type = transformationType(item.baseline)
  if (type !== 'polynomial1' && type !== 'helmert') return
  if (type === 'helmert' && !saved) return
  const transform = transformer(item.baseline)
  const { x, y } = transformAxes(transform, item.resourceMask)
  const values =
    saved?.values ?? decomposeTransform(x as Point, y as Point).values
  const inverse = invertMatrix(transformMatrix(values))
  const origin = center(item.resourceMask)
  const reference = structuredClone(item.baseline)
  reference.gcps = resourceBasis(item.resourceMask).map((resource) => {
    const delta = applyMatrix(inverse, [
      resource[0] - origin[0],
      resource[1] - origin[1]
    ])
    return {
      resource,
      geo: webMercatorToLonLat(
        transform.transformToProjectedGeo([
          origin[0] + delta[0],
          origin[1] + delta[1]
        ])
      )
    }
  })
  const axes = transformAxes(validateMap(reference), item.resourceMask)
  if (axes.similarity && !axes.mirrored)
    reference.transformation = { type: 'helmert' }
  // A malformed reset value cannot make valid annotation geometry unusable.
  const imported = saved?.imported ?? values
  transformMatrix(imported)
  item.affine = {
    values: { ...values },
    imported: { ...imported },
    reference,
    polynomial: saved?.polynomial ?? type === 'polynomial1'
  }
}

export function ensureMapTransform(item: CollageMap) {
  if (!['helmert', 'polynomial1'].includes(transformationType(item.baseline)))
    throw new Error(
      'Transform mode supports Helmert and first-order polynomial maps.'
    )
  if (!item.affine) {
    initializeMapTransform(item)
    item.affine ??= {
      values: { ...neutralTransform },
      imported: { ...neutralTransform },
      polynomial: false,
      reference: structuredClone(item.baseline)
    }
  }
  return item.affine
}

export function resourceWorldPoint(item: CollageMap, resource: Point): Point {
  return transformer(placedMap(item)).transformToProjectedGeo(resource)
}

/** Apply scales and sequential shears in the reference's resource axes. */
export function setMapTransform(
  item: CollageMap,
  values: TransformValues,
  anchor?: Point
) {
  const matrix = transformMatrix(values)
  const state = ensureMapTransform(item)
  const fixed = anchor ? resourceWorldPoint(item, anchor) : undefined
  const reference = structuredClone(state.reference)
  reference.resource = structuredClone(item.baseline.resource)
  reference.id = item.baseline.id
  const baseline = structuredClone(reference)
  if (
    Object.keys(neutralTransform).some(
      (key) =>
        values[key as keyof TransformValues] !==
        neutralTransform[key as keyof TransformValues]
    )
  ) {
    const transform = transformer(reference)
    const origin = center(item.resourceMask)
    baseline.gcps = resourceBasis(item.resourceMask).map((resource) => {
      const delta = applyMatrix(matrix, [
        resource[0] - origin[0],
        resource[1] - origin[1]
      ])
      return {
        resource,
        geo: webMercatorToLonLat(
          transform.transformToProjectedGeo([
            origin[0] + delta[0],
            origin[1] + delta[1]
          ])
        )
      }
    })
    baseline.transformation = { type: 'polynomial', options: { order: 1 } }
  }
  // Validate on a draft so an excessive drag cannot corrupt the active map.
  const next = structuredClone(item)
  replaceGeometry(next, baseline)
  next.affine = { ...structuredClone(state), values: { ...values } }
  if (anchor && fixed) {
    const after = resourceWorldPoint(next, anchor)
    next.placement.position = [
      next.placement.position[0] + fixed[0] - after[0],
      next.placement.position[1] + fixed[1] - after[1]
    ]
    placedMap(next)
  }
  Object.assign(item, next)
  delete item.selectionTransform
}

export function resetMapTransform(item: CollageMap, zero = false) {
  const state = ensureMapTransform(item)
  setMapTransform(item, zero ? neutralTransform : state.imported)
}

/** A 30-degree isometric plane with equal scale on both image axes. Preserve
 * the current area and handedness; orientation is the view's world X angle. */
export function makeIsometric(
  item: CollageMap,
  orientation = 0,
  alternate = false
) {
  const next = structuredClone(item)
  const state = ensureMapTransform(next)
  const scale = Math.sqrt(
    (state.values.scaleX * state.values.scaleY) / Math.sin(Math.PI / 3)
  )
  const x = Math.cos(Math.PI / 6) * scale
  const y = Math.sin(Math.PI / 6) * scale
  setMapTransform(
    next,
    matrixValues([
      [x, alternate ? -y : y],
      [alternate ? x : -x, y]
    ])
  )
  const axes = transformAxes(transformer(placedMap(next)), next.resourceMask)
  const angle = Math.atan2(axes.x[1], axes.x[0])
  const target =
    orientation +
    ((alternate ? 1 : -1) * ((next.mirrored ? 5 : 1) * Math.PI)) / 6
  next.placement = rotatePlacement(
    next.placement,
    mapCenter(next),
    nearestRotation(angle, target) - angle
  )
  placedMap(next)
  Object.assign(item, next)
}

function worldReference(item: CollageMap): Matrix {
  const axes = transformAxes(
    transformer(item.affine!.reference),
    item.resourceMask
  )
  return [
    rotate(
      axes.x as Point,
      item.placement.rotation - savedRotation(item.baseline)
    ),
    rotate(
      axes.y as Point,
      item.placement.rotation - savedRotation(item.baseline)
    )
  ]
}

/** Older collages have per-map transform values but no shared selector state.
 * Recover a common deformation only when every member agrees in world space. */
function inferSelectionTransform(items: CollageMap[]) {
  if (
    items.some((item) => item.selectionTransform) ||
    items.every(
      (item) =>
        JSON.stringify(item.affine!.values) ===
        JSON.stringify(item.affine!.imported)
    )
  )
    return
  try {
    const matrices = items.map((item) => {
      const reference = worldReference(item)
      const state = item.affine!
      return multiplyMatrices(
        multiplyMatrices(reference, transformMatrix(state.values)),
        invertMatrix(
          multiplyMatrices(reference, transformMatrix(state.imported))
        )
      )
    })
    const matrix = matrices[0]
    const tolerance = 1e-7 * Math.max(1, ...matrix.flat().map(Math.abs))
    if (
      !matrices.every((other) =>
        other.every((column, i) =>
          column.every(
            (value, j) => Math.abs(value - matrix[i][j]) <= tolerance
          )
        )
      )
    )
      return
    // Convert world Y-up into the selector's resource Y-down axes.
    const values = matrixValues([
      [matrix[0][0], -matrix[0][1]],
      [-matrix[1][0], matrix[1][1]]
    ])
    return { id: crypto.randomUUID(), values, rotation: 0 }
  } catch {
    // Unrelated individual distortions do not define a shared reset reference.
    return
  }
}

/** Only reuse a shared selector while all members still share its shape and
 * rotation. Moving/cropping members is fine; individual shape edits invalidate it. */
function sharedSelectionTransform(items: CollageMap[]) {
  const saved = items[0].selectionTransform
  if (!saved) return inferSelectionTransform(items)
  const rotation =
    saved.rotation + items[0].placement.rotation - saved.mapRotation
  if (
    items.every((item) => {
      const state = item.selectionTransform
      if (!state || state.id !== saved.id) return false
      const angle =
        state.rotation + item.placement.rotation - state.mapRotation - rotation
      return (
        Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) < 1e-8 &&
        JSON.stringify(state.values) === JSON.stringify(saved.values)
      )
    })
  )
    return { ...saved, rotation }
}

/** A virtual map is the shared selector. It never enters the renderer or export.
 * Cache each map's neutral world basis once, so a drag only composes matrices
 * and updates its existing local geometry. All maps receive the same world
 * affine transform, including their spacing and any shared sheet boundaries. */
export function createSelectionTransform(items: CollageMap[]) {
  if (!items.length || items.some((item) => item.locked))
    throw new Error('Select unlocked maps to transform.')
  const originals = structuredClone(items)
  originals.forEach(ensureMapTransform)
  if (originals.length === 1)
    return {
      frame: structuredClone(originals[0]),
      apply: (frame: CollageMap) => [structuredClone(frame)]
    }

  const shared = sharedSelectionTransform(originals)
  const values = shared?.values ?? neutralTransform
  const rotation = shared?.rotation ?? 0
  const shape = transformMatrix(values)
  const basis: Matrix = shape.map(([x, y]) =>
    rotate([x, -y], rotation)
  ) as Matrix
  const inverse = invertMatrix(basis)
  // Measure bounds in the saved selector's axes, not a new world-aligned box.
  // This preserves its deformation and reset reference without saving geometry.
  const [left, top, right, bottom] = bounds(
    originals.flatMap(outline).map((point) => applyMatrix(inverse, point))
  )
  const width = right - left,
    height = bottom - top
  const origin = applyMatrix(basis, [(left + right) / 2, (top + bottom) / 2])
  const resourceMask: Point[] = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height]
  ]
  const frame = makeItem({
    type: 'GeoreferencedMap',
    resource: {
      id: 'urn:allmaps:transform-frame',
      type: 'ImageService2',
      width,
      height
    },
    resourceMask,
    gcps: [
      {
        resource: [0, 0],
        geo: webMercatorToLonLat([
          origin[0] - width / 2,
          origin[1] + height / 2
        ])
      },
      {
        resource: [width, 0],
        geo: webMercatorToLonLat([
          origin[0] + width / 2,
          origin[1] + height / 2
        ])
      },
      {
        resource: [0, height],
        geo: webMercatorToLonLat([
          origin[0] - width / 2,
          origin[1] - height / 2
        ])
      }
    ],
    transformation: { type: 'helmert' }
  })
  ensureMapTransform(frame)
  if (shared) {
    setMapTransform(frame, values)
    frame.placement.rotation = rotation
  }
  const fittedFrame = transformer(placedMap(frame))
  const frameOrigin = fittedFrame.transformToProjectedGeo([0, 0])
  const frameAxes = transformAxes(fittedFrame, frame.resourceMask)
  const frameInverse = invertMatrix([
    frameAxes.x as Point,
    frameAxes.y as Point
  ])
  const selectionId = shared?.id ?? crypto.randomUUID()
  const cached = originals.map((item) => {
    const fitted = transformer(item.baseline)
    item.baseline.gcps = resourceBasis(item.resourceMask).map((resource) => ({
      resource,
      geo: webMercatorToLonLat(fitted.transformToProjectedGeo(resource))
    }))
    item.localGcps = localPoints(
      item.baseline,
      item.sourceCenter,
      item.baseline.gcps.map(({ geo }) => lonLatToWebMercator(geo))
    )
    const reference = worldReference(item)
    return { item, reference, inverse: invertMatrix(reference) }
  })
  return {
    frame,
    apply: (draft: CollageMap): CollageMap[] => {
      if (JSON.stringify(frame) === JSON.stringify(draft))
        return structuredClone(originals)
      const transform = transformer(placedMap(draft))
      const origin = transform.transformToProjectedGeo([0, 0])
      const axes = transformAxes(transform, draft.resourceMask)
      const matrix = multiplyMatrices(
        [axes.x as Point, axes.y as Point],
        frameInverse
      )
      const mapPoint = (point: Point): Point => {
        const delta = applyMatrix(matrix, [
          point[0] - frameOrigin[0],
          point[1] - frameOrigin[1]
        ])
        return [origin[0] + delta[0], origin[1] + delta[1]]
      }
      const rotation = draft.placement.rotation - frame.placement.rotation
      // Construct and validate the whole batch before updating any renderer.
      return cached.map(({ item, reference, inverse }) => {
        const next = structuredClone(item)
        let delta = rotation
        const rotatedMatrix = (angle: number): Matrix => [
          rotate(matrix[0], -angle),
          rotate(matrix[1], -angle)
        ]
        const relative = (angle: number) =>
          multiplyMatrices(
            multiplyMatrices(
              inverse,
              multiplyMatrices(rotatedMatrix(angle), reference)
            ),
            transformMatrix(item.affine!.values)
          )
        let residual = relative(delta)
        if (residual[0][0] <= 0) {
          // A large shear in another map's axes can cross the LU chart. Move
          // its polar rotation into placement, keeping scales positive.
          const total = relative(0)
          const { basis } = decomposeTransform(total[0], total[1])
          const sign = Math.sign(
            reference[0][0] * reference[1][1] -
              reference[0][1] * reference[1][0]
          )
          delta = sign * Math.atan2(basis[0][1], basis[0][0])
          residual = relative(delta)
        }
        next.affine!.values = matrixValues(residual)
        next.placement = {
          position: mapPoint(item.placement.position),
          rotation: item.placement.rotation + delta
        }
        const local = (point: Point) =>
          rotate(
            applyMatrix(matrix, rotate(point, item.placement.rotation)),
            -next.placement.rotation
          )
        next.localGcps = item.localGcps.map(local)
        next.localMask = item.localMask.map(local)
        next.localFullMask = item.localFullMask.map(local)
        next.baseline.gcps = item.baseline.gcps.map((gcp, i) => {
          const point = rotate(next.localGcps[i], savedRotation(item.baseline))
          return {
            resource: [...gcp.resource] as Point,
            geo: webMercatorToLonLat([
              point[0] + item.sourceCenter[0],
              point[1] + item.sourceCenter[1]
            ])
          }
        })
        // Nonuniform scales and shears require the three-point affine fit.
        // Pure movement/rotation can keep the original transformation type.
        const [x, y] = matrix
        if (
          Math.abs(x[0] ** 2 + x[1] ** 2 - y[0] ** 2 - y[1] ** 2) > 1e-8 ||
          Math.abs(x[0] * y[0] + x[1] * y[1]) > 1e-8
        )
          next.baseline.transformation = {
            type: 'polynomial',
            options: { order: 1 }
          }
        next.selectionTransform = {
          id: selectionId,
          values: { ...draft.affine!.values },
          rotation: draft.placement.rotation,
          mapRotation: next.placement.rotation
        }
        placedMap(next)
        return next
      })
    }
  }
}

/** Presets first remove the shared distortion (including sheet spacing), then
 * normalize each member. A neutral selector alone cannot reset a mixed selection.
 * Keep an explicit shared reference so subsequent presets and reopened sessions
 * do not mistake independent per-map scales for a shared scale of the layout. */
function prepareSelectionPreset(
  items: CollageMap[],
  preserveArea: boolean,
  zero = false
) {
  const session = createSelectionTransform(items)
  const frame = structuredClone(session.frame)
  if (preserveArea) {
    const { scaleX, scaleY } = frame.affine!.values
    const scale = Math.sqrt(scaleX * scaleY)
    setMapTransform(frame, {
      ...neutralTransform,
      scaleX: scale,
      scaleY: scale
    })
  } else resetMapTransform(frame)
  const result = session.apply(frame)
  const id = crypto.randomUUID()
  for (const item of result) {
    if (preserveArea) {
      const { scaleX, scaleY } = item.affine!.values
      const scale = Math.sqrt(scaleX * scaleY)
      setMapTransform(item, {
        ...neutralTransform,
        scaleX: scale,
        scaleY: scale
      })
    } else resetMapTransform(item, zero)
    if (result.length > 1)
      item.selectionTransform = {
        id,
        values: { ...frame.affine!.values },
        rotation: frame.placement.rotation,
        mapRotation: item.placement.rotation
      }
  }
  return result
}

/** Restore each map's imported (or neutral) shape, even when the selection has
 * no common transform. Existing shared transforms also restore sheet spacing. */
export function resetSelectionTransform(items: CollageMap[], zero = false) {
  return prepareSelectionPreset(items, false, zero)
}

/** Replace existing shear/unequal scales before tilting the selection as one
 * plane. Preserve each map's area, handedness and relative neutral orientation. */
export function makeSelectionIsometric(
  items: CollageMap[],
  orientation = 0,
  alternate = false
) {
  const normalized =
    items.length > 1
      ? prepareSelectionPreset(items, true)
      : structuredClone(items)
  const session = createSelectionTransform(normalized)
  const frame = structuredClone(session.frame)
  makeIsometric(frame, orientation, alternate)
  return session.apply(frame)
}

/** Reflect an image axis, preserving its crop and visible center. Helmert cannot
 * encode a reflection, so mirrored similarities use three affine GCPs. The
 * determinant carries mirror state through ordinary annotations, no metadata. */
export function mirrorMap(
  item: CollageMap,
  direction: 'horizontal' | 'vertical' = 'horizontal'
) {
  // Reflection needs polynomial GCPs, but does not make a Helmert import an
  // originally distorted map with a separate neutral-reset action.
  if (transformationType(item.baseline) === 'helmert') ensureMapTransform(item)
  const mask = item.appearance.applyMask
    ? item.resourceMask
    : fullResourceMask(item.baseline)
  const affine = item.affine
  replaceGeometry(item, mirrorBaseline(item.baseline, mask, direction))
  if (affine)
    item.affine = {
      ...affine,
      reference: mirrorBaseline(affine.reference, mask, direction),
      values: reflectedValues(affine.values),
      imported: reflectedValues(affine.imported)
    }
  delete item.selectionTransform
}

function mirrorBaseline(
  source: GeoreferencedMap,
  mask: Point[],
  direction: 'horizontal' | 'vertical'
) {
  const samples = resourceBasis(mask)
  const axis = direction === 'horizontal' ? 0 : 1
  const origin = samples[0][axis]
  const original = transformer(source)
  const helmert = transformationType(source) === 'helmert'
  const gcps = helmert
    ? samples.map((resource) => ({
        resource,
        geo: webMercatorToLonLat(original.transformToProjectedGeo(resource))
      }))
    : source.gcps
  const baseline: GeoreferencedMap = {
    ...structuredClone(source),
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
  const transform = validateMap(baseline)
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
  }
  return baseline
}

/** Rebuild local geometry without moving the currently visible map center. */
function replaceGeometry(item: CollageMap, baseline: GeoreferencedMap) {
  const beforeCenter = mapCenter(item)
  const transform = validateMap(baseline)
  const next = {
    ...item,
    baseline,
    mirrored: transformAxes(transform, item.resourceMask).mirrored,
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
