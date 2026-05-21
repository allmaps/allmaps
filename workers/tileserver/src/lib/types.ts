import type { TransformationType } from '@allmaps/transform'

export type XYZTile = {
  z: number
  x: number
  y: number
}

export type Tilejson = {
  tilejson: '3.0.0'
  id: string | undefined
  tiles: string[]
  fields: object
  bounds: [number, number, number, number]
  center: [number, number, number]
  minzoom: number
  maxzoom: number
}

// TODO: align this with TransformationOptions from @allmaps/render
export type TransformationOptions = {
  'transformation.type'?: TransformationType
}

export type TileResolution = 'normal' | 'retina'
