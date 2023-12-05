import type { Ring } from '@allmaps/types'

// TODO: the fullResourceMask is available directly in WarpedMap class!
// This also means this function can be removed from stdlib.
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
