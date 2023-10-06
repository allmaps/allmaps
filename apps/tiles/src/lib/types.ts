export type TileJSON = {
  tilejson: string
  id: string
  tiles: string[]
  fields: object
  bounds: [number, number, number, number]
  center: [number, number]
}
