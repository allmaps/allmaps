import { getTilesets, getIiifTile } from './tiles.js'

// export function getThumbnailUrls (image, thumbnailWidth = 100) {
//   const sizes = getSizes(image)

//   const dimensions = [
//     image.width,
//     image.height
//   ]

//   const baseUrl = image['@id']
//   const suffix = `0/${getQuality(image)}.${getFormat(image)}`

//   if (sizes.anySize) {
//     return `${baseUrl}/full/${thumbnailWidth},/${suffix}`
//   } else if (sizes.sizes) {
//     let currentSizeIndex = 0
//     while (currentSizeIndex < sizes.sizes.length && sizes.sizes[currentSizeIndex] < thumbnailWidth) {
//       currentSizeIndex++
//     }
//     const width = sizes.sizes[currentSizeIndex].width
//     return `${baseUrl}/full/${width},/${suffix}`
//   } else if (sizes.tiles) {
//     const tileSet = sizes.tiles[0]
//     const tileWidth = tileSet.width
//     const scaleFactor = Math.max(...tileSet.scaleFactors)

//     const regionWidth = tileWidth * scaleFactor
//     const regionHeight = tileWidth * scaleFactor

//     const region = `0,0,${Math.min(dimensions[0], regionWidth)},${Math.min(dimensions[1], regionHeight)}`
//     return `${baseUrl}/${region}/${tileWidth},/${suffix}`
//   } else {
//     throw new Error('Image without sizes, tiles or sizeByWhListed')
//   }
// }

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
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        thumbnailTiles.push({ x, y })
      }
    }

    return thumbnailTiles.map(({ x, y }) => getIiifTile(parsedImage, zoomLevel, x, y))
  }

  throw new Error('Unable to create thumbnail')
}
