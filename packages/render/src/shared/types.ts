import type {
  Image as IIIFImage,
  TileZoomLevel,
  ImageRequest
} from '@allmaps/iiif-parser'
import type { GcpTransformer } from '@allmaps/transform'
import type { Gcp } from '@allmaps/types'

export type { TileZoomLevel } from '@allmaps/iiif-parser'

export type Point = [number, number]

export type BBox = [number, number, number, number]

export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: Point[][]
}

// TODO: rename?
export type Ring = Point[]

export type Line = [Point, Point]

export type Size = [number, number]

export type Extent = [number, number]

export type Color = [number, number, number]
export type OptionalColor = Color | undefined

export type Tile = {
  column: number
  row: number
  zoomLevel: TileZoomLevel
  imageSize: Size
}

export type NeededTile = {
  mapId: string
  tile: Tile
  imageRequest: ImageRequest
  url: string
}

export type RemoveBackgroundOptions = Partial<{
  color: Color
  threshold: number
  hardness: number
}>

export type ColorizeOptions = Partial<{
  color: Color
}>

export type RenderOptions = Partial<{
  removeBackground?: RemoveBackgroundOptions
  colorize?: ColorizeOptions
}>

export type Transform = [number, number, number, number, number, number]

export type Matrix4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
]

export type WarpedMap = {
  imageId: string
  mapId: string
  projectedGCPs: Gcp[]
  visible: boolean
  parsedImage: IIIFImage
  resourceMask: Ring
  transformer: GcpTransformer
  geoMask: GeoJSONPolygon
  geoMaskBBox: BBox
  fullGeoMask: GeoJSONPolygon
  fullGeoMaskBBox: BBox
}

export type XYZTile = {
  z: number
  x: number
  y: number
}
