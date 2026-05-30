import {
  getImageData,
  getColorsArray,
  getColorHistogram,
  getMaxOccurringColor
} from './background-color.js'

import { scalePoints } from '@allmaps/stdlib'

import type { Size, Ring } from '@allmaps/types'

export function detectBackgroundColor(
  resourceSize: Size,
  imageBitmap: ImageBitmap,
  resourceMask?: Ring
) {
  if (!resourceMask) {
    const [width, height] = resourceSize
    resourceMask = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height]
    ]
  }

  const scale = imageBitmap.width / resourceSize[0]
  const scaledResourceMask = scalePoints(resourceMask, scale)

  const imageData = getImageData(imageBitmap, scaledResourceMask)
  const colors = getColorsArray(imageData)

  const histogram = getColorHistogram(colors)
  const backgroundColor = getMaxOccurringColor(histogram)

  return backgroundColor.color
}
