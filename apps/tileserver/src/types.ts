import type { TransformationType } from '@allmaps/transform'

export type XYZTile = {
  z: number
  x: number
  y: number
}

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

// TODO: align this with TransformationOptions from @allmaps/render
export type TilejsonOptions = {
  'transformation.type': TransformationType
}
