import { lonLatToWebMercator } from '@allmaps/project'

import type { Point, Bbox, GeojsonPolygon } from '@allmaps/types'
import type { XYZTile } from './types.js'

export function xyzTileToGeojson({ z, x, y }: XYZTile): GeojsonPolygon {
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

export function xyzTileToProjectedGeoBbox({ x, y, z }: XYZTile): Bbox {
  return [
    ...lonLatToWebMercator(xyzTileTopLeft({ x, y, z })),
    ...lonLatToWebMercator(xyzTileBottomRight({ x, y, z }))
  ]
}

export function xyzTileTopLeft({ z, x, y }: XYZTile): Point {
  return [xyzTileToLng({ x, z }), xyzTileToLat({ y, z })]
}

export function xyzTileBottomRight({ z, x, y }: XYZTile): Point {
  return [xyzTileToLng({ x: x + 1, z }), xyzTileToLat({ y: y + 1, z })]
}

// From: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export function xyzTileToLng({ x, z }: { x: number; z: number }): number {
  return (x / Math.pow(2, z)) * 360 - 180
}

export function xyzTileToLat({ y, z }: { y: number; z: number }): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}
