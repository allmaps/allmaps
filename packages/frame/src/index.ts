import * as turf from '@turf/helpers'
import turfArea from '@turf/area'
import turfIntersect from '@turf/intersect'
import turfCentroid from '@turf/centroid'
import polylabel from 'polylabel'

import { combineBboxes, computeBbox, doBboxesIntersect } from '@allmaps/stdlib'

import type { Size, Bbox, Polygon } from '@allmaps/types'

type CandidateResult = {
  bbox: Bbox
  fill: number
  coverage: number
  score: number
}

type Cluster = {
  indices: number[]
  bbox: Bbox
  totalArea: number
}

/**
 * Close rings for GeoJSON compatibility (append first point if not already closed).
 */
function closeRing(ring: number[][]): number[][] {
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, first]
  }
  return ring
}

/**
 * Convert Allmaps Polygon[] (Ring[][] with unclosed rings) to Turf polygon features.
 */
function polygonsToFeatures(mapPolygons: Polygon[]) {
  return mapPolygons.map((polygon) => turf.polygon(polygon.map(closeRing)))
}

/**
 * Compute fill (intersection / viewport) and coverage (intersection / total map)
 * for a candidate viewport bbox against map polygon features.
 * Uses bbox pre-filtering to skip non-overlapping polygons.
 */
function computeFillAndCoverage(
  candidateBbox: Bbox,
  polygonFeatures: ReturnType<typeof polygonsToFeatures>,
  polygonBboxes: Bbox[],
  totalMapArea: number
): { fill: number; coverage: number } {
  const viewportPoly = turf.polygon([
    [
      [candidateBbox[0], candidateBbox[1]],
      [candidateBbox[2], candidateBbox[1]],
      [candidateBbox[2], candidateBbox[3]],
      [candidateBbox[0], candidateBbox[3]],
      [candidateBbox[0], candidateBbox[1]]
    ]
  ])

  let intersectionArea = 0
  for (let i = 0; i < polygonFeatures.length; i++) {
    // Skip polygons whose bbox doesn't overlap the candidate viewport
    if (!doBboxesIntersect(candidateBbox, polygonBboxes[i])) {
      continue
    }
    const inter = turfIntersect(
      turf.featureCollection([viewportPoly, polygonFeatures[i]])
    )
    if (inter) {
      intersectionArea += turfArea(inter)
    }
  }

  const viewportArea = turfArea(viewportPoly)
  return {
    // Cap fill at 1.0: overlapping polygons can sum to more than viewport area
    fill: viewportArea > 0 ? Math.min(1, intersectionArea / viewportArea) : 0,
    coverage: totalMapArea > 0 ? intersectionArea / totalMapArea : 0
  }
}

/**
 * Shift a viewport bbox so the visible map content is centered within it.
 * Computes the area-weighted centroid of all map-viewport intersections,
 * then shifts the viewport to center that content.
 */
function refineCenter(
  viewportBbox: Bbox,
  polygonFeatures: ReturnType<typeof polygonsToFeatures>,
  polygonBboxes: Bbox[]
): Bbox {
  const viewportPoly = turf.polygon([
    [
      [viewportBbox[0], viewportBbox[1]],
      [viewportBbox[2], viewportBbox[1]],
      [viewportBbox[2], viewportBbox[3]],
      [viewportBbox[0], viewportBbox[3]],
      [viewportBbox[0], viewportBbox[1]]
    ]
  ])

  let totalArea = 0
  let weightedLon = 0
  let weightedLat = 0

  for (let i = 0; i < polygonFeatures.length; i++) {
    if (!doBboxesIntersect(viewportBbox, polygonBboxes[i])) continue
    const inter = turfIntersect(
      turf.featureCollection([viewportPoly, polygonFeatures[i]])
    )
    if (inter) {
      const area = turfArea(inter)
      const centroid = turfCentroid(inter)
      weightedLon += centroid.geometry.coordinates[0] * area
      weightedLat += centroid.geometry.coordinates[1] * area
      totalArea += area
    }
  }

  if (totalArea === 0) return viewportBbox

  const contentLon = weightedLon / totalArea
  const contentLat = weightedLat / totalArea
  const vpCenterLon = (viewportBbox[0] + viewportBbox[2]) / 2
  const vpCenterLat = (viewportBbox[1] + viewportBbox[3]) / 2

  const shiftLon = contentLon - vpCenterLon
  const shiftLat = contentLat - vpCenterLat

  return [
    viewportBbox[0] + shiftLon,
    viewportBbox[1] + shiftLat,
    viewportBbox[2] + shiftLon,
    viewportBbox[3] + shiftLat
  ]
}

/**
 * Group polygons into spatial clusters using union-find.
 * Polygons whose bbox centers are within 2x the average bbox diagonal
 * are merged into the same cluster.
 */
function clusterPolygons(
  polygonBboxes: Bbox[],
  polygonAreas: number[]
): Cluster[] {
  const n = polygonBboxes.length
  if (n === 0) return []
  if (n === 1) {
    return [
      { indices: [0], bbox: polygonBboxes[0], totalArea: polygonAreas[0] }
    ]
  }

  // Compute average bbox diagonal (in degrees)
  const diags = polygonBboxes.map((bbox) => {
    const dx = bbox[2] - bbox[0]
    const dy = bbox[3] - bbox[1]
    return Math.sqrt(dx * dx + dy * dy)
  })
  const avgDiag = diags.reduce((sum, d) => sum + d, 0) / n
  const threshold = 2 * avgDiag

  // Union-find
  const parent = Array.from({ length: n }, (_, i) => i)
  const rank = new Array(n).fill(0)

  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x])
    return parent[x]
  }

  function unite(a: number, b: number) {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return
    if (rank[ra] < rank[rb]) parent[ra] = rb
    else if (rank[ra] > rank[rb]) parent[rb] = ra
    else {
      parent[rb] = ra
      rank[ra]++
    }
  }

  // Merge polygons whose bbox centers are within threshold
  for (let i = 0; i < n; i++) {
    const cxi = (polygonBboxes[i][0] + polygonBboxes[i][2]) / 2
    const cyi = (polygonBboxes[i][1] + polygonBboxes[i][3]) / 2
    for (let j = i + 1; j < n; j++) {
      const cxj = (polygonBboxes[j][0] + polygonBboxes[j][2]) / 2
      const cyj = (polygonBboxes[j][1] + polygonBboxes[j][3]) / 2
      const dx = cxi - cxj
      const dy = cyi - cyj
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        unite(i, j)
      }
    }
  }

  // Group by cluster root
  const clusterMap = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    if (!clusterMap.has(root)) clusterMap.set(root, [])
    clusterMap.get(root)!.push(i)
  }

  // Build cluster objects
  const clusters: Cluster[] = []
  for (const indices of clusterMap.values()) {
    const bboxes = indices.map((i) => polygonBboxes[i])
    const combined = combineBboxes(...bboxes)!
    const totalArea = indices.reduce((sum, i) => sum + polygonAreas[i], 0)
    clusters.push({ indices, bbox: combined, totalArea })
  }

  return clusters
}

/**
 * Build a candidate bbox centered on (lon, lat) at a given zoom level.
 * The resulting bbox is in lon/lat degrees. The Viewport projection
 * handles Mercator distortion, so we do NOT apply cosLat correction here.
 */
function buildCandidateBbox(
  centerLon: number,
  centerLat: number,
  aspectRatio: number,
  baseSize: number,
  zoom: number
): Bbox {
  const size = baseSize * Math.pow(2, zoom)

  const h = aspectRatio >= 1 ? size / aspectRatio : size
  const w = aspectRatio >= 1 ? size : size * aspectRatio

  return [
    centerLon - w / 2,
    centerLat - h / 2,
    centerLon + w / 2,
    centerLat + h / 2
  ]
}

/**
 * Find the best zoom level at a given center point by sampling multiple
 * scales and picking the one with the best fill x coverage score.
 */
function findOptimalScaleAtCenter(
  centerLon: number,
  centerLat: number,
  aspectRatio: number,
  baseSize: number,
  polygonFeatures: ReturnType<typeof polygonsToFeatures>,
  polygonBboxes: Bbox[],
  totalMapArea: number,
  minCoverage: number
): CandidateResult {
  // Sample zoom levels from zoomed-in (-6 = 1/64 of map extent) to
  // zoomed-out (1.5 = 3x map extent).
  const zoomMin = -6.0
  const zoomMax = 1.5
  const numSamples = 40

  let bestResult: CandidateResult = {
    bbox: buildCandidateBbox(centerLon, centerLat, aspectRatio, baseSize, 0),
    fill: 0,
    coverage: 0,
    score: 0
  }

  for (let i = 0; i < numSamples; i++) {
    const zoom = zoomMin + ((zoomMax - zoomMin) * i) / (numSamples - 1)
    const candidateBbox = buildCandidateBbox(
      centerLon,
      centerLat,
      aspectRatio,
      baseSize,
      zoom
    )

    const { fill, coverage } = computeFillAndCoverage(
      candidateBbox,
      polygonFeatures,
      polygonBboxes,
      totalMapArea
    )

    // Enforce floors: at least 30% fill and minimum coverage
    if (fill < 0.3 || coverage < minCoverage) {
      continue
    }

    // Maximize fill (minimize background). The coverage floor
    // ensures a meaningful portion of the map is shown.
    const score = fill
    if (score > bestResult.score) {
      bestResult = { bbox: candidateBbox, fill, coverage, score }
    }
  }

  return bestResult
}

/**
 * Find the best viewport frame for preview images of map polygons.
 *
 * Generates multiple candidate viewports (varying center + scale),
 * scores each by fill x coverage, and picks the best one.
 *
 * - fill  = map area visible in viewport / viewport area  (higher = less background)
 * - coverage = map area visible in viewport / total map area  (higher = more map shown)
 * - score = fill x coverage  (balances tight crop vs showing enough map)
 *
 * Uses spatial clustering to evaluate each cluster independently,
 * so "coverage" means "how much of this cluster is shown" rather than
 * "how much of all maps is shown."
 *
 * Handles:
 * - Single large polygon: shows most of it with minimal background
 * - Scattered small maps: zooms into the densest cluster
 * - Long thin chains: shows a well-filled section
 * - Irregular polygon with outliers: focuses on the main mass
 *
 * @param mapPolygons - Array of polygons representing the map geometry
 * @param viewportSize - Target viewport dimensions [width, height]
 * @returns Optimal viewport bounding box for preview generation
 */
export function findBestFrame(
  mapPolygons: Polygon[],
  viewportSize: Size
): Bbox {
  const aspectRatio = viewportSize[0] / viewportSize[1]

  // Convert to Turf features and precompute bboxes + areas
  const polygonFeatures = polygonsToFeatures(mapPolygons)
  const polygonBboxes: Bbox[] = mapPolygons.map(
    (polygon) => computeBbox(polygon[0]) // outer ring
  )
  const polygonAreas = polygonFeatures.map((f) => turfArea(f))
  const totalMapArea = polygonAreas.reduce((sum, a) => sum + a, 0)

  // Compute the combined bounding box from all polygons
  const mapBbox = combineBboxes(...polygonBboxes)!
  const mapWidth = mapBbox[2] - mapBbox[0]
  const mapHeight = mapBbox[3] - mapBbox[1]

  const bboxCenterLon = (mapBbox[0] + mapBbox[2]) / 2
  const bboxCenterLat = (mapBbox[1] + mapBbox[3]) / 2

  // If total map area is effectively zero (turf precision loss), use simple fallback
  if (totalMapArea < 1) {
    const baseSizeH = aspectRatio >= 1 ? mapHeight * aspectRatio : mapHeight
    const baseSizeW = aspectRatio >= 1 ? mapWidth : mapWidth / aspectRatio
    const baseSize = Math.max(baseSizeH, baseSizeW)
    return buildCandidateBbox(
      bboxCenterLon,
      bboxCenterLat,
      aspectRatio,
      baseSize * 1.1,
      0
    )
  }

  // Compute spatial clusters
  const clusters = clusterPolygons(polygonBboxes, polygonAreas)
  // Sort by total area descending (largest cluster first for fallback)
  clusters.sort((a, b) => b.totalArea - a.totalArea)

  let overallBestScore = 0
  let overallBestBbox: Bbox | null = null

  for (const cluster of clusters) {
    const clusterFeatures = cluster.indices.map((i) => polygonFeatures[i])
    const clusterBboxes = cluster.indices.map((i) => polygonBboxes[i])
    const clusterAreas = cluster.indices.map((i) => polygonAreas[i])

    const clusterWidth = cluster.bbox[2] - cluster.bbox[0]
    const clusterHeight = cluster.bbox[3] - cluster.bbox[1]

    // Compute cluster-scoped baseSize
    const baseSizeH =
      aspectRatio >= 1 ? clusterHeight * aspectRatio : clusterHeight
    const baseSizeW =
      aspectRatio >= 1 ? clusterWidth : clusterWidth / aspectRatio
    const clusterBaseSize = Math.max(baseSizeH, baseSizeW)

    if (clusterBaseSize === 0) continue

    // Coverage floor: show at least 25% of the cluster for small clusters.
    // For larger clusters, scale down so we can zoom into a subset.
    const clusterSize = cluster.indices.length
    const minCoverage =
      clusterSize <= 3 ? 0.25 : Math.max(0.05, 0.5 / clusterSize)

    const clusterCenterLon = (cluster.bbox[0] + cluster.bbox[2]) / 2
    const clusterCenterLat = (cluster.bbox[1] + cluster.bbox[3]) / 2

    // Generate candidate centers for this cluster
    const candidates: { lon: number; lat: number }[] = []

    // 1. Cluster bbox center
    candidates.push({ lon: clusterCenterLon, lat: clusterCenterLat })

    // 2. Centroids of cluster members (top 8 by area)
    const indexedAreas = clusterAreas
      .map((area, localIdx) => ({
        area,
        globalIdx: cluster.indices[localIdx]
      }))
      .sort((a, b) => b.area - a.area)
    const topPolygons = indexedAreas.slice(0, 8)

    for (const { globalIdx } of topPolygons) {
      const centroid = turfCentroid(polygonFeatures[globalIdx])
      candidates.push({
        lon: centroid.geometry.coordinates[0],
        lat: centroid.geometry.coordinates[1]
      })
    }

    // 3. Midpoints between adjacent top polygon centroids
    if (topPolygons.length >= 2) {
      const topCentroids = topPolygons.map(({ globalIdx }) => {
        const c = turfCentroid(polygonFeatures[globalIdx])
        return {
          lon: c.geometry.coordinates[0],
          lat: c.geometry.coordinates[1]
        }
      })
      for (let j = 0; j < topCentroids.length - 1; j++) {
        candidates.push({
          lon: (topCentroids[j].lon + topCentroids[j + 1].lon) / 2,
          lat: (topCentroids[j].lat + topCentroids[j + 1].lat) / 2
        })
      }
    }

    // 4. Pole of inaccessibility of the largest polygon in this cluster
    if (topPolygons.length > 0) {
      const largestGlobalIdx = topPolygons[0].globalIdx
      const outerRing = mapPolygons[largestGlobalIdx][0]
      const closedOuterRing = closeRing(outerRing)
      try {
        const pole = polylabel([closedOuterRing], 0.0001)
        if (isFinite(pole[0]) && isFinite(pole[1])) {
          candidates.push({ lon: pole[0], lat: pole[1] })
        }
      } catch {
        // polylabel can fail on degenerate polygons - skip
      }
    }

    // Evaluate each candidate center with cluster-scoped scoring
    let clusterBest: CandidateResult = {
      bbox: buildCandidateBbox(
        clusterCenterLon,
        clusterCenterLat,
        aspectRatio,
        clusterBaseSize * 1.1,
        0
      ),
      fill: 0,
      coverage: 0,
      score: 0
    }

    for (const { lon, lat } of candidates) {
      const result = findOptimalScaleAtCenter(
        lon,
        lat,
        aspectRatio,
        clusterBaseSize,
        clusterFeatures,
        clusterBboxes,
        cluster.totalArea,
        minCoverage
      )
      if (result.score > clusterBest.score) {
        clusterBest = result
      }
    }

    // Weight the cluster's best score by its relative size.
    // sqrt() gently prefers larger clusters without ignoring small ones.
    const clusterWeight = Math.sqrt(cluster.totalArea / totalMapArea)
    const finalScore = clusterBest.score * clusterWeight

    if (finalScore > overallBestScore) {
      overallBestScore = finalScore
      overallBestBbox = clusterBest.bbox
    }
  }

  // If a candidate was found, refine centering and return
  if (overallBestBbox) {
    return refineCenter(overallBestBbox, polygonFeatures, polygonBboxes)
  }

  // Fallback: use the largest cluster's bbox with padding (not the global bbox)
  const largestCluster = clusters[0]
  const lcWidth = largestCluster.bbox[2] - largestCluster.bbox[0]
  const lcHeight = largestCluster.bbox[3] - largestCluster.bbox[1]
  const lcBaseSizeH = aspectRatio >= 1 ? lcHeight * aspectRatio : lcHeight
  const lcBaseSizeW = aspectRatio >= 1 ? lcWidth : lcWidth / aspectRatio
  const lcBaseSize = Math.max(lcBaseSizeH, lcBaseSizeW) * 1.1
  const lcCenterLon = (largestCluster.bbox[0] + largestCluster.bbox[2]) / 2
  const lcCenterLat = (largestCluster.bbox[1] + largestCluster.bbox[3]) / 2
  return buildCandidateBbox(
    lcCenterLon,
    lcCenterLat,
    aspectRatio,
    lcBaseSize,
    0
  )
}
