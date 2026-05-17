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
  resourceMask: Ring,
  imageBitmap: ImageBitmap
) {
  const scale = resourceSize[0] / imageBitmap.width
  const scaledResourceMask = scalePoints(resourceMask, scale)

  const imageData = getImageData(imageBitmap, scaledResourceMask)
  const colors = getColorsArray(imageData)
  const histogram = getColorHistogram(colors)
  const backgroundColor = getMaxOccurringColor(histogram)

  return backgroundColor.color
}
