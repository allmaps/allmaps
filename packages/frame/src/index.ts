import * as turf from '@turf/helpers'
import turfArea from '@turf/area'
import turfCentroid from '@turf/centroid'
import turfIntersect from '@turf/intersect'
import polylabel from 'polylabel'

import { combineBboxes, computeBbox, doBboxesIntersect } from '@allmaps/stdlib'

import type { Bbox, Polygon, Size } from '@allmaps/types'

type Point = {
  lon: number
  lat: number
}

type FrameMetrics = {
  fill: number
  rawFill: number
  coverage: number
}

type Cluster = {
  indices: number[]
  bbox: Bbox
  totalArea: number
}

type ScoringContext = {
  features: ReturnType<typeof polygonsToFeatures>
  bboxes: Bbox[]
  totalArea: number
  targetCoverage: number
  minFill: number
}

type Candidate = {
  bbox: Bbox
  score: number
  context: ScoringContext
}

type ApproximateCandidate = {
  bbox: Bbox
  score: number
}

const ZOOM_MIN = -6
const ZOOM_MAX = 1.5
const ZOOM_SAMPLES = 28
const SIMPLIFY_TOLERANCE_FACTOR = 0.0015

function closeRing(ring: number[][]): number[][] {
  const first = ring[0]
  const last = ring[ring.length - 1]

  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, first]
  }

  return ring
}

function polygonsToFeatures(mapPolygons: Polygon[]) {
  return mapPolygons.map((polygon) => turf.polygon(polygon.map(closeRing)))
}

function addPoint(points: Point[], seenPoints: Set<string>, point: Point) {
  const key = `${point.lon.toFixed(6)},${point.lat.toFixed(6)}`

  if (seenPoints.has(key)) {
    return
  }

  seenPoints.add(key)
  points.push(point)
}

function centerOfBbox(bbox: Bbox): Point {
  return {
    lon: (bbox[0] + bbox[2]) / 2,
    lat: (bbox[1] + bbox[3]) / 2
  }
}

function bboxWithCenter(bbox: Bbox, center: Point): Bbox {
  const halfWidth = (bbox[2] - bbox[0]) / 2
  const halfHeight = (bbox[3] - bbox[1]) / 2

  return [
    center.lon - halfWidth,
    center.lat - halfHeight,
    center.lon + halfWidth,
    center.lat + halfHeight
  ]
}

function bboxArea(bbox: Bbox): number {
  return (
    (bbox[2] - bbox[0]) *
    (bbox[3] - bbox[1]) *
    Math.cos(((bbox[1] + bbox[3]) / 2) * (Math.PI / 180))
  )
}

function bboxIntersectionArea(a: Bbox, b: Bbox): number {
  const minLon = Math.max(a[0], b[0])
  const minLat = Math.max(a[1], b[1])
  const maxLon = Math.min(a[2], b[2])
  const maxLat = Math.min(a[3], b[3])

  if (minLon >= maxLon || minLat >= maxLat) {
    return 0
  }

  return bboxArea([minLon, minLat, maxLon, maxLat])
}

function scaleBbox(bbox: Bbox, scale: number): Bbox {
  const center = centerOfBbox(bbox)
  const halfWidth = ((bbox[2] - bbox[0]) * scale) / 2
  const halfHeight = ((bbox[3] - bbox[1]) * scale) / 2

  return [
    center.lon - halfWidth,
    center.lat - halfHeight,
    center.lon + halfWidth,
    center.lat + halfHeight
  ]
}

function pointSegmentDistance(
  point: number[],
  start: number[],
  end: number[]
): number {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]

  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1])
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
        (dx * dx + dy * dy)
    )
  )

  return Math.hypot(
    point[0] - (start[0] + t * dx),
    point[1] - (start[1] + t * dy)
  )
}

function simplifyOpenRing(points: number[][], tolerance: number): number[][] {
  if (points.length <= 2) {
    return points
  }

  let maxDistance = 0
  let maxIndex = 0
  const start = points[0]
  const end = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const distance = pointSegmentDistance(points[i], start, end)

    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  if (maxDistance <= tolerance) {
    return [start, end]
  }

  return [
    ...simplifyOpenRing(points.slice(0, maxIndex + 1), tolerance).slice(0, -1),
    ...simplifyOpenRing(points.slice(maxIndex), tolerance)
  ]
}

function simplifyRing(ring: number[][], tolerance: number): number[][] {
  const closedRing = closeRing(ring)
  const openRing = closedRing.slice(0, -1)

  if (openRing.length <= 4) {
    return closedRing
  }

  const simplifiedRing = closeRing(simplifyOpenRing(openRing, tolerance))

  return simplifiedRing.length >= 4 ? simplifiedRing : closedRing
}

function simplifyPolygons(mapPolygons: Polygon[]): Polygon[] {
  const mapBbox = combineBboxes(
    ...mapPolygons.map((polygon) => computeBbox(polygon[0]))
  )!
  const diagonal = Math.hypot(mapBbox[2] - mapBbox[0], mapBbox[3] - mapBbox[1])
  const tolerance = diagonal * SIMPLIFY_TOLERANCE_FACTOR

  return mapPolygons.map((polygon) =>
    polygon.map((ring) => simplifyRing(ring, tolerance))
  ) as Polygon[]
}

function buildCandidateBbox(
  centerLon: number,
  centerLat: number,
  aspectRatio: number,
  baseSize: number,
  zoom: number
): Bbox {
  const size = baseSize * Math.pow(2, zoom)
  const height = aspectRatio >= 1 ? size / aspectRatio : size
  const width = aspectRatio >= 1 ? size : size * aspectRatio

  return [
    centerLon - width / 2,
    centerLat - height / 2,
    centerLon + width / 2,
    centerLat + height / 2
  ]
}

function clusterPolygons(polygonBboxes: Bbox[], polygonAreas: number[]) {
  const count = polygonBboxes.length

  if (count === 0) {
    return []
  }

  if (count === 1) {
    return [
      {
        indices: [0],
        bbox: polygonBboxes[0],
        totalArea: polygonAreas[0]
      }
    ]
  }

  const averageDiagonal =
    polygonBboxes.reduce((sum, bbox) => {
      return sum + Math.hypot(bbox[2] - bbox[0], bbox[3] - bbox[1])
    }, 0) / count
  const threshold = 2 * averageDiagonal
  const parents = Array.from({ length: count }, (_, index) => index)
  const ranks = new Array(count).fill(0)

  function find(index: number): number {
    if (parents[index] !== index) {
      parents[index] = find(parents[index])
    }

    return parents[index]
  }

  function unite(a: number, b: number) {
    const rootA = find(a)
    const rootB = find(b)

    if (rootA === rootB) {
      return
    }

    if (ranks[rootA] < ranks[rootB]) {
      parents[rootA] = rootB
    } else if (ranks[rootA] > ranks[rootB]) {
      parents[rootB] = rootA
    } else {
      parents[rootB] = rootA
      ranks[rootA]++
    }
  }

  for (let i = 0; i < count; i++) {
    const centerI = centerOfBbox(polygonBboxes[i])

    for (let j = i + 1; j < count; j++) {
      const centerJ = centerOfBbox(polygonBboxes[j])

      if (
        Math.hypot(centerI.lon - centerJ.lon, centerI.lat - centerJ.lat) <
        threshold
      ) {
        unite(i, j)
      }
    }
  }

  const clusterMap = new Map<number, number[]>()

  for (let i = 0; i < count; i++) {
    const root = find(i)
    clusterMap.set(root, [...(clusterMap.get(root) ?? []), i])
  }

  return [...clusterMap.values()].map((indices): Cluster => {
    return {
      indices,
      bbox: combineBboxes(...indices.map((index) => polygonBboxes[index]))!,
      totalArea: indices.reduce((sum, index) => sum + polygonAreas[index], 0)
    }
  })
}

function exactMetrics(
  candidateBbox: Bbox,
  polygonFeatures: ReturnType<typeof polygonsToFeatures>,
  polygonBboxes: Bbox[],
  totalArea: number
): FrameMetrics {
  const viewportPolygon = turf.polygon([
    [
      [candidateBbox[0], candidateBbox[1]],
      [candidateBbox[2], candidateBbox[1]],
      [candidateBbox[2], candidateBbox[3]],
      [candidateBbox[0], candidateBbox[3]],
      [candidateBbox[0], candidateBbox[1]]
    ]
  ])
  const viewportArea = turfArea(viewportPolygon)
  let intersectionArea = 0

  for (let i = 0; i < polygonFeatures.length; i++) {
    if (!doBboxesIntersect(candidateBbox, polygonBboxes[i])) {
      continue
    }

    const intersection = turfIntersect(
      turf.featureCollection([viewportPolygon, polygonFeatures[i]])
    )

    if (intersection) {
      intersectionArea += turfArea(intersection)
    }
  }

  return {
    fill: viewportArea > 0 ? Math.min(1, intersectionArea / viewportArea) : 0,
    rawFill: viewportArea > 0 ? intersectionArea / viewportArea : 0,
    coverage: totalArea > 0 ? intersectionArea / totalArea : 0
  }
}

function approximateMetrics(
  candidateBbox: Bbox,
  polygonBboxes: Bbox[],
  totalBboxArea: number
): FrameMetrics {
  const viewportArea = bboxArea(candidateBbox)
  const intersectionArea = polygonBboxes.reduce((sum, polygonBbox) => {
    return sum + bboxIntersectionArea(candidateBbox, polygonBbox)
  }, 0)

  return {
    fill: viewportArea > 0 ? Math.min(1, intersectionArea / viewportArea) : 0,
    rawFill: viewportArea > 0 ? intersectionArea / viewportArea : 0,
    coverage: totalBboxArea > 0 ? intersectionArea / totalBboxArea : 0
  }
}

function relaxedCenters(bbox: Bbox, polygonBboxes: Bbox[]) {
  const center = centerOfBbox(bbox)
  const influenceBbox = scaleBbox(bbox, 1.8)
  const centers: Point[] = []
  const seenCenters = new Set<string>()
  const intersectingBboxes = polygonBboxes.filter((polygonBbox) =>
    doBboxesIntersect(influenceBbox, polygonBbox)
  )

  addPoint(centers, seenCenters, center)

  if (intersectingBboxes.length === 0) {
    return centers
  }

  let weightedLon = 0
  let weightedLat = 0
  let totalWeight = 0

  for (const polygonBbox of intersectingBboxes) {
    const weight = bboxArea(polygonBbox)
    const polygonCenter = centerOfBbox(polygonBbox)
    weightedLon += polygonCenter.lon * weight
    weightedLat += polygonCenter.lat * weight
    totalWeight += weight
  }

  if (totalWeight > 0) {
    const weightedCenter = {
      lon: weightedLon / totalWeight,
      lat: weightedLat / totalWeight
    }

    addPoint(centers, seenCenters, weightedCenter)
    addPoint(centers, seenCenters, {
      lon: (center.lon + weightedCenter.lon) / 2,
      lat: (center.lat + weightedCenter.lat) / 2
    })
  }

  const combinedCenter = centerOfBbox(combineBboxes(...intersectingBboxes)!)
  addPoint(centers, seenCenters, combinedCenter)
  addPoint(centers, seenCenters, {
    lon: (center.lon + combinedCenter.lon) / 2,
    lat: (center.lat + combinedCenter.lat) / 2
  })

  return centers
}

function centerBalanceScore(bbox: Bbox, polygonBboxes: Bbox[]) {
  const influenceBbox = scaleBbox(bbox, 1.5)
  const relevantBboxes = polygonBboxes.filter((polygonBbox) =>
    doBboxesIntersect(influenceBbox, polygonBbox)
  )

  if (relevantBboxes.length === 0) {
    return 1
  }

  const contentCenter = centerOfBbox(combineBboxes(...relevantBboxes)!)
  const frameCenter = centerOfBbox(bbox)
  const dx = Math.abs(contentCenter.lon - frameCenter.lon) / (bbox[2] - bbox[0])
  const dy = Math.abs(contentCenter.lat - frameCenter.lat) / (bbox[3] - bbox[1])

  return 1 / (1 + 3 * Math.hypot(dx, dy))
}

function relaxFrame(bbox: Bbox, context: ScoringContext) {
  let bestBbox = bbox
  let bestScore = -Infinity

  for (const center of relaxedCenters(bbox, context.bboxes)) {
    const candidateBbox = bboxWithCenter(bbox, center)
    const metrics = exactMetrics(
      candidateBbox,
      context.features,
      context.bboxes,
      context.totalArea
    )

    if (metrics.fill < context.minFill * 0.72) {
      continue
    }

    const coverageScore =
      metrics.coverage >= context.targetCoverage
        ? 1 / (1 + (metrics.coverage - context.targetCoverage) * 0.12)
        : metrics.coverage / context.targetCoverage
    const fillScore = Math.min(1, metrics.fill / context.minFill)
    const score =
      fillScore *
      coverageScore *
      centerBalanceScore(candidateBbox, context.bboxes)

    if (score > bestScore) {
      bestScore = score
      bestBbox = candidateBbox
    }
  }

  return bestBbox
}

/**
 * Find the best viewport frame for preview images of map polygons.
 *
 * The search uses simplified geometry and bbox-based approximate scoring to
 * keep most candidate checks cheap. Exact Turf intersections are only run on a
 * small shortlist, then the winning frame is gently recentered.
 */
export function findBestFrame(
  mapPolygons: Polygon[],
  viewportSize: Size
): Bbox {
  if (mapPolygons.length === 0) {
    return [0, 0, 0, 0]
  }

  const aspectRatio = viewportSize[0] / viewportSize[1]
  const simplifiedPolygons = simplifyPolygons(mapPolygons)
  const polygonFeatures = polygonsToFeatures(simplifiedPolygons)
  const polygonBboxes = simplifiedPolygons.map((polygon) =>
    computeBbox(polygon[0])
  )
  const polygonBboxAreas = polygonBboxes.map(bboxArea)
  const polygonAreas = polygonFeatures.map((feature) => turfArea(feature))
  const polygonCentroids: Point[] = polygonFeatures.map((feature) => {
    const centroid = turfCentroid(feature)
    return {
      lon: centroid.geometry.coordinates[0],
      lat: centroid.geometry.coordinates[1]
    }
  })
  const totalMapArea = polygonAreas.reduce((sum, area) => sum + area, 0)
  const clusters = clusterPolygons(polygonBboxes, polygonAreas).sort(
    (a, b) => b.totalArea - a.totalArea
  )

  let bestCandidate: Candidate | undefined

  for (const cluster of clusters) {
    const clusterFeatures = cluster.indices.map(
      (index) => polygonFeatures[index]
    )
    const clusterBboxes = cluster.indices.map((index) => polygonBboxes[index])
    const clusterAreas = cluster.indices.map((index) => polygonAreas[index])
    const clusterBboxAreas = cluster.indices.map(
      (index) => polygonBboxAreas[index]
    )
    const clusterBboxArea = clusterBboxAreas.reduce(
      (sum, area) => sum + area,
      0
    )
    const originalClusterDensity = clusterBboxArea / bboxArea(cluster.bbox)
    const clusterWidth = cluster.bbox[2] - cluster.bbox[0]
    const clusterHeight = cluster.bbox[3] - cluster.bbox[1]
    const baseSize = Math.max(
      aspectRatio >= 1 ? clusterHeight * aspectRatio : clusterHeight,
      aspectRatio >= 1 ? clusterWidth : clusterWidth / aspectRatio
    )

    if (baseSize === 0) {
      continue
    }

    const isSmallScatteredCluster =
      cluster.indices.length <= 3 && clusters.length > 4
    const isDenseCollection =
      clusters.length === 1 &&
      cluster.indices.length >= 8 &&
      originalClusterDensity > 0.7
    const isSparseChain =
      clusters.length === 1 &&
      cluster.indices.length >= 8 &&
      originalClusterDensity < 0.45
    const isSmallMultiMap =
      clusters.length === 1 &&
      cluster.indices.length > 1 &&
      cluster.indices.length <= 3
    const targetCoverage = isSmallScatteredCluster
      ? 0.32
      : isSparseChain
        ? 0.07
        : isDenseCollection
          ? 0.35
          : isSmallMultiMap
            ? 0.24
            : 0.38
    const minFill = isSmallScatteredCluster
      ? 0.78
      : isSparseChain
        ? 0.65
        : isDenseCollection
          ? 0.7
          : isSmallMultiMap
            ? 0.94
            : 0.72
    const coverageOvershootPenalty = isSmallMultiMap ? 8 : 0.3
    const centers: Point[] = []
    const seenCenters = new Set<string>()
    const clusterCenter = centerOfBbox(cluster.bbox)

    addPoint(centers, seenCenters, clusterCenter)

    const topPolygons = clusterAreas
      .map((area, localIndex) => ({
        area,
        globalIndex: cluster.indices[localIndex]
      }))
      .sort((a, b) => b.area - a.area)
      .slice(0, 4)

    for (const { globalIndex } of topPolygons) {
      addPoint(centers, seenCenters, polygonCentroids[globalIndex])
    }

    if (topPolygons.length > 0) {
      const largestGlobalIndex = topPolygons[0].globalIndex

      try {
        const pole = polylabel(
          [closeRing(simplifiedPolygons[largestGlobalIndex][0])],
          0.0001
        )

        if (Number.isFinite(pole[0]) && Number.isFinite(pole[1])) {
          addPoint(centers, seenCenters, {
            lon: pole[0],
            lat: pole[1]
          })
        }
      } catch {
        // Degenerate polygons can make polylabel fail; other centers remain.
      }
    }

    const approximateCandidates: ApproximateCandidate[] = []

    for (const { lon, lat } of centers) {
      for (let sample = 0; sample < ZOOM_SAMPLES; sample++) {
        const fraction = sample / (ZOOM_SAMPLES - 1)
        const zoom = ZOOM_MIN + (ZOOM_MAX - ZOOM_MIN) * fraction
        const candidateBbox = buildCandidateBbox(
          lon,
          lat,
          aspectRatio,
          baseSize,
          zoom
        )
        const metrics = approximateMetrics(
          candidateBbox,
          clusterBboxes,
          clusterBboxArea
        )

        if (metrics.fill < 0.25 || metrics.coverage < 0.03) {
          continue
        }

        const coverageScore =
          metrics.coverage >= targetCoverage
            ? 1 /
              (1 +
                (metrics.coverage - targetCoverage) * coverageOvershootPenalty)
            : metrics.coverage / targetCoverage
        const fillScore = Math.min(1, metrics.fill / minFill)

        approximateCandidates.push({
          bbox: candidateBbox,
          score: fillScore * coverageScore
        })
      }
    }

    approximateCandidates.sort((a, b) => b.score - a.score)

    const exactCandidateCount = isSmallScatteredCluster
      ? 5
      : isDenseCollection && cluster.indices.length > 16
        ? 8
        : 14
    const context = {
      features: clusterFeatures,
      bboxes: clusterBboxes,
      totalArea: clusterAreas.reduce((sum, area) => sum + area, 0),
      targetCoverage,
      minFill
    }

    for (const candidate of approximateCandidates.slice(
      0,
      exactCandidateCount
    )) {
      const metrics = exactMetrics(
        candidate.bbox,
        context.features,
        context.bboxes,
        context.totalArea
      )

      if (metrics.fill < minFill * 0.75) {
        continue
      }

      const coverageScore =
        metrics.coverage >= targetCoverage
          ? 1 /
            (1 + (metrics.coverage - targetCoverage) * coverageOvershootPenalty)
          : metrics.coverage / targetCoverage
      const fillScore = Math.min(1, metrics.fill / minFill)
      const clusterWeight = isSmallScatteredCluster
        ? Math.sqrt(cluster.totalArea / totalMapArea)
        : Math.pow(cluster.totalArea / totalMapArea, 0.25)
      const score = fillScore * coverageScore * clusterWeight

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = {
          bbox: candidate.bbox,
          score,
          context
        }
      }
    }
  }

  if (bestCandidate) {
    return relaxFrame(bestCandidate.bbox, bestCandidate.context)
  }

  const fallbackBbox = combineBboxes(...polygonBboxes)!
  const fallbackCenter = centerOfBbox(fallbackBbox)
  const fallbackWidth = fallbackBbox[2] - fallbackBbox[0]
  const fallbackHeight = fallbackBbox[3] - fallbackBbox[1]
  const fallbackBaseSize = Math.max(
    aspectRatio >= 1 ? fallbackHeight * aspectRatio : fallbackHeight,
    aspectRatio >= 1 ? fallbackWidth : fallbackWidth / aspectRatio
  )

  return buildCandidateBbox(
    fallbackCenter.lon,
    fallbackCenter.lat,
    aspectRatio,
    fallbackBaseSize * 1.1,
    0
  )
}
