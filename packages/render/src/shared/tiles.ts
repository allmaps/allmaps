import { Image } from '@allmaps/iiif-parser'
import { computeBbox, bboxToPolygon } from '@allmaps/stdlib'

import type {
  Point,
  Line,
  Ring,
  Polygon,
  Bbox,
  Size,
  XYZTile,
  Tile,
  PointByX
} from '@allmaps/types'
import type { GcpTransformer } from '@allmaps/transform'
import type { TileZoomLevel } from '@allmaps/types'

function distanceFromPoint(tile: Tile, point: Point) {
  const center = tileCenter(tile)

  const dx = center[0] - point[0]
  const dy = center[1] - point[1]

  return Math.sqrt(dx ** 2 + dy ** 2)
}

export function imageCoordinatesToTileCoordinates(
  tile: Tile,
  imageCoordinates: Point,
  clip = true
): Point | undefined {
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

function getBestZoomLevelForMapScale(
  image: Image,
  mapTileScale: number
): TileZoomLevel {
  const tileZoomLevels = image.tileZoomLevels

  let smallestScaleDiff = Number.POSITIVE_INFINITY
  let bestZoomLevel = tileZoomLevels[tileZoomLevels.length - 1]

  for (const zoomLevel of tileZoomLevels) {
    const scaleFactor = zoomLevel.scaleFactor
    const scaleDiff = Math.abs(scaleFactor - mapTileScale)

    // scaleFactors:
    // 1.......2.......4.......8.......16
    //
    // Example mapTileScale = 3
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
    if (scaleDiff < smallestScaleDiff && scaleFactor * 1.25 >= mapTileScale) {
      smallestScaleDiff = scaleDiff
      bestZoomLevel = zoomLevel
    }
  }

  return bestZoomLevel
}

function scaleRingToTileZoomLevel(ring: Ring, zoomLevel: TileZoomLevel): Ring {
  return ring.map((point) => [
    point[0] / zoomLevel.originalWidth,
    point[1] / zoomLevel.originalHeight
  ])
}

function findNeededIiifTilesByX(tilePixelExtent: Ring) {
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

function iiifTilesByXToArray(
  zoomLevel: TileZoomLevel,
  imageSize: Size,
  iiifTilesByX: PointByX
): Tile[] {
  const neededIiifTiles: Tile[] = []
  for (const xKey in iiifTilesByX) {
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

// TODO: move to render
export function geoBboxToResourcePolygon(
  transformer: GcpTransformer,
  geoBbox: Bbox
) {
  // transformer is the transformer built from the (projected) Gcps. It transforms forward from resource coordinates to projected geo coordinates, and backward from (projected) geo coordinates to resource coordinates.
  // geoBbox is a Bbox of the viewport in (projected) geo coordinates
  // geoBboxResourcePolygon is a polygon of this Bbox, transformed backward to resource coordinates.
  // Due to transformerOptions this in not necessarilly a 4-point ring, but can have more points.

  const geoBboxPolygon = bboxToPolygon(geoBbox)
  const geoBboxResourcePolygon = transformer.transformBackward(geoBboxPolygon, {
    maxOffsetRatio: 0.00001,
    maxDepth: 2
  }) as Polygon

  return geoBboxResourcePolygon
}

export function getBestZoomLevel(
  image: Image,
  viewportSize: Size,
  resourcePolygon: Polygon
): TileZoomLevel {
  const resourceBbox = computeBbox(resourcePolygon)

  const resourceBboxWidth = resourceBbox[2] - resourceBbox[0]
  const resourceBboxHeight = resourceBbox[3] - resourceBbox[1]

  const mapScaleX = resourceBboxWidth / viewportSize[0]
  const mapScaleY = resourceBboxHeight / viewportSize[1]
  const mapScale = Math.min(mapScaleX, mapScaleY)

  return getBestZoomLevelForMapScale(image, mapScale)
}

export function computeIiifTilesForPolygonAndZoomLevel(
  image: Image,
  viewportResourcePolygon: Polygon,
  tileZoomLevel: TileZoomLevel
): Tile[] {
  // TODO: apply 'projected' in names
  const scaledViewportTesourcePolygon = scaleRingToTileZoomLevel(
    viewportResourcePolygon[0],
    tileZoomLevel
  )

  const iiifTilesByX = findNeededIiifTilesByX(scaledViewportTesourcePolygon)
  const iiifTiles = iiifTilesByXToArray(
    tileZoomLevel,
    [image.width, image.height],
    iiifTilesByX
  )

  // sort tiles to load tiles in order of their distance to center
  // TODO: move to new SortedFetch class
  const resourceBbox = computeBbox(viewportResourcePolygon)
  const resourceCenter: Point = [
    (resourceBbox[0] + resourceBbox[2]) / 2,
    (resourceBbox[1] + resourceBbox[3]) / 2
  ]

  iiifTiles.sort(
    (tileA, tileB) =>
      distanceFromPoint(tileA, resourceCenter) -
      distanceFromPoint(tileB, resourceCenter)
  )

  return iiifTiles
}

export function xyzTileToLonLatBbox({ z, x, y }: XYZTile): Bbox {
  const topLeft = xyzTileTopLeft({ z, x, y })
  const bottomRight = xyzTileBottomRight({ z, x, y })

  return [topLeft[0], topLeft[1], bottomRight[0], bottomRight[1]]
}

function xyzTileTopLeft({ z, x, y }: XYZTile): Point {
  return [tileToLng({ x, z }), tileToLat({ y, z })]
}

function xyzTileBottomRight({ z, x, y }: XYZTile): Point {
  return [tileToLng({ x: x + 1, z }), tileToLat({ y: y + 1, z })]
}

// From:
//   https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function tileToLng({ x, z }: { x: number; z: number }): number {
  return (x / Math.pow(2, z)) * 360 - 180
}

function tileToLat({ y, z }: { y: number; z: number }): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}
