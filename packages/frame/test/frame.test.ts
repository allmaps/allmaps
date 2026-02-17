import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import * as turf from '@turf/helpers'
import turfArea from '@turf/area'
import turfIntersect from '@turf/intersect'

import { findBestFrame } from '../src/index.js'
import { computeBbox } from '@allmaps/stdlib'

import type { Bbox, Polygon } from '@allmaps/types'

const inputDir = './test/input'
const viewportSize: [number, number] = [1200, 630]

type TestCase = {
  name: string
  filename: string
  description: string
  expectedMinCoverage: number // minimum % of map area that should be visible
  expectedMinFill: number // minimum % of viewport filled with map content
  expectedMaxScale: number // max ratio of result bbox area to input bbox area (lower = more zoomed in)
}

const testCases: TestCase[] = [
  {
    name: 'Mississippi River Maps',
    filename: 'mississippi.geojson',
    description: 'Diagonal chain of 16 maps - bbox is very wasteful',
    expectedMinCoverage: 0.05,
    expectedMinFill: 0.35, // Scattered but should fill reasonably well
    expectedMaxScale: 0.6 // Zooms in to ~42% of wasteful bbox
  },
  {
    name: 'City of Lynn',
    filename: 'city-of-lynn.geojson',
    description: 'Urban area with multiple map sheets (large dataset)',
    expectedMinCoverage: 0.03,
    expectedMinFill: 0.3,
    expectedMaxScale: 0.05 // Zooms in significantly to ~2.3% of bbox
  },
  {
    name: 'Rotterdam',
    filename: 'rotterdam.geojson',
    description: 'City map collection',
    expectedMinCoverage: 0.05,
    expectedMinFill: 0.35,
    expectedMaxScale: 0.08 // Zooms in to ~3.9% of bbox
  },
  {
    name: 'British Isles (TPS)',
    filename: 'british-isles-tps.geojson',
    description: 'Large map with thin plate spline transformation',
    expectedMinCoverage: 0.2,
    expectedMinFill: 0.5, // Single large map should fill well
    expectedMaxScale: 0.35 // Zooms in to ~20% of bbox
  },
  {
    name: 'De Bijenkorf',
    filename: 'bijenkort.geojson',
    description: 'Building-scale (50x120m), concave polygon',
    expectedMinCoverage: 0.2,
    expectedMinFill: 0.45, // Single building should fill well
    expectedMaxScale: 0.35 // Zooms in to ~21% of bbox
  },
  {
    name: 'C&O Canal',
    filename: 'co-canal.geojson',
    description: 'One large map + one small inset nested inside',
    expectedMinCoverage: 0.2,
    expectedMinFill: 0.5, // Should focus on main map with good fill
    expectedMaxScale: 0.25 // Zooms in to ~13% of bbox
  },
  {
    name: 'Melbourne Rail Yard',
    filename: 'melbourne-rail-yard.geojson',
    description: 'Concave boomerang-shaped rail yard',
    expectedMinCoverage: 0.25,
    expectedMinFill: 0.45, // Single area should fill well
    expectedMaxScale: 0.25 // Zooms in to ~12% of bbox
  },
  {
    name: 'Van Deventer',
    filename: 'van-deventer.geojson',
    description: '31 tiny maps scattered across the Netherlands',
    expectedMinCoverage: 0.025,
    expectedMinFill: 0.3, // Scattered maps harder to fill efficiently
    expectedMaxScale: 0.001 // Massive zoom in to ~0.007% of bbox
  }
]

function readGeoJSON(filename: string): { polygons: Polygon[]; bbox: Bbox } {
  const filePath = path.join(inputDir, filename)
  const geojson = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  const polygons: Polygon[] = []

  if (geojson.type === 'FeatureCollection') {
    for (const feature of geojson.features) {
      if (feature.geometry?.type === 'Polygon') {
        polygons.push(feature.geometry.coordinates)
      }
    }
  } else if (geojson.type === 'Feature') {
    if (geojson.geometry?.type === 'Polygon') {
      polygons.push(geojson.geometry.coordinates)
    }
  }

  // Compute overall bbox from all polygon outer rings
  const allPoints = polygons.flatMap((p) => p[0])
  const bbox = computeBbox(allPoints)

  return { polygons, bbox }
}

function closeRing(ring: number[][]): number[][] {
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, first]
  }
  return ring
}

function computeMetrics(
  resultBbox: Bbox,
  polygons: Polygon[]
): { fill: number; coverage: number; bboxArea: number } {
  const viewportPoly = turf.polygon([
    [
      [resultBbox[0], resultBbox[1]],
      [resultBbox[2], resultBbox[1]],
      [resultBbox[2], resultBbox[3]],
      [resultBbox[0], resultBbox[3]],
      [resultBbox[0], resultBbox[1]]
    ]
  ])

  const viewportArea = turfArea(viewportPoly)

  // Compute total map area and intersection with viewport
  const polygonFeatures = polygons.map((polygon) =>
    turf.polygon(polygon.map(closeRing))
  )
  const totalMapArea = polygonFeatures.reduce(
    (sum, feature) => sum + turfArea(feature),
    0
  )

  let intersectionArea = 0
  for (const feature of polygonFeatures) {
    const inter = turfIntersect(turf.featureCollection([viewportPoly, feature]))
    if (inter) {
      intersectionArea += turfArea(inter)
    }
  }

  return {
    fill: viewportArea > 0 ? Math.min(1, intersectionArea / viewportArea) : 0,
    coverage: totalMapArea > 0 ? intersectionArea / totalMapArea : 0,
    bboxArea: viewportArea
  }
}

describe('findBestFrame', () => {
  testCases.forEach((testCase) => {
    describe(testCase.name, () => {
      const { polygons, bbox: inputBbox } = readGeoJSON(testCase.filename)

      // Increase timeout for large datasets
      const timeout =
        testCase.filename === 'city-of-lynn.geojson' ? 15000 : 5000

      test(
        'should return a valid bbox',
        () => {
          const result = findBestFrame(polygons, viewportSize)

          expect(result).toBeDefined()
          expect(result).toHaveLength(4)
          expect(result[0]).toBeLessThan(result[2]) // minLon < maxLon
          expect(result[1]).toBeLessThan(result[3]) // minLat < maxLat
        },
        timeout
      )

      test(
        'should match viewport aspect ratio',
        () => {
          const result = findBestFrame(polygons, viewportSize)

          const width = result[2] - result[0]
          const height = result[3] - result[1]
          const expectedAspectRatio = viewportSize[0] / viewportSize[1]

          // Allow 1% tolerance for aspect ratio (accounting for Mercator projection)
          const actualAspectRatio = width / height
          expect(actualAspectRatio).toBeGreaterThan(expectedAspectRatio * 0.99)
          expect(actualAspectRatio).toBeLessThan(expectedAspectRatio * 1.01)
        },
        timeout
      )

      test(
        `should achieve minimum coverage of ${(testCase.expectedMinCoverage * 100).toFixed(0)}%`,
        () => {
          const result = findBestFrame(polygons, viewportSize)
          const metrics = computeMetrics(result, polygons)

          expect(metrics.coverage).toBeGreaterThanOrEqual(
            testCase.expectedMinCoverage
          )
        },
        timeout
      )

      test(
        `should achieve minimum fill of ${(testCase.expectedMinFill * 100).toFixed(0)}%`,
        () => {
          const result = findBestFrame(polygons, viewportSize)
          const metrics = computeMetrics(result, polygons)

          expect(metrics.fill).toBeGreaterThanOrEqual(testCase.expectedMinFill)
        },
        timeout
      )

      test(
        'should zoom to appropriate level',
        () => {
          const result = findBestFrame(polygons, viewportSize)

          const inputWidth = inputBbox[2] - inputBbox[0]
          const inputHeight = inputBbox[3] - inputBbox[1]
          const inputArea =
            inputWidth *
            inputHeight *
            Math.cos(((inputBbox[1] + inputBbox[3]) / 2) * (Math.PI / 180))

          const resultWidth = result[2] - result[0]
          const resultHeight = result[3] - result[1]
          const resultArea =
            resultWidth *
            resultHeight *
            Math.cos(((result[1] + result[3]) / 2) * (Math.PI / 180))

          // Scale factor: result bbox area / input bbox area
          // < 1.0 = zoomed in (result bbox smaller than input - focusing on content)
          // > 1.0 = zoomed out (result bbox larger than input - adding padding)
          // The algorithm should zoom in to focus on actual content
          const scaleFactor = resultArea / inputArea

          // Should zoom in (not use wasteful full bbox)
          // Allow for extreme zoom on scattered maps (Van Deventer can be 0.00007)
          expect(scaleFactor).toBeGreaterThan(0.00001)
          expect(scaleFactor).toBeLessThan(testCase.expectedMaxScale)
        },
        timeout
      )

      test(
        'should produce stable results (deterministic)',
        () => {
          const result1 = findBestFrame(polygons, viewportSize)
          const result2 = findBestFrame(polygons, viewportSize)

          expect(result1).toEqual(result2)
        },
        timeout * 2 // Double timeout for running twice
      )
    })
  })

  describe('Edge cases', () => {
    test('should handle very small polygon', () => {
      const polygons: Polygon[] = [
        [
          [
            [0, 0],
            [0.0001, 0],
            [0.0001, 0.0001],
            [0, 0.0001],
            [0, 0]
          ]
        ]
      ]
      const result = findBestFrame(polygons, viewportSize)

      expect(result).toBeDefined()
    })
  })
})
