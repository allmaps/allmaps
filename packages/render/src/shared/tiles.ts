import { Image } from '@allmaps/iiif-parser'
import { computeBbox, bboxToPolygon, distance } from '@allmaps/stdlib'
import { WarpedMapWithImageInfo } from '../WarpedMap'

import type {
  Point,
  Line,
  Ring,
  Bbox,
  Size,
  Tile,
  TileZoomLevel,
  NeededTile,
  PointByX
} from '@allmaps/types'
import type { GcpTransformer } from '@allmaps/transform'

function distanceTilePoint(tile: Tile, point: Point): number {
  return distance(tileCenter(tile), point)
}

export function resourcePointToTilePoint(
  tile: Tile,
  resourcePoint: Point,
  clip = true
): Point | undefined {
  const tileXMin = tile.column * tile.zoomLevel.originalWidth
  const tileYMin = tile.row * tile.zoomLevel.originalHeight

  const tileX = (resourcePoint[0] - tileXMin) / tile.zoomLevel.scaleFactor
  const tileY = (resourcePoint[1] - tileYMin) / tile.zoomLevel.scaleFactor

  if (
    !clip ||
    (resourcePoint[0] >= tileXMin &&
      resourcePoint[0] <= tileXMin + tile.zoomLevel.originalWidth &&
      resourcePoint[1] >= tileYMin &&
      resourcePoint[1] <= tileYMin + tile.zoomLevel.originalHeight &&
      resourcePoint[0] <= tile.imageSize[0] &&
      resourcePoint[1] <= tile.imageSize[1])
  ) {
    return [tileX, tileY]
  }
}

export function tileBbox(tile: Tile): Bbox {
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

export function tileCenter(tile: Tile): Point {
  const bbox = tileBbox(tile)

  return [(bbox[2] - bbox[0]) / 2 + bbox[0], (bbox[3] - bbox[1]) / 2 + bbox[1]]
}

// From:
//  https://github.com/vHawk/tiles-intersect
// See also:
//  https://www.redblobgames.com/grids/line-drawing.html
function tilesIntersect([a, b]: Line): Point[] {
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

export function getBestZoomLevelForScale(
  image: Image,
  scale: number
): TileZoomLevel {
  const tileZoomLevels = image.tileZoomLevels

  let smallestScaleDiff = Number.POSITIVE_INFINITY
  let bestZoomLevel = tileZoomLevels[tileZoomLevels.length - 1]

  for (const zoomLevel of tileZoomLevels) {
    const scaleFactor = zoomLevel.scaleFactor
    const scaleDiff = Math.abs(scaleFactor - scale)

    // scaleFactors:
    // 1.......2.......4.......8.......16
    //
    // Example mapScale = 3
    // 1.......2..|....4.......8.......16
    //
    // scaleFactor 2:
    //   scaleDiff = 1
    //   scaleFactor * 1.25 = 2.5 => 2.5 >= 3 === false
    //
    // scaleFactor 4:
    //   scaleDiff = 1
    //   scaleFactor * 1.25 = 5 => 5 >= 3 === true
    //
    // Pick scaleFactor 4!

    // TODO: read 1.25 from config
    // TODO: maybe use a smaller value when the scaleFactor is low and a higher value when the scaleFactor is high?
    // TODO: use lgoarithmic scale?
    if (scaleDiff < smallestScaleDiff && scaleFactor * 1.25 >= scale) {
      smallestScaleDiff = scaleDiff
      bestZoomLevel = zoomLevel
    }
  }

  return bestZoomLevel
}

function scalePointsToTileZoomLevel(
  points: Point[],
  zoomLevel: TileZoomLevel
): Point[] {
  return points.map((point) => [
    point[0] / zoomLevel.originalWidth,
    point[1] / zoomLevel.originalHeight
  ])
}

function findNeededTilesByX(tilePixelExtent: Ring) {
  const tiles: PointByX = {}
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

function tilesByXToArray(
  zoomLevel: TileZoomLevel,
  imageSize: Size,
  tilesByX: PointByX
): Tile[] {
  const neededTiles: Tile[] = []
  for (const xKey in tilesByX) {
    const x = parseInt(xKey)

    if (x < 0 || x >= zoomLevel.columns) {
      break
    }

    const fromY = Math.max(tilesByX[x][0], 0)
    const toY = Math.min(tilesByX[x][1], zoomLevel.rows - 1)

    for (let y = fromY; y <= toY; y++) {
      neededTiles.push({
        column: x,
        row: y,
        zoomLevel,
        imageSize
      })
    }
  }

  return neededTiles
}

// TODO: move to render
export function geoBboxToResourceRing(
  transformer: GcpTransformer,
  geoBbox: Bbox
) {
  // transformer is the transformer built from the (projected) Gcps. It transforms forward from resource coordinates to projected geo coordinates, and backward from (projected) geo coordinates to resource coordinates.
  // geoBbox is a Bbox (e.g. of the viewport) in (projected) geo coordinates
  // geoBboxResourceRing is a ring of this Bbox, transformed backward to resource coordinates.
  // Due to transformerOptions this in not necessarilly a 4-point ring, but can have more points.

  const geoBboxRing = bboxToPolygon(geoBbox)[0]
  const geoBboxResourceRing = transformer.transformBackward(geoBboxRing, {
    maxOffsetRatio: 0.00001,
    maxDepth: 2
  }) as Ring

  return geoBboxResourceRing
}

// TODO: point tileserver directly to getBestZoomLevelForMapScale too and remove this function
export function getBestZoomLevel(
  image: Image,
  canvasSize: Size,
  resourceRing: Ring
): TileZoomLevel {
  const resourceBbox = computeBbox(resourceRing)

  const resourceBboxWidth = resourceBbox[2] - resourceBbox[0]
  const resourceBboxHeight = resourceBbox[3] - resourceBbox[1]

  const mapScaleX = resourceBboxWidth / canvasSize[0]
  const mapScaleY = resourceBboxHeight / canvasSize[1]
  const mapScale = Math.min(mapScaleX, mapScaleY)

  return getBestZoomLevelForScale(image, mapScale)
}

export function computeTilesForPolygonAndZoomLevel(
  image: Image,
  resourceRing: Ring,
  tileZoomLevel: TileZoomLevel
): Tile[] {
  const scaledResourcePolygon = scalePointsToTileZoomLevel(
    resourceRing,
    tileZoomLevel
  )

  const tilesByX = findNeededTilesByX(scaledResourcePolygon)
  const tiles = tilesByXToArray(
    tileZoomLevel,
    [image.width, image.height],
    tilesByX
  )

  // sort tiles to load tiles in order of their distance to center
  // TODO: move to new SortedFetch class
  const resourceBbox = computeBbox(resourceRing)
  const resourceCenter: Point = [
    (resourceBbox[0] + resourceBbox[2]) / 2,
    (resourceBbox[1] + resourceBbox[3]) / 2
  ]

  tiles.sort(
    (tileA, tileB) =>
      distanceTilePoint(tileA, resourceCenter) -
      distanceTilePoint(tileB, resourceCenter)
  )

  return tiles
}

export function makeNeededTile(
  tile: Tile,
  warpedMap: WarpedMapWithImageInfo
): NeededTile {
  const mapId = warpedMap.mapId
  const imageRequest = warpedMap.parsedImage.getIiifTile(
    tile.zoomLevel,
    tile.column,
    tile.row
  )
  const url = warpedMap.parsedImage.getImageUrl(imageRequest)
  return {
    mapId,
    tile,
    imageRequest,
    url
  }
}
