import { computeBbox } from '@allmaps/stdlib'

import type { Ring, Point, BBox, XYZTile, GeoJSONPolygon } from './types.js'

function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180)
}

// From:
//   https://gis.stackexchange.com/questions/156035/calculating-mercator-coordinates-from-lat-lon
export function fromLonLat([lon, lat]: Point): Point {
  const rMajor = 6378137.0
  const x = rMajor * degreesToRadians(lon)
  const scale = x / lon
  const y =
    (180.0 / Math.PI) *
    Math.log(Math.tan(Math.PI / 4.0 + (lat * (Math.PI / 180.0)) / 2.0)) *
    scale

  return [x, y]
}

// From: https://gist.github.com/mudpuddle/6115083
export function toLonLat([x, y]: Point): Point {
  const rMajor = 6378137.0
  const shift = Math.PI * rMajor
  const lon = (x / shift) * 180.0
  let lat = (y / shift) * 180.0
  lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((lat * Math.PI) / 180.0)) - Math.PI / 2.0)

  return [lon, lat]
}

export function getPolygonBBox(polygon: GeoJSONPolygon): BBox {
  return computeBbox(polygon.coordinates[0])
}

export function pointInPolygon(point: Point, polygon: Ring): boolean {
  // From:
  //  https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon
  // Ray-casting algorithm based on:
  //  https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

  if (!polygon) {
    return true
  }

  const [x, y] = point

  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

    if (intersect) {
      inside = !inside
    }
  }

  return inside
}

export function xyzTileToLonLatBBox({ z, x, y }: XYZTile): BBox {
  const topLeft = xyzTileTopLeft({ z, x, y })
  const bottomRight = xyzTileBottomRight({ z, x, y })

  return [topLeft[0], topLeft[1], bottomRight[0], bottomRight[1]]
}

function xyzTileTopLeft({ z, x, y }: XYZTile): Point {
  return [tile2long({ x, z }), tile2lat({ y, z })]
}

function xyzTileBottomRight({ z, x, y }: XYZTile): Point {
  return [tile2long({ x: x + 1, z }), tile2lat({ y: y + 1, z })]
}

// From:
//   https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function tile2long({ x, z }: { x: number; z: number }): number {
  return (x / Math.pow(2, z)) * 360 - 180
}

function tile2lat({ y, z }: { y: number; z: number }): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}
