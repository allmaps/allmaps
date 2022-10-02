import { Size, ImageRequest, Tileset, TileZoomLevel } from './types.js'

export function getIiifTile(
  { width: imageWidth, height: imageHeight }: Size,
  zoomLevel: TileZoomLevel,
  column: number,
  row: number
): ImageRequest {
  // See https://iiif.io/api/image/3.0/implementation/#3-tile-region-parameter-calculation

  const regionX = column * zoomLevel.originalWidth
  const regionY = row * zoomLevel.originalHeight
  const regionWidth =
    column * zoomLevel.originalWidth + zoomLevel.width * zoomLevel.scaleFactor >
    imageWidth
      ? imageWidth - column * zoomLevel.originalWidth
      : zoomLevel.width * zoomLevel.scaleFactor
  const regionHeight =
    row * zoomLevel.originalHeight + zoomLevel.height * zoomLevel.scaleFactor >
    imageHeight
      ? imageHeight - row * zoomLevel.originalHeight
      : zoomLevel.height * zoomLevel.scaleFactor

  let tileWidth = zoomLevel.width
  let tileHeight = zoomLevel.height

  if (regionX + zoomLevel.width * zoomLevel.scaleFactor > imageWidth) {
    tileWidth = Math.floor(
      (imageWidth - regionX + zoomLevel.scaleFactor - 1) / zoomLevel.scaleFactor
    )
  }

  if (regionY + zoomLevel.height * zoomLevel.scaleFactor > imageHeight) {
    tileHeight = Math.floor(
      (imageHeight - regionY + zoomLevel.scaleFactor - 1) /
        zoomLevel.scaleFactor
    )
  }

  return {
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

function getDefaultTileset(
  { width: imageWidth, height: imageHeight }: Size,
  tileWidth = 256
): Tileset {
  const maxTilesPerSide = Math.max(imageWidth, imageHeight) / tileWidth
  const maxExponent = Math.ceil(Math.log(maxTilesPerSide) / Math.log(2))

  // let maxTileSide
  // if (parsedImage.maxWidth) {
  //   maxTileSide = parsedImage.maxWidth
  // }
  // if (parsedImage.maxHeight) {
  //   maxTileSide = maxTileSide
  //     ? Math.min(maxTileSide, parsedImage.maxHeight)
  //     : parsedImage.maxHeight
  // }
  // if (parsedImage.maxArea) {
  //   maxTileSide = maxTileSide
  //     ? Math.min(maxTileSide, Math.sqrt(parsedImage.maxArea))
  //     : Math.sqrt(parsedImage.maxArea)
  // }

  return {
    scaleFactors: Array.from(
      { length: maxExponent },
      (_, exponent) => 2 ** exponent
    ),
    // .filter((scaleFactor) => {
    //   if (maxTileSide) {
    //     return tileWidth * scaleFactor <= maxTileSide
    //   } else {
    //     return true
    //   }
    // }),
    width: tileWidth
  }
}

function getTileZoomLevelFromScaleFactor(
  { width: imageWidth, height: imageHeight }: Size,
  tileset: Tileset,
  scaleFactor: number
): TileZoomLevel {
  const height = tileset.height || tileset.width

  const originalWidth = tileset.width * scaleFactor
  const originalHeight = height * scaleFactor

  return {
    scaleFactor,
    width: tileset.width,
    height,
    originalWidth,
    originalHeight,
    columns: Math.ceil(imageWidth / originalWidth),
    rows: Math.ceil(imageHeight / originalHeight)
  }
}

function getTileZoomLevelsFromTilesets(
  imageSize: Size,
  tilesets: Tileset[]
): TileZoomLevel[] {
  return tilesets
    .map((tileset) =>
      tileset.scaleFactors.map((scaleFactor) =>
        getTileZoomLevelFromScaleFactor(imageSize, tileset, scaleFactor)
      )
    )
    .flat()
}

function hasValidTileset(tilesets: Tileset[]): boolean {
  if (
    tilesets.some(
      (tileset) =>
        tileset.width && tileset.scaleFactors && tileset.scaleFactors.length
    )
  ) {
    return true
  }

  return false
}

export function getTileZoomLevels(
  imageSize: Size,
  tilesets: Tileset[] | undefined,
  supportsAnyRegionAndSize: boolean
): TileZoomLevel[] {
  if (!tilesets || !hasValidTileset(tilesets)) {
    if (supportsAnyRegionAndSize) {
      tilesets = [getDefaultTileset(imageSize)]
    } else {
      throw new Error(
        'Image does not support tiles or custom regions and sizes.'
      )
    }
  }

  return getTileZoomLevelsFromTilesets(imageSize, tilesets)
}
