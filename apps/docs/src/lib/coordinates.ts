import { parseAnnotation } from '@allmaps/annotation'
import { GcpTransformer } from '@allmaps/transform'

export type CoordinatePair = [number, number]
export type CoordinateSelection = {
  image: CoordinatePair
  geographic: CoordinatePair
}
export type CoordinateExampleInitialView = {
  image: CoordinatePair
  imageZoom: number
  geographicZoom: number
}
// NYPL’s Stephen A. Schwarzman Building at Fifth Avenue and 42nd Street.
export const initialImagePoint: CoordinatePair = [8605, 4094]

export function createCoordinateExample(annotation: unknown) {
  const [map] = parseAnnotation(annotation)
  if (!map?.resource.width || !map.resource.height) {
    throw new Error('The annotation must include the image dimensions.')
  }
  const width = map.resource.width
  const height = map.resource.height
  const transformer = GcpTransformer.fromGeoreferencedMap(map)

  function checkImagePoint(
    point: CoordinatePair,
    clamp: boolean
  ): CoordinatePair {
    if (!point.every(Number.isFinite))
      throw new Error('Invalid image coordinates.')
    if (
      !clamp &&
      (point[0] < 0 || point[0] > width || point[1] < 0 || point[1] > height)
    ) {
      throw new Error('Choose a point inside the photograph.')
    }
    return [
      Math.max(0, Math.min(width, point[0])),
      Math.max(0, Math.min(height, point[1]))
    ]
  }

  function fromPixels(
    point: CoordinatePair,
    clamp = false
  ): CoordinateSelection {
    const image = checkImagePoint(point, clamp)
    return { image, geographic: transformer.transformToGeo(image) }
  }

  function fromGeographic(
    point: CoordinatePair,
    clamp = false
  ): CoordinateSelection {
    if (
      !point.every(Number.isFinite) ||
      Math.abs(point[0]) > 180 ||
      Math.abs(point[1]) >= 90
    ) {
      throw new Error('Invalid longitude or latitude.')
    }
    const image = checkImagePoint(transformer.transformToResource(point), clamp)
    return clamp ? fromPixels(image) : { image, geographic: [...point] }
  }

  return { imageId: map.resource.id, width, height, fromPixels, fromGeographic }
}

export type ImageTileRegion = {
  region: [number, number, number, number]
  size: CoordinatePair
  offset: CoordinatePair
}

/** Place the original, unwarped pixels on a padded MapLibre raster tile grid. */
export function createImageTileGrid(width: number, height: number) {
  const tileSize = 512
  const worldSize = Math.max(
    tileSize,
    2 ** Math.ceil(Math.log2(Math.max(width, height))) * 2
  )
  const origin: CoordinatePair = [
    Math.floor((worldSize - width) / 2),
    Math.floor((worldSize - height) / 2)
  ]
  const maxZoom = Math.log2(worldSize / tileSize)

  return {
    tileSize,
    maxZoom,
    initialZoom: maxZoom - 2,
    toWorld(point: CoordinatePair): CoordinatePair {
      return [
        (origin[0] + point[0]) / worldSize,
        (origin[1] + point[1]) / worldSize
      ]
    },
    fromWorld(point: CoordinatePair): CoordinatePair {
      return [
        point[0] * worldSize - origin[0],
        point[1] * worldSize - origin[1]
      ]
    },
    getRegion(
      zoom: number,
      column: number,
      row: number
    ): ImageTileRegion | undefined {
      const span = worldSize / 2 ** zoom
      const scale = span / tileSize
      const tileLeft = column * span - origin[0]
      const tileTop = row * span - origin[1]
      const left = Math.max(0, tileLeft)
      const top = Math.max(0, tileTop)
      const right = Math.min(width, tileLeft + span)
      const bottom = Math.min(height, tileTop + span)
      if (right <= left || bottom <= top) return
      return {
        region: [left, top, right - left, bottom - top],
        size: [
          Math.ceil((right - left) / scale),
          Math.ceil((bottom - top) / scale)
        ],
        offset: [(left - tileLeft) / scale, (top - tileTop) / scale]
      }
    }
  }
}
