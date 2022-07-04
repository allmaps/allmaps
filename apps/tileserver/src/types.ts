// TODO: import from other package

import type { TileZoomLevel } from '@allmaps/iiif-parser'

export type Tile = {
  column: number
  row: number
  zoomLevel: TileZoomLevel
}

export interface Cache {
  put(request: Request | string, response: Response): Promise<undefined>
  match(request: Request | string): Promise<Response | undefined>
}

export interface Caches {
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
