import type { Point } from '@allmaps/types'

// TODO: maybe use index
export type MapStaple = {
  stapleId: string
  mapId: string
  transformationIndex: number
  sourcePoint: Point
}

export type MapsStaple = Map<string, MapStaple[]>
