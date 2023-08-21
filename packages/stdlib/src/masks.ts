export function getFullResourceMask(
  imageWidth: number,
  imageHeight: number
): [number, number][] {
  return [
    [0, 0],
    [imageWidth, 0],
    [imageWidth, imageHeight],
    [0, imageHeight]
  ]
}
