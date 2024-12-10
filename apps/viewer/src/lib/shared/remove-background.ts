import {
  fetchImageBitmap,
  getImageData,
  getColorsArray,
  getColorHistogram,
  getMaxOccurringColor,
  rgbToHex
} from '@allmaps/stdlib'

import type { Map } from '@allmaps/annotation'
import type { Image } from '@allmaps/iiif-parser'
import type { Ring } from '@allmaps/types'

const thumbnailSize = 400

export async function getBackgroundColor(map: Map, parsedImage: Image) {
  let imageRequest = parsedImage.getThumbnail({
    width: thumbnailSize,
    height: thumbnailSize
  })

  if (Array.isArray(imageRequest)) {
    imageRequest = imageRequest[0][0]
  }

  const url = parsedImage.getImageUrl(imageRequest)
  const imageBitmap = await fetchImageBitmap(url)

  const scale = imageBitmap.width / map.resource.width

  const mask: Ring = map.resourceMask.map((point) => [
    point[0] * scale,
    point[1] * scale
  ])

  const imageData = getImageData(imageBitmap, mask)
  const colors = getColorsArray(imageData)
  const histogram = getColorHistogram(colors)
  const backgroundColor = getMaxOccurringColor(histogram)

  return rgbToHex(backgroundColor.color)
}
