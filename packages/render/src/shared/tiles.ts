import { Image } from '@allmaps/iiif-parser'
import {
  computeBbox,
  bboxToPolygon,
  bboxToCenter,
  distance
} from '@allmaps/stdlib'

import type {
  Point,
  Line,
  Ring,
  Bbox,
  Size,
  Tile,
  TileZoomLevel,
  TileByColumn
} from '@allmaps/types'
import type { GcpTransformer } from '@allmaps/transform'

/**
 * Scale factor sharpening: 1 = no sharpening, 2 = one level extra sharper, 4 = two levels extra sharper, 1/2 = one level less sharp ...
 */
const SCALE_FACTOR_SHARPENING = 1.25

// Functions for preparing to make tiles

export function geoBboxToResourceRing(
  transformer: GcpTransformer,
  geoBbox: Bbox
): Ring {
  // TODO: this function could be moved elsewhere because not stricktly about tiles
  //
  // 'transformer' is the transformer built from the (projected) Gcps. It transforms forward from resource coordinates to projected geo coordinates, and backward from (projected) geo coordinates to resource coordinates.
  // 'geoBbox' is a Bbox (e.g. of the viewport) in (projected) geo coordinates
  // 'geoBboxResourceRing' is a ring of this Bbox, transformed backward to resource coordinates.
  // Due to transformerOptions this in not necessarilly a 4-point ring, but can have more points.

  const geoBboxRing = bboxToPolygon(geoBbox)[0]
  const geoBboxResourceRing = transformer.transformBackward(geoBboxRing, {
    maxOffsetRatio: 0.00001,
    maxDepth: 2
  }) as Ring

  return geoBboxResourceRing
}

export function getBestTileZoomLevel(
  // TODO: once tileserver can import from stdlib, it can point to getBestTileZoomLevelForScale directly just like WebGL2Render, and this function can be removed.
  image: Image,
  canvasSize: Size,
  resourceRing: Ring
): TileZoomLevel {
  const resourceBbox = computeBbox(resourceRing)

  const resourceBboxWidth = resourceBbox[2] - resourceBbox[0]
  const resourceBboxHeight = resourceBbox[3] - resourceBbox[1]

  const resourceToCanvasScaleX = resourceBboxWidth / canvasSize[0]
  const resourceToCanvasScaleY = resourceBboxHeight / canvasSize[1]
  const resourceToCanvasScale = Math.min(
    resourceToCanvasScaleX,
    resourceToCanvasScaleY
  )

  return getBestTileZoomLevelForScale(image, resourceToCanvasScale)
}

/**
 * Returns the best TileZoomLevel for a given resource-to-canvas scale.
 *
 * @export
 * @param {Image} image - A parsed IIIF Image
 * @param {number} resourceToCanvasScale - The resource to canvas scale, relating resource pixels to canvas pixels.
 * @returns {TileZoomLevel}
 */
export function getBestTileZoomLevelForScale(
  image: Image,
  resourceToCanvasScale: number
): TileZoomLevel {
  // Returning the TileZoomLevel with the scaleFactor closest to the current scale.
  //
  // Available scaleFactors in tileZoomLevels:
  // 1---------2---------4---------8---------16
  // Math.log() of those scaleFactors
  // 0---------0.69------1.38------2.07------2.77
  //
  // Current scale of the map = 3
  // 1---------2----|----4---------8---------16
  // Math.log(3) = 1.09
  // 0------*--0.69---|--1.38------2.07------2.77
  //
  // scaleFactor = 1
  // Math.log(1) = 0
  // Math.log(3) = 1.09 (current)
  // Math.log(SCALE_FACTOR_SHARPENING) = 0.69
  // diff = abs(0 - (1.09 - 0.69)) = abs(-0.4) = 0.4
  //
  // scaleFactor = 2
  // Math.log(2) = 0.69
  // Math.log(3) = 1.09 (current)
  // Math.log(SCALE_FACTOR_SHARPENING) = 0.69
  // diff = abs(0.69 - (1.09 - 0.69)) = abs(0.29) = 0.29
  //
  // scaleFactor = 4
  // Math.log(4) = 1.38
  // Math.log(3) = 1.09 (current)
  // Math.log(SCALE_FACTOR_SHARPENING) = 0.69
  // diff = abs(1.38 - (1.09 - 0.69)) = abs(0.98) = 0.98
  //
  // => Pick scale factor 2, with minimum diff.
  // Notice how 3 lies in the middle of 2 and 4, but on the log scale log(3) lies closer to log(4) then log(2)
  // Notice how the SCALE_FACTOR_SHARPENING makes the actual current log scale for which the closest scaleFactor is searched move one factor of two sharper
  // On the schematic drawing above, this is represented with a '*', left of the '|'.
  //
  // Math reminder: log(A)-log(B)=log(A/B)

  let smallestdiffLogScaleFactor = Number.POSITIVE_INFINITY
  let bestTileZoomLevel = image.tileZoomLevels.at(-1) as TileZoomLevel

  for (const tileZoomLevel of image.tileZoomLevels) {
    const diffLogScaleFactor = Math.abs(
      Math.log(tileZoomLevel.scaleFactor) -
        (Math.log(resourceToCanvasScale) - Math.log(SCALE_FACTOR_SHARPENING))
    )
    if (diffLogScaleFactor < smallestdiffLogScaleFactor) {
      smallestdiffLogScaleFactor = diffLogScaleFactor
      bestTileZoomLevel = tileZoomLevel
    }
  }

  return bestTileZoomLevel
}

// Making tiles

export function computeTilesConveringRingAtTileZoomLevel(
  resourceRing: Ring,
  tileZoomLevel: TileZoomLevel,
  image: Image
): Tile[] {
  const scaledResourceRing = scaleResourcePoints(resourceRing, tileZoomLevel)
  const tilesByColumn = ringToTilesByColumn(scaledResourceRing)
  const tiles = tilesByColumnToTiles(tilesByColumn, image, tileZoomLevel)

  // Sort tiles to load tiles in order of their distance to center
  const resourceRingCenter = bboxToCenter(computeBbox(resourceRing))
  tiles.sort(
    (tileA, tileB) =>
      distanceTileToPoint(tileA, resourceRingCenter) -
      distanceTileToPoint(tileB, resourceRingCenter)
  )

  return tiles
}

function scaleResourcePoints(
  resourcePoints: Point[],
  zoomLevel: TileZoomLevel
): Point[] {
  // This scales the incoming resource points to a grid, where there scaled coordinates on the grid pixels (between integer numbers) correspond to the original coordinates on the tiles provided at this zoom level
  return resourcePoints.map((point) => [
    point[0] / zoomLevel.originalWidth,
    point[1] / zoomLevel.originalHeight
  ])
}

function ringToTilesByColumn(ring: Ring) {
  const tilesByColumn: TileByColumn = {}
  for (let i = 0; i < ring.length; i++) {
    const line: Line = [ring[i], ring[(i + 1) % ring.length]]
    const points = pointsIntersectingLine(line)

    points.forEach(([x, y]) => {
      if (!tilesByColumn[x]) {
        tilesByColumn[x] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]
      }

      if (y < tilesByColumn[x][0]) {
        tilesByColumn[x][0] = y
      }

      if (y > tilesByColumn[x][1]) {
        tilesByColumn[x][1] = y
      }
    })
  }

  return tilesByColumn
}

function pointsIntersectingLine([a, b]: Line): Point[] {
  // From:
  //  https://github.com/vHawk/tiles-intersect
  // See also:
  //  https://www.redblobgames.com/grids/line-drawing.html

  let x = Math.floor(a[0])
  let y = Math.floor(a[1])
  const endX = Math.floor(b[0])
  const endY = Math.floor(b[1])

  const points: Point[] = [[x, y]]

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

function tilesByColumnToTiles(
  tilesByColumn: TileByColumn,
  image: Image,
  zoomLevel: TileZoomLevel
): Tile[] {
  const tiles: Tile[] = []
  for (const xKey in tilesByColumn) {
    const x = parseInt(xKey)

    if (x < 0 || x >= zoomLevel.columns) {
      break
    }

    const fromY = Math.max(tilesByColumn[x][0], 0)
    const toY = Math.min(tilesByColumn[x][1], zoomLevel.rows - 1)

    for (let y = fromY; y <= toY; y++) {
      tiles.push({
        column: x,
        row: y,
        tileZoomLevel: zoomLevel,
        imageSize: [image.width, image.height]
      })
    }
  }

  return tiles
}

// Geometric computations

function distanceTileToPoint(tile: Tile, point: Point): number {
  return distance(tileCenter(tile), point)
}

export function tileCenter(tile: Tile): Point {
  const bbox = computeBboxTile(tile)

  return [(bbox[2] - bbox[0]) / 2 + bbox[0], (bbox[3] - bbox[1]) / 2 + bbox[1]]
}

export function computeBboxTile(tile: Tile): Bbox {
  const tileXMin = tile.column * tile.tileZoomLevel.originalWidth
  const tileYMin = tile.row * tile.tileZoomLevel.originalHeight

  const tileXMax = Math.min(
    tileXMin + tile.tileZoomLevel.originalWidth,
    tile.imageSize[0]
  )
  const tileYMax = Math.min(
    tileYMin + tile.tileZoomLevel.originalHeight,
    tile.imageSize[1]
  )

  return [tileXMin, tileYMin, tileXMax, tileYMax]
}

export function resourcePointToTilePoint(
  tile: Tile,
  resourcePoint: Point,
  clip = true
): Point | undefined {
  const tileXMin = tile.column * tile.tileZoomLevel.originalWidth
  const tileYMin = tile.row * tile.tileZoomLevel.originalHeight

  const tileX = (resourcePoint[0] - tileXMin) / tile.tileZoomLevel.scaleFactor
  const tileY = (resourcePoint[1] - tileYMin) / tile.tileZoomLevel.scaleFactor

  if (
    !clip ||
    (resourcePoint[0] >= tileXMin &&
      resourcePoint[0] <= tileXMin + tile.tileZoomLevel.originalWidth &&
      resourcePoint[1] >= tileYMin &&
      resourcePoint[1] <= tileYMin + tile.tileZoomLevel.originalHeight &&
      resourcePoint[0] <= tile.imageSize[0] &&
      resourcePoint[1] <= tile.imageSize[1])
  ) {
    return [tileX, tileY]
  }
}
