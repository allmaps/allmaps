import type { Ring } from '@allmaps/types'

export function getFullResourceMask(
  imageWidth: number,
  imageHeight: number
): Ring {
  return [
    [0, 0],
    [imageWidth, 0],
    [imageWidth, imageHeight],
    [0, imageHeight]
  ]
}
