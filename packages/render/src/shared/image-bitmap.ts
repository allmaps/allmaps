/**
 * Decode a tile image into an ImageBitmap, cropped to at most the tile size.
 *
 * The bitmap keeps the image's own size when it is smaller than the tile size.
 * This is common: edge tiles, overview tiles of images smaller than one tile,
 * and level 0 images whose single tile is the full image but which are served
 * at a smaller size. Cropping such an image to the tile size would pad it with
 * transparent pixels, which can take many times the memory of the image itself.
 *
 * @param blob - Fetched tile image
 * @param maxWidth - Tile width
 * @param maxHeight - Tile height
 */
export async function createTileImageBitmap(
  blob: Blob,
  maxWidth: number,
  maxHeight: number
): Promise<ImageBitmap> {
  const imageBitmap = await createImageBitmap(blob)
  if (imageBitmap.width <= maxWidth && imageBitmap.height <= maxHeight) {
    return imageBitmap
  }

  try {
    return await createImageBitmap(
      imageBitmap,
      0,
      0,
      Math.min(imageBitmap.width, maxWidth),
      Math.min(imageBitmap.height, maxHeight)
    )
  } finally {
    imageBitmap.close()
  }
}
