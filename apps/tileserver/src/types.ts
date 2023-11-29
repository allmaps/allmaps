import type { TransformationType } from '@allmaps/transform'

export type XYZTile = {
  z: number
  x: number
  y: number
}

// Keeping this here to note that the original version of Tile in this package didn't have imageSize as compared to @allmaps/types
// export type Tile = {
//   column: number
//   row: number
//   zoomLevel: TileZoomLevel
// }

export type Cache = {
  put(request: Request | string, response: Response): Promise<undefined>
  match(request: Request | string): Promise<Response | undefined>
}

export type Caches = {
  default: Cache
}

export type Tilejson = {
  tilejson: '3.0.0'
  id: string | undefined
  tiles: string[]
  fields: object
  bounds: number[]
  center: number[]
  // maxzoom
  // minzoom
}

export type TilejsonOptions = {
  'transformation.type': TransformationType
}
