import type {
  Image as IIIFImage,
  TileZoomLevel,
  ImageRequest
} from '@allmaps/iiif-parser'
import type { GCPTransformInfo } from '@allmaps/transform'

export type Position = [number, number]

// export type BBox = [number, number, number, number] | [number, number, number, number, number, number];
export type BBox = [number, number, number, number]

export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: Position[][]
}

// TODO: rename?
export type SVGPolygon = Position[]

export type Line = [Position, Position]

export type Size = [number, number]

export type Extent = [number, number]

export type Color = [number, number, number]
export type OptionalColor = Color | null

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

export type RemoveBackgroundOptions = {
  color: Color
  threshold?: number
  hardness?: number
}

export type ColorizeOptions = {
  color: Color
}

export type RenderOptions = {
  opacity?: number
  removeBackground?: RemoveBackgroundOptions
  colorize?: ColorizeOptions
}

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
  visible: boolean
  parsedImage: IIIFImage
  pixelMask: SVGPolygon
  transformer: GCPTransformInfo
  geoMask: GeoJSONPolygon
  fullGeoMask: GeoJSONPolygon
}

export type XYZTile = {
  z: number
  x: number
  y: number
}
