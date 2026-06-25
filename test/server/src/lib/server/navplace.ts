import { GcpTransformer } from '@allmaps/transform'

import type { Bbox, JsonObject, Point, Ring } from '../types.ts'
import { getGeoreferencedMap, type ImageFixture } from './fixture-data.ts'

const navPlaceContext = 'http://iiif.io/api/extension/navplace/context.json'
const presentation3Context = 'http://iiif.io/api/presentation/3/context.json'

function computeBbox(points: Ring): Bbox {
  return [
    Math.min(...points.map((point) => point[0])),
    Math.min(...points.map((point) => point[1])),
    Math.max(...points.map((point) => point[0])),
    Math.max(...points.map((point) => point[1]))
  ]
}

function bboxToCenter(bbox: Bbox): Point {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
}

function bboxToRing(bbox: Bbox): Ring {
  return [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[1]],
    [bbox[2], bbox[3]],
    [bbox[0], bbox[3]],
    [bbox[0], bbox[1]]
  ]
}

function getGeoMask(image: ImageFixture): Ring {
  const georeferencedMap = getGeoreferencedMap(image)
  const transformer = GcpTransformer.fromGeoreferencedMap(georeferencedMap)
  const resourceMask = georeferencedMap.resourceMask as unknown as Ring

  return transformer.transformToGeo([resourceMask])[0] as unknown as Ring
}

function createGeoJsonFeatureCollection(
  manifestId: string,
  geometry:
    | {
        type: 'Point'
        coordinates: Point
      }
    | {
        type: 'Polygon'
        coordinates: Ring[]
      },
  label: string
) {
  return {
    id: `${manifestId}/navplace`,
    type: 'FeatureCollection',
    features: [
      {
        id: `${manifestId}/navplace/feature/1`,
        type: 'Feature',
        properties: {
          label: {
            none: [label]
          }
        },
        geometry
      }
    ]
  }
}

export function addNavPlaceContext(manifest: JsonObject) {
  const context = manifest['@context']

  return {
    ...manifest,
    '@context': Array.isArray(context)
      ? [navPlaceContext, ...context.filter((item) => item !== navPlaceContext)]
      : [navPlaceContext, context ?? presentation3Context]
  }
}

export function createNavPlace(
  manifestId: string,
  image: ImageFixture,
  variant: string
) {
  const geoMask = getGeoMask(image)
  const geoMaskBbox = computeBbox(geoMask)

  if (variant === 'navplace-midpoint') {
    return createGeoJsonFeatureCollection(
      manifestId,
      {
        type: 'Point',
        coordinates: bboxToCenter(geoMaskBbox)
      },
      `${image.label} midpoint`
    )
  }

  if (variant === 'navplace-bbox') {
    return createGeoJsonFeatureCollection(
      manifestId,
      {
        type: 'Polygon',
        coordinates: [bboxToRing(geoMaskBbox)]
      },
      `${image.label} bounding box`
    )
  }

  throw new Error(`Unknown navPlace variant: ${variant}`)
}
