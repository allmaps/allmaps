import type { Point, Ring, Bbox, XYZTile } from '@allmaps/types'

// Repeating this function from stdlib here such that we don't have to load stdlib, which uses dom.
export function pointInRing(point: Point, ring: Ring) {
  // From:
  //  https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon
  // Ray-casting algorithm based on:
  //  https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

  if (!ring) {
    return true
  }

  const [x, y] = point

  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

    if (intersect) {
      inside = !inside
    }
  }

  return inside
}

export function xyzTileToGeojson({ z, x, y }: XYZTile) {
  const topLeft = xyzTileTopLeft({ z, x, y })
  const bottomRight = xyzTileBottomRight({ z, x, y })

  return {
    type: 'Polygon',
    coordinates: [
      [
        topLeft,
        [topLeft[0], bottomRight[1]],
        bottomRight,
        [bottomRight[0], topLeft[1]],
        topLeft
      ]
    ]
  }
}

export function xyzTileToGeoBbox({ z, x, y }: XYZTile): Bbox {
  const topLeft = xyzTileTopLeft({ z, x, y })
  const bottomRight = xyzTileBottomRight({ z, x, y })

  return [...topLeft, ...bottomRight]
}

function xyzTileTopLeft({ z, x, y }: XYZTile): Point {
  return [tileToLongitude({ x, z }), tileToLatitude({ y, z })]
}

function xyzTileBottomRight({ z, x, y }: XYZTile): Point {
  return [tileToLongitude({ x: x + 1, z }), tileToLatitude({ y: y + 1, z })]
}

// From:
//   https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export function tileToLongitude({ x, z }: { x: number; z: number }): number {
  return (x / Math.pow(2, z)) * 360 - 180
}

export function tileToLatitude({ y, z }: { y: number; z: number }): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

export function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
}

export function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  )
}
