// TODO: import from other package

import type { TileZoomLevel } from '@allmaps/iiif-parser'

export type Tile = {
  column: number
  row: number
  zoomLevel: TileZoomLevel
}

export type Cache = {
  put(request: Request | string, response: Response): Promise<undefined>
  match(request: Request | string): Promise<Response | undefined>
}

export type Caches = {
  default: Cache
}

export type Size = [number, number]

export type Extent = [number, number, number, number]

export type Coord = [number, number]

export type XYZTile = {
  z: number
  x: number
  y: number
}

// TODO: import transformation types from other package
export type Transformation = 'polynomial' | 'thin-plate-spline'

export type Options = {
  'transformation.type': Transformation
}
