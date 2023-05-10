import { Image } from '@allmaps/iiif-parser'

import type { GCPTransformerInterface } from '@allmaps/transform'
import type { TileZoomLevel } from '@allmaps/iiif-parser'

import { computeBBox } from './bbox.js'
import { geoBBoxToSVGPolygon } from './transform.js'

import type { Size, BBox, Position, Tile, Line, SVGPolygon } from './types.js'

type PositionByX = { [key: number]: Position }

export function imageCoordinatesToTileCoordinates(
  tile: Tile,
  imageCoordinates: Position,
  clip = true
): Position | undefined {
  const tileXMin = tile.column * tile.zoomLevel.originalWidth
  const tileYMin = tile.row * tile.zoomLevel.originalHeight

  const tileX = (imageCoordinates[0] - tileXMin) / tile.zoomLevel.scaleFactor
  const tileY = (imageCoordinates[1] - tileYMin) / tile.zoomLevel.scaleFactor

  if (
    !clip ||
    (imageCoordinates[0] >= tileXMin &&
      imageCoordinates[0] <= tileXMin + tile.zoomLevel.originalWidth &&
      imageCoordinates[1] >= tileYMin &&
      imageCoordinates[1] <= tileYMin + tile.zoomLevel.originalHeight &&
      imageCoordinates[0] <= tile.imageSize[0] &&
      imageCoordinates[1] <= tile.imageSize[1])
  ) {
    return [tileX, tileY]
  }
}

export function tileBBox(tile: Tile): BBox {
  const tileXMin = tile.column * tile.zoomLevel.originalWidth
  const tileYMin = tile.row * tile.zoomLevel.originalHeight

  const tileXMax = Math.min(
    tileXMin + tile.zoomLevel.originalWidth,
    tile.imageSize[0]
  )
  const tileYMax = Math.min(
    tileYMin + tile.zoomLevel.originalHeight,
    tile.imageSize[1]
  )

  return [tileXMin, tileYMin, tileXMax, tileYMax]
}

export function tileCenter(tile: Tile): Position {
  const bbox = tileBBox(tile)

  return [(bbox[2] - bbox[0]) / 2 + bbox[0], (bbox[3] - bbox[1]) / 2 + bbox[1]]
}

function distanceFromPoint(tile: Tile, point: Position) {
  const center = tileCenter(tile)

  const dx = center[0] - point[0]
  const dy = center[1] - point[1]

  return Math.sqrt(dx ** 2 + dy ** 2)
}

// From:
//  https://github.com/vHawk/tiles-intersect
// See also:
//  https://www.redblobgames.com/grids/line-drawing.html
function tilesIntersect([a, b]: Line): Position[] {
  let x = Math.floor(a[0])
  let y = Math.floor(a[1])
  const endX = Math.floor(b[0])
  const endY = Math.floor(b[1])

  let points: Position[] = [[x, y]]

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

function findBestZoomLevel(
  timeZoomLevels: TileZoomLevel[],
  mapTileScale: number
): TileZoomLevel | undefined {
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

function scaleToTiles(
  zoomLevel: TileZoomLevel,
  points: SVGPolygon
): SVGPolygon {
  return points.map((point) => [
    point[0] / zoomLevel.originalWidth,
    point[1] / zoomLevel.originalHeight
  ])
}

function findNeededIiifTilesByX(tilePixelExtent: SVGPolygon) {
  // TODO: use Map
  const tiles: PositionByX = {}
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

function iiifTilesByXToArray(
  zoomLevel: TileZoomLevel,
  imageSize: Size,
  iiifTilesByX: PositionByX
): Tile[] {
  const neededIiifTiles: Tile[] = []
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
        zoomLevel,
        imageSize
      })
    }
  }

  return neededIiifTiles
}

export function computeIiifTilesForMapGeoBBox(
  transformer: GCPTransformerInterface,
  image: Image,
  viewportSize: Size,
  geoBBox: BBox
): Tile[] {
  const imageBBoxPolygon = geoBBoxToSVGPolygon(transformer, geoBBox)
  const geoBBoxImageBBox = computeBBox(imageBBoxPolygon)

  if (
    (geoBBoxImageBBox[0] > image.width || geoBBoxImageBBox[2] < 0) &&
    (geoBBoxImageBBox[1] > image.height || geoBBoxImageBBox[3] < 0)
  ) {
    return []
  }

  const geoBBoxImageBBoxWidth = geoBBoxImageBBox[2] - geoBBoxImageBBox[0]
  const geoBBoxImageBBoxHeight = geoBBoxImageBBox[3] - geoBBoxImageBBox[1]

  const mapScaleX = geoBBoxImageBBoxWidth / viewportSize[0]
  const mapScaleY = geoBBoxImageBBoxHeight / viewportSize[1]
  const mapScale = Math.min(mapScaleX, mapScaleY)

  const zoomLevel = findBestZoomLevel(image.tileZoomLevels, mapScale)

  if (zoomLevel) {
    // TODO: maybe index all tiles in rtree?

    const tilePixelExtent = scaleToTiles(zoomLevel, imageBBoxPolygon)

    const iiifTilesByX = findNeededIiifTilesByX(tilePixelExtent)
    const iiifTiles = iiifTilesByXToArray(
      zoomLevel,
      [image.width, image.height],
      iiifTilesByX
    )

    const imageBBoxCenter: Position = [
      geoBBoxImageBBoxWidth / 2 + geoBBoxImageBBox[0],
      geoBBoxImageBBoxHeight / 2 + geoBBoxImageBBox[1]
    ]

    // sort tiles to load tiles in order of their distance to center
    iiifTiles.sort(
      (tileA, tileB) =>
        distanceFromPoint(tileA, imageBBoxCenter) -
        distanceFromPoint(tileB, imageBBoxCenter)
    )

    return iiifTiles
  } else {
    return []
  }
}
