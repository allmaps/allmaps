import { toImage } from '@allmaps/transform'
import { Image } from '@allmaps/iiif-parser'

import type { GCPTransformInfo } from '@allmaps/transform'
import type { TileZoomLevel } from '@allmaps/iiif-parser'

// TODO: import types from @allmaps/iiif-parser,
// or create types package
type Size = [number, number]
type Extent = [number, number, number, number]
type Coord = [number, number]
type Line = [Coord, Coord]

type CoordByX = { [key: number]: Coord }

type Tile = {
  column: number,
  row: number,
  zoomLevel: TileZoomLevel
}

function computeExtent(values: number[]): [number, number] {
  let min: number = Number.POSITIVE_INFINITY
  let max: number = Number.NEGATIVE_INFINITY

  for (const value of values) {
    if (min === undefined) {
      if (value >= value) min = max = value
    } else {
      if (min > value) min = value
      if (max < value) max = value
    }
  }

  return [min, max]
}

// From:
//  https://github.com/vHawk/tiles-intersect
// See also:
//  https://www.redblobgames.com/grids/line-drawing.html
function tilesIntersect([a, b]: Line): [
  number,
  number
][] {
  let x = Math.floor(a[0])
  let y = Math.floor(a[1])
  const endX = Math.floor(b[0])
  const endY = Math.floor(b[1])

  let points: Coord[] = [[x, y]]

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

function extentToImage(transformer: GCPTransformInfo, extent: Extent) {
  const [y1, x1, y2, x2] = extent

  return [
    toImage(transformer, [y1, x1]),
    toImage(transformer, [y1, x2]),
    toImage(transformer, [y2, x2]),
    toImage(transformer, [y2, x1])
  ]
}

function computeMinMax(points: Coord[]) {
  const xs = []
  const ys = []

  for (let point of points) {
    xs.push(point[0])
    ys.push(point[1])
  }

  const [minX, maxX] = computeExtent(xs)
  const [minY, maxY] = computeExtent(ys)

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

function findBestZoomLevel(
  timeZoomLevels: TileZoomLevel[],
  mapTileScale: number
) : TileZoomLevel | undefined {
  let smallestScaleDiff = Number.POSITIVE_INFINITY
  let bestZoomLevel: TileZoomLevel | undefined

  for (let zoomLevel of timeZoomLevels) {
    const scaleFactor = zoomLevel.scaleFactor
    const scaleDiff = Math.abs(Math.log2(scaleFactor) - Math.log2(mapTileScale))
    // const scaleDiff = Math.abs(scaleFactor - mapTileScale)

    if (scaleDiff < smallestScaleDiff) {
      smallestScaleDiff = scaleDiff
      bestZoomLevel = zoomLevel
    }
  }

  return bestZoomLevel
}

function scaleToTiles(zoomLevel: TileZoomLevel, points: Coord[]): Coord[] {
  return points.map((point) => [
    point[0] / zoomLevel.originalWidth,
    point[1] / zoomLevel.originalHeight
  ])
}

function findNeededIiifTilesByX(tilePixelExtent: Coord[]) {
  // TODO: use Map
  const tiles: CoordByX = {}
  for (let i = 0; i < tilePixelExtent.length; i++) {
    const line: Line = [
      tilePixelExtent[i],
      tilePixelExtent[(i + 1) % tilePixelExtent.length]
    ]
    const lineTiles = tilesIntersect(line)

    lineTiles.forEach(([x, y]) => {
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

function iiifTilesByXToArray(zoomLevel: TileZoomLevel, iiifTilesByX: CoordByX) {
  const neededIiifTiles = []
  for (let xKey in iiifTilesByX) {
    const x = parseInt(xKey)

    if (x < 0 || x >= zoomLevel.columns) {
      break
    }

    const fromY = Math.max(iiifTilesByX[x][0], 0)
    const toY = Math.min(iiifTilesByX[x][1], zoomLevel.rows - 1)

    for (let y = fromY; y <= toY; y++) {
      neededIiifTiles.push({
        column: x,
        row: y,
        zoomLevel
      })
    }
  }

  return neededIiifTiles
}

export function computeIiifTilesForMapExtent(
  transformer: GCPTransformInfo,
  image: Image,
  viewportSize: Size,
  geoExtent: Extent
) : Tile[] {
  const imagePixelExtent = extentToImage(transformer, geoExtent)
  const imagePixelExtentMinMax = computeMinMax(imagePixelExtent)

  if (
    (imagePixelExtentMinMax.minX > image.width ||
      imagePixelExtentMinMax.maxX < 0) &&
    (imagePixelExtentMinMax.maxY > image.height ||
      imagePixelExtentMinMax.maxY < 0)
  ) {
    return []
  }

  const mapScaleX = imagePixelExtentMinMax.width / viewportSize[0]
  const mapScaleY = imagePixelExtentMinMax.height / viewportSize[1]
  const mapScale = Math.min(mapScaleX, mapScaleY)

  const zoomLevel = findBestZoomLevel(image.tileZoomLevels, mapScale)

  if (zoomLevel) {
    const tilePixelExtent = scaleToTiles(zoomLevel, imagePixelExtent)

    const iiifTilesByX = findNeededIiifTilesByX(tilePixelExtent)
    const iiifTiles = iiifTilesByXToArray(zoomLevel, iiifTilesByX)

    return iiifTiles
  } else {
    return []
  }
}
