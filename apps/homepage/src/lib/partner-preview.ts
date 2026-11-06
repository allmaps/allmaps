import { ProjectedGcpTransformer, lonLatProjection } from '@allmaps/project'
import type { GeoreferencedMap } from '@allmaps/annotation'

export type PartnerPreviewData = {
  annotationUrl: string
  imageUrl: string
  imageSrcset: string
  intrinsicWidth: number
  intrinsicHeight: number
}

// Crop the downloaded pixels, not an enlarged version. All crops have the same
// landscape proportion, with a modest zoom and the institution near the center.
export function getPartnerCrop(
  map: GeoreferencedMap,
  imageWidth: number,
  imageHeight: number,
  location?: [number, number],
  bounds: [number, number, number, number] = [0, 0, 1, 1]
) {
  if (
    !bounds.every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1
    ) ||
    bounds[0] >= bounds[2] ||
    bounds[1] >= bounds[3]
  ) {
    throw new Error('Invalid partner preview bounds')
  }
  const minimumLeft = Math.ceil(bounds[0] * imageWidth)
  const minimumTop = Math.ceil(bounds[1] * imageHeight)
  const maximumRight = Math.floor(bounds[2] * imageWidth)
  const maximumBottom = Math.floor(bounds[3] * imageHeight)
  const availableWidth = maximumRight - minimumLeft
  const availableHeight = maximumBottom - minimumTop
  if (availableWidth < 1 || availableHeight < 1) {
    throw new Error('Partner preview bounds contain no pixels')
  }
  let center = [imageWidth / 2, imageHeight / 2]
  if (location) {
    const transformer = ProjectedGcpTransformer.fromGeoreferencedMap(map, {
      projection: lonLatProjection
    })
    const point = transformer.transformToResource(location)
    if (!point.every(Number.isFinite)) {
      throw new Error('Could not locate institution in its map')
    }
    center = [
      (point[0] / map.resource.width!) * imageWidth,
      (point[1] / map.resource.height!) * imageHeight
    ]
  }

  const width = Math.max(
    1,
    Math.floor(Math.min(availableWidth, availableHeight * 1.8) / 1.5)
  )
  const height = Math.max(1, Math.floor(width / 1.8))
  return {
    left: Math.max(
      minimumLeft,
      Math.min(maximumRight - width, Math.round(center[0] - width / 2))
    ),
    top: Math.max(
      minimumTop,
      Math.min(maximumBottom - height, Math.round(center[1] - height / 2))
    ),
    width,
    height
  }
}
