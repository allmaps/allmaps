export function getImageData(imageBitmap: ImageBitmap): Uint8ClampedArray {
  const offscreenCanvas = new OffscreenCanvas(
    imageBitmap.width,
    imageBitmap.height
  )

  const ctx = offscreenCanvas.getContext('2d')

  ctx!.drawImage(imageBitmap, 0, 0)

  const imageData = ctx!.getImageData(
    0,
    0,
    imageBitmap.width,
    imageBitmap.height
  )

  return imageData.data
}
