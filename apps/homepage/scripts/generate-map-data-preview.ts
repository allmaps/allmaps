import { writeFile } from 'node:fs/promises'
import { parseAnnotation } from '@allmaps/annotation'
import { geoMercator, geoPath } from 'd3-geo'
import { getGeojsonPolygon } from '../src/shared/geometry.ts'

import type { FeatureCollection, Geometry } from 'geojson'

// Pin each sheet so the illustrated masks and GCPs can be reproduced.
const annotationUrls = [
  'https://annotations.allmaps.org/maps/051d059e8d1111fd@e8405163b4a995bf',
  'https://annotations.allmaps.org/maps/f85571e758deac59@3c75480f580edaf3',
  'https://annotations.allmaps.org/maps/b32045d70bef076b@2e149e815bc42ac4',
  'https://annotations.allmaps.org/maps/9ae202c6f52e46c3@8d45b786e7571607',
  'https://annotations.allmaps.org/maps/6f95e84e64fafa06@7061c02d9835aedc',
  'https://annotations.allmaps.org/maps/6e98c2fb30ddd6f2@12eca13f6aca98e8',
  'https://annotations.allmaps.org/maps/89a1ea9380406457@27347bc1933accc7',
  'https://annotations.allmaps.org/maps/af70248ffb8dc4db@52e380799294fdb5',
  'https://annotations.allmaps.org/maps/bc28df44edb77b24@6a2e2a902b6c33a4'
]

const sheets = await Promise.all(
  annotationUrls.map(async (annotationUrl) => {
    const response = await fetch(annotationUrl, {
      signal: AbortSignal.timeout(30_000)
    })
    if (!response.ok) {
      throw new Error(`Could not fetch ${annotationUrl}: ${response.status}`)
    }
    const maps = parseAnnotation(await response.json())
    if (maps.length !== 1) throw new Error(`Expected one map: ${annotationUrl}`)
    const map = maps[0]
    return { annotationUrl, map, polygon: getGeojsonPolygon(map) }
  })
)

const width = 420
const height = 400
const padding = 40
const collection: FeatureCollection<Geometry> = {
  type: 'FeatureCollection',
  // Fit the three central sheets; neighboring sheets continue past the crop.
  features: sheets.slice(0, 3).flatMap(({ map, polygon }) => [
    { type: 'Feature' as const, properties: {}, geometry: polygon },
    {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'MultiPoint' as const,
        coordinates: map.gcps.map(({ geo }) => geo)
      }
    }
  ])
}

// One projection preserves the sheets' relative positions and scale.
const projection = geoMercator().fitExtent(
  [
    [padding, padding],
    [width - padding, height - padding]
  ],
  collection
)
const path = geoPath(projection).digits(2)

const preview = {
  annotationUrl: 'https://annotations.allmaps.org/manifests/23379602e8187445',
  collectionUrl: 'https://ark.digitalcommonwealth.org/ark:/50959/dj530101x',
  label: 'Atlas of Lynn, Massachusetts',
  width,
  height,
  sheets: sheets.map(({ annotationUrl, map, polygon }) => {
    const outline = path(polygon)
    if (!outline || /NaN|Infinity/.test(outline)) {
      throw new Error(`Invalid outline: ${annotationUrl}`)
    }
    return {
      annotationUrl,
      imageUrl: map.resource.id,
      path: outline,
      controlPoints: map.gcps.map(({ geo }) => {
        const point = projection(geo)
        if (!point || point.some((value) => !Number.isFinite(value))) {
          throw new Error(`Invalid control point: ${annotationUrl}`)
        }
        return point.map((value) => Number(value.toFixed(2)))
      })
    }
  })
}

await writeFile(
  new URL('../src/lib/data/map-data-preview.json', import.meta.url),
  `${JSON.stringify(preview, null, 2)}\n`
)
console.log(`Bundled ${preview.sheets.length} Lynn masks and their GCPs`)
