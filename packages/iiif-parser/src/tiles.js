export function getIiifTile (parsedImage, tileset, x, y) {
  // See https://iiif.io/api/image/3.0/implementation/#3-tile-region-parameter-calculation

  const regionX = x * tileset.originalWidth
  const regionY = y * tileset.originalHeight
  const regionWidth = x * tileset.originalWidth + tileset.width * tileset.scaleFactor > parsedImage.width
    ? parsedImage.width - x * tileset.originalWidth : tileset.width * tileset.scaleFactor
  const regionHeight = y * tileset.originalHeight + tileset.height * tileset.scaleFactor > parsedImage.height
    ? parsedImage.height - y * tileset.originalHeight : tileset.height * tileset.scaleFactor

  let tileWidth = tileset.width
  let tileHeight = tileset.height

  if (regionX + tileset.width * tileset.scaleFactor > parsedImage.width) {
    tileWidth = Math.floor((parsedImage.width - regionX + tileset.scaleFactor - 1) / tileset.scaleFactor)
  }

  if (regionY + tileset.height * tileset.scaleFactor > parsedImage.height) {
    tileHeight = Math.floor((parsedImage.height - regionY + tileset.scaleFactor - 1) / tileset.scaleFactor)
  }

  return {
    regionX,
    regionY,
    regionWidth,
    regionHeight,
    tileWidth,
    tileHeight,
    scaleFactor: tileset.scaleFactor
  }
}

function getDefaultTileset (parsedImage, tileWidth = 256) {
  const maxTilesPerSide = Math.max(parsedImage.width, parsedImage.height) / tileWidth
  const maxExponent = Math.ceil(Math.log(maxTilesPerSide) / Math.log(2))

  let maxTileSide

  if (parsedImage.maxWidth) {
    maxTileSide = parsedImage.maxWidth
  }

  if (parsedImage.maxHeight) {
    maxTileSide = maxTileSide ? Math.min(maxTileSide, parsedImage.maxHeight) : parsedImage.maxHeight
  }

  if (parsedImage.maxArea) {
    maxTileSide = maxTileSide ? Math.min(maxTileSide, Math.sqrt(parsedImage.maxArea)) : Math.sqrt(parsedImage.maxArea)
  }

  return {
    scaleFactors: Array
      .from({length: maxExponent}, (_, exponent) => 2 ** exponent)
      .filter((scaleFactor) => {
        if (maxTileSide) {
          return tileWidth * scaleFactor <= maxTileSide
        } else {
          return true
        }
      }),
    width: tileWidth
  }
}

function getTilesFromTilesets (tilesets) {
  return tilesets.map((tileset) => tileset.scaleFactors
    .map((scaleFactor) => ({
      scaleFactor,
      width: tileset.width,
      height: tileset.height || tileset.width,
      originalWidth: tileset.width * scaleFactor,
      originalHeight: (tileset.height || tileset.width) * scaleFactor
    }))).flat()
}

function supportsCustomTiles (parsedImage) {
  return parsedImage.supportsAnyRegionAndSize
}

function hasValidTileset (parsedImage) {
  return parsedImage.tiles &&
    parsedImage.tiles
      .some((tileset) => tileset.width && tileset.scaleFactors && tileset.scaleFactors.length)
}

function getTilesets (parsedImage) {
  if (hasValidTileset(parsedImage)) {
    return parsedImage.tiles
  } else if (supportsCustomTiles(parsedImage)) {
    return [getDefaultTileset(parsedImage)]
  } else {
    throw new Error('Image does not support tiles or custom regions and sizes.')
  }
}

export function getTiles (parsedImage) {
  const tilesets = getTilesets(parsedImage)
  return getTilesFromTilesets(tilesets)
}
