import { ProjectedGcpTransformer } from '@allmaps/project'
import { lonLatToWebMercator, webMercatorToLonLat } from '@allmaps/project'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { GeocoderGeoJsonFeature } from '@allmaps/ui/geocoder'
import type { Point, GeojsonPolygon } from '@allmaps/types'
import { checkImage } from './random-maps.ts'
import {
  normalizeMap,
  parseMaps,
  validateResourceMask,
  fullResourceMask
} from './model.ts'

export type Area = { geometry: GeojsonPolygon }
export type SearchPlace = {
  id: string
  label: string
  query: string
  feature: GeocoderGeoJsonFeature
}
export type SearchResult = {
  id: string
  map: GeoreferencedMap
  original: GeoreferencedMap
}
export type SearchResults = {
  maps: SearchResult[]
  sources: GeoreferencedMap[]
  skipped: number
  excluded: number
  limited: boolean
}
type Network = { signal: AbortSignal; fetchFn?: typeof fetch }

/** Keep useful precision for small buffers while still allowing a 50 km range. */
export function bufferFromRange(value: number) {
  return Math.round((10 * 5000 ** (value / 100)) / 10) * 10
}

export function bufferToRange(meters: number) {
  return (Math.log(meters / 10) / Math.log(5000)) * 100
}

/** The selection uses each result's current mask choice. */
export function selectionMaps(
  results: SearchResult[],
  selected: string[],
  originalMasks: string[]
): GeoreferencedMap[] {
  const chosen = new Set(selected)
  const originals = new Set(originalMasks)
  return results.flatMap((result) => {
    if (!chosen.has(result.id)) return []
    return [originals.has(result.id) ? result.original : result.map]
  })
}

/** Autocomplete already supplies a point. Ignore bounds and never fetch geometry. */
export function resolvePlace(
  feature: GeocoderGeoJsonFeature,
  query: string
): SearchPlace {
  return {
    id: feature.properties.id,
    label: feature.properties.data.label,
    query,
    feature: { geometry: feature.geometry, properties: feature.properties }
  }
}

export function searchArea(place: SearchPlace, meters: number): Area {
  if (!Number.isFinite(meters) || meters < 10 || meters > 50000)
    throw new Error('Choose a buffer between 10 and 50,000 metres.')
  const [longitude, latitude] = place.feature.geometry.coordinates
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    Math.abs(longitude) > 180 ||
    Math.abs(latitude) >= 85
  )
    throw new Error('Choose coordinates away from the poles and date line.')
  const center = lonLatToWebMercator([longitude, latitude])
  // A circle in the rendering projection, measured in ground metres at its
  // center. Helmert preserves its shape when imported at null island.
  const radius = meters / Math.cos((latitude * Math.PI) / 180)
  const ring = Array.from({ length: 128 }, (_, i) => {
    const angle = (i / 128) * 2 * Math.PI
    return webMercatorToLonLat([
      center[0] + radius * Math.cos(angle),
      center[1] + radius * Math.sin(angle)
    ])
  })
  const area: Area = {
    geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] }
  }
  areaBounds(area) // Reject unsupported wrapping/polar searches before querying.
  return area
}

export function areaBounds(area: Area): [number, number, number, number] {
  const points = area.geometry.coordinates[0]
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1])
  const bounds: [number, number, number, number] = [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys)
  ]
  if (
    !bounds.every(Number.isFinite) ||
    bounds[2] - bounds[0] > 180 ||
    bounds[0] < -180 ||
    bounds[2] > 180 ||
    bounds[1] < -85 ||
    bounds[3] > 85
  )
    throw new Error(
      'Choose a smaller search area away from the poles and date line.'
    )
  return bounds
}

export function mapsSearchUrl(
  area: Area,
  base = 'https://annotations.allmaps.org'
) {
  const [w, s, e, n] = areaBounds(area)
  return (
    `${base.replace(/\/$/, '')}/maps?` +
    new URLSearchParams({
      intersects: [s, w, n, e].join(','),
      limit: '100'
    })
  )
}

export type ImageTransform = {
  toResource: (point: Point) => Point
  toGeo: (point: Point) => Point
  scale: number
}
const transforms = new WeakMap<GeoreferencedMap, ImageTransform>()

export function imageTransform(source: GeoreferencedMap) {
  const cached = transforms.get(source)
  if (cached) return cached
  normalizeMap(source) // Reject unsupported resources/GCPs before inverse work.
  const transform = new ProjectedGcpTransformer(source.gcps, 'helmert')
  // Invert the fitted forward matrix, not a separately fitted reverse transform:
  // residuals in original GCPs otherwise make the two fits disagree.
  const origin = transform.transformToProjectedGeo([0, 0])
  const x = transform.transformToProjectedGeo([1, 0])
  const y = transform.transformToProjectedGeo([0, 1])
  const a = x[0] - origin[0],
    b = y[0] - origin[0]
  const c = x[1] - origin[1],
    d = y[1] - origin[1]
  const determinant = a * d - b * c
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-16)
    throw new Error('This map has no invertible geographic transform.')
  const toResource = (point: Point): Point => {
    const projected = lonLatToWebMercator(point as Point)
    const dx = projected[0] - origin[0],
      dy = projected[1] - origin[1]
    return [(d * dx - b * dy) / determinant, (a * dy - c * dx) / determinant]
  }
  const fitted: ImageTransform = {
    toResource,
    toGeo: ([x, y]) =>
      webMercatorToLonLat([
        origin[0] + a * x + b * y,
        origin[1] + c * x + d * y
      ]),
    scale: Math.hypot(a, c)
  }
  transforms.set(source, fitted)
  return fitted
}

/** Replace the original mask with the whole circle. Never intersect or clamp
 * the ring: a source that cannot fill it is not a circular search result. */
export function cropMap(
  source: GeoreferencedMap,
  area: Area
): GeoreferencedMap | undefined {
  const { toResource } = imageTransform(source)
  const resourceMask = area.geometry.coordinates[0]
    .slice(0, -1)
    .map((point) => toResource(point as Point))
  const { width, height } = source.resource
  if (
    resourceMask.some(([x, y]) => x < 0 || y < 0 || x > width! || y > height!)
  )
    return
  validateResourceMask(resourceMask, width!, height!)
  return { ...source, resourceMask }
}

const sourceId = (source: GeoreferencedMap) =>
  source.id ?? JSON.stringify([source.resource.id, source.gcps])

/** Reuse checked images and fitted inverses while the radius slider is moving. */
export function resizeResults(
  results: SearchResults,
  area: Area
): SearchResults {
  const next: SearchResults = { ...results, maps: [], excluded: 0 }
  for (const original of results.sources) {
    const map = cropMap(original, area)
    if (map) next.maps.push({ id: sourceId(original), map, original })
    else next.excluded++
  }
  return next
}

/** Bound both the database response and concurrent IIIF metadata checks. No
 * sample pixels are fetched: actual tiles are requested only by the renderer. */
export async function findMaps(
  area: Area,
  {
    signal,
    fetchFn = fetch,
    base,
    onprogress
  }: Network & {
    base?: string
    onprogress?: (results: SearchResults) => void
  }
): Promise<SearchResults> {
  const response = await fetchFn(mapsSearchUrl(area, base), {
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)])
  })
  if (!response.ok)
    throw new Error(`Map search failed (HTTP ${response.status}).`)
  const sources = parseMaps(await response.json())
  const results: SearchResults = {
    maps: [],
    sources: [],
    skipped: 0,
    excluded: 0,
    limited: sources.length >= 100
  }
  const seen = new Set<string>()
  const services = new Map<string, ReturnType<typeof checkImage>>()
  let next = 0
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < sources.length && !signal.aborted) {
        const source = sources[next++]
        const id = sourceId(source)
        if (seen.has(id)) continue
        seen.add(id)
        try {
          let service = services.get(source.resource.id)
          if (!service) {
            service = checkImage(
              source,
              fetchFn,
              (blob) => createImageBitmap(blob),
              AbortSignal.any([signal, AbortSignal.timeout(10000)])
            ).catch(() => undefined)
            services.set(source.resource.id, service)
          }
          const size = await service
          signal.throwIfAborted()
          if (!size) {
            results.skipped++
            continue
          }
          const original = {
            ...source,
            resource: { ...source.resource, ...size }
          }
          const map = cropMap(original, area)
          results.sources.push(original)
          if (map) results.maps.push({ id, map, original })
          else results.excluded++
        } catch {
          signal.throwIfAborted()
          results.skipped++
        }
        if (!signal.aborted)
          onprogress?.({
            ...results,
            maps: [...results.maps],
            sources: [...results.sources]
          })
      }
    })
  )
  signal.throwIfAborted()
  return results
}

export type ImportMask = 'circle' | 'original' | 'full'

/** Import style never changes the circular search preview. */
export function importSearchMap(
  cropped: GeoreferencedMap,
  original: GeoreferencedMap,
  mask: ImportMask
): GeoreferencedMap {
  if (mask === 'original') return structuredClone(original)
  if (mask === 'full')
    return {
      ...structuredClone(original),
      resourceMask: fullResourceMask(original)
    }
  return structuredClone(cropped)
}
