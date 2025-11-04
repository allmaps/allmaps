import type {
  Image as IIIFImage,
  EmbeddedImage as IIIFEmbeddedImage,
  Canvas as IIIFCanvas,
  Manifest as IIIFManifest,
  EmbeddedManifest as IIIFEmbeddedManifest,
  Collection as IIIFCollection,
  EmbeddedCollection as IIIFEmbeddedCollection
} from '@allmaps/iiif-parser'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { GeojsonPolygon } from '@allmaps/types'
import type { PickerProjection } from '@allmaps/components/projections'

export type Organization = {
  title: string
  label?: string | ((title: string) => string)
  subtitle?: string
  baseUrls: string[]
  allowCallback?: boolean
}

export type OrganizationWithId = Organization & {
  id: string
}

export type GCP = {
  resource: Point
  geo: Point
}

export type Point = [number, number]

export type View = 'images' | 'mask' | 'georeference' | 'results'
export type MaybeView = View | undefined

export type Scope = 'images' | 'image' | 'map'

export type SourceType = 'image' | 'manifest' | 'collection'

export type IIIFPresentationResource =
  | IIIFCollection
  | IIIFEmbeddedCollection
  | IIIFCanvas
  | IIIFManifest
  | IIIFEmbeddedManifest

export type IIIFResource =
  | IIIFPresentationResource
  | IIIFEmbeddedImage
  | IIIFImage

type BaseSource = {
  url: string
  allmapsId: string
  sourceIiif: unknown
  type: SourceType
  parsedIiif: IIIFImage | IIIFManifest | IIIFCollection
}

export type ImageSource = {
  type: 'image'
  parsedIiif: IIIFImage
}

export type ManifestSource = {
  type: 'manifest'
  parsedIiif: IIIFManifest
}

export type CollectionSource = {
  type: 'collection'
  parsedIiif: IIIFCollection
}

export type Source = BaseSource &
  (ImageSource | ManifestSource | CollectionSource)

export type DbImageService = 'ImageService1' | 'ImageService2' | 'ImageService3'

export type GeoreferencedMapsByImageId = Record<string, GeoreferencedMap[]>

export type LabelIndexFromGcpIdFn = (gcpId: string) => number

export type GcpCoordinates = {
  resource?: Point
  geo?: Point
}

export type Example = {
  organizationId: string
  title: string
  manifestId?: string
  imageId: string
}

export type Viewport =
  | {
      zoom: number
      center: [number, number]
      bearing: number
    }
  | {
      bounds: [number, number, number, number]
    }

export type AllmapsPluginId = 'maplibre' | 'leaflet' | 'openlayers'

export type AllmapsPluginItem = {
  label: string
  value: AllmapsPluginId
}

export type BasemapPresetId =
  | 'protomaps'
  | 'esri-world-topo'
  | 'esri-world-imagery'
  | 'osm'

export type BasemapProtomapsPresetItem = {
  label: string
  type: 'protomaps'
  attribution: string
  value: BasemapPresetId
}

export type BasemapRasterPresetItem = {
  label: string
  url: string
  type: 'raster'
  attribution: string
  value: BasemapPresetId
}

export type BasemapPresetItem =
  | BasemapProtomapsPresetItem
  | BasemapRasterPresetItem

export type ClickedItem =
  | { type: 'map'; mapId: string }
  | { type: 'gcp'; mapId: string; gcpId: string }

// export type GetProjectionById = (id: string) => PickerProjection | undefined
export type ProjectionsById = Record<string, PickerProjection>

export type Message = { text: string; type: 'error' | 'success' | 'info' }

export type CollectionPath = {
  index: number
  page?: number
}[]

export type SearchParam<T> = {
  key: string
  default?: T
  toString?: (value: T) => string | undefined
  parse?: (value: string | undefined) => T | undefined
}

export type SearchParams = {
  [K in string]: SearchParam<any>
}

// Extract the type T from SearchParam<T>
export type ExtractSearchParamType<T> =
  T extends SearchParam<infer U> ? U : never

export type SearchParamsInput<
  T extends SearchParams,
  K extends keyof T = keyof T
> = {
  [P in K]?: ExtractSearchParamType<T[P]>
}

export type Breadcrumb = {
  label?: string
  path: CollectionPath
  type: 'collection' | 'manifest' | 'canvas'
  id: string
}

export type WarpedResourceMask = {
  id: string
  polygon: GeojsonPolygon
}
