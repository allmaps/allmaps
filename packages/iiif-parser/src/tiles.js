export function getIiifTile (parsedImage, zoomLevel, x, y) {
  // See https://iiif.io/api/image/3.0/implementation/#3-tile-region-parameter-calculation

  const regionX = x * zoomLevel.originalWidth
  const regionY = y * zoomLevel.originalHeight
  const regionWidth = x * zoomLevel.originalWidth + zoomLevel.width * zoomLevel.scaleFactor > parsedImage.width
    ? parsedImage.width - x * zoomLevel.originalWidth : zoomLevel.width * zoomLevel.scaleFactor
  const regionHeight = y * zoomLevel.originalHeight + zoomLevel.height * zoomLevel.scaleFactor > parsedImage.height
    ? parsedImage.height - y * zoomLevel.originalHeight : zoomLevel.height * zoomLevel.scaleFactor

  let tileWidth = zoomLevel.width
  let tileHeight = zoomLevel.height

  if (regionX + zoomLevel.width * zoomLevel.scaleFactor > parsedImage.width) {
    tileWidth = Math.floor((parsedImage.width - regionX + zoomLevel.scaleFactor - 1) / zoomLevel.scaleFactor)
  }

  if (regionY + zoomLevel.height * zoomLevel.scaleFactor > parsedImage.height) {
    tileHeight = Math.floor((parsedImage.height - regionY + zoomLevel.scaleFactor - 1) / zoomLevel.scaleFactor)
  }

  return {
    // scaleFactor: zoomLevel.scaleFactor,
    region: {
      x: regionX,
      y: regionY,
      width: regionWidth,
      height: regionHeight
    },
    size: {
      width: tileWidth,
      height: tileHeight
    }
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
      .from({ length: maxExponent }, (_, exponent) => 2 ** exponent)
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

function getTilesetFromScaleFactor (parsedImage, tileset, scaleFactor) {
  const height = tileset.height || tileset.width

  const originalWidth = tileset.width * scaleFactor
  const originalHeight = height * scaleFactor

  return {
    scaleFactor,
    width: tileset.width,
    height,
    originalWidth,
    originalHeight,
    columns: Math.ceil(parsedImage.width / originalWidth),
    rows: Math.ceil(parsedImage.height / originalHeight)
  }
}

function getTilesFromTilesets (parsedImage, tilesets) {
  return tilesets.map((tileset) => tileset.scaleFactors
    .map((scaleFactor) => getTilesetFromScaleFactor(parsedImage, tileset, scaleFactor)))
}

function supportsCustomTiles (parsedImage) {
  return parsedImage.supportsAnyRegionAndSize
}

function hasValidTileset (parsedImage) {
  return parsedImage.tiles &&
    parsedImage.tiles
      .some((tileset) => tileset.width && tileset.scaleFactors && tileset.scaleFactors.length)
}

export function getTilesets (parsedImage) {
  let tilesets

  if (hasValidTileset(parsedImage)) {
    tilesets = parsedImage.tiles
  } else if (supportsCustomTiles(parsedImage)) {
    tilesets = [getDefaultTileset(parsedImage)]
  } else {
    throw new Error('Image does not support tiles or custom regions and sizes.')
  }

  return getTilesFromTilesets(parsedImage, tilesets)
}
