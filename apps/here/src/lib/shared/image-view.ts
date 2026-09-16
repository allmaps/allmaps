import { Image } from '@allmaps/iiif-parser'
import { parseAnnotation } from '@allmaps/annotation'
import { GcpTransformer } from '@allmaps/transform'

import {
  generateFakeStraightAnnotation,
  computeTransformedAnnotationBbox
} from './annotation.ts'

import type { Point } from '@allmaps/types'
import type { MapWithImageInfo, CompassMode } from './types.js'

export function createImageView({ map, imageInfo }: MapWithImageInfo) {
  const image = Image.parse(imageInfo)
  const annotation = generateFakeStraightAnnotation(
    map.resource.id,
    image.width,
    image.height
  )
  const straightMap = parseAnnotation(annotation)[0]
  const transformer = new GcpTransformer(
    straightMap.gcps,
    straightMap.transformation?.type
  )
  const bbox = computeTransformedAnnotationBbox(annotation)
  const minZoom = 7
  const maxZoom = 18
  // The editor's annotation uses 1/10,000 degree per image pixel.
  // Base the initial detail on IIIF resolutions, not the editor's zoom limits.
  const nativeImageZoom = Math.log2((360 * 10_000) / 512)
  const scaleFactors = image.tileZoomLevels.map(
    ({ scaleFactor }) => scaleFactor
  )
  const coarsestImageZoom =
    nativeImageZoom - Math.log2(Math.max(1, ...scaleFactors))
  const finestImageZoom =
    nativeImageZoom - Math.log2(Math.min(1, ...scaleFactors))
  const positionZoom =
    coarsestImageZoom + (finestImageZoom - coarsestImageZoom) * 0.75

  return {
    toLngLat: (point: Point): Point => transformer.transformToGeo(point),
    minZoom,
    maxZoom,
    positionZoom,
    bounds: [
      [bbox[0], bbox[1]],
      [bbox[2], bbox[3]]
    ] as [Point, Point],
    map: straightMap
  }
}

export function getImageBearing(
  mode: CompassMode,
  mapBearing?: number,
  orientationAlpha?: number
): number | undefined {
  // MapLibre bearing has the opposite sign to OpenLayers view rotation.
  if (mode === 'image') return 0
  if (mode === 'north' && mapBearing !== undefined) return -mapBearing
  if (
    mode === 'follow-orientation' &&
    mapBearing !== undefined &&
    orientationAlpha !== undefined
  ) {
    return -(orientationAlpha - mapBearing + 45)
  }
}

export function getPositionRotation(
  mode: CompassMode,
  mapBearing: number,
  orientationAlpha: number
) {
  // The orientation icon points east; subtract 90 degrees to point north.
  return mode === 'follow-orientation'
    ? orientationAlpha - 90
    : -orientationAlpha - mapBearing - 90
}
