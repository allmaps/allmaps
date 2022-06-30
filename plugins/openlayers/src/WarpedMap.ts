import type { Image as IIIFImage } from '@allmaps/iiif-parser'
import type { GCPTransformInfo } from '@allmaps/transform'
import type { Map as Georef } from '@allmaps/annotation'

type Coord = [number, number]
type Polygon = {
  type: string,
  coordinates: Coord[][]
}

type GeoExtent = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export class WarpedMap {
  mapId: string
  map: Georef
  transformer: GCPTransformInfo
  image: IIIFImage
  geoMask: Polygon
  triangles: number[]
  geoExtent

  constructor(
    mapId: string,
    map: Georef,
    image: IIIFImage,
    transformer: GCPTransformInfo,
    geoMask: Polygon,
    geoExtent: GeoExtent,
    triangles: number[]
  ) {
    this.mapId = mapId
    this.map = map
    this.transformer = transformer
    this.image = image
    this.geoMask = geoMask
    this.triangles = triangles
    this.geoExtent = geoExtent
  }
}
