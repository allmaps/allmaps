import type { TransformationType } from '@allmaps/transform'

// TODO: remove this. Kept a copy here to note that this version doesn't have imageSize as compared to @allmaps/types
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
