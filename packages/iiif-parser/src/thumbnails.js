import { getTilesets, getIiifTile } from './tiles.js'

function getThumbnailSize (parsedImage, containerWidth, containerHeight, mode = 'cover') {
  if (mode === 'cover' || mode === 'contain') {
    const widthRatio = containerWidth / parsedImage.width
    const heightRatio = containerHeight / parsedImage.height

    const ratio = mode === 'cover' ? Math.max(widthRatio, heightRatio) : Math.min(widthRatio, heightRatio)

    const width = parsedImage.width * ratio
    const height = parsedImage.height * ratio

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

export function getThumbnail (parsedImage, containerWidth, containerHeight, mode = 'cover') {
  if (!containerHeight) {
    containerHeight = containerWidth
  }

  const { width, height } = getThumbnailSize(parsedImage, containerWidth, containerHeight, mode)

  if (parsedImage.sizes) {
    let matchingSize
    for (let size of parsedImage.sizes) {
      const scaleFactor = size.width / width
      if (scaleFactor >= maxThumbnailDownscale && scaleFactor <= maxThumbnailUpscale) {
        matchingSize = size
        break
      }
    }

    return {
      size: matchingSize
    }
  }

  if (parsedImage.supportsAnyRegionAndSize) {
    // TODO: can request smaller region than full
    return {
      size: {
        width: Math.round(width),
        height: Math.round(height)
      }
    }
  }

  if (parsedImage.tiles) {
    const tilesets = getTilesets(parsedImage)

    // TODO: also use other tilesets!
    const tileset = tilesets[0]

    // TODO: take maxThumbnailDownscale and maxThumbnailUpscale into account
    const ratio = parsedImage.width / width
    const nearestZoomLevels = tileset
      .map(({ scaleFactor }, index) => ({
        index,
        scaleFactor,
        diff: Math.abs(scaleFactor - ratio)
      }))
      .sort((a, b) => a.diff - b.diff)

    const zoomLevel = tileset[nearestZoomLevels[0].index]

    const tilesX = Math.ceil(parsedImage.width / (zoomLevel.scaleFactor * tileset[0].width))
    const tilesY = Math.ceil(parsedImage.height / (zoomLevel.scaleFactor * tileset[0].height))

    let thumbnailTiles = []
    for (let y = 0; y < tilesY; y++) {
      let thumbnailRow = []
      for (let x = 0; x < tilesX; x++) {
        const thumbnailTile = getIiifTile(parsedImage, zoomLevel, x, y)
        thumbnailRow.push(thumbnailTile)
      }
      thumbnailTiles.push(thumbnailRow)
    }

    return thumbnailTiles
  }

  throw new Error('Unable to create thumbnail')
}
