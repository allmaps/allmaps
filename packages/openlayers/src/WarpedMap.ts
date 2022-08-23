import type { Image as IIIFImage } from '@allmaps/iiif-parser'
import type { GCPTransformInfo } from '@allmaps/transform'
import type { Map as Georef } from '@allmaps/annotation'

type Coord = [number, number]
type Polygon = {
  type: string,
  coordinates: Coord[][]
}

type Extent = [
  number, // minX
  number, // minY
  number, // maxX
  number // maxY
]

export class WarpedMap {
  mapId: string
  map: Georef
  transformer: GCPTransformInfo
  image: IIIFImage
  geoMask: Polygon
  triangles: number[]
  geoMaskExtent: Extent

  constructor(
    mapId: string,
    map: Georef,
    image: IIIFImage,
    transformer: GCPTransformInfo,
    geoMask: Polygon,
    geoMaskExtent: Extent,
    triangles: number[]
  ) {
    this.mapId = mapId
    this.map = map
    this.transformer = transformer
    this.image = image
    this.geoMask = geoMask
    this.triangles = triangles
    this.geoMaskExtent = geoMaskExtent
  }
}
