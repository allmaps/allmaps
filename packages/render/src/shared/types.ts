import type {
  Image as IIIFImage,
  TileZoomLevel,
  ImageRequest
} from '@allmaps/iiif-parser'
import type { GCPTransformInfo } from '@allmaps/transform'

import type { BBox, Polygon, Position } from 'geojson'

export { BBox, Polygon as GeoJSONPolygon, Position }

// TODO: rename
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

export type CachedTile = {
  mapId: string
  tile: Tile
  imageRequest: ImageRequest
  url: string
  // TODO: can imageData be removed?
  imageData?: ImageData
  imageBitmap?: ImageBitmap
  loading: boolean
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

export type WarpedMap = {
  imageId: string
  mapId: string
  parsedImage: IIIFImage
  pixelMask: SVGPolygon
  transformer: GCPTransformInfo
  geoMask: Polygon
}

export type XYZTile = {
  z: number
  x: number
  y: number
}
