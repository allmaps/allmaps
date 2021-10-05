import { extent } from 'd3-array'

import { toImage } from '@allmaps/transform'
import { getTilesets } from '@allmaps/iiif-parser'

const TILE_WIDTH = 256

// From:
//  https://github.com/vHawk/tiles-intersect
// See also:
//  https://www.redblobgames.com/grids/line-drawing.html
function tilesIntersect ([a, b]) {
  let x = Math.floor(a[0])
  let y = Math.floor(a[1])
  const endX = Math.floor(b[0])
  const endY = Math.floor(b[1])

  let points = [[x, y]]

  if (x === endX && y === endY) {
    return points
  }

  const stepX = Math.sign(b[0] - a[0])
  const stepY = Math.sign(b[1] - a[1])

  const toX = Math.abs(a[0] - x - Math.max(0, stepX))
  const toY = Math.abs(a[1] - y - Math.max(0, stepY))

  const vX = Math.abs(a[0] - b[0])
  const vY = Math.abs(a[1] - b[1])

  let tMaxX = toX / vX
  let tMaxY = toY / vY

  const tDeltaX = 1 / vX
  const tDeltaY = 1 / vY

  while (!(x === endX && y === endY)) {
    if (tMaxX < tMaxY) {
      tMaxX = tMaxX + tDeltaX
      x = x + stepX
    } else {
      tMaxY = tMaxY + tDeltaY
      y = y + stepY
    }

    points.push([x, y])
  }

  return points
}

function extentToImage (transformer, extent) {
  const [y1, x1, y2, x2] = extent

  return [
    toImage(transformer, [y1, x1]),
    toImage(transformer, [y1, x2]),
    toImage(transformer, [y2, x2]),
    toImage(transformer, [y2, x1])
  ]
}

function computeMinMax (points) {
  const xs = []
  const ys = []

  for (let point of points) {
    xs.push(point[0])
    ys.push(point[1])
  }

  const [minX, maxX] = extent(xs)
  const [minY, maxY] = extent(ys)

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

function findBestZoomLevel (tilesets, mapTileScale) {
  let smallestScaleDiff = Number.POSITIVE_INFINITY
  let bestZoomLevel

  for (let tileset of tilesets) {
    for (let zoomLevel of tileset) {
      const scaleFactor = zoomLevel.scaleFactor
      const scaleDiff = Math.abs(Math.log2(scaleFactor) - Math.log2(mapTileScale))
      // const scaleDiff = Math.abs(scaleFactor - mapTileScale)

      if (scaleDiff < smallestScaleDiff) {
        smallestScaleDiff = scaleDiff
        bestZoomLevel = zoomLevel
      }
    }
  }

  return bestZoomLevel
}

function scaleToTiles (zoomLevel, points) {
  return points
    .map((point) => [
      point[0] / zoomLevel.originalWidth,
      point[1] / zoomLevel.originalHeight
    ])
}

function findNeededIiifTilesByX (zoomLevel, tilePixelExtent) {
  const tiles = {}
  for (let i = 0; i < tilePixelExtent.length; i++) {
    const line = [tilePixelExtent[i], tilePixelExtent[(i + 1) % tilePixelExtent.length]]
    const lineTiles = tilesIntersect(line)

    lineTiles.forEach(([x, y]) => {
      if (x < 0 || y < 0 ||
        x >= zoomLevel.columns || y >= zoomLevel.rows) {
        return
      }

      if (!tiles[x]) {
        tiles[x] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]
      }

      if (y < tiles[x][0]) {
        tiles[x][0] = y
      }

      if (y > tiles[x][1]) {
        tiles[x][1] = y
      }
    })
  }

  return tiles
}

function iiifTilesByXToArray (zoomLevel, iiifTilesByX) {
  const neededIiifTiles = []
  for (let x in iiifTilesByX) {
    const fromY = iiifTilesByX[x][0]
    const toY = iiifTilesByX[x][1]
    for (let y = fromY; y <= toY; y++) {
      neededIiifTiles.push({
        x: parseInt(x),
        y,
        ...zoomLevel
      })
    }
  }

  return neededIiifTiles
}

export function iiifTilesForMapExtent (transformer, parsedImage, extent) {
  // =================================================
  // TODO: move to constructor
  const tilesets = getTilesets(parsedImage)
  // =================================================

  const pixelExtent = extentToImage(transformer, extent)
  const pixelExtentMinMax = computeMinMax(pixelExtent)

  if ((pixelExtentMinMax.minX > parsedImage.width || pixelExtentMinMax.maxX < 0) &&
    (pixelExtentMinMax.maxY > parsedImage.height || pixelExtentMinMax.maxY < 0)) {
    return []
  }

  const mapTileScale = pixelExtentMinMax.width / TILE_WIDTH

  const zoomLevel = findBestZoomLevel(tilesets, mapTileScale)
  const tilePixelExtent = scaleToTiles(zoomLevel, pixelExtent)

  const iiifTilesByX = findNeededIiifTilesByX(zoomLevel, tilePixelExtent)
  const iiifTiles = iiifTilesByXToArray(zoomLevel, iiifTilesByX)

  return iiifTiles
}

// TODO: create CLASS!!!
// class Car {
//   constructor(brand) {
//     this.carname = brand;
//   }
//   present() {
//     return "I have a " + this.carname + ".";
//   }
// }
