import { distance, squaredDistance, sizeToResolution } from '@allmaps/stdlib'
import { FetchableTile } from '../tilecache/FetchableTile.js'

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
 * @param image - A parsed IIIF Image
 * @param resourceToCanvasScale - The resource to canvas scale, relating resource pixels to canvas pixels.
 * @returns
 */
export function getTileZoomLevelForScale(
  tileZoomLevels: TileZoomLevel[],
  resourceToCanvasScale: number,
  scaleFactorCorrection: number,
  log2ScaleFactorCorrection: number
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

  let smallestLog2ScaleFactorDiff = Number.POSITIVE_INFINITY
  let bestTileZoomLevel = tileZoomLevels.at(-1) as TileZoomLevel

  for (const tileZoomLevel of tileZoomLevels) {
    const log2ScaleFactorDiff = Math.abs(
      Math.log2(tileZoomLevel.scaleFactor) -
        (Math.log2(resourceToCanvasScale + scaleFactorCorrection) +
          log2ScaleFactorCorrection)
    )
    if (log2ScaleFactorDiff < smallestLog2ScaleFactorDiff) {
      smallestLog2ScaleFactorDiff = log2ScaleFactorDiff
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
    const pixels = lineToPixels(line)

    pixels.forEach(([x, y]) => {
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

function lineToPixels([startPoint, endPoint]: Line): Point[] {
  // From:
  //  https://github.com/vHawk/tiles-intersect
  // See also:
  //  https://www.redblobgames.com/grids/line-drawing.html

  // Start and end pixel coordinates
  let startPixelX = Math.floor(startPoint[0])
  let startPixelY = Math.floor(startPoint[1])
  const endPixelX = Math.floor(endPoint[0])
  const endPixelY = Math.floor(endPoint[1])

  const points: Point[] = [[startPixelX, startPixelY]]

  if (startPixelX === endPixelX && startPixelY === endPixelY) {
    return points
  }

  // The pixel step: 1, 0 or -1
  const stepX = Math.sign(endPoint[0] - startPoint[0])
  const stepY = Math.sign(endPoint[1] - startPoint[1])

  // The rest in the first pixel before reaching the next one
  const restX = Math.abs(startPoint[0] - startPixelX - Math.max(0, stepX))
  const restY = Math.abs(startPoint[1] - startPixelY - Math.max(0, stepY))

  // The distance
  const distanceX = Math.abs(startPoint[0] - endPoint[0])
  const distanceY = Math.abs(startPoint[1] - endPoint[1])

  // The relative rest
  let restPerStepX = restX / distanceX
  let restPerStepY = restY / distanceY

  // The delta
  const onePerStepX = 1 / distanceX
  const onePerStepY = 1 / distanceY

  while (!(startPixelX === endPixelX && startPixelY === endPixelY)) {
    if (distanceY === 0) {
      startPixelX = startPixelX + stepX
    } else if (distanceX === 0) {
      startPixelY = startPixelY + stepY
    } else if (restPerStepX < restPerStepY) {
      restPerStepX = restPerStepX + onePerStepX
      startPixelX = startPixelX + stepX
    } else {
      restPerStepY = restPerStepY + onePerStepY
      startPixelY = startPixelY + stepY
    }

    points.push([startPixelX, startPixelY])
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
  image: Image,
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
    image,
    columnStart,
    columnEnd,
    rowStart,
    rowEnd,
    validTile
  )
}

export function getTilesAtScaleFactor(
  scaleFactor: number,
  image: Image,
  columnStart?: number,
  columnEnd?: number,
  rowStart?: number,
  rowEnd?: number,
  validTile: (tile: Tile) => boolean = (_tile: Tile) => true
) {
  const tileZoomLevel = image.tileZoomLevels.find(
    (tileZoomLevel) => tileZoomLevel.scaleFactor === scaleFactor
  )
  const imageSize = [image.width, image.height] as Size

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
    tile0.column === tile1.column &&
    tile0.row === tile1.row &&
    tile0.tileZoomLevel.scaleFactor === tile1.tileZoomLevel.scaleFactor
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
 * @param tile
 * @returns
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
 * @param resourcePoint
 * @param tile
 * @param clip
 * @returns
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
  image: Image,
  scaleFactor: number,
  maxLowerLog2ScaleFactorDiff: number,
  maxHigherLog2ScaleFactorDiff: number,
  validTile?: (tile: Tile) => boolean
): Tile[] {
  const tilesAtOtherScaleFactors = []

  const tilesAtLowerScaleFactor = recursivelyGetTilesAtLowerScaleFactor(
    tile,
    image,
    scaleFactor,
    maxLowerLog2ScaleFactorDiff,
    validTile
  )
  for (const tileAtLowerScaleFactor of tilesAtLowerScaleFactor) {
    if (tileAtLowerScaleFactor) {
      tilesAtOtherScaleFactors.push(tileAtLowerScaleFactor)
    }
  }
  if (tilesAtOtherScaleFactors.length === 0) {
    const maxScaleFactor = Math.max(
      ...image.tileZoomLevels.map((tileZoomLevel) => tileZoomLevel.scaleFactor)
    )
    const tileAtHigherScaleFactor = recursivelyGetTilesAtHigherScaleFactor(
      tile,
      image,
      scaleFactor,
      maxHigherLog2ScaleFactorDiff,
      maxScaleFactor,
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
  image: Image,
  scaleFactor: number,
  log2ScaleFactorDiff: number,
  maxScaleFactor: number,
  validTile?: (tile: Tile) => boolean
): Tile | undefined {
  const higherScaleFactor = 2 ** (Math.log2(scaleFactor) + 1)
  if (higherScaleFactor > maxScaleFactor || log2ScaleFactorDiff <= 0) {
    return undefined
  }
  const tileAtHigherScaleFactor = getTileAtHigherScaleFactor(
    tile,
    image,
    higherScaleFactor,
    validTile
  )
  if (tileAtHigherScaleFactor !== undefined) {
    return tileAtHigherScaleFactor
  } else {
    return recursivelyGetTilesAtHigherScaleFactor(
      tile,
      image,
      higherScaleFactor,
      log2ScaleFactorDiff--,
      maxScaleFactor,
      validTile
    )
  }
}

export function recursivelyGetTilesAtLowerScaleFactor(
  tile: Tile,
  image: Image,
  scaleFactor: number,
  log2ScaleFactorDiff: number,
  validTile?: (tile: Tile) => boolean
): (Tile | undefined)[] {
  const lowerScaleFactor = 2 ** (Math.log2(scaleFactor) - 1)
  if (lowerScaleFactor <= 0 || log2ScaleFactorDiff <= 0) {
    return []
  }
  const tilesAtLowerScaleFactor = getTilesAtLowerScaleFactor(
    tile,
    image,
    lowerScaleFactor,
    validTile
  )
  const allTilesAtLowerScaleFactor = getTilesAtLowerScaleFactor(
    tile,
    image,
    lowerScaleFactor,
    (_tile) => true
  )
  if (tilesAtLowerScaleFactor.length === allTilesAtLowerScaleFactor.length) {
    return tilesAtLowerScaleFactor
  } else {
    return [
      ...tilesAtLowerScaleFactor,
      ...recursivelyGetTilesAtLowerScaleFactor(
        tile,
        image,
        lowerScaleFactor,
        log2ScaleFactorDiff--,
        validTile
      )
    ]
  }
}

export function getTileAtHigherScaleFactor(
  tile: Tile,
  image: Image,
  higherScaleFactor: number,
  validTile?: (tile: Tile) => boolean
): Tile | undefined {
  const tilesCoveringTileAtHigherScaleFactor =
    getTilesCoveringTileAtScaleFactor(tile, image, higherScaleFactor, validTile)

  if (tilesCoveringTileAtHigherScaleFactor.length === 0) {
    return undefined
  }

  return tilesCoveringTileAtHigherScaleFactor[0]
}

export function getTilesAtLowerScaleFactor(
  tile: Tile,
  image: Image,
  lowerScaleFactor: number,
  validTile?: (tile: Tile) => boolean
): (Tile | undefined)[] {
  const tilesCoveringTileAtLowerScaleFactor = getTilesCoveringTileAtScaleFactor(
    tile,
    image,
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

export function tileUrl(tile: Tile, image: Image): string {
  const imageRequest = image.getTileImageRequest(
    tile.tileZoomLevel,
    tile.column,
    tile.row
  )
  return image.getImageUrl(imageRequest)
}
