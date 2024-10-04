export async function getImageData(
  blob: Blob,
  width: number,
  height: number
): Promise<ImageData> {
  const imageBitmap = await createImageBitmap(blob, 0, 0, width, height)

  const offscreenCanvas = new OffscreenCanvas(width, height)

  const ctx = offscreenCanvas.getContext('2d')

  if (!ctx) {
    throw new Error('No offscreen canvas in worker')
  }
  ctx.drawImage(imageBitmap, 0, 0)

  const imageData = ctx!.getImageData(0, 0, width, height)

  return imageData
}
