import { Image } from '@allmaps/iiif-parser'
import { computeBbox, bboxToCenter, distance } from '@allmaps/stdlib'
import FetchableMapTile from '../tilecache/FetchableTile'

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

/**
 * Target scale factor correction
 * Since this is done before comparing *logarithmic* evaluations of the target and available scale factors (to find the best fit), this has more effect on small scale factors.
 * 0 = no correction, -1 = correct target scale factor with -1 to obain less sharp images (especially at low scale factors), 1 = idem with correction +1, ...
 */
const DEFAULT_TARGET_SCALE_FACTOR_CORRECTION = 0.5

// Functions for preparing to make tiles

// TODO: consider a way to make this more elegant:
// - many-to-many data structure
// - a new compact class with just these two properties and an equality function between elements
// - new JS tuple - https://github.com/tc39/proposal-record-tuple
export function createKeyFromMapIdAndTileUrl(
  mapId: string,
  tileUrl: string
): string {
  return `${mapId}:${tileUrl}`
}
export function createKeyFromTile(fetchableMapTile: FetchableMapTile): string {
  return createKeyFromMapIdAndTileUrl(
    fetchableMapTile.mapId,
    fetchableMapTile.tileUrl
  )
}

export function fetchableMapTilesToKeys(
  fetchableMapTiles: FetchableMapTile[]
): Set<string> {
  return new Set(
    fetchableMapTiles.map((fetchableMapTile) =>
      createKeyFromTile(fetchableMapTile)
    )
  )
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
  resourceToCanvasScale: number,
  targetScaleFactorCorrection = DEFAULT_TARGET_SCALE_FACTOR_CORRECTION
): TileZoomLevel {
  // Returning the TileZoomLevel with the scaleFactor closest to the current scale.
  // We use logarithms here because for scaleFactors 1 is a 'far' of 2 as 8 is of 16.
  // Math reminder: log(A)-log(B)=log(A/B)
  //
  // Example:
  // Available scaleFactors in tileZoomLevels:
  // 1---------2---------4---------8---------16
  // Math.log() of those scaleFactors
  // 0---------0.69------1.38------2.07------2.77
  //
  // Current scale of the map '|' = 3, corrected scale '*' = 3.5
  // 1---------2----|-*--4---------8---------16
  // Math.log(3.5) = 1.09, Math.log(3.5) = 1.25
  // 0---------0.69--|-*-1.38------2.07------2.77
  //
  // scaleFactor = 1
  // Math.log(1) = 0
  // Math.log(3 + targetScaleFactorCorrection) = Math.log(3 + 0.5) = 1.25 (current)
  // diff = abs(0 - 1.25) = abs(-1.25) = 1.25
  //
  // scaleFactor = 2
  // Math.log(2) = 0.69
  // Math.log(3 + 0.5) = 1.25 (current)
  // diff = abs(0.69 - 1.25) = abs(-0.56) = 0.56
  //
  // scaleFactor = 4
  // Math.log(4) = 1.38
  // Math.log(3 + 0.5) = 1.25 (current)
  // diff = abs(1.38 - 1.25) = abs(0.13) = 0.13
  //
  // => Pick scale factor 4, with minimum diff.
  // Notice how 3 lies in the middle of 2 and 4, but on the log scale log(3) lies closer to log(4) then log(2)
  // Notice how the targetScaleFactorCorrection corrects the current scale for which the closest scaleFactor is searched.
  // Notice how this happens before taking a Math.log(), making it have more effect on smaller scales then on bigger.

  let smallestdiffLogScaleFactor = Number.POSITIVE_INFINITY
  let bestTileZoomLevel = image.tileZoomLevels.at(-1) as TileZoomLevel

  for (const tileZoomLevel of image.tileZoomLevels) {
    const diffLogScaleFactor = Math.abs(
      Math.log(tileZoomLevel.scaleFactor) -
        Math.log(resourceToCanvasScale + targetScaleFactorCorrection)
    )
    if (diffLogScaleFactor < smallestdiffLogScaleFactor) {
      smallestdiffLogScaleFactor = diffLogScaleFactor
      bestTileZoomLevel = tileZoomLevel
    }
  }

  return bestTileZoomLevel
}

// Making tiles

export function computeTilesCoveringRingAtTileZoomLevel(
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

// Computations

export function tileByteSize(tile: FetchableMapTile): number {
  return (
    (tile.imageRequest.size?.height || 0) *
    (tile.imageRequest.size?.width || 0) *
    3 // RBG, so 3 values per pixel
  )
}

// Geometric computations

function distanceTileToPoint(tile: Tile, point: Point): number {
  return distance(tileCenter(tile), point)
}

export function tileCenter(tile: Tile): Point {
  const bbox = computeBboxTile(tile)

  return [(bbox[2] - bbox[0]) / 2 + bbox[0], (bbox[3] - bbox[1]) / 2 + bbox[1]]
}

export function tilePosition(tile: Tile): Point {
  const resourceTilePositionX = tile.column * tile.tileZoomLevel.originalWidth
  const resourceTilePositionY = tile.row * tile.tileZoomLevel.originalHeight

  return [resourceTilePositionX, resourceTilePositionY]
}

export function computeBboxTile(tile: Tile): Bbox {
  const resourceTilePosition = tilePosition(tile)

  const resourceTileMaxX = Math.min(
    resourceTilePosition[0] + tile.tileZoomLevel.originalWidth,
    tile.imageSize[0]
  )
  const resourceTileMaxY = Math.min(
    resourceTilePosition[1] + tile.tileZoomLevel.originalHeight,
    tile.imageSize[1]
  )

  return [
    resourceTilePosition[0],
    resourceTilePosition[1],
    resourceTileMaxX,
    resourceTileMaxY
  ]
}

// Currently unused
export function resourcePointToTilePoint(
  tile: Tile,
  resourcePoint: Point,
  clip = true
): Point | undefined {
  const resourceTilePosition = tilePosition(tile)

  const tilePointX =
    (resourcePoint[0] - resourceTilePosition[0]) /
    tile.tileZoomLevel.scaleFactor
  const tilePointY =
    (resourcePoint[1] - resourceTilePosition[1]) /
    tile.tileZoomLevel.scaleFactor

  if (
    !clip ||
    (resourcePoint[0] >= resourceTilePosition[0] &&
      resourcePoint[0] <=
        resourceTilePosition[0] + tile.tileZoomLevel.originalWidth &&
      resourcePoint[1] >= resourceTilePosition[1] &&
      resourcePoint[1] <=
        resourceTilePosition[1] + tile.tileZoomLevel.originalHeight &&
      resourcePoint[0] <= tile.imageSize[0] &&
      resourcePoint[1] <= tile.imageSize[1])
  ) {
    return [tilePointX, tilePointY]
  }
}
