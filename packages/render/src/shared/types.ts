import type { Gcp, Ring, Bbox, Color, GeojsonPolygon } from '@allmaps/types'
import type { Image as IIIFImage } from '@allmaps/iiif-parser'
import type { GcpTransformer } from '@allmaps/transform'

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

export type WarpedMap = {
  imageId: string
  mapId: string
  projectedGCPs: Gcp[]
  visible: boolean
  parsedImage: IIIFImage
  resourceMask: Ring
  transformer: GcpTransformer
  geoMask: GeojsonPolygon
  geoMaskBbox: Bbox
  fullGeoMask: GeojsonPolygon
  fullGeoMaskBbox: Bbox
}
