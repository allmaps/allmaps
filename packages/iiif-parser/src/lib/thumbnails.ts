import { getIiifTile } from './tiles.js'

import { ImageRequest, Size, TileZoomLevel, Fit } from './types.js'

function getThumbnailSize(
  imageSize: Size,
  containerSize: Size,
  mode: Fit = 'cover'
): Size {
  if (mode === 'cover' || mode === 'contain') {
    const widthRatio = containerSize.width / imageSize.width
    const heightRatio = containerSize.height / imageSize.height

    const ratio =
      mode === 'cover'
        ? Math.max(widthRatio, heightRatio)
        : Math.min(widthRatio, heightRatio)

    const width = imageSize.width * ratio
    const height = imageSize.height * ratio

    return {
      width,
      height
    }
  } else {
    throw new Error('Size must be either "cover" or "contain"')
  }
}

const maxThumbnailDownscale = 0.8
const maxThumbnailUpscale = 1.5

export function getThumbnail(
  imageSize: Size,
  containerSize: Size,
  mode: Fit = 'cover',
  {
    sizes,
    tileZoomLevels,
    supportsAnyRegionAndSize
  }: {
    sizes?: Size[]
    tileZoomLevels?: TileZoomLevel[]
    supportsAnyRegionAndSize?: boolean | null
  }
): ImageRequest | ImageRequest[][] {
  const { width, height } = getThumbnailSize(imageSize, containerSize, mode)

  if (sizes) {
    let matchingSize
    for (let size of sizes) {
      const scaleFactor = size.width / width
      if (
        scaleFactor >= maxThumbnailDownscale &&
        scaleFactor <= maxThumbnailUpscale
      ) {
        matchingSize = size
        break
      }
    }

    if (matchingSize) {
      return {
        size: matchingSize
      }
    }
  }

  if (supportsAnyRegionAndSize) {
    // TODO: can request smaller region than full
    return {
      size: {
        width: Math.round(width),
        height: Math.round(height)
      }
    }
  }

  if (tileZoomLevels) {
    // TODO: take maxThumbnailDownscale and maxThumbnailUpscale into account
    const ratio = imageSize.width / width
    const nearestZoomLevels = tileZoomLevels
      .map(({ scaleFactor }, index) => ({
        index,
        scaleFactor,
        diff: Math.abs(scaleFactor - ratio)
      }))
      .sort((a, b) => a.diff - b.diff)

    const zoomLevel = tileZoomLevels[nearestZoomLevels[0].index]

    const tilesX = Math.ceil(
      imageSize.width / (zoomLevel.scaleFactor * tileZoomLevels[0].width)
    )
    const tilesY = Math.ceil(
      imageSize.height / (zoomLevel.scaleFactor * tileZoomLevels[0].height)
    )

    let thumbnailTiles = []
    for (let y = 0; y < tilesY; y++) {
      let thumbnailRow = []
      for (let x = 0; x < tilesX; x++) {
        const thumbnailTile = getIiifTile(imageSize, zoomLevel, x, y)
        thumbnailRow.push(thumbnailTile)
      }
      thumbnailTiles.push(thumbnailRow)
    }

    return thumbnailTiles
  }

  throw new Error('Unable to create thumbnail')
}
