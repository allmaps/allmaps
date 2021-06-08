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
      region: 'full',
      size: matchingSize
    }
  }

  if (parsedImage.supportsAnyRegionAndSize) {
    // TODO: can request smaller region than full
    const region = 'full'
    const size = {
      width: Math.round(width),
      height: Math.round(height)
    }

    return {
      region,
      size
    }
  }

  if (parsedImage.tiles) {
    const tilesets = getTilesets(parsedImage)

    // TODO: also use other tilesets!
    const tileset = tilesets[0]

    const tilesX = Math.ceil(width / tileset[0].width)
    const tilesY = Math.ceil(height / tileset[0].height)

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
