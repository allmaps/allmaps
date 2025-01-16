import {
  computeBbox,
  bboxToCenter,
  distance,
  doBboxesIntersect,
  bufferBboxByRatio,
  squaredDistance,
  sizeToResolution
} from '@allmaps/stdlib'
import { MapPruneConstants, MapPruneInfo } from './types'
import FetchableTile from '../tilecache/FetchableTile'

import type { Image } from '@allmaps/iiif-parser'
import type {
  Point,
  Line,
  Ring,
  Bbox,
  Tile,
  Size,
  TileZoomLevel,
  TileByColumn
} from '@allmaps/types'

// Preparing to make tiles

/**
 * Returns the best TileZoomLevel for a given resource-to-canvas scale.
 *
 * @export
 * @param {Image} image - A parsed IIIF Image
 * @param {number} resourceToCanvasScale - The resource to canvas scale, relating resource pixels to canvas pixels.
 * @returns {TileZoomLevel}
 */
export function getTileZoomLevelForScale(
  tileZoomLevels: TileZoomLevel[],
  resourceToCanvasScale: number,
  scaleFactorCorrection: number,
  log2scaleFactorCorrection: number
): TileZoomLevel {
  // Returning the TileZoomLevel with the scaleFactor closest to the map scale.
  // We use logarithms here because for scaleFactors 1 is as 'far' of 2 as 8 is of 16.
  // Math reminder: log(A)-log(B)=log(A/B)
  //
  // Example:
  // Available scaleFactors in tileZoomLevels:
  // 1---------2---------4---------8---------16
  // Math.log2() of those scaleFactors
  // 0---------1---------2---------3---------4
  //
  // Scale of the map '|' = 3, corrected scale '*' = 3.5
  // 1---------2----|-*--4---------8---------16
  // Math.log2(3) = 1.58, Math.log2(3.5) = 1.80
  // 0---------1-----|-*-2---------3---------4
  //
  // The algorithm loops through all available scaleFactors and find out
  // which one (in Math.log2()) is closest to the (corrected) scale.
  //
  // The scale can be corrected before and after taking the Math.log2()
  // Here we will correct before.
  // Math.log2(3 + scaleFactorCorrection) = Math.log2(3 + 0.5) = 1.80
  //
  // scaleFactor = 1
  // Math.log2(1) = 0
  // diff = abs(0 - 1.80) = abs(-1.80) = 1.80
  //
  // scaleFactor = 2
  // Math.log2(2) = 1
  // diff = abs(1 - 1.80) = abs(-0.80) = 0.80
  //
  // scaleFactor = 4
  // Math.log2(4) = 3
  // diff = abs(3 - 1.80) = abs(0.20) = 0.20
  //
  // => Pick scaleFactor 4, which has minimum diff.
  // Notice how 3 lies in the middle of 2 and 4, but on the log scale log2(3) lies closer to log2(4) than log2(2)
  // Notice how the scaleFactorCorrection corrects the scale for which the closest scaleFactor is searched.
  // Notice when this happens before taking a Math.log2(), it has more effect on smaller scales then on bigger.

  let smallestdiffLogScaleFactor = Number.POSITIVE_INFINITY
  let bestTileZoomLevel = tileZoomLevels.at(-1) as TileZoomLevel

  for (const tileZoomLevel of tileZoomLevels) {
    const diffLogScaleFactor = Math.abs(
      Math.log2(tileZoomLevel.scaleFactor) -
        (Math.log2(resourceToCanvasScale + scaleFactorCorrection) +
          log2scaleFactorCorrection)
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
  imageSize: Size
): Tile[] {
  const scaledResourceRing = scaleResourcePoints(resourceRing, tileZoomLevel)
  const tilesByColumn = ringToTilesByColumn(scaledResourceRing)
  const tiles = tilesByColumnToTiles(tilesByColumn, tileZoomLevel, imageSize)

  // Sort tiles to load tiles in order of their distance to center
  const resourceRingCenter = bboxToCenter(computeBbox(resourceRing))
  tiles.sort(
    (tileA, tileB) =>
      squaredDistanceTileToPoint(tileA, resourceRingCenter) -
      squaredDistanceTileToPoint(tileB, resourceRingCenter)
  )

  return tiles
}

function scaleResourcePoints(
  resourcePoints: Point[],
  tileZoomLevel: TileZoomLevel
): Point[] {
  // This scales the incoming resource points to a grid, where there scaled coordinates on the grid pixels (between integer numbers) correspond to the original coordinates on the tiles provided at this zoom level
  return resourcePoints.map((point) => [
    point[0] / tileZoomLevel.originalWidth,
    point[1] / tileZoomLevel.originalHeight
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
  tileZoomLevel: TileZoomLevel,
  imageSize: Size
): Tile[] {
  const tiles: Tile[] = []
  for (const xKey in tilesByColumn) {
    const x = parseInt(xKey)

    if (x < 0 || x >= tileZoomLevel.columns) {
      break
    }

    const fromY = Math.max(tilesByColumn[x][0], 0)
    const toY = Math.min(tilesByColumn[x][1], tileZoomLevel.rows - 1)

    for (let y = fromY; y <= toY; y++) {
      tiles.push({
        column: x,
        row: y,
        tileZoomLevel: tileZoomLevel,
        imageSize
      })
    }
  }

  return tiles
}

// Looking up tiles

export function getTilesCoveringTileAtScaleFactor(
  tile: Tile,
  parsedImage: Image,
  scaleFactor: number,
  validTile?: (tile: Tile) => boolean
) {
  let columnStart = Math.floor(
    (tile.column * tile.tileZoomLevel.scaleFactor) / scaleFactor
  )
  columnStart = columnStart >= 0 ? columnStart : 0
  const columnEnd = Math.ceil(
    ((tile.column + 1) * tile.tileZoomLevel.scaleFactor) / scaleFactor
  )
  let rowStart = Math.floor(
    (tile.row * tile.tileZoomLevel.scaleFactor) / scaleFactor
  )
  rowStart = rowStart >= 0 ? rowStart : 0
  const rowEnd = Math.ceil(
    ((tile.row + 1) * tile.tileZoomLevel.scaleFactor) / scaleFactor
  )
  return getTilesAtScaleFactor(
    scaleFactor,
    parsedImage,
    columnStart,
    columnEnd,
    rowStart,
    rowEnd,
    validTile
  )
}

export function getTilesAtScaleFactor(
  scaleFactor: number,
  parsedImage: Image,
  columnStart?: number,
  columnEnd?: number,
  rowStart?: number,
  rowEnd?: number,
  validTile: (tile: Tile) => boolean = (_tile: Tile) => true
) {
  const tileZoomLevel = parsedImage.tileZoomLevels.find(
    (tileZoomLevel) => tileZoomLevel.scaleFactor == scaleFactor
  )
  const imageSize = [parsedImage.width, parsedImage.height] as Size

  if (!tileZoomLevel) {
    return []
  }

  columnStart = columnStart ? columnStart : 0
  columnEnd = columnEnd ? columnEnd : tileZoomLevel.columns
  rowStart = rowStart ? rowStart : 0
  rowEnd = rowEnd ? rowEnd : tileZoomLevel.rows

  const tiles: Tile[] = []
  for (let column = columnStart; column < columnEnd; column++) {
    for (let row = rowStart; row < rowEnd; row++) {
      const tile = {
        column,
        row,
        tileZoomLevel,
        imageSize
      }
      if (validTile(tile)) {
        tiles.push(tile)
      }
    }
  }

  return tiles
}

// Identity

export function equalTileByRowColumnScaleFactor(
  tile0: Tile,
  tile1: Tile
): boolean {
  return (
    tile0.column == tile1.column &&
    tile0.row == tile1.row &&
    tile0.tileZoomLevel.scaleFactor == tile1.tileZoomLevel.scaleFactor
  )
}

// Geometric computations

export function distanceTileToPoint(tile: Tile, point: Point): number {
  return distance(tileCenter(tile), point)
}

export function squaredDistanceTileToPoint(tile: Tile, point: Point): number {
  return squaredDistance(tileCenter(tile), point)
}

export function tileCenter(tile: Tile): Point {
  const bbox = computeBboxTile(tile)

  return [(bbox[2] - bbox[0]) / 2 + bbox[0], (bbox[3] - bbox[1]) / 2 + bbox[1]]
}

/**
 * Returns the resource coordinates of the tile's origin point
 *
 * @export
 * @param {Tile} tile
 * @returns {Point}
 */
export function tileToTileOriginPoint(tile: Tile): Point {
  return [
    tile.column * tile.tileZoomLevel.originalWidth,
    tile.row * tile.tileZoomLevel.originalHeight
  ]
}

export function clipTilePointToTile(tilePoint: Point, tile: Tile): Point {
  const tileSize = [tile.tileZoomLevel.width, tile.tileZoomLevel.height]
  return tilePoint.map((coordinate, index) => {
    coordinate = Math.max(coordinate, 0)
    coordinate = Math.min(coordinate, tileSize[index] - 1)
    return coordinate
  }) as Point
}

/**
 * From the input point in resource coordinates, returns the same point in tile coordinates
 * I.e. relative to the tile's origin point and scaled using the scale factor
 *
 * @export
 * @param {Point} resourcePoint
 * @param {Tile} tile
 * @param {boolean} [clip=true]
 * @returns {Point | undefined}
 */
export function resourcePointToTilePoint(
  resourcePoint: Point,
  tile: Tile,
  clip = true
): Point | undefined {
  const resourceTileOriginPoint = tileToTileOriginPoint(tile)
  const tilePoint = [
    (resourcePoint[0] - resourceTileOriginPoint[0]) /
      tile.tileZoomLevel.scaleFactor,
    (resourcePoint[1] - resourceTileOriginPoint[1]) /
      tile.tileZoomLevel.scaleFactor
  ] as Point

  if (
    !clip ||
    resourcePointInTile(resourcePoint, tile)
    // && pointInImage(resourcePoint, tile)
  ) {
    return tilePoint
  }
}

export function resourcePointInTile(resourcePoint: Point, tile: Tile): boolean {
  const resourceTileOrigin = tileToTileOriginPoint(tile)

  return (
    resourcePoint[0] >= resourceTileOrigin[0] &&
    resourcePoint[0] <=
      resourceTileOrigin[0] + tile.tileZoomLevel.originalWidth &&
    resourcePoint[1] >= resourceTileOrigin[1] &&
    resourcePoint[1] <=
      resourceTileOrigin[1] + tile.tileZoomLevel.originalHeight
  )
}

export function resourcePointInImage(
  resourcePoint: Point,
  tile: Tile
): boolean {
  return (
    resourcePoint[0] > 0 &&
    resourcePoint[0] <= tile.imageSize[0] &&
    resourcePoint[1] > 0 &&
    resourcePoint[1] <= tile.imageSize[1]
  )
}

export function computeBboxTile(tile: Tile): Bbox {
  const resourceTileOriginPoint = tileToTileOriginPoint(tile)

  const resourceTileMaxX = Math.min(
    resourceTileOriginPoint[0] + tile.tileZoomLevel.originalWidth,
    tile.imageSize[0]
  )
  const resourceTileMaxY = Math.min(
    resourceTileOriginPoint[1] + tile.tileZoomLevel.originalHeight,
    tile.imageSize[1]
  )

  return [
    resourceTileOriginPoint[0],
    resourceTileOriginPoint[1],
    resourceTileMaxX,
    resourceTileMaxY
  ]
}

// Resolution

export function getTileSize(tile: Tile): Size {
  return [tile.tileZoomLevel.width, tile.tileZoomLevel.height]
}

export function getTileOriginalSize(tile: Tile): Size {
  return [tile.tileZoomLevel.originalWidth, tile.tileZoomLevel.originalHeight]
}

export function getTileResolution(tile: Tile): number {
  return sizeToResolution(getTileSize(tile))
}

export function getTileOriginalResolution(tile: Tile): number {
  return sizeToResolution(getTileOriginalSize(tile))
}

export function getTilesResolution(tiles: Tile[]): number {
  return tiles.map((tile) => getTileResolution(tile)).reduce((a, c) => a + c, 0)
}

export function getTilesOriginalResolution(tiles: Tile[]): number {
  return tiles
    .map((tile) => getTileOriginalResolution(tile))
    .reduce((a, c) => a + c, 0)
}

export function getTileZoomLevelResolution(
  tileZoomLevel: TileZoomLevel
): number {
  return (
    tileZoomLevel.rows *
    tileZoomLevel.width *
    tileZoomLevel.columns *
    tileZoomLevel.height
  )
}

export function getTileZoomLevelOriginalResolution(
  tileZoomLevel: TileZoomLevel
): number {
  return (
    tileZoomLevel.rows *
    tileZoomLevel.originalWidth *
    tileZoomLevel.columns *
    tileZoomLevel.originalHeight
  )
}

// Search at other scalefactors

export function getTilesAtOtherScaleFactors(
  tile: Tile,
  parsedImage: Image,
  scaleFactor: number,
  TEXTURES_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF: number,
  TEXTURES_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF: number,
  validTile?: (tile: Tile) => boolean
): Tile[] {
  const tilesAtOtherScaleFactors = []

  const tilesAtLowerScaleFactor = recursivelyGetTilesAtLowerScaleFactor(
    tile,
    parsedImage,
    scaleFactor,
    TEXTURES_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF,
    validTile
  )
  for (const tileAtLowerScaleFactor of tilesAtLowerScaleFactor) {
    if (tileAtLowerScaleFactor) {
      tilesAtOtherScaleFactors.push(tileAtLowerScaleFactor)
    }
  }
  if (tilesAtOtherScaleFactors.length == 0) {
    const tileAtHigherScaleFactor = recursivelyGetTilesAtHigherScaleFactor(
      tile,
      parsedImage,
      scaleFactor,
      TEXTURES_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF,
      validTile
    )
    if (tileAtHigherScaleFactor) {
      tilesAtOtherScaleFactors.push(tileAtHigherScaleFactor)
    }
  }

  return tilesAtOtherScaleFactors
}

export function recursivelyGetTilesAtHigherScaleFactor(
  tile: Tile,
  parsedImage: Image,
  scaleFactor: number,
  log2ScaleFactorDiff: number,
  validTile?: (tile: Tile) => boolean
): Tile | undefined {
  const higherScaleFactor = 2 ** (Math.log2(scaleFactor) + 1)
  if (
    higherScaleFactor >
      parsedImage.tileZoomLevels
        .map((tileZoomLevel) => tileZoomLevel.scaleFactor)
        .reduce((a, c) => a + c, 0) -
        scaleFactor ||
    log2ScaleFactorDiff == 0
  ) {
    return undefined
  }
  const tileAtHigherScaleFactor = getTileAtHigherScaleFactor(
    tile,
    parsedImage,
    higherScaleFactor,
    validTile
  )
  if (tileAtHigherScaleFactor !== undefined) {
    return tileAtHigherScaleFactor
  } else {
    return recursivelyGetTilesAtHigherScaleFactor(
      tile,
      parsedImage,
      higherScaleFactor,
      log2ScaleFactorDiff--,
      validTile
    )
  }
}

export function recursivelyGetTilesAtLowerScaleFactor(
  tile: Tile,
  parsedImage: Image,
  scaleFactor: number,
  log2ScaleFactorDiff: number,
  validTile?: (tile: Tile) => boolean
): (Tile | undefined)[] {
  const lowerScaleFactor = 2 ** (Math.log2(scaleFactor) - 1)
  if (lowerScaleFactor <= 0 || log2ScaleFactorDiff == 0) {
    return []
  }
  const tilesAtLowerScaleFactor = getTilesAtLowerScaleFactor(
    tile,
    parsedImage,
    lowerScaleFactor,
    validTile
  )
  const allTilesAtLowerScaleFactor = getTilesAtLowerScaleFactor(
    tile,
    parsedImage,
    lowerScaleFactor,
    (_tile) => true
  )
  if (tilesAtLowerScaleFactor.length == allTilesAtLowerScaleFactor.length) {
    return tilesAtLowerScaleFactor
  } else {
    return [
      ...tilesAtLowerScaleFactor,
      ...recursivelyGetTilesAtLowerScaleFactor(
        tile,
        parsedImage,
        lowerScaleFactor,
        log2ScaleFactorDiff--,
        validTile
      )
    ]
  }
}

export function getTileAtHigherScaleFactor(
  tile: Tile,
  parsedImage: Image,
  higherScaleFactor: number,
  validTile?: (tile: Tile) => boolean
): Tile | undefined {
  const tilesCoveringTileAtHigherScaleFactor =
    getTilesCoveringTileAtScaleFactor(
      tile,
      parsedImage,
      higherScaleFactor,
      validTile
    )

  if (tilesCoveringTileAtHigherScaleFactor.length == 0) {
    return undefined
  }

  return tilesCoveringTileAtHigherScaleFactor[0]
}

export function getTilesAtLowerScaleFactor(
  tile: Tile,
  parsedImage: Image,
  lowerScaleFactor: number,
  validTile?: (tile: Tile) => boolean
): (Tile | undefined)[] {
  const tilesCoveringTileAtLowerScaleFactor = getTilesCoveringTileAtScaleFactor(
    tile,
    parsedImage,
    lowerScaleFactor,
    validTile
  )

  return tilesCoveringTileAtLowerScaleFactor
}

// Keys for search

// TODO: consider a way to make this more elegant:
// - many-to-many data structure
// - a new compact class with just these two properties and an equality function between elements
// - new JS tuple - https://github.com/tc39/proposal-record-tuple

export function fetchableTileKey(fetchableTile: FetchableTile): string {
  return keyFromMapIdTileUrl(fetchableTile.mapId, fetchableTile.tileUrl)
}

export function keyFromMapIdTileUrl(mapId: string, tileUrl: string): string {
  return `${mapId}:${tileUrl}`
}

export function tileKey(tile: Tile): string {
  return keyFromScaleFactorRowColumn(
    tile.tileZoomLevel.scaleFactor,
    tile.row,
    tile.column
  )
}

export function keyFromScaleFactorRowColumn(
  scaleFactor: number,
  row: number,
  column: number
): string {
  return `${scaleFactor}:${row}:${column}`
}

export function tileUrl(tile: Tile, parsedImage: Image): string {
  const imageRequest = parsedImage.getIiifTile(
    tile.tileZoomLevel,
    tile.column,
    tile.row
  )
  return parsedImage.getImageUrl(imageRequest)
}

// TileCache

export function shouldPruneTile(
  tile: Tile,
  mapPruneInfo: MapPruneInfo,
  mapPruneConstants: MapPruneConstants
) {
  // Don't prune if overview
  // Note that resourceViewportRingBboxForViewport and tileZoomLevelForViewport are only undefined
  // if overview tile, so we add them here to prevent TypeScript errors furter on
  if (
    mapPruneInfo.overviewTileZoomLevelForViewport &&
    tile.tileZoomLevel.scaleFactor ==
      mapPruneInfo.overviewTileZoomLevelForViewport.scaleFactor
  ) {
    return false
  }

  // Prune if the tileZoomLevelForViewport or resourceViewportRingBboxForViewport are undefined
  // (this only happens if the map is too small to render)
  if (
    mapPruneInfo.resourceViewportRingBboxForViewport == undefined ||
    mapPruneInfo.tileZoomLevelForViewport == undefined
  ) {
    return true
  }

  // Should prune if scale factor too much off
  //
  // Example:
  // Available scaleFactors in tileZoomLevels:
  // 1 (full original resolution), 2, 4, 8, 16 (zoomed out)
  //
  // Tile scale factor: 16, so log2 tile scale factor: 4
  // Scale factor for viewport: 8, so log2 scale factor for viewport: 3
  // Difference: 4 - 3 = 1, check if not more then max
  // This is positive if tile scale factor is higher then scale factor for viewport, so tiles are lower original resolution
  //
  // Since there are less lower original resolution tiles,
  // MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF can be higher then MAX_LOWER_LOG2_SCALE_FACTOR_DIFF
  //
  const log2ScaleFactorDiff =
    Math.log2(tile.tileZoomLevel.scaleFactor) -
    Math.log2(mapPruneInfo.tileZoomLevelForViewport.scaleFactor)
  // Check if scale factor not too high, i.e. tile resolution too low
  const tileScaleFactorTooHigh =
    log2ScaleFactorDiff > mapPruneConstants.maxHigherLog2ScaleFactorDiff
  if (tileScaleFactorTooHigh) {
    return true
  }
  // Check if scale factor not too low, i.e. tile resolution too high
  const tileScaleFactorTooLow =
    -log2ScaleFactorDiff > mapPruneConstants.maxLowerLog2ScaleFactorDiff
  if (tileScaleFactorTooLow) {
    return true
  }

  // Prune if too far away
  // Note that we correct the tile bbox by buffering the scale factor difference (if positive)
  // This allows us to keep all tiles that would be needed if we zoom out again
  // Even if they currently don't overlap with the viewport ring bbox
  if (
    !doBboxesIntersect(
      bufferBboxByRatio(
        computeBboxTile(tile),
        Math.max(0, log2ScaleFactorDiff)
      ),
      mapPruneInfo.resourceViewportRingBboxForViewport
    )
  ) {
    return true
  }

  // By default, don't prune
  return false
}
